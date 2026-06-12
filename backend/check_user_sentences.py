import sqlite3
import json

conn = sqlite3.connect('vocabulary.db')
cursor = conn.cursor()

cursor.execute("SELECT id FROM users WHERE email = 'yoav.shuster10@gmail.com'")
user = cursor.fetchone()
if not user:
    print('User not found')
    exit()

user_id = user[0]
print(f'User ID: {user_id}')

cursor.execute("""
    SELECT COUNT(*) FROM user_word_progress
    WHERE user_id = ? AND learning_state = 'graduated'
""", (user_id,))
graduated_count = cursor.fetchone()[0]
print(f'Graduated words: {graduated_count}')

cursor.execute("""
    SELECT COUNT(*) FROM user_word_progress uwp
    JOIN words w ON uwp.word_id = w.id
    WHERE uwp.user_id = ? 
    AND uwp.learning_state = 'graduated'
    AND w.ai_association IS NOT NULL
""", (user_id,))
with_assoc = cursor.fetchone()[0]
print(f'Graduated words with ai_association: {with_assoc}')

cursor.execute("""
    SELECT COUNT(*) FROM user_word_progress uwp
    JOIN words w ON uwp.word_id = w.id
    WHERE uwp.user_id = ? 
    AND uwp.learning_state = 'graduated'
    AND w.ai_association IS NOT NULL
    AND w.ai_association LIKE '%"word_form"%'
""", (user_id,))
with_word_form = cursor.fetchone()[0]
print(f'Graduated words with ai_association and word_form: {with_word_form}')

cursor.execute("""
    SELECT w.language, COUNT(*) FROM user_word_progress uwp
    JOIN words w ON uwp.word_id = w.id
    WHERE uwp.user_id = ? 
    AND uwp.learning_state = 'graduated'
    AND w.ai_association IS NOT NULL
    AND w.ai_association LIKE '%"word_form"%'
    GROUP BY w.language
""", (user_id,))
print('By language:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]}')
