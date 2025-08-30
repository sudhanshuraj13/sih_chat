import os
import json
import re
from difflib import SequenceMatcher
from dotenv import load_dotenv
from openai import OpenAI
import chainlit as cl
from typing import Optional

# ---- Config ----
load_dotenv()
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
MODEL = "gemini-2.0-flash-exp"
TOP_K = 3
JSON_PATH = "data/problem_statements_cleaned.json"

# ---- Utilities ----
def load_json(path):
    """Load JSON data from file"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = [data]
        return data
    except FileNotFoundError:
        print(f"Warning: {path} not found")
        return []
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return []

def similar(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a, b).ratio()

def extract_ids(query):
    """Extract problem statement IDs from query"""
    return re.findall(r"\b(\d{3,6})\b", query)

def score_item(query, item):
    """Score a problem statement based on query relevance"""
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
    
    # Check for ID matches
    for nid in extract_ids(q):
        if nid and (nid in ps_number or nid == ps_id):
            score += 200

    # Token matching
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

    # Similarity scoring
    try:
        score += 40 * similar(q, title)
        score += 25 * similar(q, org)
        score += 20 * similar(q, theme)
    except Exception:
        pass

    return score

def search_data(query, data, top_k=TOP_K):
    """Search and rank problem statements"""
    scored = []
    for item in data:
        s = score_item(query, item)
        if s > 0:
            scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:top_k]]

def build_compact_context(hits):
    """Build context from search results"""
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

def get_base_url_and_model(provider):
    """Get base URL and model based on provider"""
    if provider == "OpenAI":
        return "https://api.openai.com/v1", "gpt-3.5-turbo"
    elif provider == "Groq":
        return "https://api.groq.com/openai/v1", "llama3-8b-8192"
    else:  # Default to Gemini
        return "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash-exp"

async def call_ai_api(query, hits, api_key: str, provider: str = "Gemini"):
    """Call AI API with the provided API key and provider"""
    if not api_key:
        return "🔒 **Access Denied**\n\n❌ You must provide an API key to use this chatbot.\n\n**To get started:**\n1. Get an API key from your preferred provider:\n   - **Gemini**: https://makersuite.google.com/app/apikey\n   - **OpenAI**: https://platform.openai.com/api-keys\n   - **Groq**: https://console.groq.com/keys\n\n2. Set your API key: `/setkey your_api_key_here`\n\n3. Start using the chatbot!\n\n🔐 *No data access without API key authentication.*"

    # Get base URL and model for the provider
    base_url, model = get_base_url_and_model(provider)
    
    # Initialize client with user's API key
    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
    except Exception as e:
        return f"❌ Error initializing {provider} API client: {e}"

    contexts = build_compact_context(hits)
    
    system = """You are Meera, an AI assistant specialized in helping students with Smart India Hackathon (SIH) problem statements. 
    You provide detailed explanations, implementation suggestions, and technical guidance.
    Format your responses using markdown for better readability."""
    
    user_content = (
        f"User query: {query}\n\n"
        f"Relevant Problem Statements:\n"
        f"{json.dumps(contexts, ensure_ascii=False, indent=2)}\n\n"
        "Provide a helpful, detailed response. If the user asks about a specific problem statement, "
        "explain it thoroughly including the background, expected solution, and provide implementation suggestions."
    )

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
            max_tokens=1000
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"❌ {provider} API call failed: {e}\n\nPlease check your API key and try again."

# ---- Load dataset ----
DATA = load_json(JSON_PATH)
if DATA:
    print(f"✅ Loaded {len(DATA)} problem statements")
else:
    print("⚠️ No problem statements loaded")

# ---- Chainlit Events ----

@cl.on_chat_start
async def on_chat_start():
    """Initialize chat session"""
    # Initialize session with default values
    cl.user_session.set("provider", "Gemini")
    cl.user_session.set("top_k", 3)
    cl.user_session.set("show_details", True)
    
    # Check for API key in environment (optional for development)
    api_key = os.getenv("API_KEY")
    if api_key:
        cl.user_session.set("api_key", api_key)
    
    # Send welcome message - emphasizing API key requirement
    welcome_msg = """🚀 **Welcome to SIH Chatbot - Meera**

🔒 **AUTHENTICATION REQUIRED**

This chatbot requires a valid API key to access Smart India Hackathon problem statements and provide AI-powered assistance.

**🔑 Quick Setup:**
1. **Get an API key** from your preferred provider:
   - **Gemini** (Recommended): https://makersuite.google.com/app/apikey
   - **OpenAI**: https://platform.openai.com/api-keys  
   - **Groq**: https://console.groq.com/keys

2. **Set your API key**: `/setkey your_api_key_here`

3. **Optional - Change provider**: `/provider Gemini` (or OpenAI/Groq)

**🚨 Important:** 
- No data access without API key
- All searches and responses require authentication
- Your API key is stored securely in your session

