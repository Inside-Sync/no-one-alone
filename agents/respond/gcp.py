"""Gemini audio assessor and Chirp voice for respond-agent. Both return None on any error."""
import json
import logging
import os

from lang import is_en

log = logging.getLogger("gcp")

SYMPTOMS = ["chest pain", "dizziness", "fall", "headache", "weakness", "cannot stand"]
CLARITY = ["CLEAR", "SLURRED", "NO_SPEECH"]
TIMEOUT_S = 15

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "transcript": {"type": "STRING"},
        "clarity": {"type": "STRING", "enum": CLARITY},
        "coherent": {"type": "BOOLEAN"},
        "symptoms": {"type": "ARRAY", "items": {"type": "STRING"}},
        "confidence": {"type": "NUMBER"},
    },
    "required": ["transcript", "clarity", "coherent", "symptoms", "confidence"],
}


def locale_for(person: dict) -> str:
    return "en-AU" if is_en(person) else "vi-VN"


def validate(data) -> dict | None:
    try:
        if data["clarity"] not in CLARITY or not isinstance(data["coherent"], bool):
            return None
        if not isinstance(data["transcript"], str) or not isinstance(data["symptoms"], list):
            return None
        if not all(isinstance(s, str) for s in data["symptoms"]):
            return None
        conf = min(1.0, max(0.0, float(data["confidence"])))
    except (KeyError, TypeError, ValueError):
        return None
    return {"transcript": data["transcript"], "clarity": data["clarity"], "coherent": data["coherent"],
            "symptoms": [s for s in data["symptoms"] if s in SYMPTOMS], "confidence": conf}


class GeminiAssessor:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            import google.auth
            from google import genai
            from google.genai import types
            project = os.environ.get("GOOGLE_CLOUD_PROJECT") or google.auth.default()[1]
            self._client = genai.Client(
                vertexai=True, project=project, location=os.environ.get("GEMINI_LOCATION", "global"),
                http_options=types.HttpOptions(timeout=TIMEOUT_S * 1000))
        return self._client

    def __call__(self, audio: bytes, mime: str, ctx: dict) -> dict | None:
        try:
            from google.genai import types
            prompt = (f"Transcribe this audio in locale {ctx.get('locale')}. Judge clarity as CLEAR, SLURRED "
                      "or NO_SPEECH, whether the speech is coherent, any symptoms the speaker mentions from "
                      f"this list only: {', '.join(SYMPTOMS)}, and your confidence from 0 to 1.")
            if ctx.get("expected"):
                prompt += f' The speaker was asked to repeat "{ctx["expected"]}"; use SLURRED if the repetition is garbled.'
            resp = self._get_client().models.generate_content(
                model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
                contents=[types.Part.from_bytes(data=audio, mime_type=mime.split(";")[0].strip() or "audio/webm"), prompt],
                config=types.GenerateContentConfig(
                    temperature=0, thinking_config=types.ThinkingConfig(thinking_budget=0),
                    response_mime_type="application/json", response_schema=SCHEMA))
            return validate(json.loads(resp.text))
        except Exception as e:
            log.warning("gemini failed: %s", type(e).__name__)
            return None


class ChirpVoice:
    def __init__(self):
        self._client = None
        self._voices = {}

    def _synth(self, text: str, locale: str, name: str) -> bytes:
        from google.cloud import texttospeech as tts
        if self._client is None:
            self._client = tts.TextToSpeechClient()
        return self._client.synthesize_speech(
            input=tts.SynthesisInput(text=text),
            voice=tts.VoiceSelectionParams(language_code=locale, name=name),
            audio_config=tts.AudioConfig(audio_encoding=tts.AudioEncoding.MP3, speaking_rate=0.9),
            timeout=float(TIMEOUT_S)).audio_content

    def speak(self, text: str, locale: str) -> bytes | None:
        try:
            from google.api_core.exceptions import InvalidArgument
            name = self._voices.get(locale) or f"{locale}-Chirp3-HD-Aoede"
            try:
                return self._synth(text, locale, name)
            except InvalidArgument:
                voices = self._client.list_voices(language_code=locale).voices
                name = next(v.name for v in voices if "Chirp3-HD" in v.name)
                self._voices[locale] = name
                return self._synth(text, locale, name)
        except Exception as e:
            log.warning("chirp failed: %s", type(e).__name__)
            return None
