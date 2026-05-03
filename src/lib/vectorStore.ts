import { pipeline, env } from '@xenova/transformers';
import { LocalIndex } from 'vectra';
import path from 'path';

// Disable local models since we will download from hub
env.allowLocalModels = false;
env.useBrowserCache = false;

// Create a singleton for the embedding pipeline to avoid reloading
let embedderInstance: any = null;

export async function getEmbedder() {
  if (!embedderInstance) {
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderInstance;
}

export async function getVectorStore() {
  const indexPath = path.join(process.cwd(), '.vectra');
  const index = new LocalIndex(indexPath);
  
  if (!await index.isIndexCreated()) {
    await index.createIndex({
      version: 1,
      deleteIfExists: true
    });
  }
  
  return index;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
