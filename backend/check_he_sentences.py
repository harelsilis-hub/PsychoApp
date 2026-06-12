import sqlite3
import json

conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute("SELECT english, hebrew, ai_association FROM words WHERE language = 'he' AND ai_association IS NOT NULL LIMIT 5")
rows = cursor.fetchall()
with open('hebrew_words.txt', 'w', encoding='utf-8') as f:
    for row in rows:
        f.write(f"Word: {row[0]}\nTranslation: {row[1]}\nSentence: {row[2]}\n\n")
