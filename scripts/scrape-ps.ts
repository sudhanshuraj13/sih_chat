import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// IMPORTANT: Add all the SIH problem statements URLs you want to scrape here
const SIH_PS_URLS = [
  'https://sih.gov.in/sih2025PS',
  'https://sih.gov.in/sih2024PS',
  'https://sih.gov.in/sih2023PS'
];

async function scrapeSIH() {
  console.log(`Starting Playwright to scrape ${SIH_PS_URLS.length} Problem Statement URLs...`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const allProblemStatements: any[] = [];
  
  try {
    for (const url of SIH_PS_URLS) {
      if (!url.trim()) continue;
      
      console.log(`\nNavigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      console.log('Waiting for table to load...');
      try {
        await page.waitForSelector('table', { state: 'attached', timeout: 15000 });
      } catch (e) {
        console.log('Table not found within timeout, proceeding anyway...');
      }

      console.log('Extracting problem statements from table across all pages...');
      
      // Try to maximize the table rows displayed (DataTables default)
      try {
        await page.evaluate(() => {
          const selects = document.querySelectorAll('select');
          for (const select of Array.from(selects)) {
            if (select.innerText.includes('100') || select.name.includes('length')) {
              const options = Array.from(select.options);
              const maxOpt = options.find(o => o.value === '-1' || o.text.toLowerCase().includes('all')) || options[options.length - 1];
              select.value = maxOpt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
        await page.waitForTimeout(2000);
      } catch (e) {
        // Ignore if dropdown not found
      }

      let hasNextPage = true;
      let pageNumber = 1;

      while (hasNextPage) {
        const pageResults = await page.evaluate(() => {
          const results: any[] = [];
          const rows = document.querySelectorAll('table tbody tr');
          
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
              const ps_id = cells[0]?.innerText.trim() || '';
              const organization = cells[1]?.innerText.trim() || '';
              const title = cells[2]?.innerText.trim() || '';
              const category = cells[3]?.innerText.trim() || ''; 
              const theme = cells[4]?.innerText.trim() || '';
              const full_description = cells[5]?.innerText.trim() || '';

              if (ps_id && title) {
                results.push({
                  ps_id,
                  ps_number: ps_id.replace('SIH', ''),
                  title,
                  organization,
                  category,
                  theme,
                  full_description,
                  expected_solution: '', 
                  background: '',
                });
              }
            }
          });
          return results;
        });

        console.log(`  -> Extracted ${pageResults.length} problem statements from page ${pageNumber}`);
        allProblemStatements.push(...pageResults);

        // Try to click "Next" for pagination
        hasNextPage = await page.evaluate(() => {
          // Look for standard DataTables or Bootstrap "Next" buttons that are NOT disabled
          const nextBtn = document.querySelector('.paginate_button.next:not(.disabled), a.next:not(.disabled), li.next:not(.disabled) a, button.next:not([disabled])') as HTMLElement;
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });

        if (hasNextPage) {
          pageNumber++;
          await page.waitForTimeout(1500); // Wait for the next page of the table to render
        }
      }

      console.log(`Finished ${url}: Extracted a total of ${allProblemStatements.length} problem statements so far.`);
    }

    const finalData = {
      metadata: {
        total_problem_statements: allProblemStatements.length,
        last_updated: new Date().toISOString(),
        sources: SIH_PS_URLS,
        type: "problem_statements"
      },
      data: allProblemStatements
    };

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'ps_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf-8');
    
    console.log(`\n✅ Successfully saved PS data to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error during PS scraping:', error);
  } finally {
    await browser.close();
  }
}

scrapeSIH();
