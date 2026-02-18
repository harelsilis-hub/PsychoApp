"""Test script for Sorting Hat API endpoints."""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 70)
print("TESTING SORTING HAT API ENDPOINTS")
print("=" * 70)

# Test 1: Start placement test
print("\n[TEST 1] Starting placement test...")
response = requests.post(
    f"{BASE_URL}/api/v1/sorting/start",
    json={"user_id": 1}
)
print(f"Status: {response.status_code}")
if response.status_code == 201:
    data = response.json()
    print(json.dumps(data, indent=2))
    session_id = data['session']['id']
    first_word = data['word']
    print(f"\n[OK] Placement test started!")
    print(f"Session ID: {session_id}")
    print(f"First word: {first_word['english']} (difficulty: {first_word['difficulty_rank']})")
else:
    print(f"[ERROR] Failed: {response.text}")
    exit(1)

# Test 2: Submit answer (user knows the word)
print("\n[TEST 2] Submitting answer: Known")
response = requests.post(
    f"{BASE_URL}/api/v1/sorting/answer?user_id=1",
    json={"is_known": True}
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Question count: {data['session']['question_count']}")
    print(f"Current range: [{data['session']['current_min']}, {data['session']['current_max']}]")
    if not data['is_complete']:
        next_word = data['word']
        print(f"Next word: {next_word['english']} (difficulty: {next_word['difficulty_rank']})")
        print(f"Message: {data['message']}")
    print("[OK] Answer submitted successfully!")
else:
    print(f"[ERROR] Failed: {response.text}")

# Test 3: Submit another answer (user doesn't know the word)
print("\n[TEST 3] Submitting answer: Unknown")
response = requests.post(
    f"{BASE_URL}/api/v1/sorting/answer?user_id=1",
    json={"is_known": False}
)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Question count: {data['session']['question_count']}")
    print(f"Current range: [{data['session']['current_min']}, {data['session']['current_max']}]")
    if not data['is_complete']:
        next_word = data['word']
        print(f"Next word: {next_word['english']} (difficulty: {next_word['difficulty_rank']})")
        print(f"Message: {data['message']}")
    print("[OK] Answer submitted successfully!")
else:
    print(f"[ERROR] Failed: {response.text}")

# Test 4: Get active session
print("\n[TEST 4] Getting active session...")
response = requests.get(f"{BASE_URL}/api/v1/sorting/session/1")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, indent=2))
    print("[OK] Session retrieved successfully!")
else:
    print(f"[ERROR] Failed: {response.text}")

# Test 5: Simulate full placement test
print("\n[TEST 5] Simulating full placement test (user knows words up to 60)...")
target_level = 60
question_count = 0
max_questions = 20

while question_count < max_questions:
    # Get current session to know next word
    response = requests.get(f"{BASE_URL}/api/v1/sorting/session/1")
    if response.status_code != 200:
        break

    session = response.json()
    if not session['is_active']:
        print(f"\n[COMPLETE] Test finished!")
        print(f"Final level: {session['final_level']}")
        print(f"Questions asked: {session['question_count']}")
        break

    # Calculate midpoint to simulate the word
    mid = (session['current_min'] + session['current_max']) // 2

    # Simulate answer based on target level
    is_known = mid <= target_level

    # Submit answer
    response = requests.post(
        f"{BASE_URL}/api/v1/sorting/answer?user_id=1",
        json={"is_known": is_known}
    )

    if response.status_code == 200:
        data = response.json()
        question_count = data['session']['question_count']

        if data['is_complete']:
            print(f"\n[COMPLETE] Placement test finished!")
            print(f"Final level: {data['session']['final_level']}")
            print(f"Target level: {target_level}")
            print(f"Accuracy: ±{abs(data['session']['final_level'] - target_level)} levels")
            print(f"Total questions: {question_count}")
            break
        else:
            print(f"Q{question_count}: Range [{data['session']['current_min']}, {data['session']['current_max']}]", end="")
            if data['word']:
                print(f" -> Word difficulty: {data['word']['difficulty_rank']}")
    else:
        print(f"[ERROR] Failed at question {question_count + 1}")
        break

print("\n" + "=" * 70)
print("[SUCCESS] ALL API TESTS COMPLETED!")
print("=" * 70)
