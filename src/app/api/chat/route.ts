import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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

/**
 * Create the appropriate LLM model instance based on provider, model name, and API key.
 */
function createModelInstance(provider: string, modelName: string, apiKey: string) {
  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey });
    return openai(modelName);
  } else if (provider === 'google') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelName);
  } else {
    // Default: Groq
    const groq = createGroq({ apiKey });
    return groq(modelName);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey, apiProvider, apiModel } = body;

    const provider = apiProvider || 'groq';
    const modelName = apiModel || 'llama-3.3-70b-versatile';

    // Validate API key
    if (!apiKey) {
      return Response.json(
        { error: 'Missing API Key. Please click the Settings icon to add your API key.' },
        { status: 401 }
      );
    }

    // Extract the latest user message text for RAG search
    const lastMessage = messages[messages.length - 1];
    const latestText = lastMessage?.content || '';

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
    try {
      const queryVector = await generateEmbedding(latestText);
      const index = await getVectorStore();
      const results = await index.queryItems(queryVector, latestText, 8);

      results.forEach((r: any, i: number) => {
        contextParts.push(`[Semantic Source ${i + 1}] Score: ${r.score.toFixed(3)}\n${String(r.item.metadata.text)}`);
      });
    } catch (vecErr) {
      console.warn('Vector search failed (index might be empty):', vecErr);
    }

    const context = contextParts.join('\n\n---\n\n');

    // System prompt with RAG context
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

    // Create model instance and stream the response
    const model = createModelInstance(provider, modelName, apiKey);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      temperature: 0.2,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return Response.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
