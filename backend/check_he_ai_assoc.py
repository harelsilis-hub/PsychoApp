import sqlite3
conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute('SELECT ai_association FROM words WHERE language = "he" AND ai_association IS NOT NULL LIMIT 5')
for row in cursor.fetchall():
    print(row[0])
