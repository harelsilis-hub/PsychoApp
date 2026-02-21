"""
Create PERFECT seed with EXACTLY 400 words using ALL authentic psychometric vocabulary.
Uses sophisticated difficulty scoring on actual CSV data.
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

# Most common English words (should be easiest)
COMMON_WORDS = {
    'about', 'above', 'accept', 'across', 'add', 'admit', 'affect', 'after', 'against',
    'agree', 'allow', 'also', 'among', 'another', 'answer', 'appear', 'apply', 'approach',
    'area', 'around', 'ask', 'attack', 'attempt', 'avoid', 'back', 'become', 'before',
    'begin', 'behind', 'believe', 'below', 'between', 'beyond', 'both', 'bring', 'build',
    'call', 'carry', 'cause', 'central', 'certain', 'change', 'choose', 'clear', 'close',
    'come', 'common', 'consider', 'contain', 'continue', 'control', 'could', 'course',
    'cover', 'create', 'current', 'decide', 'depend', 'describe', 'design', 'develop',
    'direct', 'during', 'early', 'either', 'enough', 'entire', 'establish', 'even',
    'ever', 'every', 'example', 'expect', 'explain', 'face', 'fact', 'fall', 'family',
    'feel', 'field', 'figure', 'final', 'find', 'follow', 'force', 'form', 'former',
    'forward', 'four', 'full', 'general', 'give', 'govern', 'great', 'ground', 'group',
    'hand', 'happen', 'have', 'head', 'help', 'high', 'hold', 'home', 'house', 'however',
    'human', 'idea', 'image', 'important', 'include', 'increase', 'interest', 'involve',
    'issue', 'keep', 'kind', 'know', 'large', 'last', 'late', 'later', 'lead', 'learn',
    'least', 'leave', 'left', 'less', 'level', 'life', 'likely', 'line', 'list', 'little',
    'local', 'long', 'look', 'lose', 'love', 'main', 'major', 'make', 'many', 'market',
    'matter', 'mean', 'meet', 'member', 'method', 'might', 'mind', 'minute', 'miss',
    'moment', 'month', 'more', 'most', 'mother', 'move', 'much', 'must', 'name',
    'nation', 'national', 'near', 'need', 'never', 'next', 'night', 'number',
    'occur', 'offer', 'office', 'often', 'once', 'only', 'open', 'order', 'other',
    'over', 'part', 'party', 'pass', 'past', 'people', 'period', 'person', 'place',
    'plan', 'play', 'point', 'policy', 'political', 'position', 'possible', 'power',
    'present', 'president', 'price', 'private', 'probably', 'problem', 'process',
    'produce', 'program', 'provide', 'public', 'purpose', 'question', 'quite',
    'range', 'rate', 'reach', 'read', 'ready', 'real', 'really', 'reason', 'receive',
    'recent', 'recognize', 'record', 'reduce', 'region', 'remain', 'remember', 'remove',
    'report', 'require', 'research', 'resource', 'respond', 'result', 'return', 'right',
    'rise', 'road', 'role', 'room', 'rule', 'same', 'school', 'second', 'section',
    'seem', 'sell', 'send', 'sense', 'series', 'serious', 'serve', 'service', 'several',
    'short', 'should', 'show', 'side', 'significant', 'similar', 'simple', 'simply',
    'since', 'single', 'site', 'situation', 'small', 'social', 'society', 'some',
    'someone', 'something', 'sometimes', 'soon', 'sort', 'source', 'south', 'space',
    'speak', 'special', 'specific', 'spend', 'staff', 'stand', 'standard', 'start',
    'state', 'still', 'stop', 'story', 'street', 'strong', 'student', 'study', 'subject',
    'success', 'such', 'suggest', 'support', 'sure', 'system', 'table', 'take', 'talk',
    'team', 'tell', 'tend', 'term', 'test', 'than', 'thank', 'their', 'them', 'themselves',
    'then', 'theory', 'there', 'these', 'they', 'thing', 'think', 'third', 'this', 'those',
    'though', 'thought', 'thousand', 'three', 'through', 'throughout', 'time', 'today',
    'together', 'tonight', 'toward', 'town', 'trade', 'traditional', 'training', 'treat',
    'treatment', 'trial', 'true', 'truth', 'turn', 'type', 'under', 'understand', 'union',
    'until', 'upon', 'usually', 'value', 'various', 'very', 'view', 'visit', 'voice',
    'wait', 'walk', 'wall', 'want', 'watch', 'water', 'week', 'weight', 'well', 'west',
    'what', 'whatever', 'when', 'where', 'whether', 'which', 'while', 'white', 'whole',
    'whose', 'wide', 'wife', 'will', 'window', 'within', 'without', 'woman', 'wonder',
    'word', 'work', 'worker', 'world', 'worry', 'would', 'write', 'writer', 'wrong',
    'yard', 'year', 'young', 'your', 'yourself'
}

def calculate_difficulty(english_word):
    """Calculate difficulty score (0-100)"""
    word = english_word.lower().strip()
    score = 0

    # Word length (primary factor)
    length = len(word)
    if length <= 4:
        score += 0
    elif length <= 5:
        score += 10
    elif length <= 6:
        score += 20
    elif length <= 7:
        score += 30
    elif length <= 8:
        score += 40
    elif length <= 9:
        score += 50
    elif length <= 10:
        score += 60
    elif length <= 11:
        score += 70
    elif length <= 12:
        score += 80
    else:
        score += 90

    # Common word penalty (make very common words easiest)
    if word in COMMON_WORDS:
        score = max(0, score - 30)

    # Advanced suffixes
    advanced_suffixes = ['tion', 'sion', 'ment', 'ness', 'ance', 'ence', 'ity', 'ism', 'ous', 'ious', 'eous', 'ive']
    for suffix in advanced_suffixes:
        if word.endswith(suffix):
            score += 15
            break

    # Advanced prefixes
    advanced_prefixes = ['pre', 'post', 'anti', 'contra', 'inter', 'trans', 'sub', 'super', 'ultra', 'pseudo']
    for prefix in advanced_prefixes:
        if word.startswith(prefix) and len(word) > len(prefix) + 2:
            score += 10
            break

    # Uncommon letters
    uncommon = ['q', 'x', 'z', 'j']
    for letter in uncommon:
        if letter in word:
            score += 5

    # Multiple syllables (estimated)
    vowel_groups = re.findall(r'[aeiou]+', word)
    syllables = len(vowel_groups)
    if syllables >= 4:
        score += 20
    elif syllables >= 3:
        score += 10

    return min(100, max(0, score))

# Load words
words = []
with open('psychometric_words_clean.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line:
            parts = line.split('\t')
            if len(parts) == 2:
                english = parts[0].strip()
                hebrew = parts[1].strip()

                # Quality filters
                if (english and hebrew and
                    3 <= len(english) <= 20 and  # Reasonable length
                    english.count(' ') <= 1 and  # Max 2-word phrases
                    not any(c.isdigit() for c in english)):  # No numbers

                    words.append({
                        'english': english,
                        'hebrew': hebrew,
                        'difficulty': calculate_difficulty(english)
                    })

print(f"Loaded {len(words)} valid words")

# Sort by difficulty
words.sort(key=lambda w: (w['difficulty'], w['english'].lower()))

print(f"\nEasiest 10:")
for i, w in enumerate(words[:10], 1):
    print(f"{i:2d}. {w['english']:20s} → {w['hebrew']:25s} (score: {w['difficulty']:3d})")

print(f"\nHardest 10:")
for i, w in enumerate(words[-10:], len(words)-9):
    print(f"{i:4d}. {w['english']:20s} → {w['hebrew']:25s} (score: {w['difficulty']:3d})")

# Select EXACTLY 400 words evenly distributed
total_words = len(words)
step = total_words / 400.0

selected = []
for i in range(400):
    idx = int(i * step)
    if idx < len(words):
        selected.append(words[idx])

# Assign ranks: EXACTLY 20 words per level
for i, word in enumerate(selected):
    level = (i // 20) + 1  # 0-19 → level 1, 20-39 → level 2, etc.
    position_in_level = i % 20
    rank = ((level - 1) * 5) + 1 + (position_in_level % 5)

    word['rank'] = rank
    word['level'] = level

print(f"\n✅ Selected {len(selected)} words")

# Verify distribution
level_counts = {}
for word in selected:
    level = word['level']
    level_counts[level] = level_counts.get(level, 0) + 1

print("\n📊 Distribution verification:")
all_perfect = True
for level in range(1, 21):
    count = level_counts.get(level, 0)
    status = "✅" if count == 20 else "❌"
    print(f"  Level {level:2d}: {count:2d} words {status}")
    if count != 20:
        all_perfect = False

if all_perfect:
    print("\n✅ PERFECT: 20 words × 20 levels = 400 total")
else:
    print("\n❌ ERROR: Distribution not perfect!")
    sys.exit(1)

# Generate seed file
output = '''"""
Seed script for Israeli Psychometric Entrance Test vocabulary.
STRICT CURATED VERSION:
- EXACTLY 400 authentic psychometric words from source CSV
- EXACTLY 20 words per level across 20 levels
- Authentic Hebrew translations from test prep materials
- Difficulty calculated by word complexity, frequency, and structure
"""
import asyncio
import sys
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.word import Word


# 400 AUTHENTIC Israeli Psychometric Test words
# PERFECT distribution: 20 levels × 20 words = 400
# Difficulty progression: easiest → hardest
# Level = ceil(difficulty_rank / 5)
PSYCHOMETRIC_WORDS = [
'''

current_level = 0
for word in selected:
    level = word['level']
    rank = word['rank']

    if level != current_level:
        output += f'\n    # ===== LEVEL {level} (ranks {((level-1)*5)+1}-{level*5}) - EXACTLY 20 WORDS =====\n'
        current_level = level

    output += f'    {{"english": "{word["english"]}", "hebrew": "{word["hebrew"]}", "difficulty_rank": {rank}}},\n'

output += ''']


async def seed_words(session: AsyncSession):
    """Seed database with EXACTLY 400 authentic psychometric words."""
    print("\\n" + "=" * 70)
    print("🇮🇱 STRICT PSYCHOMETRIC VOCABULARY SEEDER 🇮🇱")
    print("=" * 70)

    # Clear existing words
    print("[INFO] Clearing existing words...")
    await session.execute(delete(Word))
    await session.commit()
    print("[CLEARED] ✅ Database wiped clean")

    # Insert words
    print(f"[SEEDING] Inserting {len(PSYCHOMETRIC_WORDS)} authentic words...")
    for word_data in PSYCHOMETRIC_WORDS:
        word = Word(
            english=word_data["english"],
            hebrew=word_data["hebrew"],
            difficulty_rank=word_data["difficulty_rank"]
        )
        session.add(word)

    await session.commit()
    print(f"[SUCCESS] ✅ Inserted {len(PSYCHOMETRIC_WORDS)} words")

    # Verify count
    stmt = select(Word)
    result = await session.execute(stmt)
    total = len(result.scalars().all())

    if total != 400:
        print(f"[ERROR] ❌ Expected 400, found {total}")
    else:
        print(f"[VERIFY] ✅ Perfect count: {total} words")

    # Verify distribution
    print("\\n[DISTRIBUTION] Verifying 20 words per level:")
    all_good = True
    for level in range(1, 21):
        min_rank = (level - 1) * 5 + 1
        max_rank = level * 5
        stmt = select(Word).where(
            Word.difficulty_rank >= min_rank,
            Word.difficulty_rank <= max_rank
        )
        result = await session.execute(stmt)
        count = len(result.scalars().all())
        status = "✅" if count == 20 else "❌"
        print(f"  Level {level:2d} (ranks {min_rank:2d}-{max_rank:3d}): {count:2d} words {status}")
        if count != 20:
            all_good = False

    if all_good:
        print("\\n[SUCCESS] ✅✅✅ PERFECT DISTRIBUTION: 20 words × 20 levels = 400")
    else:
        print("\\n[ERROR] ❌ Distribution not perfect")


async def main():
    """Main seeder function."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_words(session)

    print("\\n" + "=" * 70)
    print("✅ SEEDING COMPLETE - DATABASE READY")
    print("=" * 70)


if __name__ == "__main__":
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

    asyncio.run(main())
'''

with open('backend/app/seed_psychometric_data.py', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\n✅✅✅ PERFECT seed file created!")
print(f"📁 Location: backend/app/seed_psychometric_data.py")
print(f"📊 Distribution: EXACTLY 20 words × 20 levels = 400 total")
print(f"🎯 Difficulty: Properly scored and distributed")
print(f"🇮🇱 Translations: Authentic from source CSV")
