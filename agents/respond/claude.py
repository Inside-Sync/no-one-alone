"""Claude on Vertex AI for Noa's wording (teach card and family-health panel). Returns None on any error."""
import json
import logging
import os

from explain import SCHEMA

log = logging.getLogger("claude")
TIMEOUT_S = 7


class ClaudeExplainer:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            import google.auth
            from anthropic import AnthropicVertex
            project = os.environ.get("GOOGLE_CLOUD_PROJECT") or google.auth.default()[1]
            self._client = AnthropicVertex(project_id=project, region=os.environ.get("CLAUDE_LOCATION", "global"),
                                           timeout=TIMEOUT_S, max_retries=0)
        return self._client

    def __call__(self, system: str, user: str, schema: dict = SCHEMA, model: str | None = None) -> dict | None:
        try:
            model = model or os.environ.get("CLAUDE_MODEL", "claude-opus-5-5")
            # Opus 5.5 rejects thinking disabled; Haiku 5.5 accepts it at low effort.
            extra = {"thinking": {"type": "disabled"}} if model.startswith("claude-haiku") else {}
            resp = self._get_client().messages.create(
                model=model, max_tokens=2000, system=system, messages=[{"role": "user", "content": user}],
                output_config={"effort": "low", "format": {"type": "json_schema", "schema": schema}}, **extra)
            if resp.stop_reason != "end_turn":
                log.warning("claude stopped: %s", resp.stop_reason)
                return None
            return json.loads(next(b.text for b in resp.content if b.type == "text"))
        except Exception as e:
            log.warning("claude failed: %s", type(e).__name__)
            return None
