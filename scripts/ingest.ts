import { getVectorStore, generateEmbedding } from '../src/lib/vectorStore';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Starting ingestion...');
  try {
    const index = await getVectorStore();
    
    console.log('Clearing old vector store...');
    await index.deleteIndex();
    await index.createIndex({
      version: 1,
      deleteIfExists: true
    });
    
    await index.beginUpdate();
    let totalProcessed = 0;

    // --- 1. Ingest Problem Statements ---
    const psDataPath = path.join(process.cwd(), 'data', 'ps_data.json');
    if (fs.existsSync(psDataPath)) {
      console.log('Found ps_data.json, ingesting Problem Statements...');
      const fileContent = fs.readFileSync(psDataPath, 'utf-8');
      const data = JSON.parse(fileContent);
      const problemStatements = data.data || [];

      for (const ps of problemStatements) {
        if (!ps.title) continue;
        const narrative = flattenPS(ps);
        const vector = await generateEmbedding(narrative);

        await index.insertItem({
          vector,
          metadata: {
            type: 'problem_statement',
            ps_number: ps.ps_number || ps.ps_id || '',
            title: ps.title,
            organization: ps.organization || '',
            text: narrative 
          }
        });
        totalProcessed++;
      }
      console.log(`Finished ingesting ${problemStatements.length} Problem Statements.`);
    } else {
      console.log('No ps_data.json found, skipping Problem Statements.');
    }

    // --- 2. Ingest General Knowledge ---
    const generalDataPath = path.join(process.cwd(), 'data', 'general_data.json');
    if (fs.existsSync(generalDataPath)) {
      console.log('Found general_data.json, ingesting General Knowledge...');
      const fileContent = fs.readFileSync(generalDataPath, 'utf-8');
      const data = JSON.parse(fileContent);
      const textChunks = data.data || [];

      for (const chunk of textChunks) {
        if (!chunk.text) continue;
        
        // Prepend the source URL to give the LLM context of where this came from
        const contextText = `Source: ${chunk.source}\nInformation: ${chunk.text}`;
        const vector = await generateEmbedding(contextText);

        await index.insertItem({
          vector,
          metadata: {
            type: 'general_knowledge',
            source: chunk.source,
            tag: chunk.tag,
            text: contextText 
          }
        });
        totalProcessed++;
      }
      console.log(`Finished ingesting ${textChunks.length} General Knowledge chunks.`);
    } else {
      console.log('No general_data.json found, skipping General Knowledge.');
    }

    await index.endUpdate();
    console.log(`\n✅ Successfully ingested ${totalProcessed} total items into the Vectra index!`);

  } catch (error) {
    console.error('Ingestion error:', error);
  }
}

function flattenPS(ps: any): string {
  // The 'category' field holds the real SIH number (e.g. "25050")
  const sihNumber = ps.category ? `SIH${ps.category}` : `SIH-${ps.ps_id || ps.ps_number}`;
  return [
    `Problem Statement ${sihNumber} (PS ID: ${ps.ps_id || ps.ps_number}) — ${ps.title}`,
    `SIH Number: ${sihNumber}`,
    `Organization: ${ps.organization}`,
    `Theme: ${ps.theme}`,
    `Category: ${ps.category}`,
    ps.background ? `Background: ${ps.background}` : '',
    ps.full_description ? `Problem: ${ps.full_description}` : '',
  ].filter(Boolean).join('\n');
}

main();
