"""Pydantic v2 request/response and tool-argument models (section 11, 12)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Tradition = Literal["evangelical", "catholic", "mainline"]
SafetyFlag = Literal[
    "none", "self_harm", "harm_to_others", "abuse", "medical", "eating_disorder", "psychosis_signs"
]
Struggle = Literal[
    "anger", "fear", "sexual", "escapism", "shame", "envy",
    "compulsion", "deceit", "pride", "other", "not_a_temptation",
]
Trigger = Literal[
    "tired", "alone", "hurt", "bored", "stressed", "hungry", "conflict", "online", "late_night", "other"
]
ContextType = Literal["family", "work", "school", "church", "online", "home_alone", "social", "other"]
Front = Literal["world", "flesh", "devil", "unclear"]


# ---- tool-argument models (validated after the forced tool call) ----
class DiscernArgs(BaseModel):
    safety_flag: SafetyFlag
    struggle: Struggle
    lie: str = Field(max_length=60)
    stirred_by: list[str] = Field(default_factory=list, max_length=3)
    triggers: list[Trigger] = Field(default_factory=list, max_length=4)
    context_type: ContextType = "other"
    front: Front = "unclear"
    intensity: int = Field(ge=1, le=10)
    confidence: float = Field(ge=0, le=1)
    truth_queries: list[str] = Field(default_factory=list, max_length=2)


class TruthArgs(BaseModel):
    primary: str
    backup: str
    why: str = Field(max_length=90)


class ComposeArgs(BaseModel):
    reflection: str = Field(default="", max_length=200)
    escapes: list[str] = Field(default_factory=list, max_length=3)
    gentle_reply: str | None = Field(default=None, max_length=320)


class InsightArgs(BaseModel):
    sentences: list[str] = Field(default_factory=list, max_length=3)


# ---- request / response models ----
class DiscernIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    tradition: Tradition | None = None
    locale: str = "en-US"


class Meta(BaseModel):
    model: str
    latencyMs: int
    promptVersion: str


class SpeechOutIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class DiscernOut(BaseModel):
    discernment: DiscernArgs
    meta: Meta


class Candidate(BaseModel):
    id: str
    reference: str
    text: str = Field(max_length=600)


class TruthIn(BaseModel):
    struggle: Struggle
    lie: str = Field(max_length=60)
    candidates: list[Candidate] = Field(min_length=1, max_length=12)


class TruthOut(BaseModel):
    primary: str
    backup: str
    why: str


class VerseRef(BaseModel):
    reference: str
    text: str = Field(max_length=2000)


class Action(BaseModel):
    id: str
    label: str


class ComposeIn(BaseModel):
    struggle: Struggle
    lie: str = Field(max_length=60)
    verse: VerseRef
    actions: list[Action]
    needsGentleReply: bool = False
    context: str | None = Field(default=None, max_length=1000)
    tradition: Tradition | None = None


class ComposeOut(BaseModel):
    reflection: str
    escapes: list[str]
    gentleReply: str | None = None


class InsightCandidate(BaseModel):
    rule: str
    numbers: dict[str, int]
    labels: dict[str, str]


class InsightIn(BaseModel):
    candidates: list[InsightCandidate] = Field(min_length=1, max_length=5)


class InsightOut(BaseModel):
    sentences: list[str]


class VerseOut(BaseModel):
    id: str
    reference: str
    content: str
    bibleId: int


class BibleOut(BaseModel):
    id: int
    abbreviation: str
    title: str
    copyright: str


class VerseSearchOut(BaseModel):
    references: list[str]


class VotdOut(BaseModel):
    day: int
    passageId: str


class PrayCreateOut(BaseModel):
    token: str
    url: str
    expiresAt: int


class PrayStatusOut(BaseModel):
    acks: int
    expiresAt: int
