import sqlite3
import requests
import time
import re

DB_PATH = "vocabulary.db"

def fetch_sentence_for_word(word):
    # Use Tatoeba API
    url = f"https://dev.tatoeba.org/en/api_v0/search?from=eng&to=&query={word}"
    headers = {
        'User-Agent': 'PsychoApp-Script/1.0'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data.get("results"):
            for result in data["results"]:
                text = result.get("text", "")
                
                # Check if the word is actually in the sentence (whole word match)
                pattern = re.compile(rf"\b{re.escape(word)}\b", re.IGNORECASE)
                if pattern.search(text):
                    # Replace the word with "_______"
                    blanked_sentence = pattern.sub("_______", text)
                    return text, blanked_sentence
    except Exception as e:
        print(f"Error fetching '{word}': {e}")
    return None, None

def main():
    print("Connecting to local database (vocabulary.db)...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # We will put the blanked sentence in ai_association
    cur.execute("SELECT id, english FROM words WHERE ai_association IS NULL AND language = 'en'")
    words = cur.fetchall()
    
    print(f"Found {len(words)} words missing sentences.")
    
    updates = []
    
    # We will test on just 10 words first to see the quality
    test_words = words[:10]
    print(f"\n--- Testing on {len(test_words)} words ---")
    
    for word_id, english in test_words:
        # Some words have multiple parts like "for example"
        search_word = english.split(" -")[0].strip() # Clean psychometric formats
        search_word = search_word.split("(")[0].strip()
        
        print(f"Fetching for: {search_word}")
        orig_sentence, blanked = fetch_sentence_for_word(search_word)
        
        if blanked:
            print(f"  Found: {orig_sentence}")
            print(f"  Saved: {blanked}")
            updates.append((blanked, word_id))
        else:
            print("  No suitable sentence found.")
        
        # Respect Tatoeba API rate limit
        time.sleep(1.5)
        
    print(f"\nSuccess: Found sentences for {len(updates)} out of {len(test_words)} tested words.")
    
    if updates:
        cur.executemany("UPDATE words SET ai_association = ? WHERE id = ?", updates)
        conn.commit()
        print("Saved to local database! (You can run the full list by modifying the script later)")
        
    conn.close()

if __name__ == "__main__":
    main()
