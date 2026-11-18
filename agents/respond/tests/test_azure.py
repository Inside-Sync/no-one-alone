import base64
import json

import httpx

import azure

SAMPLE = {"RecognitionStatus": "Success", "NBest": [
    {"AccuracyScore": 100.0, "FluencyScore": 100.0, "CompletenessScore": 100.0, "PronScore": 95.1}]}
URL = "https://uaenorth.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"


class Resp:
    def raise_for_status(self):
        pass

    def json(self):
        return SAMPLE


def test_parse_scores():
    assert azure.parse_scores(SAMPLE) == {"accuracy": 100.0, "fluency": 100.0, "completeness": 100.0, "overall": 95.1}
    assert azure.parse_scores({"RecognitionStatus": "NoMatch"}) is None


def test_assessment_header():
    decoded = json.loads(base64.b64decode(azure.assessment_header("the sky is blue in abu dhabi")))
    assert decoded == {"ReferenceText": "the sky is blue in abu dhabi", "GradingSystem": "HundredMark",
                       "Granularity": "Word", "Dimension": "Comprehensive", "EnableMiscue": "True"}


def test_request(monkeypatch):
    monkeypatch.setenv("AZURE_SPEECH_KEY", "k")
    monkeypatch.delenv("AZURE_SPEECH_REGION", raising=False)
    monkeypatch.setattr(azure, "to_wav", lambda a: b"WAV")
    seen = {}

    def post(url, **kw):
        seen["url"], seen["kw"] = url, kw
        return Resp()
    monkeypatch.setattr(httpx, "post", post)
    out = azure.pronunciation(b"webm", "the sky is blue in abu dhabi")
    assert seen["url"] == URL
    assert seen["kw"]["params"] == {"language": "en-US", "format": "detailed"}
    assert seen["kw"]["content"] == b"WAV"
    assert "Pronunciation-Assessment" in seen["kw"]["headers"]
    assert out["overall"] == 95.1


def test_no_key(monkeypatch):
    monkeypatch.delenv("AZURE_SPEECH_KEY", raising=False)
    monkeypatch.setattr(azure, "to_wav", lambda a: b"WAV")
    calls = []
    monkeypatch.setattr(httpx, "post", lambda *a, **k: calls.append(1) or Resp())
    assert azure.pronunciation(b"x", "ref") is None
    assert calls == []


def test_timeout(monkeypatch):
    monkeypatch.setenv("AZURE_SPEECH_KEY", "k")
    monkeypatch.setattr(azure, "to_wav", lambda a: b"WAV")

    def post(*a, **k):
        raise httpx.ConnectTimeout("slow")
    monkeypatch.setattr(httpx, "post", post)
    assert azure.pronunciation(b"x", "ref") is None
