import types

import anthropic
import pytest

import claude

SCHEMA = {"type": "object", "properties": {"explain": {"type": "string"}, "simpler": {"type": "string"}},
          "required": ["explain", "simpler"], "additionalProperties": False}


class Messages:
    def __init__(self, stop="end_turn", text='{"explain": "e", "simpler": "s"}', error=None):
        self.stop, self.text, self.error, self.seen = stop, text, error, {}

    def create(self, **kw):
        self.seen.update(kw)
        if self.error:
            raise self.error
        blocks = [types.SimpleNamespace(type="thinking", thinking=""), types.SimpleNamespace(type="text", text=self.text)]
        return types.SimpleNamespace(stop_reason=self.stop, content=blocks)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for k in ("ANTHROPIC_FEDERATION_RULE_ID", "ANTHROPIC_ORGANIZATION_ID", "ANTHROPIC_SERVICE_ACCOUNT_ID",
              "ANTHROPIC_WORKSPACE_ID", "ANTHROPIC_API_KEY"):
        monkeypatch.delenv(k, raising=False)


def explainer(messages):
    c = claude.ClaudeExplainer()
    c._client = types.SimpleNamespace(messages=messages)
    return c


def test_default_opus_low_effort_json_schema_no_thinking_or_temperature(monkeypatch):
    monkeypatch.delenv("CLAUDE_MODEL", raising=False)
    m = Messages()
    assert explainer(m)("SYS", "USER") == {"explain": "e", "simpler": "s"}
    assert m.seen["model"] == "claude-opus-5-5" and m.seen["max_tokens"] == 2000
    assert m.seen["output_config"] == {"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}}
    assert m.seen["system"] == "SYS" and m.seen["messages"] == [{"role": "user", "content": "USER"}]
    assert "thinking" not in m.seen and "temperature" not in m.seen


def test_haiku_from_env_runs_with_thinking_disabled(monkeypatch):
    monkeypatch.setenv("CLAUDE_MODEL", "claude-haiku-5-5")
    m = Messages()
    explainer(m)("SYS", "USER")
    assert m.seen["model"] == "claude-haiku-5-5" and m.seen["thinking"] == {"type": "disabled"}


def test_refusal_or_cut_off_is_none():
    assert explainer(Messages(stop="refusal"))("S", "U") is None
    assert explainer(Messages(stop="max_tokens"))("S", "U") is None


def test_errors_and_bad_json_are_none():
    assert explainer(Messages(error=TimeoutError()))("S", "U") is None
    assert explainer(Messages(text="not json"))("S", "U") is None


def test_client_is_vertex_with_7_s_and_no_retries(monkeypatch):
    seen = {}

    class FakeVertex:
        def __init__(self, **kw):
            seen.update(kw)

    monkeypatch.setattr(anthropic, "AnthropicVertex", FakeVertex)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "p1")
    monkeypatch.delenv("CLAUDE_LOCATION", raising=False)
    claude.ClaudeExplainer()._get_client()
    assert seen == {"project_id": "p1", "region": "global", "timeout": 7, "max_retries": 0}
    monkeypatch.setenv("CLAUDE_LOCATION", "us-east5")
    claude.ClaudeExplainer()._get_client()
    assert seen["region"] == "us-east5"


def test_api_key_selects_the_claude_api_with_7_s_and_no_retries(monkeypatch):
    seen = {}

    class FakeApi:
        def __init__(self, **kw):
            seen.update(kw)

    class NoVertex:
        def __init__(self, **kw):
            raise AssertionError("Vertex used although an API key is set")

    monkeypatch.setattr(anthropic, "Anthropic", FakeApi)
    monkeypatch.setattr(anthropic, "AnthropicVertex", NoVertex)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assert isinstance(claude.ClaudeExplainer()._get_client(), FakeApi)
    assert seen == {"timeout": 7, "max_retries": 0}


def test_blank_api_key_still_uses_vertex(monkeypatch):
    seen = {}

    class FakeVertex:
        def __init__(self, **kw):
            seen.update(kw)

    class NoApi:
        def __init__(self, **kw):
            raise AssertionError("Claude API used with a blank key")

    monkeypatch.setattr(anthropic, "AnthropicVertex", FakeVertex)
    monkeypatch.setattr(anthropic, "Anthropic", NoApi)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "   ")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "p1")
    assert isinstance(claude.ClaudeExplainer()._get_client(), FakeVertex)
    assert seen["project_id"] == "p1"


