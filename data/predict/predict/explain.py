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
                       r"|\brisks?\b|\blikely\b|\bchance\b", re.I)
WORD = lambda w: re.compile(rf"\b{re.escape(w)}s?\b", re.I)  # noqa: E731


def check(text: object, facts: list[str], allowed_terms: tuple[str, ...] = ()) -> str | None:
    """Why `text` is not grounded in `facts` (or `allowed_terms`), or None when it is."""
    if not isinstance(text, str):
        return "not text"
    text = " ".join(text.split())
    if not text:
        return "empty"
    if len(text) > MAX_CHARS:
        return f"longer than {MAX_CHARS} characters"
    if m := FORBIDDEN.search(text):
        return f"forbidden wording {m.group(0)!r} (probability, percentage, risk, diagnosis or prediction)"
    source = " ".join([*facts, *allowed_terms]).lower()
    if extra := sorted(set(re.findall(r"\d+(?:\.\d+)?", text)) - set(re.findall(r"\d+(?:\.\d+)?", source))):
        return f"number not in the facts: {', '.join(extra)}"
    for term in RELATIVES + CONDITIONS:
        if WORD(term).search(text) and not WORD(term).search(source):
            return f"{'relative' if term in RELATIVES else 'condition'} not in the facts: {term!r}"
    for term in RELATIVES:
        # "grandfathers" when the facts name one grandfather would invent relatives.
        if re.search(rf"\b{term}s\b", text, re.I) and not re.search(rf"\b{term}s\b", source):
            return f"plural relative not in the facts: {term + 's'!r}"
    deceased = set(re.findall(r"\b([a-z]+) \(deceased\)", " ".join(facts).lower()))
    if DEATH.search(text) and not deceased:
        return "death wording, but nobody in the facts is recorded as deceased"
    for rel in set(re.findall(r"\b([a-z]+)(?: \(deceased\))?:", " ".join(facts).lower())) - deceased:
        # Living or unknown status: never described as dead.
        if re.search(rf"\b(late|deceased) {rel}\b|\b{rel}\b(?:,? \w+){{0,3}},? (died|passed away|is dead|was dead)\b",
                     text, re.I):
            return f"describes the {rel} as dead, which the record does not say"
    for rel in deceased:
        # A deceased relative is described in the past tense: "your grandfather had", never "has" or "is".
        if re.search(rf"\b{rel}(?: and \w+)? (has|have|is|are|lives|suffers)\b", text, re.I):
            return f"present tense for the deceased {rel}"
    return None


def validate(text: object, facts: list[str], allowed_terms: tuple[str, ...] = ()) -> str | None:
    """The text if it only uses numbers, relatives and conditions present in `facts` (or `allowed_terms`), else None."""
    return " ".join(text.split()) if check(text, facts, allowed_terms) is None else None


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


def gemini_drivers(explainer, prompt: str, facts_by_driver: list[list[str]]) -> list | None:
    """One Gemini call for all drivers of one person. Returns the raw list (validated by the caller) or None."""
    if not isinstance(explainer, GeminiExplainer):
        return None
    from google.genai import types
    explainer.calls += 1
    names = ("Blood-pressure trend", "Missed doses", "Family history")
    sections = "\n".join(f"{names[i] if i < len(names) else 'Reason'} facts:\n- " + "\n- ".join(f)
                          for i, f in enumerate(facts_by_driver))
    try:
        resp = explainer._get_client().models.generate_content(
            model=explainer.model, contents=f"{prompt}\n\n{sections}",
            config=types.GenerateContentConfig(
                temperature=0, response_mime_type="application/json",
                response_schema={"type": "OBJECT", "properties": {"drivers": {"type": "ARRAY", "items": {"type": "STRING"}}},
                                 "required": ["drivers"]},
                thinking_config=types.ThinkingConfig(thinking_budget=0)),
        )
        drivers = json.loads(resp.text).get("drivers")
        return drivers if isinstance(drivers, list) else None
    except Exception:
        explainer.rejected += 1
        return None
