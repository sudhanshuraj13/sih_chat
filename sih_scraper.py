import json
import re
from bs4 import BeautifulSoup, NavigableString

def clean_text(text):
    if text:
        return re.sub(r'\s+', ' ', text).strip()
    return ""

def parse_modal_text(modal_soup):
    details = {}
    if not modal_soup:
        return details

 
    detail_rows = modal_soup.find_all('tr')
    
    for row in detail_rows:
        header_tag = row.find('th')
        data_tag = row.find('td')
        
        if header_tag and data_tag:
            key = clean_text(header_tag.get_text()).lower().replace(' ', '_')
         
            if key == 'description':
             
                description_div = data_tag.find('div', class_='style-2')
                if description_div:
         
                    for br in description_div.find_all("br"):
                        br.replace_with("\n")
                    
                    full_text = clean_text(description_div.get_text())
                    
       
                    parts = re.split(r'(Background|Expected Solution)', full_text)
                    
                 
                    details['problem_statement'] = clean_text(parts[0].replace('Problem Statement', ''))
                    
               
                    for i in range(1, len(parts), 2):
                        section_key = clean_text(parts[i]).lower().replace(' ', '_')
                        section_value = clean_text(parts[i+1])
                        details[section_key] = section_value
            else:
 
                details[key] = clean_text(data_tag.get_text())

    return details


def extract_problem_statements(html_file_path='sih2025.html'):
    print("Reading HTML file...")
    try:
        with open(html_file_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
    except FileNotFoundError:
        print(f"Error: The file '{html_file_path}' was not found.")
        return []

    soup = BeautifulSoup(html_content, 'html.parser')
    
    print("Extracting problem statements with the definitive parsing logic...")
    
    problem_statements = []
    
    table_body = soup.find('table', {'id': 'dataTablePS'}).find('tbody')
    if not table_body:
        print("Error: Could not find the main table body (tbody) with id='dataTablePS'.")
        return []
        
    rows = table_body.find_all('tr')
    print(f"Found {len(rows)} problem statements in the table.")

    for row_idx, row in enumerate(rows, 1):
        cells = row.find_all('td', recursive=False)
        if len(cells) < 7:
            continue

        serial_no = clean_text(cells[0].get_text())
        organization = clean_text(cells[1].get_text())
        title_tag = cells[2].find('a')
        problem_statement_title = clean_text(title_tag.get_text()) if title_tag else "N/A"
        category = clean_text(cells[3].get_text())
        ps_number = clean_text(cells[4].get_text())
        submitted_ideas_count = clean_text(cells[5].get_text())
        theme = clean_text(cells[6].get_text())
        
        modal_details = {}
        if title_tag and title_tag.has_attr('data-target'):
            modal_id = title_tag['data-target'].lstrip('#')
            modal_soup = soup.find('div', id=modal_id)
            if modal_soup:
                modal_details = parse_modal_text(modal_soup)
        
        problem_statements.append({
            "serial_no": serial_no,
            "organization": organization,
            "problem_statement_title": problem_statement_title,
            "category": category,
            "ps_number": ps_number,
            "submitted_ideas_count": submitted_ideas_count,
            "theme": theme,
            "details": modal_details
        })

    return problem_statements

def main():
    """Main function to run the scraper."""
    problem_statements = extract_problem_statements()
    
    if problem_statements:
        output_file = 'problem_statements_cleaned.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(problem_statements, f, indent=2, ensure_ascii=False)
        print(f"\nSuccess! Saved {len(problem_statements)} entries to '{output_file}'")
        
        print("\nSample of the first extracted item:")
        print(json.dumps(problem_statements[0], indent=2, ensure_ascii=False))
    else:
        print("\nNo problem statements were extracted.")

if __name__ == "__main__":
    main()
