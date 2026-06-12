import sqlite3
conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute('SELECT language, COUNT(*) FROM words WHERE ai_association LIKE \'%\"word_form\"%\' GROUP BY language')
print('Words with word_form by language:', cursor.fetchall())
