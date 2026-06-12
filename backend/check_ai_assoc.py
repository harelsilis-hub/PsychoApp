import sqlite3
conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute('SELECT language, COUNT(*) FROM words WHERE ai_association IS NOT NULL GROUP BY language')
print('Words with ai_association by language:', cursor.fetchall())
