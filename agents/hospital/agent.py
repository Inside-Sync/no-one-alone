"""Deterministic ADK agent: one A2A message in, one handoff packet out. No LLM planning."""
import json
from typing import AsyncGenerator

from google.adk.a2a.converters.part_converter import A2A_DATA_PART_END_TAG, A2A_DATA_PART_START_TAG
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types

from handoff import pipeline
from handoff.contracts import ErrorBody


def extract_body(content: types.Content | None) -> object:
    """The single part is JSON text or an A2A data part (an inline blob in <a2a_datapart_json> tags)."""
    for part in (content.parts or []) if content else []:
        if part.text:
            return json.loads(part.text)
        blob = part.inline_data
        if blob and blob.data and blob.data.startswith(A2A_DATA_PART_START_TAG) and blob.data.endswith(A2A_DATA_PART_END_TAG):
            return json.loads(blob.data[len(A2A_DATA_PART_START_TAG):-len(A2A_DATA_PART_END_TAG)])
    raise ValueError("no text or data part")


class HospitalAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        try:
            body = extract_body(ctx.user_content)
        except ValueError:  # json.JSONDecodeError is a ValueError
            result = ErrorBody.of("INVALID_REQUEST", "message must carry the /handoff body as one data part or JSON text").to_json()
        else:
            _, result = await pipeline.handle(body)
        text = json.dumps(result, ensure_ascii=False)
        yield Event(invocation_id=ctx.invocation_id, author=self.name,
                    content=types.Content(role="model", parts=[types.Part(text=text)]))


root_agent = HospitalAgent(
    name="hospital_agent",
    description="Builds a consent-filtered pre-arrival packet for the receiving emergency department from the "
                "person's FHIR R4 record. Input: the /handoff request body. Output: the pre-arrival packet as JSON text.",
)
