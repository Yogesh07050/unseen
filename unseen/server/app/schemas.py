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
    truth_queries: list[str] = Field(default_factory=list, max_length=3)


class TruthArgs(BaseModel):
    primary: str
    backups: list[str] = Field(default_factory=list, max_length=4)
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
    """Choose Scripture for one battle. The server builds the candidate pool:
    the client's Truth Index ids (`candidateIds`, '+'-joined USFM ranges such as
    EPH.4.26+EPH.4.27) plus YouVersion verse-search hits for `truthQueries` and
    the lie itself, fetches each candidate's text in `bibleId`, and asks the
    model to pick a primary and ordered backups. Legacy `candidates` (with text)
    are still accepted."""
    struggle: Struggle
    lie: str = Field(max_length=60)
    candidates: list[Candidate] = Field(default_factory=list, max_length=12)
    candidateIds: list[str] = Field(default_factory=list, max_length=12)
    truthQueries: list[str] = Field(default_factory=list, max_length=3)
    stirredBy: list[str] = Field(default_factory=list, max_length=3)
    bibleId: int = 3034


class TruthOut(BaseModel):
    primary: str
    backup: str            # == backups[0] (kept for older clients)
    backups: list[str] = Field(default_factory=list)
    why: str
    pool: list[str] = Field(default_factory=list)   # every candidate id the model saw, best-known first


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
    """One Bible version as YouVersion describes it. ``copyright`` is the notice that
    must be displayed with the version's text; ``books`` lists the USFM book codes
    it contains (a New Testament-only version lacks GEN)."""
    id: int
    abbreviation: str
    title: str
    localizedTitle: str | None = None
    copyright: str | None = None
    promotionalContent: str | None = None
    publisherUrl: str | None = None
    languageTag: str = "en"
    deepLink: str | None = None
    books: list[str] = Field(default_factory=list)


class BibleListOut(BaseModel):
    bibles: list[BibleOut]
    # True when the list came from YouVersion (other versions are real choices);
    # False for the keyless/offline fallback, which lists only the bundled BSB.
    live: bool


class VerseSearchOut(BaseModel):
    references: list[str]


class VotdOut(BaseModel):
    day: int
    passageId: str          # 'JAS.5.16' or a range 'PHP.4.6-7'
    source: str = "rotation"  # 'youversion' | 'rotation'


class PrayCreateOut(BaseModel):
    token: str
    url: str
    expiresAt: int


class PrayStatusOut(BaseModel):
    acks: int
    expiresAt: int


# ---- per-install data sync (routers/sync.py) ----
class SyncDelete(BaseModel):
    collection: str = Field(max_length=16)
    id: str = Field(max_length=128)


class SyncPushIn(BaseModel):
    profile: dict | None = None
    # collection -> client objects (app/src/types.ts shapes); each carries id + updatedAt
    upserts: dict[str, list[dict]] = Field(default_factory=dict)
    deletes: list[SyncDelete] = Field(default_factory=list, max_length=1000)


class SyncAck(BaseModel):
    ok: bool
    now: int
    available: bool  # False = no database configured; the phone keeps its own store
    upserts: int = 0
    deletes: int = 0
    profile: int = 0


class SyncPullOut(BaseModel):
    now: int
    available: bool
    profile: dict | None = None
    battles: list[dict] = Field(default_factory=list)
    stones: list[dict] = Field(default_factory=list)
    allies: list[dict] = Field(default_factory=list)
    armory: list[dict] = Field(default_factory=list)
    watch: list[dict] = Field(default_factory=list)


# ---- accounts (routers/auth.py) ----
class CredentialsIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    id: str
    username: str


class AuthOut(BaseModel):
    token: str
    user: UserOut
    expiresAt: int
    claimed: dict[str, int] = Field(default_factory=dict)  # anonymous rows attached to the account on sign-in
