import requests
from bs4 import BeautifulSoup
import json
import time
import logging
from urllib.parse import urljoin, urlparse
from fake_useragent import UserAgent
import re
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SIHComprehensiveScraper:
    def __init__(self, base_url="https://sih.gov.in"):
        self.base_url = base_url
        self.session = requests.Session()
        self.ua = UserAgent()
        self.session.headers.update({
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.google.com/'
        })
        
        # Create data directory
        os.makedirs('data', exist_ok=True)
        
        # All SIH URLs to scrape
        self.sih_urls = {
            # Current SIH 2025
            'sih2025_homepage': '/',
            'sih2025_problem_statements': '/sih2025PS',
            'sih2025_themes': '/SIH_Themes',
            'sih2025_faqs': '/faqs',
            'sih2025_contact': '/contactUs',
            'sih2025_implementation_team': '/implementationTeam',
            'sih2025_project_implementation': '/projectImplementation',
            'sih2025_know_spoc': '/know-your-spoc',
            
            # Previous years - Problem Statements
            'sih2024_homepage': '/sih2024',
            'sih2024_problem_statements': '/sih2024PS',
            'sih2024_screening_result': '/sih2024/screeningresult',
            'sih2024_grand_finale_result': '/sih2024/sih2024-grand-finale-result',
            
            'sih2023_homepage': '/sih2023s',
            'sih2023_problem_statements': '/sih2023PS',
            'sih2023_screening_result': '/sih2023-screening-final-result',
            'sih2023_grand_finale_result': '/sih2023-grand-finale-result',
            
            'sih2022_homepage': '/sih2022s',
            'sih2022_problem_statements': '/sih2022PS',
            'sih2022_screening_result': '/sih2022-prescreening-result',
            
            # Junior editions
            'sih2022_junior': '/sih2022-prescreening-result-Jr',
            
            # Guidelines and documents
            'guidelines_college_spoc': '/letters/Guidelines-how-to-apply-college.pdf',
            'idea_presentation_format': '/letters/SIH2025-IDEA-Presentation-Format.pptx',
            
            # Results and winners
            'all_results': '/results',
        }

    def safe_request(self, url, max_retries=3):
        """Make a safe HTTP request with retries"""
        for attempt in range(max_retries):
            try:
                # Rotate user agent
                self.session.headers['User-Agent'] = self.ua.random
                
                full_url = urljoin(self.base_url, url)
                logging.info(f"Fetching: {full_url}")
                
                response = self.session.get(full_url, timeout=15)
                response.raise_for_status()
                
                return response
                
            except Exception as e:
                logging.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logging.error(f"Failed to fetch {url} after {max_retries} attempts")
                    return None

    def extract_problem_statements_table(self, soup, year="2025"):
        """Extract problem statements from data table"""
        problem_statements = []
        
        # Look for different table IDs used across years
        table_ids = ['dataTablePS', 'dataTable', 'problemStatementsTable']
        table = None
        
        for table_id in table_ids:
            table = soup.find('table', {'id': table_id})
            if table:
                break
        
        if not table:
            # Fallback: look for any table with problem statements
            tables = soup.find_all('table')
            for t in tables:
                if 'problem' in str(t).lower() or 'statement' in str(t).lower():
                    table = t
                    break
        
        if not table:
            logging.warning(f"No problem statements table found for {year}")
            return []
        
        tbody = table.find('tbody')
        if not tbody:
            tbody = table
            
        rows = tbody.find_all('tr')
        logging.info(f"Found {len(rows)} rows in problem statements table for {year}")
        
        for row_idx, row in enumerate(rows):
            try:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 5:  # Minimum columns expected
                    continue
                
                # Extract basic info (adjust based on table structure)
                ps_data = {
                    'year': year,
                    'serial_no': self.clean_text(cells[0].get_text()) if len(cells) > 0 else '',
                    'organization': self.clean_text(cells[1].get_text()) if len(cells) > 1 else '',
                    'problem_statement_title': '',
                    'category': self.clean_text(cells[3].get_text()) if len(cells) > 3 else '',
                    'ps_number': self.clean_text(cells[4].get_text()) if len(cells) > 4 else '',
                    'theme': self.clean_text(cells[6].get_text()) if len(cells) > 6 else '',
                    'details': {}
                }
                
                # Extract problem statement title and modal link
                if len(cells) > 2:
                    title_cell = cells[2]
                    title_link = title_cell.find('a')
                    if title_link:
                        ps_data['problem_statement_title'] = self.clean_text(title_link.get_text())
                        
                        # Extract modal details if available
                        if title_link.has_attr('data-target'):
                            modal_id = title_link['data-target'].lstrip('#')
                            modal = soup.find('div', id=modal_id)
                            if modal:
                                ps_data['details'] = self.extract_modal_details(modal)
                    else:
                        ps_data['problem_statement_title'] = self.clean_text(title_cell.get_text())
                
                problem_statements.append(ps_data)
                
            except Exception as e:
                logging.error(f"Error processing row {row_idx} for {year}: {e}")
                continue
        
        logging.info(f"Successfully extracted {len(problem_statements)} problem statements for {year}")
        return problem_statements

    def extract_modal_details(self, modal):
        """Extract detailed information from modal dialogs"""
        details = {}
        
        try:
            modal_body = modal.find('div', class_='modal-body') or modal
            
            # Extract from table structure
            rows = modal_body.find_all('tr')
            for row in rows:
                th = row.find('th')
                td = row.find('td')
                
                if th and td:
                    key = self.clean_text(th.get_text()).lower().replace(' ', '_').replace(':', '')
                    value = self.clean_text(td.get_text())
                    
                    if key and value:
                        details[key] = value
            
            # Extract from paragraphs if no table structure
            if not details:
                paragraphs = modal_body.find_all('p')
                for p in paragraphs:
                    text = self.clean_text(p.get_text())
                    if ':' in text:
                        parts = text.split(':', 1)
                        if len(parts) == 2:
                            key = parts[0].strip().lower().replace(' ', '_')
                            value = parts[1].strip()
                            details[key] = value
            
        except Exception as e:
            logging.warning(f"Error extracting modal details: {e}")
        
        return details

    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        cleaned = re.sub(r'\s+', ' ', str(text)).strip()
        cleaned = re.sub(r'[^\x20-\x7E\u00A0-\uFFFF]', '', cleaned)
        return cleaned

    def extract_page_content(self, soup, url):
        """Extract general content from any page"""
        content = {
            'url': url,
            'title': '',
            'meta_description': '',
            'headings': [],
            'paragraphs': [],
            'lists': [],
            'tables': [],
            'links': [],
            'images': []
        }
        
        try:
            # Title
            title_tag = soup.find('title')
            if title_tag:
                content['title'] = self.clean_text(title_tag.get_text())
            
            # Meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                content['meta_description'] = meta_desc.get('content', '')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Headings
            for i in range(1, 7):
                for heading in soup.find_all(f'h{i}'):
                    text = self.clean_text(heading.get_text())
                    if text:
                        content['headings'].append({
                            'level': i,
                            'text': text
                        })
            
            # Paragraphs
            for p in soup.find_all('p'):
                text = self.clean_text(p.get_text())
                if len(text) > 30:  # Only substantial content
                    content['paragraphs'].append(text)
            
            # Lists
            for ul in soup.find_all(['ul', 'ol']):
                items = []
                for li in ul.find_all('li'):
                    item_text = self.clean_text(li.get_text())
                    if item_text:
                        items.append(item_text)
                if items:
                    content['lists'].append(items)
            
            # Links
            for a in soup.find_all('a', href=True):
                link_text = self.clean_text(a.get_text())
                href = a.get('href')
                if link_text and href:
                    content['links'].append({
                        'text': link_text,
                        'href': href,
                        'full_url': urljoin(self.base_url, href)
                    })
            
            # Images
            for img in soup.find_all('img', src=True):
                alt_text = img.get('alt', '')
                src = img.get('src')
                if src:
                    content['images'].append({
                        'src': urljoin(self.base_url, src),
                        'alt': alt_text
                    })
            
        except Exception as e:
            logging.error(f"Error extracting content from {url}: {e}")
        
        return content

    def scrape_all_sih_data(self):
        """Scrape all SIH data comprehensively"""
        all_data = {
            'scrape_timestamp': datetime.now().isoformat(),
            'base_url': self.base_url,
            'pages': {},
            'problem_statements': {
                '2025': [],
                '2024': [],
                '2023': [],
                '2022': []
            },
            'summary': {}
        }
        
        total_urls = len(self.sih_urls)
        processed = 0
        
        for page_name, url_path in self.sih_urls.items():
            try:
                processed += 1
                logging.info(f"Processing {processed}/{total_urls}: {page_name}")
                
                # Skip documents for now (can be downloaded separately)
                if url_path.endswith(('.pdf', '.pptx', '.doc', '.docx')):
                    all_data['pages'][page_name] = {
                        'type': 'document',
                        'url': urljoin(self.base_url, url_path),
                        'note': 'Document file - requires separate download'
                    }
                    continue
                
                response = self.safe_request(url_path)
                if not response:
                    continue
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract general page content
                page_content = self.extract_page_content(soup, url_path)
                all_data['pages'][page_name] = page_content
                
                # Special processing for problem statements pages
                if 'problem_statements' in page_name or 'PS' in url_path:
                    year = '2025'  # default
                    if '2024' in page_name:
                        year = '2024'
                    elif '2023' in page_name:
                        year = '2023'
                    elif '2022' in page_name:
                        year = '2022'
                    
                    ps_data = self.extract_problem_statements_table(soup, year)
                    if ps_data:
                        all_data['problem_statements'][year].extend(ps_data)
                
                # Be respectful to the server
                time.sleep(1)
                
            except Exception as e:
                logging.error(f"Error processing {page_name}: {e}")
                continue
        
        # Generate summary
        all_data['summary'] = {
            'total_pages_scraped': len([p for p in all_data['pages'].values() if 'error' not in p]),
            'total_problem_statements': sum(len(ps) for ps in all_data['problem_statements'].values()),
            'problem_statements_by_year': {
                year: len(ps) for year, ps in all_data['problem_statements'].items()
            }
        }
        
        return all_data

    def save_data(self, data, filename='sih_complete_dataset.json'):
        """Save scraped data to JSON file"""
        filepath = os.path.join('data', filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logging.info(f"Data saved to {filepath}")
        return filepath

def main():
    """Main function to run comprehensive scraping"""
    scraper = SIHComprehensiveScraper()
    
    print("🚀 Starting comprehensive SIH website scraping...")
    print("📊 This will scrape:")
    print("   - All current SIH 2025 pages")
    print("   - Previous years' problem statements (2022-2024)")
    print("   - Results, themes, FAQs, guidelines")
    print("   - All organizational data")
    print()
    
    # Scrape all data
    complete_data = scraper.scrape_all_sih_data()
    
    # Save complete dataset
    filepath = scraper.save_data(complete_data)
    
    # Save problem statements separately for easy access
    ps_only = {
        'timestamp': complete_data['scrape_timestamp'],
        'problem_statements': complete_data['problem_statements'],
        'total_count': complete_data['summary']['total_problem_statements']
    }
    ps_filepath = scraper.save_data(ps_only, 'sih_problem_statements_all_years.json')
    
    # Print summary
    print("\n" + "="*60)
    print("🎉 SIH COMPREHENSIVE SCRAPING COMPLETE")
    print("="*60)
    print(f"📁 Complete dataset: {filepath}")
    print(f"📋 Problem statements only: {ps_filepath}")
    print()
    print("📊 Summary:")
    print(f"   • Total pages scraped: {complete_data['summary']['total_pages_scraped']}")
    print(f"   • Total problem statements: {complete_data['summary']['total_problem_statements']}")
    print()
    print("🗓️ Problem statements by year:")
    for year, count in complete_data['summary']['problem_statements_by_year'].items():
        if count > 0:
            print(f"   • {year}: {count} problem statements")
    
    print(f"\n✅ Ready for RAG implementation!")
    print(f"📂 Data files saved in: ./data/")

if __name__ == "__main__":
    main()