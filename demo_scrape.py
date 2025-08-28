from bs4 import BeautifulSoup
import json
import re

def clean_text(text):
    """Clean and normalize text by removing extra whitespaces and newlines."""
    if text:
        # Remove extra whitespaces and newlines
        text = re.sub(r'\s+', ' ', text.strip())
        # Remove ellipsis artifacts
        text = re.sub(r'\.{2,}$', '', text)
    return text

def extract_problem_statements():
    print("Reading HTML file...")
    
    # Read the HTML file
    with open('sih2025.html', 'r', encoding='utf-8') as file:
        html_content = file.read()
    
    # Parse with BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    print("Extracting problem statements...")
    
    # Find the table
    table = soup.find('table')
    
    if not table:
        print("No table found in the HTML!")
        return []
    
    # Get all rows
    rows = table.find_all('tr')
    
    if not rows:
        print("No rows found in the table!")
        return []
    
    # Get headers from the first row
    header_row = rows[0]
    headers = []
    for th in header_row.find_all(['th', 'td']):
        headers.append(clean_text(th.get_text()))
    
    print(f"Found {len(headers)} columns in header row")
    
    # Debug: Print all headers
    for i, header in enumerate(headers):
        print(f"  Header {i}: '{header[:50]}...' (truncated)" if len(header) > 50 else f"  Header {i}: '{header}'")
    
    problem_statements = []
    
    # Process each data row
    for row_idx, row in enumerate(rows[1:], 1):
        cells = row.find_all(['td', 'th'])
        
        if not cells:
            continue
        
        # Debug first few rows
        if row_idx <= 3:
            print(f"\nDebug - Row {row_idx} has {len(cells)} cells")
        
        # Extract data based on the pattern you've shown
        # It seems the actual data might be in specific positions
        try:
            # Based on your output, let's map the correct columns
            # Adjusting indices based on the 17-column structure
            
            # Try to extract from the visible pattern
            ps_data = {
                'serial_no': clean_text(cells[0].get_text()) if len(cells) > 0 else '',
                'organization': clean_text(cells[1].get_text()) if len(cells) > 1 else '',
                'problem_statement_title': clean_text(cells[2].get_text()) if len(cells) > 2 else '',
                'category': clean_text(cells[3].get_text()) if len(cells) > 3 else '',
                'ps_number': clean_text(cells[4].get_text()) if len(cells) > 4 else '',
                'submitted_ideas_count': clean_text(cells[15].get_text()) if len(cells) > 15 else '0',
                'theme': clean_text(cells[16].get_text()) if len(cells) > 16 else '',
                'description': clean_text(cells[5].get_text()) if len(cells) > 5 else ''
            }
            
            # Clean up the data
            ps_data['serial_no'] = re.sub(r'[^\d]', '', ps_data['serial_no'])  # Keep only digits
            ps_data['submitted_ideas_count'] = re.sub(r'[^\d]', '', ps_data['submitted_ideas_count']) or '0'
            
            # Only add if we have meaningful data
            if ps_data['ps_number'] and ps_data['problem_statement_title']:
                problem_statements.append(ps_data)
                
                # Debug output for first few entries
                if len(problem_statements) <= 3:
                    print(f"\nExtracted PS #{len(problem_statements)}:")
                    print(f"  PS Number: {ps_data['ps_number']}")
                    print(f"  Title: {ps_data['problem_statement_title'][:80]}...")
                    print(f"  Organization: {ps_data['organization'][:50]}...")
                    
        except Exception as e:
            print(f"Error processing row {row_idx}: {e}")
            continue
    
    return problem_statements

def save_to_json(data, filename='problem_statements.json'):
    print(f"\nSaving to JSON file...")
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(data)} problem statements to {filename}")

def analyze_table_structure():
    """Analyze the table structure to understand the layout better."""
    print("Analyzing table structure...")

    with open('sih2025.html', 'r', encoding='utf-8') as file:
        html_content = file.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    table = soup.find('table')
    
    if not table:
        print("No table found!")
        return
    
    rows = table.find_all('tr')
    print(f"Total rows: {len(rows)}")
    
    # Analyze first 5 rows
    for i, row in enumerate(rows[:5]):
        cells = row.find_all(['td', 'th'])
        print(f"\nRow {i}: {len(cells)} cells")
        
        # Show first 100 chars of each cell
        for j, cell in enumerate(cells):
            text = clean_text(cell.get_text())[:100]
            print(f"  Cell {j}: {text}...")

def main():
    # First, analyze the structure
    print("=" * 60)
    analyze_table_structure()
    print("=" * 60)
    
    # Then extract the data
    problem_statements = extract_problem_statements()
    
    if problem_statements:
        save_to_json(problem_statements)
        print(f"\nDone! Found and saved {len(problem_statements)} problem statements.")
        
        # Show sample of extracted data
        print("\nSample of extracted data:")
        if problem_statements:
            sample = problem_statements[0]
            print(json.dumps(sample, indent=2, ensure_ascii=False))
    else:
        print("No problem statements were extracted.")

if __name__ == "__main__":
    main()
    