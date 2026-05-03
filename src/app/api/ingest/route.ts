import { NextResponse } from 'next/server';
import { getVectorStore, generateEmbedding } from '@/lib/vectorStore';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300; // allow up to 5 minutes

export async function POST(req: Request) {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'sih_data_for_embeddings.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const problemStatements = data.problem_statements || [];

    const index = await getVectorStore();
    
    // Clear existing index if needed (or just add to it, for this script we assume start fresh)
    await index.beginUpdate();

    let processed = 0;
    for (const ps of problemStatements) {
      if (!ps.title) continue;

      // The key fix: Flattening PS into a narrative string
      const narrative = flattenPS(ps);
      const vector = await generateEmbedding(narrative);

      await index.insertItem({
        vector,
        metadata: {
          ps_number: ps.ps_number || ps.ps_id || '',
          title: ps.title,
          organization: ps.organization || '',
          category: ps.category || '',
          theme: ps.theme || '',
          year: (ps.ps_id || '').substring(0, 5),
          text: narrative // Store the text so we can inject it into the prompt
        }
      });
      processed++;
      
      // Log progress
      if (processed % 10 === 0) {
        console.log(`Ingested ${processed}/${problemStatements.length}`);
      }
    }

    await index.endUpdate();

    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function flattenPS(ps: any): string {
  const sihNumber = ps.category ? `SIH${ps.category}` : `SIH-${ps.ps_id || ps.ps_number}`;
  return [
    `Problem Statement ${sihNumber} (PS ID: ${ps.ps_id || ps.ps_number}) — ${ps.title}`,
    `SIH Number: ${sihNumber}`,
    `Organization: ${ps.organization}`,
    `Department: ${ps.department || ''}`,
    `Theme: ${ps.theme}`,
    `Category: ${ps.category}`,
    ``,
    ps.background ? `Background: ${ps.background}` : '',
    ps.full_description ? `Problem: ${ps.full_description}` : '',
    ps.expected_solution ? `Expected solution: ${ps.expected_solution}` : '',
  ].filter(Boolean).join('\n');
}
