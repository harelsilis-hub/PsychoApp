#!/usr/bin/env python3
"""
Fix Hebrew database entries where characters jumped from word (key) end
to definition (value) end due to RTL PDF extraction errors.

Detectable patterns
-------------------
Case A) Key ends with a standalone niqqud mark (no base letter after it).
        e.g. "אוֹצֵ" -> "שומר על משהו יקר ערךר"
             the base letter ר jumped from key end to value end.

Case B) Value ends with a niqqud mark.
        e.g. "אָח"  -> "שדה מרעה, כר דשאוּ"    (ends with dagesh ּ)
             "הִכְחִי" -> "שלל, טען שמשהו אינו נכוןשׁ"  (ends with shin-dot ׁ)
             a letter+niqqud cluster jumped from key end to value end.

Fix for both cases: peel the trailing cluster (1 base letter + optional niqqud)
from the end of the value and append it to the end of the key.

Limitation
----------
Entries where both key AND value end with plain base letters (no niqqud at
either end) cannot be reliably detected without a Hebrew dictionary.
"""

import json
from pathlib import Path

# ── Unicode character sets ────────────────────────────────────────────────────

# Hebrew base letters: א (U+05D0) through ת (U+05EA) incl. final forms
HEBREW_BASE = set(range(0x05D0, 0x05EB))

# Hebrew niqqud (vowel points / diacritics)
HEBREW_NIQQUD = (
    set(range(0x05B0, 0x05BE))   # shva, ḥataf, hiriq, tsere, segol, patah,
                                 # qamats, holam, qubuts, dagesh, meteg …
    | {0x05BF,                   # rafe
       0x05C1,                   # shin dot
       0x05C2,                   # sin dot
       0x05C4,                   # upper dot
       0x05C5,                   # lower dot
       0x05C7}                   # qamats qatan
)


def is_base(c: str) -> bool:
    return ord(c) in HEBREW_BASE


def is_niqqud(c: str) -> bool:
    return ord(c) in HEBREW_NIQQUD


# ── Detection ─────────────────────────────────────────────────────────────────

def is_broken(key: str, value: str) -> bool:
    """
    Return True if this entry shows the jump bug.
    Case A: key's last character is a niqqud (no base letter at very end).
    Case B: value's last character is a niqqud.
    """
    if not key or not value:
        return False
    return is_niqqud(key[-1]) or is_niqqud(value[-1])


# ── Fix ───────────────────────────────────────────────────────────────────────

def peel_trailing_cluster(s: str):
    """
    Peel one character cluster from the end of s.
    A cluster = optional trailing niqqud marks + the preceding base letter.

    Returns (cluster, rest_of_string).
    Example: "ערךר"  -> ("ר",  "ערך")
             "דשאוּ" -> ("וּ", "דשא")
             "נכוןשׁ" -> ("שׁ", "נכון")
    """
    i = len(s)

    # 1. collect trailing niqqud marks (0 or more)
    niqqud_tail = []
    while i > 0 and is_niqqud(s[i - 1]):
        niqqud_tail.insert(0, s[i - 1])
        i -= 1

    # 2. collect the one base letter immediately before the niqqud (if present)
    base = ''
    if i > 0 and is_base(s[i - 1]):
        base = s[i - 1]
        i -= 1

    cluster = base + ''.join(niqqud_tail)
    return cluster, s[:i]


def fix_entry(key: str, value: str):
    """Move trailing cluster from value end to key end."""
    cluster, new_value = peel_trailing_cluster(value)
    new_key   = key + cluster
    new_value = new_value.rstrip()  # remove any trailing whitespace left behind
    return new_key, new_value


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    src = Path('database_hebrew.json')
    dst = Path('database_hebrew_fixed.json')
    log = Path('fix_log.txt')

    if not src.exists():
        print(f"ERROR: {src} not found. Run this script from the PsychoApp directory.")
        return

    data: dict = json.loads(src.read_text(encoding='utf-8'))

    fixed_data: dict = {}
    changes: list    = []
    key_conflicts: list = []

    for key, value in data.items():
        if is_broken(key, value):
            new_key, new_value = fix_entry(key, value)

            if new_key in fixed_data:
                # Edge case: fixed key already exists in output — flag for manual review
                key_conflicts.append((key, value, new_key, new_value))
                # Keep the original entry to avoid silent data loss
                fixed_data[key] = value
            else:
                fixed_data[new_key] = new_value
                changes.append((key, value, new_key, new_value))
        else:
            fixed_data[key] = value

    # ── Write fixed JSON ──────────────────────────────────────────────────────
    dst.write_text(
        json.dumps(fixed_data, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    # ── Write human-readable change log ──────────────────────────────────────
    lines = [
        f"Total entries : {len(data)}",
        f"Fixed         : {len(changes)}",
        f"Key conflicts : {len(key_conflicts)}  (kept original, needs manual review)",
        '',
        '=' * 70,
        'FIXED ENTRIES',
        '=' * 70,
        '',
    ]
    for old_k, old_v, new_k, new_v in changes:
        lines.append(f"  KEY : {old_k!r}  →  {new_k!r}")
        lines.append(f"  VAL : {old_v!r}  →  {new_v!r}")
        lines.append('')

    if key_conflicts:
        lines += [
            '=' * 70,
            'KEY CONFLICTS  (manual review required)',
            '=' * 70,
            '',
        ]
        for old_k, old_v, new_k, new_v in key_conflicts:
            lines.append(f"  ORIG KEY : {old_k!r}")
            lines.append(f"  ORIG VAL : {old_v!r}")
            lines.append(f"  WANT KEY : {new_k!r}  ← already exists")
            lines.append('')

    log.write_text('\n'.join(lines), encoding='utf-8')

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"Done.")
    print(f"  Entries total   : {len(data)}")
    print(f"  Entries fixed   : {len(changes)}")
    print(f"  Key conflicts   : {len(key_conflicts)}  (see {log})")
    print(f"  Output JSON     : {dst}")
    print(f"  Change log      : {log}")
    print()
    print("Review fix_log.txt before replacing database_hebrew.json and re-seeding.")


if __name__ == '__main__':
    main()
