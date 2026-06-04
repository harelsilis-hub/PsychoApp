import sqlite3

def main():
    conn = sqlite3.connect('vocabulary.db')
    cursor = conn.cursor()
    
    # Query distinct user ids that have progress in unit 11 words
    query = """
    SELECT COUNT(DISTINCT user_id) 
    FROM user_word_progress 
    JOIN words ON user_word_progress.word_id = words.id 
    WHERE words.unit = 11
    """
    
    cursor.execute(query)
    result = cursor.fetchone()
    print(f"Users with progress in unit 11 words: {result[0]}")
    
    # Query distinct user ids that have interacted with unit 11 words
    query2 = """
    SELECT COUNT(DISTINCT user_id) 
    FROM word_interaction_events 
    JOIN words ON word_interaction_events.word_id = words.id 
    WHERE words.unit = 11
    """
    try:
        cursor.execute(query2)
        result2 = cursor.fetchone()
        print(f"Users with interactions in unit 11 words: {result2[0]}")
    except Exception as e:
        pass
        
    conn.close()

if __name__ == "__main__":
    main()
