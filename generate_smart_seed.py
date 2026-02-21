"""
Generate seed file with authentic psychometric vocabulary.
Assigns difficulty ranks based on word frequency and complexity.
"""
import sys
import re

# Fix Windows encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Common word prefixes and suffixes that indicate difficulty
ADVANCED_PREFIXES = ['pre', 'post', 'anti', 'circum', 'contra', 'intra', 'extra', 'ultra']
ADVANCED_SUFFIXES = ['tion', 'ment', 'ness', 'ity', 'ism', 'ous', 'ious', 'eous']

# Very common basic words (should be easiest)
BASIC_WORDS = {
    'a', 'about', 'above', 'across', 'after', 'against', 'all', 'almost', 'also', 'although',
    'always', 'among', 'an', 'and', 'another', 'any', 'are', 'around', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by',
    'can', 'could', 'do', 'down', 'during', 'each', 'even', 'every', 'few', 'first',
    'for', 'from', 'get', 'give', 'go', 'good', 'great', 'had', 'has', 'have', 'he',
    'her', 'here', 'him', 'his', 'how', 'if', 'in', 'into', 'is', 'it', 'its',
    'just', 'know', 'last', 'like', 'long', 'look', 'make', 'man', 'many', 'may',
    'me', 'more', 'most', 'much', 'must', 'my', 'new', 'no', 'not', 'now', 'of',
    'on', 'one', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'people',
    'say', 'see', 'she', 'should', 'so', 'some', 'such', 'take', 'than', 'that',
    'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'time', 'to', 'too', 'two', 'under', 'up', 'use', 'very', 'want',
    'was', 'way', 'we', 'well', 'were', 'what', 'when', 'where', 'which', 'while',
    'who', 'will', 'with', 'would', 'year', 'you', 'your',
    'able', 'accept', 'add', 'age', 'air', 'allow', 'answer', 'appear', 'area',
    'ask', 'back', 'become', 'begin', 'believe', 'best', 'better', 'big', 'black',
    'body', 'book', 'bring', 'build', 'business', 'call', 'car', 'carry', 'case',
    'cause', 'certain', 'change', 'child', 'city', 'clear', 'close', 'come',
    'common', 'consider', 'country', 'course', 'cover', 'create', 'cut', 'day',
    'deal', 'decide', 'develop', 'die', 'different', 'early', 'easy', 'eat',
    'end', 'enough', 'enter', 'entire', 'event', 'ever', 'face', 'fact', 'fall',
    'family', 'far', 'feel', 'field', 'find', 'follow', 'form', 'four', 'free',
    'friend', 'full', 'game', 'general', 'girl', 'group', 'grow', 'hand', 'happen',
    'hard', 'head', 'health', 'hear', 'help', 'high', 'hold', 'home', 'hope',
    'hour', 'house', 'however', 'idea', 'important', 'include', 'increase',
    'information', 'interest', 'issue', 'job', 'keep', 'kind', 'large', 'late',
    'later', 'lead', 'learn', 'leave', 'left', 'less', 'let', 'letter', 'level',
    'life', 'light', 'line', 'list', 'little', 'live', 'local', 'lose', 'lot',
    'love', 'low', 'matter', 'mean', 'meet', 'member', 'might', 'mind', 'minute',
    'miss', 'moment', 'money', 'month', 'move', 'name', 'national', 'near',
    'need', 'never', 'next', 'night', 'number', 'occur', 'offer', 'office',
    'often', 'old', 'once', 'open', 'order', 'others', 'part', 'party', 'pass',
    'past', 'pay', 'person', 'place', 'plan', 'play', 'point', 'possible',
    'power', 'present', 'president', 'price', 'private', 'problem', 'process',
    'produce', 'program', 'provide', 'public', 'put', 'question', 'quite',
    'range', 'rate', 'reach', 'read', 'ready', 'real', 'really', 'reason',
    'receive', 'recent', 'recognize', 'record', 'reduce', 'region', 'remain',
    'remember', 'report', 'require', 'research', 'result', 'return', 'right',
    'rise', 'road', 'role', 'room', 'rule', 'run', 'same', 'school', 'second',
    'seem', 'sell', 'send', 'sense', 'serve', 'service', 'set', 'several',
    'short', 'show', 'side', 'similar', 'simple', 'since', 'site', 'situation',
    'small', 'social', 'something', 'sometimes', 'sort', 'sound', 'source',
    'space', 'speak', 'special', 'spend', 'staff', 'stand', 'start', 'state',
    'still', 'stop', 'story', 'student', 'study', 'subject', 'success', 'support',
    'sure', 'system', 'table', 'tell', 'tend', 'term', 'test', 'thank', 'thing',
    'think', 'though', 'thought', 'three', 'today', 'together', 'top', 'toward',
    'town', 'trade', 'try', 'turn', 'type', 'understand', 'until', 'value',
    'various', 'view', 'visit', 'voice', 'wait', 'walk', 'wall', 'war', 'watch',
    'water', 'week', 'whether', 'white', 'whole', 'why', 'wide', 'wife', 'win',
    'woman', 'word', 'work', 'world', 'worry', 'write', 'wrong', 'yes', 'yet',
    'young'
}

