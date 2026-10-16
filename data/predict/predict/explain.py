"""Plain-language explanations from Gemini, grounded in given facts only. Any output that fails validation is dropped."""
import json
import os
import re
from typing import Protocol

MAX_CHARS = 240
RELATIVES = ("mother", "father", "grandmother", "grandfather", "brother", "sister", "son", "daughter", "husband",
             "wife", "aunt", "uncle", "cousin", "niece", "nephew", "grandson", "granddaughter")
CONDITIONS = ("stroke", "hypertension", "blood pressure", "diabetes", "blood sugar", "prediabetes", "dementia",
              "cancer", "heart attack", "heart disease", "atrial fibrillation", "kidney", "glaucoma", "cholesterol",
              "obesity", "alzheimer", "arthritis", "hearing")
DEATH = re.compile(r"\b(died|dies|dead|deceased|passed away|late)\b", re.I)
FORBIDDEN = re.compile(r"%|\bpercent|\bprobab|\bdiagnos|\bguarantee|\bwill (get|develop|have)\b|\byou have\b"
                       r"|\b(higher|increased|greater|elevated|high) risk\b|\bat risk\b|\blikely\b|\bchance\b", re.I)
WORD = lambda w: re.compile(rf"\b{re.escape(w)}s?\b", re.I)  # noqa: E731


def validate(text: object, facts: list[str], allowed_terms: tuple[str, ...] = ()) -> str | None:
    """The text if it only uses numbers, relatives and conditions present in `facts` (or `allowed_terms`), else None."""
    if not isinstance(text, str):
        return None
    text = " ".join(text.split())
    if not text or len(text) > MAX_CHARS or FORBIDDEN.search(text):
        return None
    source = " ".join([*facts, *allowed_terms]).lower()
    if set(re.findall(r"\d+(?:\.\d+)?", text)) - set(re.findall(r"\d+(?:\.\d+)?", source)):
        return None
    for term in RELATIVES + CONDITIONS:
        if WORD(term).search(text) and not WORD(term).search(source):
            return None
    for term in RELATIVES:
        # "grandfathers" when the facts name one grandfather would invent relatives.
        if re.search(rf"\b{term}s\b", text, re.I) and not re.search(rf"\b{term}s\b", source):
            return None
    deceased = set(re.findall(r"\b([a-z]+) \(deceased\)", " ".join(facts).lower()))
    if DEATH.search(text) and not deceased:
        return None  # nobody in the facts is recorded as deceased
    for rel in set(re.findall(r"\b([a-z]+)(?: \(deceased\))?:", " ".join(facts).lower())) - deceased:
        # Living or unknown status: never described as dead.
        if re.search(rf"\b(late|deceased) {rel}\b|\b{rel}\b(?:,? \w+){{0,3}},? (died|passed away|is dead|was dead)\b",
                     text, re.I):
            return None
    for rel in deceased:
        # A deceased relative is described in the past tense: "your grandfather had", never "has" or "is".
        if re.search(rf"\b{rel}(?: and \w+)? (has|have|is|are|lives|suffers)\b", text, re.I):
            return None
    return text


class Explainer(Protocol):
    def explain(self, prompt: str, facts: list[str], allowed_terms: tuple[str, ...] = ()) -> str | None: ...


class NoExplainer:
    """Dry runs and Gemini failures: no explanation; the optional field is then omitted."""

    def explain(self, prompt, facts, allowed_terms=()):
        return None


class GeminiExplainer:
    """Gemini on Vertex AI, temperature 0, JSON output; same client setup as agents/respond/gcp.py."""

    def __init__(self, client=None, model: str | None = None):
        self._client = client
        self.model = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.calls = self.rejected = 0

    def _get_client(self):
        if self._client is None:
            import google.auth
            from google import genai
            project = os.environ.get("GOOGLE_CLOUD_PROJECT") or google.auth.default()[1]
            self._client = genai.Client(vertexai=True, project=project,
                                        location=os.environ.get("GEMINI_LOCATION", "global"))
        return self._client

    def explain(self, prompt, facts, allowed_terms=()):
        from google.genai import types
        self.calls += 1
        try:
            resp = self._get_client().models.generate_content(
                model=self.model,
                contents=f"{prompt}\n\nFacts (the only information you may use):\n- " + "\n- ".join(facts),
                config=types.GenerateContentConfig(
                    temperature=0, response_mime_type="application/json",
                    response_schema={"type": "OBJECT", "properties": {"explanation": {"type": "STRING"}},
                                     "required": ["explanation"]},
                    thinking_config=types.ThinkingConfig(thinking_budget=0)),
            )
            text = json.loads(resp.text).get("explanation")
        except Exception:
            self.rejected += 1
            return None
        ok = validate(text, facts, allowed_terms)
        if ok is None:
            self.rejected += 1
        return ok
