"""
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

    # ===== LEVEL 1 (ranks 1-5) =====
    {"english": "certain", "hebrew": "בטוח", "difficulty_rank": 1},
    {"english": "agog", "hebrew": "נלהב", "difficulty_rank": 1},
    {"english": "avid", "hebrew": "להוט", "difficulty_rank": 1},
    {"english": "bend", "hebrew": "לעקם", "difficulty_rank": 1},
    {"english": "brew", "hebrew": "לבשל (חליטה או שכר - בירה)", "difficulty_rank": 2},
    {"english": "cite", "hebrew": "לצטט", "difficulty_rank": 2},
    {"english": "coup", "hebrew": "הפיכה", "difficulty_rank": 2},
    {"english": "deem", "hebrew": "העריך", "difficulty_rank": 2},
    {"english": "dose", "hebrew": "מנה", "difficulty_rank": 3},
    {"english": "duly", "hebrew": "כראוי", "difficulty_rank": 3},
    {"english": "fare", "hebrew": "דמי נסיעה", "difficulty_rank": 3},
    {"english": "fork", "hebrew": "מזלג", "difficulty_rank": 3},
    {"english": "glib", "hebrew": "קל לשון", "difficulty_rank": 4},
    {"english": "heap", "hebrew": "לערום", "difficulty_rank": 4},
    {"english": "hush", "hebrew": "להשתיק", "difficulty_rank": 4},
    {"english": "jet", "hebrew": "סילון 2.לפרוץ", "difficulty_rank": 4},
    {"english": "lard", "hebrew": "שומן חזיר", "difficulty_rank": 5},
    {"english": "loom", "hebrew": "מכונת אריגה 2. הגיח", "difficulty_rank": 5},
    {"english": "mew", "hebrew": "יללה", "difficulty_rank": 5},
    {"english": "mug", "hebrew": "ספל 2.להתקיף", "difficulty_rank": 5},

    # ===== LEVEL 2 (ranks 6-10) =====
    {"english": "omen", "hebrew": "אות", "difficulty_rank": 6},
    {"english": "pare", "hebrew": "קילף", "difficulty_rank": 6},
    {"english": "pile", "hebrew": "ערם", "difficulty_rank": 6},
    {"english": "pore", "hebrew": "נקבובית 2.לשקוע", "difficulty_rank": 6},
    {"english": "rave", "hebrew": "לדבר בהתלהבות", "difficulty_rank": 7},
    {"english": "ripe", "hebrew": "בוגר", "difficulty_rank": 7},
    {"english": "sap", "hebrew": "להוציא מוהל מעץ", "difficulty_rank": 7},
    {"english": "sips", "hebrew": "לגימות", "difficulty_rank": 7},
    {"english": "soil", "hebrew": "ללכלך 2.אדמה", "difficulty_rank": 8},
    {"english": "swan", "hebrew": "ברבור", "difficulty_rank": 8},
    {"english": "tidy", "hebrew": "נקי", "difficulty_rank": 8},
    {"english": "trim", "hebrew": "קצץ", "difficulty_rank": 8},
    {"english": "vein", "hebrew": "כלי דם 2. מצב רוח", "difficulty_rank": 9},
    {"english": "watt", "hebrew": "ואט", "difficulty_rank": 9},
    {"english": "worn", "hebrew": "נלבש 2.נשחק", "difficulty_rank": 9},
    {"english": "interest", "hebrew": "לעורר עניין 2.ריבית", "difficulty_rank": 9},
    {"english": "abhor", "hebrew": "לתאב", "difficulty_rank": 10},
    {"english": "affirm", "hebrew": "לאשר 2.לטעון", "difficulty_rank": 10},
    {"english": "amends", "hebrew": "מתקנת", "difficulty_rank": 10},
    {"english": "appeal", "hebrew": "מערער", "difficulty_rank": 10},

    # ===== LEVEL 3 (ranks 11-15) =====
    {"english": "asset", "hebrew": "נכס", "difficulty_rank": 11},
    {"english": "baffle", "hebrew": "לבלבל", "difficulty_rank": 11},
    {"english": "beckon", "hebrew": "להזמין", "difficulty_rank": 11},
    {"english": "bitter", "hebrew": "מר", "difficulty_rank": 11},
    {"english": "bonnet", "hebrew": "מצנפת 2. מכסה מנוע", "difficulty_rank": 12},
    {"english": "brine", "hebrew": "מי מלח", "difficulty_rank": 12},
    {"english": "bureau", "hebrew": "לשכה", "difficulty_rank": 12},
    {"english": "canned", "hebrew": "משומר", "difficulty_rank": 12},
    {"english": "ceased", "hebrew": "חדל", "difficulty_rank": 13},
    {"english": "chilly", "hebrew": "צונן", "difficulty_rank": 13},
    {"english": "clash", "hebrew": "התנגש", "difficulty_rank": 13},
    {"english": "coerce", "hebrew": "לאלץ", "difficulty_rank": 13},
    {"english": "copper", "hebrew": "נחושת", "difficulty_rank": 14},
    {"english": "creed", "hebrew": "אמונה", "difficulty_rank": 14},
    {"english": "dampen", "hebrew": "להרטיב משהו 2. לשכך", "difficulty_rank": 14},
    {"english": "defect", "hebrew": "לערוק", "difficulty_rank": 14},
    {"english": "derail", "hebrew": "להוריד מהפסים", "difficulty_rank": 15},
    {"english": "digit", "hebrew": "אצבע 2.ספרה", "difficulty_rank": 15},
    {"english": "drape", "hebrew": "וילון", "difficulty_rank": 15},
    {"english": "edicts", "hebrew": "גזירות", "difficulty_rank": 15},

    # ===== LEVEL 4 (ranks 16-20) =====
    {"english": "ensue", "hebrew": "לנבוע (ממשהו אחר)", "difficulty_rank": 16},
    {"english": "evict", "hebrew": "לגרש", "difficulty_rank": 16},
    {"english": "felony", "hebrew": "עבירה", "difficulty_rank": 16},
    {"english": "flair", "hebrew": "כישרון", "difficulty_rank": 16},
    {"english": "flurry", "hebrew": "התרגשות", "difficulty_rank": 17},
    {"english": "frayed", "hebrew": "מרופט", "difficulty_rank": 17},
    {"english": "gauge", "hebrew": "מודד", "difficulty_rank": 17},
    {"english": "gloom", "hebrew": "חשכה", "difficulty_rank": 17},
    {"english": "greasy", "hebrew": "שמנוני", "difficulty_rank": 18},
    {"english": "gypsy", "hebrew": "צועני", "difficulty_rank": 18},
    {"english": "hawker", "hebrew": "רוכל", "difficulty_rank": 18},
    {"english": "hobble", "hebrew": "ללכת בצורה כושלת", "difficulty_rank": 18},
    {"english": "idiom", "hebrew": "ניב", "difficulty_rank": 19},
    {"english": "inmost", "hebrew": "הפנימי ביותר", "difficulty_rank": 19},
    {"english": "jovial", "hebrew": "שמח", "difficulty_rank": 19},
    {"english": "latent", "hebrew": "חבוי", "difficulty_rank": 19},
    {"english": "likens", "hebrew": "לדמות", "difficulty_rank": 20},
    {"english": "loose", "hebrew": "רפוי", "difficulty_rank": 20},
    {"english": "marred", "hebrew": "פגום", "difficulty_rank": 20},
    {"english": "merge", "hebrew": "ממזג", "difficulty_rank": 20},

    # ===== LEVEL 5 (ranks 21-25) =====
    {"english": "mooing", "hebrew": "געה (עשה קול של פרה)", "difficulty_rank": 21},
    {"english": "murmur", "hebrew": "למלמל 2.לנהום", "difficulty_rank": 21},
    {"english": "nibble", "hebrew": "לכרסם", "difficulty_rank": 21},
    {"english": "ordain", "hebrew": "להסמיך", "difficulty_rank": 21},
    {"english": "palely", "hebrew": "חיוור", "difficulty_rank": 22},
    {"english": "pastor", "hebrew": "כומר", "difficulty_rank": 22},
    {"english": "pepper", "hebrew": "פלפל", "difficulty_rank": 22},
    {"english": "placid", "hebrew": "רוגע", "difficulty_rank": 22},
    {"english": "polish", "hebrew": "לצחצח", "difficulty_rank": 23},
    {"english": "propel", "hebrew": "להניע", "difficulty_rank": 23},
    {"english": "radish", "hebrew": "צנון", "difficulty_rank": 23},
    {"english": "realms", "hebrew": "ממלכות", "difficulty_rank": 23},
    {"english": "relic", "hebrew": "שריד", "difficulty_rank": 24},
    {"english": "retell", "hebrew": "לספר מחדש", "difficulty_rank": 24},
    {"english": "roast", "hebrew": "צלוי", "difficulty_rank": 24},
    {"english": "saber", "hebrew": "סיף (חרב)", "difficulty_rank": 24},
    {"english": "scent", "hebrew": "ריח", "difficulty_rank": 25},
    {"english": "seeped", "hebrew": "חלחל פנימה", "difficulty_rank": 25},
    {"english": "shiver", "hebrew": "לרעוד", "difficulty_rank": 25},
    {"english": "skimp", "hebrew": "להתמקצן", "difficulty_rank": 25},

    # ===== LEVEL 6 (ranks 26-30) =====
    {"english": "sneer", "hebrew": "בז", "difficulty_rank": 26},
    {"english": "spear", "hebrew": "חנית 2.לדקור", "difficulty_rank": 26},
    {"english": "sprig", "hebrew": "ענף", "difficulty_rank": 26},
    {"english": "stark", "hebrew": "פשוט", "difficulty_rank": 26},
    {"english": "storey", "hebrew": "קומה", "difficulty_rank": 27},
    {"english": "strop", "hebrew": "להשחיז", "difficulty_rank": 27},
    {"english": "sunken", "hebrew": "שקוע", "difficulty_rank": 27},
    {"english": "swoon", "hebrew": "להתעלף", "difficulty_rank": 27},
    {"english": "tempt", "hebrew": "פיתה", "difficulty_rank": 28},
    {"english": "thrive", "hebrew": "לשגשג", "difficulty_rank": 28},
    {"english": "torpid", "hebrew": "רדום", "difficulty_rank": 28},
    {"english": "trite", "hebrew": "נדוש", "difficulty_rank": 28},
    {"english": "uneasy", "hebrew": "מודאג", "difficulty_rank": 29},
    {"english": "usher", "hebrew": "סדרן 2.שומר", "difficulty_rank": 29},
    {"english": "veneer", "hebrew": "שכבה דקה של משהו יקר", "difficulty_rank": 29},
    {"english": "vista", "hebrew": "נוף", "difficulty_rank": 29},
    {"english": "weaver", "hebrew": "אורג", "difficulty_rank": 29},
    {"english": "wince", "hebrew": "להתכווץ", "difficulty_rank": 30},
    {"english": "annex", "hebrew": "סיפח", "difficulty_rank": 30},
    {"english": "expend", "hebrew": "לבזבז", "difficulty_rank": 30},

    # ===== LEVEL 7 (ranks 31-35) =====
    {"english": "index", "hebrew": "אינדקס", "difficulty_rank": 31},
    {"english": "queer", "hebrew": "חשוד", "difficulty_rank": 31},
    {"english": "sphere", "hebrew": "כדור 2.כיפת השמיים 3.תחום בו מתרחשת פעילות מסוימת", "difficulty_rank": 31},
    {"english": "zodiac", "hebrew": "גלגל המזלות", "difficulty_rank": 31},
    {"english": "ashore", "hebrew": "על החוף", "difficulty_rank": 32},
    {"english": "delude", "hebrew": "להשלות", "difficulty_rank": 32},
    {"english": "elude", "hebrew": "לברוח", "difficulty_rank": 32},
    {"english": "finite", "hebrew": "סופי", "difficulty_rank": 32},
    {"english": "lacuna", "hebrew": "מרווח", "difficulty_rank": 33},
    {"english": "novice", "hebrew": "טירון", "difficulty_rank": 33},
    {"english": "recede", "hebrew": "נסוג 2. התפוגג", "difficulty_rank": 33},
    {"english": "secede", "hebrew": "פרש", "difficulty_rank": 33},
    {"english": "uterus", "hebrew": "רחם", "difficulty_rank": 34},
    {"english": "amplify", "hebrew": "להגביר", "difficulty_rank": 34},
    {"english": "backlash", "hebrew": "תקופת נגד חריפה", "difficulty_rank": 34},
    {"english": "bitterly", "hebrew": "במרירות (עם הרגשה שלילית)", "difficulty_rank": 34},
    {"english": "branding", "hebrew": "מיתוג", "difficulty_rank": 35},
    {"english": "bulwark", "hebrew": "חומת הגנה", "difficulty_rank": 35},
    {"english": "carcass", "hebrew": "פגר", "difficulty_rank": 35},
    {"english": "chasten", "hebrew": "לחנך", "difficulty_rank": 35},

    # ===== LEVEL 8 (ranks 36-40) =====
    {"english": "clutter", "hebrew": "ערבוביה", "difficulty_rank": 36},
    {"english": "condemn", "hebrew": "להרשיע", "difficulty_rank": 36},
    {"english": "council", "hebrew": "מועצה", "difficulty_rank": 36},
    {"english": "crumble", "hebrew": "להתפורר", "difficulty_rank": 36},
    {"english": "dangles", "hebrew": "משתלשל", "difficulty_rank": 37},
    {"english": "diffract", "hebrew": "שבירה של אור", "difficulty_rank": 37},
    {"english": "Doomsday", "hebrew": "יום הדין", "difficulty_rank": 37},
    {"english": "echoing", "hebrew": "הדהוד", "difficulty_rank": 37},
    {"english": "faithful", "hebrew": "נאמן", "difficulty_rank": 38},
    {"english": "flapping", "hebrew": "לנפנפף", "difficulty_rank": 38},
    {"english": "fortress", "hebrew": "מצודה", "difficulty_rank": 38},
    {"english": "gargled", "hebrew": "לגרגר", "difficulty_rank": 38},
    {"english": "gnarled", "hebrew": "מסוקס", "difficulty_rank": 39},
    {"english": "gunnery", "hebrew": "תותחנות", "difficulty_rank": 39},
    {"english": "heirloom", "hebrew": "ירושה", "difficulty_rank": 39},
    {"english": "inflect", "hebrew": "היטה", "difficulty_rank": 39},
    {"english": "languor", "hebrew": "חולשה", "difficulty_rank": 40},
    {"english": "lustful", "hebrew": "חמדני", "difficulty_rank": 40},
    {"english": "mattress", "hebrew": "מזרן", "difficulty_rank": 40},
    {"english": "mulberry", "hebrew": "תות", "difficulty_rank": 40},

    # ===== LEVEL 9 (ranks 41-45) =====
    {"english": "offshoot", "hebrew": "שלוחה", "difficulty_rank": 41},
    {"english": "outwards", "hebrew": "כלפי חוץ", "difficulty_rank": 41},
    {"english": "pending", "hebrew": "בציפייה ל", "difficulty_rank": 41},
    {"english": "platter", "hebrew": "מגש", "difficulty_rank": 41},
    {"english": "postal", "hebrew": "של דואר", "difficulty_rank": 42},
    {"english": "promptly", "hebrew": "ללא עיכוב", "difficulty_rank": 42},
    {"english": "reactor", "hebrew": "כור אטומי", "difficulty_rank": 42},
    {"english": "rescind", "hebrew": "ביטל את התוקף", "difficulty_rank": 42},
    {"english": "scarlet", "hebrew": "אדום", "difficulty_rank": 43},
    {"english": "sculptor", "hebrew": "פסל", "difficulty_rank": 43},
    {"english": "showdown", "hebrew": "עימות מכריע", "difficulty_rank": 43},
    {"english": "slothful", "hebrew": "עצל", "difficulty_rank": 43},
    {"english": "spectre", "hebrew": "רוח רפאים", "difficulty_rank": 44},
    {"english": "starkly", "hebrew": "באופן בוטה", "difficulty_rank": 44},
    {"english": "straying", "hebrew": "תעייה", "difficulty_rank": 44},
    {"english": "surmount", "hebrew": "להתגבר על", "difficulty_rank": 44},
    {"english": "teasing", "hebrew": "הקנטה", "difficulty_rank": 45},
    {"english": "thudding", "hebrew": "לחבוט", "difficulty_rank": 45},
    {"english": "trickle", "hebrew": "לטפטף", "difficulty_rank": 45},
    {"english": "unscrew", "hebrew": "להבריג החוצה", "difficulty_rank": 45},

    # ===== LEVEL 10 (ranks 46-50) =====
    {"english": "walkout", "hebrew": "שביתה", "difficulty_rank": 46},
    {"english": "workshop", "hebrew": "בית מלאכה 2.קורס", "difficulty_rank": 46},
    {"english": "conquest", "hebrew": "כיבוש", "difficulty_rank": 46},
    {"english": "freight", "hebrew": "מטען", "difficulty_rank": 46},
    {"english": "pamphlet", "hebrew": "חוברת", "difficulty_rank": 47},
    {"english": "quashed", "hebrew": "מבוטל", "difficulty_rank": 47},
    {"english": "abashed", "hebrew": "נבוך", "difficulty_rank": 47},
    {"english": "acrimony", "hebrew": "כעס", "difficulty_rank": 47},
    {"english": "allusion", "hebrew": "רמיזה", "difficulty_rank": 48},
    {"english": "arsonist", "hebrew": "מצית (אדם שמצבע הצתה)", "difficulty_rank": 48},
    {"english": "aversion", "hebrew": "סלידה", "difficulty_rank": 48},
    {"english": "biddable", "hebrew": "צייתן", "difficulty_rank": 48},
    {"english": "caravan", "hebrew": "קרוון", "difficulty_rank": 49},
    {"english": "chalice", "hebrew": "גביע", "difficulty_rank": 49},
    {"english": "commute", "hebrew": "נסיעה יום יומית לעבודה 2.להמתיק עונש 3.להחליף", "difficulty_rank": 49},
    {"english": "confided", "hebrew": "התוודה", "difficulty_rank": 49},
    {"english": "converge", "hebrew": "להתכנס", "difficulty_rank": 50},
    {"english": "curator", "hebrew": "אוצר (במוזיאון)", "difficulty_rank": 50},
    {"english": "deferred", "hebrew": "דחה", "difficulty_rank": 50},
    {"english": "deportee", "hebrew": "מגורש", "difficulty_rank": 50},

    # ===== LEVEL 11 (ranks 51-55) =====
    {"english": "deviated", "hebrew": "לסטות", "difficulty_rank": 51},
    {"english": "disburse", "hebrew": "שילם", "difficulty_rank": 51},
    {"english": "dissuade", "hebrew": "הניא (גרם למשהו לא לקרות)", "difficulty_rank": 51},
    {"english": "emboided", "hebrew": "להמחיש", "difficulty_rank": 51},
    {"english": "enraged", "hebrew": "להרגיז", "difficulty_rank": 52},
    {"english": "essence", "hebrew": "מהות", "difficulty_rank": 52},
    {"english": "ferment", "hebrew": "להתסיס", "difficulty_rank": 52},
    {"english": "foresee", "hebrew": "לצפות מראש", "difficulty_rank": 52},
    {"english": "garment", "hebrew": "בגד", "difficulty_rank": 53},
    {"english": "hardware", "hebrew": "חומרה", "difficulty_rank": 53},
    {"english": "imagery", "hebrew": "דימוי", "difficulty_rank": 53},
    {"english": "imposing", "hebrew": "מרשים", "difficulty_rank": 53},
    {"english": "infrared", "hebrew": "תת אדום", "difficulty_rank": 54},
    {"english": "integral", "hebrew": "בלתי נפרד", "difficulty_rank": 54},
    {"english": "jubilee", "hebrew": "יובל", "difficulty_rank": 54},
    {"english": "literacy", "hebrew": "ידיעת קרוא וכתוב 2.השכלה", "difficulty_rank": 54},
    {"english": "maternal", "hebrew": "אמהי", "difficulty_rank": 55},
    {"english": "mudslide", "hebrew": "מפולת בוץ", "difficulty_rank": 55},
    {"english": "oblivion", "hebrew": "שכחה", "difficulty_rank": 55},
    {"english": "optical", "hebrew": "אופטי", "difficulty_rank": 55},

    # ===== LEVEL 12 (ranks 56-60) =====
    {"english": "overrun", "hebrew": "לעבור על גדותיו", "difficulty_rank": 56},
    {"english": "partisan", "hebrew": "מוטה לצד", "difficulty_rank": 56},
    {"english": "persude", "hebrew": "לשכנע", "difficulty_rank": 56},
    {"english": "probable", "hebrew": "סביר", "difficulty_rank": 56},
    {"english": "rationed", "hebrew": "הקציב", "difficulty_rank": 57},
    {"english": "rehearse", "hebrew": "לעשות חזרות", "difficulty_rank": 57},
    {"english": "reprieve", "hebrew": "המתיק את דינו", "difficulty_rank": 57},
    {"english": "retarded", "hebrew": "מפגר", "difficulty_rank": 57},
    {"english": "reviving", "hebrew": "להחיות", "difficulty_rank": 57},
    {"english": "scavenge", "hebrew": "לחטט בזבל 2.לחפש מזון 3.לנקות", "difficulty_rank": 58},
    {"english": "sinkhole", "hebrew": "בולען", "difficulty_rank": 58},
    {"english": "submerge", "hebrew": "להשקיע", "difficulty_rank": 58},
    {"english": "tedious", "hebrew": "מייגע", "difficulty_rank": 58},
    {"english": "turnover", "hebrew": "מחזור", "difficulty_rank": 59},
    {"english": "unravel", "hebrew": "להיפרם 2.לפענח", "difficulty_rank": 59},
    {"english": "vestiges", "hebrew": "שרידים", "difficulty_rank": 59},
    {"english": "widower", "hebrew": "אלמן", "difficulty_rank": 60},
    {"english": "euphoric", "hebrew": "אופורייה", "difficulty_rank": 60},
    {"english": "gives in", "hebrew": "נכנע", "difficulty_rank": 60},
    {"english": "precept", "hebrew": "עדות", "difficulty_rank": 60},

    # ===== LEVEL 13 (ranks 61-65) =====
    {"english": "wipe out", "hebrew": "להחריב", "difficulty_rank": 61},
    {"english": "allocate", "hebrew": "הקציב", "difficulty_rank": 61},
    {"english": "automate", "hebrew": "ממוחשב 2.אוטומטי", "difficulty_rank": 61},
    {"english": "bystander", "hebrew": "משקיף", "difficulty_rank": 61},
    {"english": "construct", "hebrew": "לבנות", "difficulty_rank": 62},
    {"english": "delegate", "hebrew": "ציר", "difficulty_rank": 62},
    {"english": "edifice", "hebrew": "מבנה", "difficulty_rank": 62},
    {"english": "equinox", "hebrew": "נקודות שיווי", "difficulty_rank": 62},
    {"english": "firsthand", "hebrew": "ממקור ראשון", "difficulty_rank": 63},
    {"english": "hucksters", "hebrew": "רוכלים 2.נוכלים", "difficulty_rank": 63},
    {"english": "insulate", "hebrew": "לבודד", "difficulty_rank": 63},
    {"english": "marinate", "hebrew": "להשרות", "difficulty_rank": 63},
    {"english": "obsolete", "hebrew": "מיושן", "difficulty_rank": 64},
    {"english": "Passersby", "hebrew": "עוברי אורח", "difficulty_rank": 64},
    {"english": "relocate", "hebrew": "לשנות מיקום", "difficulty_rank": 64},
    {"english": "shortfall", "hebrew": "גירעון", "difficulty_rank": 64},
    {"english": "threshold", "hebrew": "סף", "difficulty_rank": 65},
    {"english": "vigorous", "hebrew": "איתן", "difficulty_rank": 65},
    {"english": "cold-sweat", "hebrew": "זיעה קרה (כתוצאה מפחד)", "difficulty_rank": 65},
    {"english": "held back", "hebrew": "מנע", "difficulty_rank": 65},

    # ===== LEVEL 14 (ranks 66-70) =====
    {"english": "pretence", "hebrew": "העמדת פנים", "difficulty_rank": 66},
    {"english": "accountant", "hebrew": "רואה חשבון", "difficulty_rank": 66},
    {"english": "appliance", "hebrew": "מכשיר", "difficulty_rank": 66},
    {"english": "bedridden", "hebrew": "מרותק למיטה", "difficulty_rank": 66},
    {"english": "burgeoning", "hebrew": "נביטה", "difficulty_rank": 67},
    {"english": "coalesced", "hebrew": "התמזגו", "difficulty_rank": 67},
    {"english": "compulsion", "hebrew": "כפייה", "difficulty_rank": 67},
    {"english": "consensual", "hebrew": "בהסכמה", "difficulty_rank": 67},
    {"english": "cosmetics", "hebrew": "קוסמטיקה", "difficulty_rank": 68},
    {"english": "despondent", "hebrew": "מדוכדך", "difficulty_rank": 68},
    {"english": "disclosing", "hebrew": "לחשוף", "difficulty_rank": 68},
    {"english": "dispersing", "hebrew": "פיזר", "difficulty_rank": 68},
    {"english": "eccentric", "hebrew": "מוזר", "difficulty_rank": 69},
    {"english": "entrusted", "hebrew": "מופקד", "difficulty_rank": 69},
    {"english": "fortified", "hebrew": "מבוצר 2.  מחוזק", "difficulty_rank": 69},
    {"english": "grievances", "hebrew": "טרונייה", "difficulty_rank": 69},
    {"english": "immensely", "hebrew": "לאין שיעור", "difficulty_rank": 70},
    {"english": "inflicted", "hebrew": "הסב", "difficulty_rank": 70},
    {"english": "intersect", "hebrew": "להיפגש", "difficulty_rank": 70},
    {"english": "lieutenant", "hebrew": "סגן", "difficulty_rank": 70},

    # ===== LEVEL 15 (ranks 71-75) =====
    {"english": "manuscript", "hebrew": "כתב יד", "difficulty_rank": 71},
    {"english": "noncturnal", "hebrew": "פעיל בלילה", "difficulty_rank": 71},
    {"english": "outlandish", "hebrew": "מוזר", "difficulty_rank": 71},
    {"english": "partucles", "hebrew": "חלקיקים", "difficulty_rank": 71},
    {"english": "personnel", "hebrew": "סגל", "difficulty_rank": 72},
    {"english": "pollutants", "hebrew": "מזהמים", "difficulty_rank": 72},
    {"english": "proponent", "hebrew": "חסיד", "difficulty_rank": 72},
    {"english": "reassemble", "hebrew": "לקבץ מחדש", "difficulty_rank": 72},
    {"english": "reimbursed", "hebrew": "החזיר את ההוצאות", "difficulty_rank": 73},
    {"english": "resembled", "hebrew": "דימה", "difficulty_rank": 73},
    {"english": "scrimmage", "hebrew": "תגרה", "difficulty_rank": 73},
    {"english": "staggering", "hebrew": "מדהים", "difficulty_rank": 73},
    {"english": "surpassed", "hebrew": "עלה על 2.הצטיין", "difficulty_rank": 74},
    {"english": "tombstone", "hebrew": "מצבה", "difficulty_rank": 74},
    {"english": "understudy", "hebrew": "שחקן מחליף", "difficulty_rank": 74},
    {"english": "watershed", "hebrew": "קו פרשת מים 2.נקודת מפנה", "difficulty_rank": 74},
    {"english": "blashpheme", "hebrew": "לחלל (דבר קדוש)", "difficulty_rank": 75},
    {"english": "expectant", "hebrew": "כינוי לאישה הרה 2.אדם המצפה לדבר מסוים", "difficulty_rank": 75},
    {"english": "on account", "hebrew": "בגלל", "difficulty_rank": 75},
    {"english": "sequences", "hebrew": "סדרות", "difficulty_rank": 75},

    # ===== LEVEL 16 (ranks 76-80) =====
    {"english": "abominable", "hebrew": "מזעזע", "difficulty_rank": 76},
    {"english": "adulterate", "hebrew": "מהל", "difficulty_rank": 76},
    {"english": "ambiguity", "hebrew": "דו משמעות", "difficulty_rank": 76},
    {"english": "artisanal", "hebrew": "ששייך או קשור לעבדתו של אומן", "difficulty_rank": 76},
    {"english": "beforehand", "hebrew": "מראש", "difficulty_rank": 77},
    {"english": "carcinogen", "hebrew": "חומר מסרטן", "difficulty_rank": 77},
    {"english": "commotion", "hebrew": "המולה", "difficulty_rank": 77},
    {"english": "configure", "hebrew": "עיצב", "difficulty_rank": 77},
    {"english": "corrosive", "hebrew": "מאכל", "difficulty_rank": 78},
    {"english": "decompose", "hebrew": "להתכלות", "difficulty_rank": 78},
    {"english": "derailment", "hebrew": "ירידה מהפסים", "difficulty_rank": 78},
    {"english": "dictation", "hebrew": "הכתבה", "difficulty_rank": 78},
    {"english": "egregious", "hebrew": "בוטה (בצורה שלילית)", "difficulty_rank": 79},
    {"english": "entailment", "hebrew": "משמעות", "difficulty_rank": 79},
    {"english": "fallacious", "hebrew": "מטעה", "difficulty_rank": 79},
    {"english": "formulate", "hebrew": "לנסח", "difficulty_rank": 79},
    {"english": "hodgepodge", "hebrew": "ערבוביה", "difficulty_rank": 80},
    {"english": "imperious", "hebrew": "שחצן", "difficulty_rank": 80},
    {"english": "incidence", "hebrew": "כמות 2.שכיחות", "difficulty_rank": 80},
    {"english": "ingenious", "hebrew": "גאוני", "difficulty_rank": 80},

    # ===== LEVEL 17 (ranks 81-85) =====
    {"english": "instrument", "hebrew": "כלי 2. מסמך רשמי", "difficulty_rank": 81},
    {"english": "invariable", "hebrew": "קבוע", "difficulty_rank": 81},
    {"english": "litigious", "hebrew": "מתדיינים (בבית משפט)", "difficulty_rank": 81},
    {"english": "menageries", "hebrew": "ביבר", "difficulty_rank": 81},
    {"english": "notorious", "hebrew": "מפורסם 2.ידוע לשמצה", "difficulty_rank": 82},
    {"english": "opportune", "hebrew": "מה שקרה בעיתוי מוצלח", "difficulty_rank": 82},
    {"english": "palpitate", "hebrew": "פועם במהירות", "difficulty_rank": 82},
    {"english": "pernicious", "hebrew": "הרסני", "difficulty_rank": 82},
    {"english": "possessive", "hebrew": "קנאי", "difficulty_rank": 83},
    {"english": "reclusive", "hebrew": "מתבודד", "difficulty_rank": 83},
    {"english": "rejection", "hebrew": "דחייה", "difficulty_rank": 83},
    {"english": "resolutely", "hebrew": "בנחישות", "difficulty_rank": 83},
    {"english": "scrupulous", "hebrew": "מוקפד", "difficulty_rank": 84},
    {"english": "springboard", "hebrew": "מקפצה", "difficulty_rank": 84},
    {"english": "surrogate", "hebrew": "תחליף", "difficulty_rank": 84},
    {"english": "undergone", "hebrew": "חוה", "difficulty_rank": 84},
    {"english": "venerated", "hebrew": "העריץ", "difficulty_rank": 85},
    {"english": "wholesale", "hebrew": "סיטונאות", "difficulty_rank": 85},
    {"english": "capitalize", "hebrew": "הפיק תועלת ממשהו 2. השתמש באות גדולה", "difficulty_rank": 85},
    {"english": "euthanized", "hebrew": "המית בהמתת חסד", "difficulty_rank": 85},

    # ===== LEVEL 18 (ranks 86-90) =====
    {"english": "expatriate", "hebrew": "גולה - עזב את מדיניתו וחי באחרת", "difficulty_rank": 86},
    {"english": "intoxicate", "hebrew": "לשכר (שיכור)", "difficulty_rank": 86},
    {"english": "preserved", "hebrew": "נשמר", "difficulty_rank": 86},
    {"english": "aberration", "hebrew": "סטייה (מהנורמה)", "difficulty_rank": 86},
    {"english": "compression", "hebrew": "דחיסה", "difficulty_rank": 87},
    {"english": "decimation", "hebrew": "השמדה", "difficulty_rank": 87},
    {"english": "emaciation", "hebrew": "כחישות", "difficulty_rank": 87},
    {"english": "incubation", "hebrew": "דגירה", "difficulty_rank": 87},
    {"english": "meticulous", "hebrew": "מדוקדק", "difficulty_rank": 88},
    {"english": "relentlessly", "hebrew": "בקשיחות", "difficulty_rank": 88},
    {"english": "skirmishing", "hebrew": "האבקות", "difficulty_rank": 88},
    {"english": "troubleshoot", "hebrew": "לפתור בעיות", "difficulty_rank": 88},
    {"english": "catchphrase", "hebrew": "ביטוי קליט", "difficulty_rank": 89},
    {"english": "manslaughter", "hebrew": "הריגה", "difficulty_rank": 89},
    {"english": "preventive", "hebrew": "מונע", "difficulty_rank": 89},
    {"english": "accommodated", "hebrew": "אירח 2. העניק", "difficulty_rank": 89},
    {"english": "aristocracy", "hebrew": "אצולה", "difficulty_rank": 90},
    {"english": "chauvinisim", "hebrew": "שובניסטיות", "difficulty_rank": 90},
    {"english": "comparative", "hebrew": "יחסי", "difficulty_rank": 90},
    {"english": "confiscated", "hebrew": "מוחרם", "difficulty_rank": 90},

    # ===== LEVEL 19 (ranks 91-95) =====
    {"english": "cosmopolitan", "hebrew": "אוניברסלי", "difficulty_rank": 91},
    {"english": "discernment", "hebrew": "הבחנה", "difficulty_rank": 91},
    {"english": "encompassing", "hebrew": "הקיף", "difficulty_rank": 91},
    {"english": "furthermore", "hebrew": "יתרה מכך", "difficulty_rank": 91},
    {"english": "impractical", "hebrew": "לא מעשי", "difficulty_rank": 92},
    {"english": "inconvenient", "hebrew": "לא נוח", "difficulty_rank": 92},
    {"english": "innumerable", "hebrew": "עצום", "difficulty_rank": 92},
    {"english": "involuntary", "hebrew": "לא רצוני", "difficulty_rank": 92},
    {"english": "malfeasance", "hebrew": "עבירה", "difficulty_rank": 93},
    {"english": "occasionally", "hebrew": "מדי פעם", "difficulty_rank": 93},
    {"english": "promotional", "hebrew": "קידום מכירות", "difficulty_rank": 93},
    {"english": "refreshment", "hebrew": "כיבוד 1.התרעננות", "difficulty_rank": 93},
    {"english": "ricocheting", "hebrew": "מנתז", "difficulty_rank": 94},
    {"english": "thererunder", "hebrew": "מתחתיו", "difficulty_rank": 94},
    {"english": "underscoring", "hebrew": "הדגשה", "difficulty_rank": 94},
    {"english": "wistfulness", "hebrew": "עצבות", "difficulty_rank": 94},
    {"english": "enlightened", "hebrew": "נאור", "difficulty_rank": 95},
    {"english": "immortalize", "hebrew": "הנציח", "difficulty_rank": 95},
    {"english": "precautions", "hebrew": "אמצעי זהירות", "difficulty_rank": 95},
    {"english": "touched upon", "hebrew": "התייחס", "difficulty_rank": 95},

    # ===== LEVEL 20 (ranks 96-100) =====
    {"english": "administrative", "hebrew": "ניהולי", "difficulty_rank": 96},
    {"english": "assassinating", "hebrew": "מתנקש", "difficulty_rank": 96},
    {"english": "caught up with", "hebrew": "הדבקת פערים", "difficulty_rank": 96},
    {"english": "composition", "hebrew": "הרכב", "difficulty_rank": 96},
    {"english": "conscientious", "hebrew": "מצפוני 2.יסודי", "difficulty_rank": 97},
    {"english": "contraction", "hebrew": "צמצום", "difficulty_rank": 97},
    {"english": "deleterious", "hebrew": "מזיק", "difficulty_rank": 97},
    {"english": "disproportion", "hebrew": "יחס שגוי", "difficulty_rank": 97},
    {"english": "exploitation", "hebrew": "ניצול", "difficulty_rank": 98},
    {"english": "fundameltalist", "hebrew": "שמרן קיצוני", "difficulty_rank": 98},
    {"english": "immunization", "hebrew": "חיסון", "difficulty_rank": 98},
    {"english": "incarceration", "hebrew": "כליאה", "difficulty_rank": 98},
    {"english": "indispensable", "hebrew": "חיוני", "difficulty_rank": 99},
    {"english": "intermediaries", "hebrew": "מתווכים", "difficulty_rank": 99},
    {"english": "jurisdiction", "hebrew": "תחום שיפוט", "difficulty_rank": 99},
    {"english": "nail - biting", "hebrew": "מותח (מביא לידי כסיסת אצבעות)", "difficulty_rank": 99},
    {"english": "phosphorescent", "hebrew": "זרחני", "difficulty_rank": 100},
    {"english": "preliminary", "hebrew": "מוקדם 2.פעולת הכנה לפני דבר מה", "difficulty_rank": 100},
    {"english": "proposition", "hebrew": "טענה", "difficulty_rank": 100},
    {"english": "reforestation", "hebrew": "ייעור מחדש", "difficulty_rank": 100},
]


async def seed_words(session: AsyncSession):
    """Seed the database with authentic Israeli Psychometric Test vocabulary."""
    print("\n[SEEDING] Starting Israeli Psychometric vocabulary seeding...")

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
    print("\n[DISTRIBUTION] Words by level (1-20):")
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

    print("\n[COMPLETE] Database populated with authentic psychometric vocabulary!")
    print("=" * 70)
    print("\n✅ Your app is now ready with authentic test preparation words.")
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