def calculate_difficulty_score(english_word):
    """Calculate difficulty score (0-100, higher = harder)"""
    word = english_word.lower().strip()
    score = 0

    # Base score: word length (very strong indicator)
    length = len(word)
    if length <= 4:
        score += 5
    elif length <= 6:
        score += 15
    elif length <= 8:
        score += 30
    elif length <= 10:
        score += 50
    elif length <= 12:
        score += 70
    else:
        score += 85

    # Very common basic words should be easiest
    if word in BASIC_WORDS:
        score = max(0, score - 40)

    # Advanced prefixes
    for prefix in ADVANCED_PREFIXES:
        if word.startswith(prefix):
            score += 15
            break

    # Advanced suffixes
    for suffix in ADVANCED_SUFFIXES:
        if word.endswith(suffix):
            score += 10
            break

    # Words with hyphens or spaces are often phrases (medium difficulty)
    if '-' in word or ' ' in word:
        score += 5

    # Multiple syllables (estimated by vowel clusters)
    vowels = re.findall(r'[aeiou]+', word)
    syllable_count = len(vowels)
    if syllable_count >= 4:
        score += 20
    elif syllable_count >= 3:
        score += 10

    # Words with uncommon letter combinations
    rare_combos = ['gh', 'ph', 'qu', 'x', 'z']
    for combo in rare_combos:
        if combo in word:
            score += 5

    # Cap at 100
    return min(100, score)

