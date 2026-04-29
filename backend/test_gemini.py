"""Quick Gemini API diagnostic — run this first to see the raw error."""
import os, sys
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / ".env"
for line in env_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

import httpx

KEY = os.getenv("GEMINI_API_KEY", "")
print(f"GEMINI_API_KEY loaded: {'YES — ' + KEY[:10] + '...' if KEY else 'NO — NOT FOUND'}")

if not KEY:
    sys.exit("Add GEMINI_API_KEY to backend/.env first")

# Try two models — pick whichever works
for model in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    print(f"\nTrying model: {model}")
    try:
        resp = httpx.post(
            url,
            params={"key": KEY},
            json={"contents": [{"parts": [{"text": "Say hello in one word."}]}]},
            timeout=30,
        )
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  ✅ SUCCESS! Response: {resp.json()['candidates'][0]['content']['parts'][0]['text']}")
            print(f"\n  → Use this model: {model}")
            break
        else:
            print(f"  ❌ Error body: {resp.text[:500]}")
    except Exception as e:
        print(f"  ❌ Exception: {e}")