**Need help?** Type `/help` after setting your API key."""

    await cl.Message(content=welcome_msg).send()

@cl.on_message
async def main(message: cl.Message):
    """Handle user messages"""
    user_query = message.content.strip()
    
    # Handle configuration commands
    if user_query.startswith("/setkey "):
        api_key = user_query[8:].strip()
        if len(api_key) < 10:
            await cl.Message(content="❌ **Invalid API key**\n\nAPI key seems too short. Please provide a valid key.").send()
            return
        
        cl.user_session.set("api_key", api_key)
        provider = cl.user_session.get("provider", "Gemini")
        await cl.Message(
            content=f"✅ **API Key set successfully!**\n\n"
                   f"Provider: {provider}\n"
                   f"You can now get AI-powered responses. Try asking about problem statements!"
        ).send()
        return
    
    elif user_query.startswith("/provider "):
        provider = user_query[10:].strip()
        if provider.lower() == "openai":
            provider = "OpenAI"
        elif provider.lower() == "groq":
            provider = "Groq"
        else:
            provider = "Gemini"
        
        cl.user_session.set("provider", provider)
        await cl.Message(content=f"✅ **Provider set to {provider}**\n\nMake sure your API key is compatible with this provider.").send()
        return
    
    elif user_query.startswith("/results "):
        try:
            top_k = int(user_query[9:].strip())
            if 1 <= top_k <= 10:
                cl.user_session.set("top_k", top_k)
                await cl.Message(content=f"✅ **Results count set to {top_k}**").send()
            else:
                await cl.Message(content="❌ **Invalid number**\n\nPlease use a number between 1 and 10.").send()
        except ValueError:
            await cl.Message(content="❌ **Invalid format**\n\nUse: `/results 5`").send()
        return
    
    # Handle help and info commands
    elif user_query.lower() in ["/help", "help"]:
        help_msg = """📚 **SIH Chatbot Help**

**🔧 Configuration Commands:**
- `/setkey your_key` - Set API key
- `/provider Gemini` - Set AI provider (Gemini/OpenAI/Groq)
- `/results 5` - Set number of results (1-10)
- `/config` - Show current configuration

**🔍 Search Examples:**
- `healthcare` - Find healthcare-related problems
- `SIH25001` - Get details about a specific PS number
- `Ministry of Education` - Find problems from a specific organization
- `blockchain` - Find blockchain-related challenges

**📊 Information Commands:**
- `/help` - Show this help message
- `/stats` - Show dataset statistics
- `/themes` - List all available themes

**💡 Tips:**
- Be specific in your queries for better results
- Use PS numbers for exact matches
- Ask for implementation ideas after finding a problem
- Set your API key first for AI-powered responses"""

        await cl.Message(content=help_msg).send()
        return
    
    elif user_query.lower() in ["/config", "config"]:
        api_key = cl.user_session.get("api_key")
        provider = cl.user_session.get("provider", "Gemini")
        top_k = cl.user_session.get("top_k", 3)
        show_details = cl.user_session.get("show_details", True)
        
        config_info = f"""🔧 **Current Configuration:**

- **AI Provider:** {provider}
- **API Key:** {'✅ Set' if api_key else '❌ Not set'}
- **Results Count:** {top_k}
- **Show Details:** {'Yes' if show_details else 'No'}

**To update:**
- `/setkey your_api_key` - Set API key
- `/provider Gemini` - Change provider
- `/results 5` - Change result count"""
        
        await cl.Message(content=config_info).send()
        return
    
    elif user_query.lower() in ["/stats", "stats"]:
        themes = set(item.get("theme", "") for item in DATA if item.get("theme"))
        categories = set(item.get("category", "") for item in DATA if item.get("category"))
        orgs = set(item.get("organization", "") for item in DATA if item.get("organization"))
        
        await cl.Message(
            content=f"📊 **Dataset Statistics**\n\n"
                   f"- Total Problem Statements: **{len(DATA)}**\n"
                   f"- Unique Themes: **{len(themes)}**\n"
                   f"- Unique Categories: **{len(categories)}**\n"
                   f"- Participating Organizations: **{len(orgs)}**\n"
        ).send()
        return
    
    elif user_query.lower() in ["/themes", "themes"]:
        themes = sorted(set(item.get("theme", "") for item in DATA if item.get("theme")))
        theme_list = "\n".join([f"- {theme}" for theme in themes[:20]])  # Show first 20
        
        await cl.Message(
            content=f"🎯 **Available Themes:**\n\n{theme_list}\n\n*Showing first 20 themes*\n\nTry searching for any of these themes!"
        ).send()
        return
    
    # Handle regular search queries
    api_key = cl.user_session.get("api_key") or os.getenv("API_KEY")
    provider = cl.user_session.get("provider", "Gemini")
    top_k = cl.user_session.get("top_k", 3)
    
    # Search for relevant problem statements
    hits = search_data(user_query, DATA, top_k=top_k)
    
    if not hits:
        await cl.Message(
            content="❌ **No matching problem statements found.**\n\n"
                   "**Try:**\n"
                   "- Using different keywords\n"
                   "- Searching by theme (healthcare, education, etc.)\n"
                   "- Using PS numbers\n"
                   "- Type `/themes` to see available themes\n\n"
                   "**Example searches:**\n"
                   "- `healthcare`\n"
                   "- `blockchain`\n"
                   "- `SIH25001`"
        ).send()
        return
    
    # Generate response with AI API
    answer = await call_ai_api(user_query, hits, api_key, provider)
    await cl.Message(content=answer).send()