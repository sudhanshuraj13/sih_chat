import json

input_file = "problem_statements_cleaned.json"
output_file = "software.json"

# Keys we already have at the parent level and want to remove from details
DUPLICATE_KEYS = {
    "organization",
    "category",
    "theme",
    "ps_number",
    "problem_statement_title"
}

def clean_entry(entry):
    """Remove duplicate keys from 'details' that are already in parent."""
    details = entry.get("details", {})
    if isinstance(details, dict):
        cleaned_details = {}
        for k, v in details.items():
            # keep only if not duplicate
            if k not in DUPLICATE_KEYS:
                cleaned_details[k] = v
        entry["details"] = cleaned_details
    return entry

# Load JSON
with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

software_entries = []
seen_ids = set()
seen_titles = set()

for item in data:
    if item.get("category", "").strip().lower() == "software":
        details = item.get("details", {})
        ps_id = details.get("problem_statement_id")
        ps_title = details.get("problem_statement_title")

        # Avoid duplicates across list
        if ps_id not in seen_ids and ps_title not in seen_titles:
            cleaned_item = clean_entry(item)
            software_entries.append(cleaned_item)
            seen_ids.add(ps_id)
            seen_titles.add(ps_title)

# Save cleaned result
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(software_entries, f, indent=2, ensure_ascii=False)

print(f"✅ Cleaned and saved {len(software_entries)} software problem statements into {output_file}")