# Read clean words
words = []
with open('psychometric_words_clean.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            parts = line.split('\t')
            if len(parts) == 2:
                words.append({
                    'english': parts[0],
                    'hebrew': parts[1]
                })

print(f"Loaded {len(words)} words")

# Calculate difficulty scores
for word in words:
    word['difficulty_score'] = calculate_difficulty_score(word['english'])

# Sort by difficulty score (easiest first)
words.sort(key=lambda w: (w['difficulty_score'], w['english'].lower()))

print("\nEasiest 10 words:")
for i, word in enumerate(words[:10], 1):
    print(f"{i}. {word['english']} → {word['hebrew']} (score: {word['difficulty_score']})")

print("\nHardest 10 words:")
for i, word in enumerate(words[-10:], len(words)-9):
    print(f"{i}. {word['english']} → {word['hebrew']} (score: {word['difficulty_score']})")

# Select 400 words distributed across difficulty range
TOTAL_WORDS = 400
step = len(words) // TOTAL_WORDS
selected_words = [words[i] for i in range(0, len(words), step)][:TOTAL_WORDS]

print(f"\nSelected {len(selected_words)} words distributed across difficulty range")

# Assign difficulty ranks (1-100) based on position in sorted list
for i, word in enumerate(selected_words):
    # Map 0-399 to 1-100 evenly
    rank = int((i / len(selected_words)) * 100) + 1
    rank = min(rank, 100)
    word['rank'] = rank
    word['level'] = (rank - 1) // 5 + 1

# Generate Python seed file
output = '''"""
Seed script for Israeli Psychometric Entrance Test vocabulary.
Populates database with 400 authentic psychometric words.
Difficulty ranks assigned based on word frequency and linguistic complexity.
Difficulty mapping: 1-20 levels with difficulty_rank 1-100 (Level = ceil(difficulty_rank / 5)).
"""
import asyncio
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word


# 400 authentic Israeli Psychometric Test words
# Sorted by difficulty: easy to hard
# Distributed across 20 levels using difficulty_rank 1-100
# Level = ceil(difficulty_rank / 5) → Level 1: ranks 1-5, Level 2: ranks 6-10, ..., Level 20: ranks 96-100
PSYCHOMETRIC_WORDS = [
'''

# Add words with level comments
current_level = 0
for i, word in enumerate(selected_words):
    eng = word['english']
    heb = word['hebrew']
    rank = word['rank']
    level = word['level']

    # Add level comment when level changes
    if level != current_level:
        output += f'\n    # ===== LEVEL {level} (ranks {((level-1)*5)+1}-{level*5}) =====\n'
        current_level = level

    output += f'    {{"english": "{eng}", "hebrew": "{heb}", "difficulty_rank": {rank}}},\n'

output += ''']


async def seed_words(session: AsyncSession):
    """Seed the database with authentic Israeli Psychometric Test vocabulary."""
    print("\\n[SEEDING] Starting Israeli Psychometric vocabulary seeding...")

    # Clear existing words
    print("[INFO] Wiping existing word database...")
    await session.execute(delete(Word))
    await session.commit()
    print("[CLEARED] All existing words deleted.")

    # Insert authentic psychometric words
    words_added = 0
    for word_data in PSYCHOMETRIC_WORDS:
        word = Word(
            english=word_data["english"],
            hebrew=word_data["hebrew"],
            difficulty_rank=word_data["difficulty_rank"]
        )
        session.add(word)
        words_added += 1

    await session.commit()
    print(f"[SUCCESS] Added {words_added} authentic psychometric words to database.")

    # Verify seeding
    stmt = select(Word)
    result = await session.execute(stmt)
    total_words = len(result.scalars().all())
    print(f"[VERIFY] Total words in database: {total_words}")

    # Show difficulty distribution by level (1-20)
    print("\\n[DISTRIBUTION] Words by level (1-20):")
    print("  (Level = ceil(difficulty_rank / 5))")
    print()

    for level in range(1, 21):
        min_rank = (level - 1) * 5 + 1
        max_rank = level * 5
        stmt = select(Word).where(
            Word.difficulty_rank >= min_rank,
            Word.difficulty_rank <= max_rank
        )
        result = await session.execute(stmt)
        count = len(result.scalars().all())
        print(f"  Level {level:2d} (ranks {min_rank:2d}-{max_rank:3d}): {count} words")


async def main():
    """Main function to run the seeder."""
    print("=" * 70)
    print("🇮🇱 ISRAELI PSYCHOMETRIC ENTRANCE TEST VOCABULARY SEEDER 🇮🇱")
    print("=" * 70)

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed the data
    async with AsyncSessionLocal() as session:
        await seed_words(session)

    print("\\n[COMPLETE] Database populated with authentic psychometric vocabulary!")
    print("=" * 70)
    print("\\n✅ Your app is now ready with authentic test preparation words.")
    print("📚 Students can now practice with real psychometric exam vocabulary!")
    print("🎯 Difficulty assigned by word frequency and linguistic complexity")
    print("🎯 System configured for 20-level precision (Level = ceil(difficulty_rank / 5))")


if __name__ == "__main__":
    # Handle Windows encoding for Hebrew text
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    asyncio.run(main())
'''

# Write seed file
with open('backend/app/seed_psychometric_data.py', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\n✅ Generated new seed file with {len(selected_words)} authentic psychometric words!")
print(f"📊 Distribution: ~20 words per level across 20 levels")
print(f"📊 Difficulty based on: word length, frequency, linguistic complexity")
print(f"📁 File: backend/app/seed_psychometric_data.py")
print("\nNext steps:")
print("1. Run: cd backend && python -m app.seed_psychometric_data")
print("2. Test the placement test with properly-leveled words!")
