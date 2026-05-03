import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// IMPORTANT: Add general SIH URLs here (About, Guidelines, Timeline, FAQs, etc.)
const GENERAL_URLS = [
  'https://sih.gov.in/',
  'https://sih.gov.in/#process-timeline',
  'https://sih.gov.in/#sihthemes'
];

async function scrapeGeneralPages() {
  console.log(`Starting Playwright to scrape ${GENERAL_URLS.length} General URLs...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const allTextChunks: any[] = [];
  
  try {
    for (const url of GENERAL_URLS) {
      if (!url.trim()) continue;
      
      console.log(`\nNavigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      console.log('Extracting paragraphs and headings...');
      const chunks = await page.evaluate((sourceUrl) => {
        const results: any[] = [];
        
        // Target main content tags that hold valuable text
        const elements = document.querySelectorAll('h1, h2, h3, h4, p, li');
        
        elements.forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim() || '';
          // Only keep substantial chunks to avoid noise (like short menu items)
          if (text.length > 30) {
            results.push({
              source: sourceUrl,
              text: text,
              tag: el.tagName.toLowerCase()
            });
          }
        });
        
        return results;
      }, url);

      console.log(`Extracted ${chunks.length} text chunks from ${url}`);
      allTextChunks.push(...chunks);
    }

    const finalData = {
      metadata: {
        total_chunks: allTextChunks.length,
        last_updated: new Date().toISOString(),
        sources: GENERAL_URLS,
        type: "general_knowledge"
      },
      data: allTextChunks
    };

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'general_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf-8');
    
    console.log(`\n✅ Successfully saved general data to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error during general scraping:', error);
  } finally {
    await browser.close();
  }
}

scrapeGeneralPages();
