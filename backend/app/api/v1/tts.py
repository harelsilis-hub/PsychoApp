"""Text-to-Speech endpoint using gTTS (Google TTS) as fallback for devices without Hebrew voice."""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from gtts import gTTS
import io

router = APIRouter()

# Simple in-memory cache so the same word isn't re-fetched from Google on every tap
_cache: dict[str, bytes] = {}


@router.get("/tts")
async def text_to_speech(
    text: str = Query(..., max_length=200),
    lang: str = Query(default="he", max_length=10),
):
    cache_key = f"{lang}:{text}"
    if cache_key in _cache:
        return Response(content=_cache[cache_key], media_type="audio/mpeg")

    try:
        tts = gTTS(text=text, lang=lang)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        audio = buf.read()
        _cache[cache_key] = audio
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