WIF_ENV = {"ANTHROPIC_FEDERATION_RULE_ID": "fdrl_abc", "ANTHROPIC_ORGANIZATION_ID": "11111111-2222-3333-4444-555555555555",
           "ANTHROPIC_SERVICE_ACCOUNT_ID": "svac_def", "ANTHROPIC_WORKSPACE_ID": "wrkspc_ghi"}


def _forbid(name):
    class Forbidden:
        def __init__(self, **kw):
            raise AssertionError(name + " used")
    return Forbidden


def test_federation_ids_select_workload_identity_with_7_s_and_no_retries(monkeypatch):
    seen, creds = {}, {}

    class FakeApi:
        def __init__(self, **kw):
            seen.update(kw)

    class FakeCreds:
        def __init__(self, **kw):
            creds.update(kw)

    monkeypatch.setattr(anthropic, "Anthropic", FakeApi)
    monkeypatch.setattr(anthropic, "WorkloadIdentityCredentials", FakeCreds)
    monkeypatch.setattr(anthropic, "AnthropicVertex", _forbid("Vertex"))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    for k, v in WIF_ENV.items():
        monkeypatch.setenv(k, v)
    assert isinstance(claude.ClaudeExplainer()._get_client(), FakeApi)
    assert isinstance(seen.pop("credentials"), FakeCreds) and seen == {"timeout": 7, "max_retries": 0}
    assert creds.pop("identity_token_provider") is claude._google_id_token
    assert creds.pop("http_client").timeout.read == 7
    assert creds == {"federation_rule_id": "fdrl_abc", "organization_id": "11111111-2222-3333-4444-555555555555",
                     "service_account_id": "svac_def", "workspace_id": "wrkspc_ghi"}


def test_unset_optional_federation_ids_are_none(monkeypatch):
    creds = {}

    class FakeCreds:
        def __init__(self, **kw):
            creds.update(kw)

    monkeypatch.setattr(anthropic, "Anthropic", lambda **kw: object())
    monkeypatch.setattr(anthropic, "WorkloadIdentityCredentials", FakeCreds)
    monkeypatch.setenv("ANTHROPIC_FEDERATION_RULE_ID", "fdrl_abc")
    monkeypatch.setenv("ANTHROPIC_ORGANIZATION_ID", "o")
    monkeypatch.setenv("ANTHROPIC_SERVICE_ACCOUNT_ID", "  ")
    claude.ClaudeExplainer()._get_client()
    assert creds["service_account_id"] is None and creds["workspace_id"] is None


def test_google_id_token_asks_for_the_anthropic_audience(monkeypatch):
    import google.oauth2.id_token
    got = {}

    def fake_fetch(request, audience):
        got["audience"] = audience
        return "tok"

    monkeypatch.setattr(google.oauth2.id_token, "fetch_id_token", fake_fetch)
    assert claude._google_id_token() == "tok" and got["audience"] == "https://api.anthropic.com"


def test_federation_rule_without_organization_falls_back_to_vertex(monkeypatch):
    seen = {}

    class FakeVertex:
        def __init__(self, **kw):
            seen.update(kw)

    monkeypatch.setattr(anthropic, "AnthropicVertex", FakeVertex)
    monkeypatch.setattr(anthropic, "Anthropic", _forbid("Claude API"))
    monkeypatch.setenv("ANTHROPIC_FEDERATION_RULE_ID", "fdrl_abc")
    monkeypatch.delenv("ANTHROPIC_ORGANIZATION_ID", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "p1")
    assert isinstance(claude.ClaudeExplainer()._get_client(), FakeVertex)


def test_schema_and_model_arguments_reach_the_request():
    other = {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"], "additionalProperties": False}
    m = Messages(text='{"text": "t"}')
    assert explainer(m)("S", "U", schema=other, model="claude-haiku-5-5") == {"text": "t"}
    assert m.seen["model"] == "claude-haiku-5-5" and m.seen["thinking"] == {"type": "disabled"}
    assert m.seen["output_config"] == {"effort": "low", "format": {"type": "json_schema", "schema": other}}
