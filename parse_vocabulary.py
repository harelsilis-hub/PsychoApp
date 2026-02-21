"""
Parse psychometric vocabulary from CSV and prepare for database seeding.
"""
import csv
import sys
import re

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Read the CSV file using proper CSV parsing
words = []
with open('psychometric_words.csv.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        # Skip empty rows
        if not row or all(not cell.strip() for cell in row):
            continue

        # Process pairs: english,hebrew,english,hebrew...
        for i in range(0, len(row), 2):
            if i + 1 < len(row):
                english = row[i].strip()
                hebrew = row[i + 1].strip()

                # Skip empty pairs or invalid entries
                if english and hebrew and len(english) > 1:
                    # Clean up english word (remove numbers, parentheses for main word)
                    english_clean = re.sub(r'^\d+\.?\s*', '', english).strip()  # Remove leading numbers
                    english_clean = english_clean.split('(')[0].strip()  # Remove parentheses
                    english_clean = english_clean.split('/')[0].strip()  # Take first option if multiple

                    # Clean up hebrew (take first translation if multiple, remove numbers)
                    hebrew_clean = re.sub(r'^\d+\.?\s*', '', hebrew).strip()
                    hebrew_clean = hebrew_clean.split(',')[0].strip()  # Take first translation

                    if english_clean and hebrew_clean and len(english_clean) > 1:
                        words.append({
                            'english': english_clean,
                            'hebrew': hebrew_clean
                        })

# Remove duplicates (keep first occurrence)
seen = set()
unique_words = []
for word in words:
    key = word['english'].lower()
    if key not in seen:
        seen.add(key)
        unique_words.append(word)

print(f"Total words extracted: {len(words)}")
print(f"Unique words: {len(unique_words)}")
print("\nFirst 20 words:")
for i, word in enumerate(unique_words[:20], 1):
    print(f"{i}. {word['english']} → {word['hebrew']}")

print("\nLast 10 words:")
for i, word in enumerate(unique_words[-10:], len(unique_words)-9):
    print(f"{i}. {word['english']} → {word['hebrew']}")

# Save to a clean file
with open('psychometric_words_clean.txt', 'w', encoding='utf-8') as f:
    for word in unique_words:
        f.write(f"{word['english']}\t{word['hebrew']}\n")

print(f"\nClean word list saved to: psychometric_words_clean.txt")
print(f"Ready to create seed file with {len(unique_words)} authentic psychometric words!")
