"""Wire shapes from docs/contract.md v1.3.

Request: section 4.3 `POST /handoff` body, which respond-agent forwards unchanged.
Response: section 4.4 packet. Fields marked EXTENSION are proposed in
docs/contract-extensions.md and are not yet in the shared contract.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

Level = Literal["OK", "MONITOR", "COME_NOW", "EMERGENCY"]
Suspected = Literal["STROKE", "UNKNOWN"]
Communication = Literal["HARD_OF_HEARING", "COGNITIVE_IMPAIRMENT"]
Status = Literal["COMPLETED", "PARTIAL", "BLOCKED_CONSENT"]
Category = Literal["identity", "conditions", "medications", "allergies", "familyHistory", "communication"]
CATEGORIES: tuple[Category, ...] = ("identity", "conditions", "medications", "allergies", "familyHistory", "communication")
ErrorCode = Literal["INVALID_REQUEST", "AGENT_FAILED"]


class _In(BaseModel):
    # Unknown fields are ignored so core-api can add fields without breaking us; unknown enum values still fail.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore", frozen=True)


class _Out(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    def to_json(self) -> dict:
        # Contract section 1: absent optional fields are omitted, never null.
        return self.model_dump(by_alias=True, exclude_none=True, mode="json")


class OnScene(_In):
    name: str = Field(min_length=1)
    relation: str = Field(min_length=1)


class HospitalRef(_In):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    eta_min: int | None = Field(default=None, ge=0)


class HandoffRequest(_In):
    incident_id: str = Field(min_length=1)
    person_id: str = Field(min_length=1)
    level: Level
    suspected: Suspected
    last_known_well_at: str | None = None
    findings: list[str] = []
    on_scene: OnScene | None = None
    hospital: HospitalRef

    @field_validator("last_known_well_at")
    @classmethod
    def _utc_timestamp(cls, v: str | None) -> str | None:
        # Kept as the original string so the packet echoes it byte for byte.
        if v is not None and (not v.endswith("Z") or datetime.fromisoformat(v).tzinfo is None):
            raise ValueError("must be an ISO-8601 UTC timestamp ending in Z")
        return v


class Patient(_Out):
    name: str | None = None
    age: int | None = None
    sex: Literal["F", "M"] | None = None


class Medication(_Out):
    name: str
    dose: str | None = None


class Contact(_Out):
    name: str
    relation: str
    on_scene: bool


class HandoffPacket(_Out):
    patient: Patient | None = None
    suspected: Suspected
    last_known_well_at: str | None = None
    findings: list[str]
    conditions: list[str] | None = None
    medications: list[Medication] | None = None
    allergies: list[str] | None = None
    communication: list[Communication] | None = None
    baseline: str | None = None
    contact: Contact | None = None
    eta_min: int | None = None
    text: str
    # EXTENSION fields (docs/contract-extensions.md), pending Dũng's review.
    status: Status
    family_history: list[str] | None = None
    withheld: list[Category] = []
    warnings: list[str] = []
    sources: list[str] = []


class ErrorDetail(_Out):
    code: ErrorCode
    message: str


class ErrorBody(_Out):
    error: ErrorDetail

    @classmethod
    def of(cls, code: ErrorCode, message: str) -> "ErrorBody":
        return cls(error=ErrorDetail(code=code, message=message))
