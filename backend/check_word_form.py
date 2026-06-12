import sqlite3
conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM words WHERE ai_association LIKE \'%\"word_form\"%\'')
print('Words with word_form:', cursor.fetchone()[0])
