import asyncio
import sys

try:
    import asyncpg
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "asyncpg"])
    import asyncpg

import json

async def fetch():
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = "postgresql://psychoapp_db1_0_user:ZGkGArcmqDTDt4IAFQiPoHbJcvV2TnmH@dpg-d6i9aui4d50c73fr1ud0-a.oregon-postgres.render.com/psychoapp_db1_0"
    try:
        print("Connecting with asyncpg...")
        conn = await asyncpg.connect(url, ssl=ctx)
        print("Connected!")
        rows = await conn.fetch("SELECT english, hebrew FROM words WHERE unit = 11 AND language = 'en'")
        result = {r['english']: r['hebrew'] for r in rows}
        print(f"Fetched {len(result)} words.")
        with open("unit_11_prod.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        await conn.close()
    except Exception as e:
        print("Error:", e)

asyncio.run(fetch())
