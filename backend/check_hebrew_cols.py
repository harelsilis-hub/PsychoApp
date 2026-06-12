import sqlite3
conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute("SELECT english, hebrew FROM words WHERE language = 'he' LIMIT 5")
print(cursor.fetchall())
