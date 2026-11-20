"""Claude for Noa's wording: the Claude API (workload identity federation, else ANTHROPIC_API_KEY), else Vertex AI. Returns None on any error."""
import json
import logging
import os

from explain import SCHEMA

log = logging.getLogger("claude")
TIMEOUT_S = 7
AUDIENCE = "https://api.anthropic.com"


def _google_id_token() -> str:
    import google.auth.transport.requests
    import google.oauth2.id_token
    return google.oauth2.id_token.fetch_id_token(google.auth.transport.requests.Request(), AUDIENCE)


class ClaudeExplainer:
    def __init__(self):
        self._client = None

    def _get_client(self):
        env = os.environ.get
        if self._client is None and env("ANTHROPIC_FEDERATION_RULE_ID", "").strip():
            if env("ANTHROPIC_ORGANIZATION_ID", "").strip():
                from anthropic import Anthropic, WorkloadIdentityCredentials
                creds = WorkloadIdentityCredentials(
                    identity_token_provider=_google_id_token, federation_rule_id=env("ANTHROPIC_FEDERATION_RULE_ID").strip(),
                    organization_id=env("ANTHROPIC_ORGANIZATION_ID").strip(),
                    service_account_id=env("ANTHROPIC_SERVICE_ACCOUNT_ID") or None, workspace_id=env("ANTHROPIC_WORKSPACE_ID") or None)
                self._client = Anthropic(credentials=creds, timeout=TIMEOUT_S, max_retries=0)
            else:
                log.warning("ANTHROPIC_FEDERATION_RULE_ID is set without ANTHROPIC_ORGANIZATION_ID; ignoring it")
        if self._client is None and os.environ.get("ANTHROPIC_API_KEY", "").strip():
            from anthropic import Anthropic
            self._client = Anthropic(timeout=TIMEOUT_S, max_retries=0)
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
