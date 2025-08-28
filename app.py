import os
import json
import re
from difflib import SequenceMatcher
from dotenv import load_dotenv
from openai import OpenAI
import chainlit as cl

# ---- Config ----
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
MODEL = "gemini-2.5-flash"
TOP_K = 3
JSON_PATH = "data/problem_statements_cleaned.json"

# ---- Initialize Gemini client ----
openai_client = None
if GEMINI_API_KEY:
    try:
        openai_client = OpenAI(api_key=GEMINI_API_KEY, base_url=BASE_URL)
    except Exception as e:
        print("Warning: Could not init OpenAI client:", e)
        openai_client = None


# ---- Utilities ----
def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        data = [data]
    return data

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def extract_ids(query):
    return re.findall(r"\b(\d{3,6})\b", query)

def score_item(query, item):
    q = query.lower()
    title = str(item.get("problem_statement_title", "")).lower()
    org = str(item.get("organization", "")).lower()
    theme = str(item.get("theme", "")).lower()
    category = str(item.get("category", "")).lower()
    ps_number = str(item.get("ps_number", "")).lower()
    details = item.get("details") or {}
    ps_id = str(details.get("problem_statement_id", "")).lower()
    ps_text = str(details.get("problem_statement", "")).lower()

    score = 0.0
    for nid in extract_ids(q):
        if nid and (nid in ps_number or nid == ps_id):
            score += 200

    for token in re.split(r"\W+", q):
        if not token:
            continue
        if token in title: score += 6
        if token in org: score += 5
        if token in theme: score += 4
        if token in category: score += 4
        if token in ps_text: score += 2
        if token in ps_number: score += 8
        if token == ps_id: score += 10

    try:
        score += 40 * similar(q, title)
        score += 25 * similar(q, org)
        score += 20 * similar(q, theme)
    except Exception:
        pass

    return score

def search_data(query, data, top_k=TOP_K):
    scored = []
    for item in data:
        s = score_item(query, item)
        if s > 0:
            scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:top_k]]

def build_compact_context(hits):
    contexts = []
    for it in hits:
        d = it.get("details") or {}
        contexts.append({
            "ps_number": it.get("ps_number"),
            "problem_statement_id": d.get("problem_statement_id"),
            "title": it.get("problem_statement_title"),
            "organization": it.get("organization"),
            "theme": it.get("theme"),
            "category": it.get("category"),
            "problem_statement": (d.get("problem_statement") or "")[:1200],
            "background": (d.get("background") or "")[:800],
            "expected_solution": (d.get("expected_solution") or "")[:800],
        })
    return contexts

def call_gemini(query, hits):
    if openai_client is None:
        if not hits:
            return "No relevant problem statements found."
        lines = ["Here are the top matches I found:"]
        for i, h in enumerate(hits, 1):
            d = h.get("details") or {}
            lines.append(
                f"{i}. {h.get('problem_statement_title')} "
                f"(ps_number: {h.get('ps_number')} | id: {d.get('problem_statement_id')} | org: {h.get('organization')})"
            )
        return "\n".join(lines)

    contexts = build_compact_context(hits)
    system = "You are Rana, an assistant specialized in explaining SIH (Smart India Hackathon) problem statements."
    user_content = (
        f"User query: {query}\n\nRelevantEntries:\n"
        f"{json.dumps(contexts, ensure_ascii=False, indent=2)}\n\n"
        "Write a helpful answer and, if asked, provide full details for a specific id."
    )

    try:
        resp = openai_client.chat.completions.create(
            model=MODEL,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
            max_tokens=800
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"(Model call failed: {e})"


# ---- Load dataset ----
try:
    DATA = load_json(JSON_PATH)
    print(f"Loaded {len(DATA)} entries from {JSON_PATH}")
except Exception as e:
    print("Could not load JSON:", e)
    DATA = []


# ---- Chainlit Chatbot ----
@cl.on_message
async def main(message: cl.Message):
    user_query = message.content
    hits = search_data(user_query, DATA, top_k=TOP_K)
    answer = call_gemini(user_query, hits)
    await cl.Message(content=answer).send()
