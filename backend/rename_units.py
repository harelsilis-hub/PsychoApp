import json
import os

db_path = 'database_english.json'
with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

# Create a new dict to preserve order
new_db = {}
for key, value in db.items():
    if key.startswith("Unit "):
        try:
            num = int(key.split(" ")[1])
            if num >= 12:
                new_key = f"Unit {num - 1}"
                new_db[new_key] = value
                print(f"Renamed {key} -> {new_key}")
            else:
                new_db[key] = value
        except ValueError:
            new_db[key] = value
    else:
        new_db[key] = value

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(new_db, f, ensure_ascii=False, indent=2)

print("Finished renaming units.")
