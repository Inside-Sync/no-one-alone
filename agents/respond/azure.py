"""Azure AI Speech pronunciation scores for the speech check. Returns None on any error."""
import base64
import json
import logging
import os
import subprocess

import httpx

log = logging.getLogger("azure")
TIMEOUT_S = 4


def to_wav(audio: bytes) -> bytes:
    return subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-t", "30", "-ac", "1", "-ar", "16000", "-f", "wav", "pipe:1"],
                          input=audio, capture_output=True, check=True, timeout=TIMEOUT_S).stdout


def assessment_header(reference: str) -> str:
    params = {"ReferenceText": reference, "GradingSystem": "HundredMark", "Granularity": "Word",
              "Dimension": "Comprehensive", "EnableMiscue": "True"}
    return base64.b64encode(json.dumps(params).encode()).decode()


def parse_scores(data: dict) -> dict | None:
    if data.get("RecognitionStatus") != "Success" or not data.get("NBest"):
        return None
    best = data["NBest"][0]
    return {"accuracy": best["AccuracyScore"], "fluency": best["FluencyScore"],
            "completeness": best["CompletenessScore"], "overall": best["PronScore"]}


def pronunciation(audio: bytes, reference: str) -> dict | None:
    key = os.environ.get("AZURE_SPEECH_KEY")
    if not key:
        return None
    try:
        region = os.environ.get("AZURE_SPEECH_REGION", "uaenorth")
        r = httpx.post(f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1",
                       params={"language": "en-US", "format": "detailed"}, content=to_wav(audio), timeout=TIMEOUT_S,
                       headers={"Ocp-Apim-Subscription-Key": key, "Accept": "application/json",
                                "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
                                "Pronunciation-Assessment": assessment_header(reference)})
        r.raise_for_status()
        return parse_scores(r.json())
    except Exception as e:
        log.warning("azure pronunciation failed: %s", type(e).__name__)
        return None
