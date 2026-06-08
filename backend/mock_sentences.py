import sqlite3
import json

db_path = "./vocabulary.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

mock_data = [
    {
        "word": "about",
        "json": {"sentence": "We talked about the movie for hours.", "word_form": "about"}
    },
    {
        "word": "both",
        "json": {"sentence": "They both decided to go to the park.", "word_form": "both"}
    },
    {
        "word": "like",
        "json": {"sentence": "She looks just like her older sister.", "word_form": "like"}
    },
    {
        "word": "especially",
        "json": {"sentence": "I love sweet things, especially chocolate cake.", "word_form": "especially"}
    },
    {
        "word": "however",
        "json": {"sentence": "The test was hard; however, I still passed.", "word_form": "however"}
    },
    {
        "word": "certainly",
        "json": {"sentence": "She will certainly win the race with that speed.", "word_form": "certainly"}
    },
    {
        "word": "mainly",
        "json": {"sentence": "The audience consisted mainly of teenagers.", "word_form": "mainly"}
    },
    {
        "word": "indeed",
        "json": {"sentence": "It is very cold indeed today.", "word_form": "indeed"}
    },
    {
        "word": "of course",
        "json": {"sentence": "You can borrow my book, of course.", "word_form": "of course"}
    },
    {
        "word": "in fact",
        "json": {"sentence": "He is not angry; in fact, he is quite happy.", "word_form": "in fact"}
    }
]

for item in mock_data:
    cur.execute(
        "UPDATE words SET ai_association = ? WHERE english = ?",
        (json.dumps(item["json"]), item["word"])
    )

conn.commit()
print("Inserted 10 mock JSON sentences!")
