from bs4 import BeautifulSoup
import json

def scrape_problem_statements(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find the main table
    table = soup.find('table', id='dataTablePS')
    if not table:
        print("Table not found!")
        return []
    
    # Debug: Check table headers to understand structure
    headers = table.find('thead').find_all('th') if table.find('thead') else []
    print("Table headers found:")
    for i, header in enumerate(headers):
        print(f"  Column {i}: '{header.get_text(strip=True)}'")
    print()
    
    rows = table.find('tbody').find_all('tr')
    problems = []
    
    # Debug: Print first row to check column structure
    if rows:
        first_row_cols = rows[0].find_all('td')
        print(f"Debug - First row has {len(first_row_cols)} columns:")
        for i, col in enumerate(first_row_cols):
            print(f"  Column {i}: '{col.get_text(strip=True)[:50]}...'")
        print()
    
    for row in rows:
        # Find the link that opens modal - this should be in the "Problem Statement Title" column
        link = row.find('a', {'data-toggle': 'modal'})
        
        if link:
            title_summary = link.get_text(strip=True)
            modal_target = link['data-target'].lstrip('#')
            
            # Find corresponding modal
            modal = soup.find('div', id=modal_target)
            
            # Get detailed title and description from modal
            if modal:
                # Look for title
                title_th = modal.find('th', string=lambda x: x and 'Problem Statement Title' in x)
                if title_th and title_th.find_next_sibling('td'):
                    title_cell = title_th.find_next_sibling('td')
                    style_div = title_cell.find('div', class_='style-2')
                    detailed_title = style_div.get_text(strip=True) if style_div else title_cell.get_text(strip=True)
                else:
                    detailed_title = "Title not available"
                
                # Look for description  
                desc_th = modal.find('th', string=lambda x: x and 'Description' in x)
                if desc_th and desc_th.find_next_sibling('td'):
                    desc_cell = desc_th.find_next_sibling('td')
                    desc_div = desc_cell.find('div', class_='style-2')
                    description = desc_div.get_text(strip=True, separator='\n') if desc_div else desc_cell.get_text(strip=True, separator='\n')
                else:
                    description = "Description not available"
            else:
                detailed_title = "Modal not found"
                description = "Modal not found"
            
            # Get other info from table columns - let's be more careful about this
            cols = row.find_all('td')
            
            # Instead of guessing indices, let's extract based on position of the link
            link_column_index = None
            for i, col in enumerate(cols):
                if col.find('a', {'data-toggle': 'modal'}):
                    link_column_index = i
                    break
            
            # Now extract data based on the link position
            if link_column_index is not None:
                # Based on your image: S.No(0), Organization(1), Problem Title(2), Category(3), PS Number(4), Ideas(5), Theme(6)
                if link_column_index == 2:  # Link is in Problem Title column
                    s_no = cols[0].get_text(strip=True) if len(cols) > 0 else "Unknown"
                    org = cols[1].get_text(strip=True) if len(cols) > 1 else "Unknown"
                    cat = cols[3].get_text(strip=True) if len(cols) > 3 else "Unknown"
                    ps_num = cols[4].get_text(strip=True) if len(cols) > 4 else "Unknown"
                    submitted_ideas = cols[5].get_text(strip=True) if len(cols) > 5 else "Unknown"
                    theme = cols[6].get_text(strip=True) if len(cols) > 6 else "Unknown"
                else:
                    # Fallback - print what we found
                    print(f"Link found in unexpected column {link_column_index}")
                    s_no = org = cat = ps_num = submitted_ideas = theme = "Unknown"
            else:
                s_no = org = cat = ps_num = submitted_ideas = theme = "Unknown"
            
            # Store everything
            problem_data = {
                's_no': s_no,
                'ps_number': ps_num,
                'organization': org,
                'category': cat,
                'theme': theme,
                'submitted_ideas': submitted_ideas,
                'title_summary': title_summary,
                'title_detailed': detailed_title,
                'description': description
            }
            
            problems.append(problem_data)
    
    return problems

def main():
    print("Reading HTML file...")
    
    with open('sih2025.html', 'r', encoding='utf-8') as file:
        html_data = file.read()
    
    print("Extracting problem statements...")
    all_problems = scrape_problem_statements(html_data)
    
    print("Saving to JSON file...")
    with open('problem_statements.json', 'w', encoding='utf-8') as json_file:
        json.dump(all_problems, json_file, indent=2, ensure_ascii=False)
    
    print(f"Done! Found and saved {len(all_problems)} problem statements.")

if __name__ == "__main__":
    main()