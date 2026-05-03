import { streamText, convertToModelMessages } from 'ai';
import { createGroq, groq } from '@ai-sdk/groq';
import { getVectorStore, generateEmbedding } from '@/lib/vectorStore';
import fs from 'fs';
import path from 'path';

/**
 * Extract SIH-style IDs from a query string (e.g. "SIH25050", "25050", "sih 25050")
 */
function extractSIHNumbers(query: string): string[] {
  const patterns = [
    /SIH\s*(\d{4,6})/gi,   // "SIH25050" or "SIH 25050"
    /\b(25\d{3})\b/g,       // bare "25050" (SIH2025 format)
    /\b(1[5-9]\d{2,3})\b/g, // older format like "1526"
  ];
  const ids = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      ids.add(match[1]);
    }
  }
  return Array.from(ids);
}

/**
 * Find problem statements by exact SIH number from the raw JSON data files.
 * This bypasses vector search entirely for precise ID lookups.
 */
function findPSByExactId(sihNumbers: string[]): string[] {
  const results: string[] = [];
  const psDataPath = path.join(process.cwd(), 'data', 'ps_data.json');

  if (!fs.existsSync(psDataPath)) return results;

  const data = JSON.parse(fs.readFileSync(psDataPath, 'utf-8'));
  const items = data.data || [];

  for (const ps of items) {
    const category = String(ps.category || '');
    const psId = String(ps.ps_id || '');
    const psNumber = String(ps.ps_number || '');

    for (const sihNum of sihNumbers) {
      if (category === sihNum || psId === sihNum || psNumber === sihNum) {
        const sihLabel = `SIH${category}`;
        const narrative = [
          `Problem Statement ${sihLabel} (PS ID: ${psId}) — ${ps.title}`,
          `SIH Number: ${sihLabel}`,
          `Organization: ${ps.organization}`,
          `Theme: ${ps.theme}`,
          `Category: ${ps.category}`,
          ps.full_description ? `Full Description: ${ps.full_description}` : '',
          ps.expected_solution ? `Expected Solution: ${ps.expected_solution}` : '',
          ps.background ? `Background: ${ps.background}` : '',
        ].filter(Boolean).join('\n');
        results.push(narrative);
      }
    }
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // AI SDK v6: UIMessages use 'parts' array, extract text from the latest message
    const lastMessage = messages[messages.length - 1];
    const latestText =
      lastMessage.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join(' ') ||
      lastMessage.content ||
      '';

    // --- HYBRID SEARCH ---
    const contextParts: string[] = [];

    // Step 1: Exact ID match (fast, precise)
    const sihNumbers = extractSIHNumbers(latestText);
    if (sihNumbers.length > 0) {
      const exactMatches = findPSByExactId(sihNumbers);
      exactMatches.forEach((text, i) => {
        contextParts.push(`[EXACT MATCH ${i + 1}]\n${text}`);
      });
    }

    // Step 2: Semantic vector search (broad, meaning-based)
    const queryVector = await generateEmbedding(latestText);
    const index = await getVectorStore();
    const results = await index.queryItems(queryVector, latestText, 8);

    results.forEach((r, i) => {
      contextParts.push(`[Semantic Source ${i + 1}] Score: ${r.score.toFixed(3)}\n${String(r.item.metadata.text)}`);
    });

    const context = contextParts.join('\n\n---\n\n');

    // System prompt
    const systemPrompt = `You are an expert Smart India Hackathon (SIH) advisory assistant.

CRITICAL RULES:
1. **ONLY use information from the CONTEXT below** - DO NOT hallucinate problem statements.
2. If context has the answer, provide a highly professional, well-structured response with full details.
3. If the context doesn't have the answer (e.g., they ask for a PS number not in the context), DO NOT say "I don't have this in my database". Instead, respond professionally like this:
   "I currently don't see [Topic/PS Number] listed in the official Smart India Hackathon catalog I have access to. It's possible the statement was recently updated or withdrawn. However, I'd be happy to help you explore other problem statements related to [Related Theme] or search by specific technologies and domains."
4. When talking about problem statements, ALWAYS include their PS Number (e.g., SIH25001), Theme, and Organization.
5. Prioritize EXACT MATCH results over Semantic Source results.

CONTEXT:
${context}
`;

    // Convert UIMessages to model messages and stream LLM Response
    const modelMessages = await convertToModelMessages(messages);

    const apiKey = req.headers.get('x-groq-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing Groq API Key. Please click the Settings icon to add your API key." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groq = createGroq({ apiKey });

    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
