import json
import argparse
import os

def update_img_paths(target_file, mapping_file, output_file=None):
    # Load mapping
    with open(mapping_file, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    # Load target file
    with open(target_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_count = 0
    for entry in data.get("results", []):
        old_img = entry.get("img")
        if old_img in mapping:
            entry["img"] = mapping[old_img]
            updated_count += 1

    if not output_file:
        base, ext = os.path.splitext(target_file)
        output_file = f"{base}_updated{ext}"

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"Updated {updated_count} entries.")
    print(f"Saved updated file to: {output_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update img fields in a FoundryVTT JSON file using a mapping file.")
    parser.add_argument("target_file", help="Path to the JSON file to update")
    parser.add_argument("mapping_file", help="Path to the JSON file with old:new img mappings")
    parser.add_argument("-o", "--output", help="Path to save the updated JSON file (optional)")

    args = parser.parse_args()
    update_img_paths(args.target_file, args.mapping_file, args.output)

# Example usage:
# python update-icons.py rolltables.json img_mapping.json -o updated_rolltables.json
# This will read rolltables.json, update the img paths according to img_mapping.json, and save the result to updated_rolltables.json.