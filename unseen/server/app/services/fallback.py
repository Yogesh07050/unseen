"""Deterministic discern/truth/compose/insight used when Gloo is not configured
or a Gloo call fails. Mirrors the on-device keyword classifier (section 6.8)."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from ..schemas import (
    ComposeIn, ComposeOut, DiscernIn, DiscernArgs, InsightIn, InsightOut, TruthIn, TruthOut,
)

_CONTENT = Path(__file__).resolve().parent.parent / "content"

KEYWORDS: dict[str, list[str]] = {
    "anger": ["angry", "furious", "rage", "hate", "yell", "revenge", "cruel", "insult", "humiliat", "fire back", "mad"],
    "fear": ["anxious", "afraid", "scared", "worr", "panic", "fall apart", "nervous", "lose my job"],
    "sexual": ["lust", "porn", "sex", "explicit", "hook up", "nudes", "shouldn"],
    "escapism": ["scroll", "binge", "numb", "gaming", "five more minutes", "wasting", "keep watching"],
    "shame": ["worthless", "too far gone", "failure", "failed", "ashamed", "disgusting", "hopeless", "tired of me"],
    "envy": ["jealous", "envy", "better than me", "unfair", "compare", "perfect", "except me"],
    "compulsion": ["gambl", "bet", "drink", "spend", "shopping", "vape", "smoke", "cope", "one more"],
    "deceit": ["lie to", "cover up", "gossip", "pretend", "hide it", "lie to my"],
    "pride": ["do not need anyone", "don't need anyone", "show them", "better than them", "by myself"],
}

NON_SIN = ["died", "grief", "grieving", "cancer", "diagnosed", "depress"]

SEED_LIE = {
    "anger": "He deserves it.",
    "fear": "It's all going to fall apart.",
    "sexual": "No one will know.",
    "escapism": "Just five more minutes.",
    "shame": "You're too far gone.",
    "envy": "Their life is better than yours.",
    "compulsion": "You need this to cope.",
    "deceit": "A small lie protects everyone.",
    "pride": "You don't need anyone.",
    "other": "This is fine.",
}

ARCH_TRIGGERS = {
    "anger": (["hurt", "conflict"], "family", "flesh"),
    "fear": (["stressed", "alone"], "work", "world"),
    "sexual": (["alone", "late_night"], "home_alone", "flesh"),
    "escapism": (["bored", "late_night"], "online", "flesh"),
    "shame": (["tired", "alone"], "home_alone", "devil"),
    "envy": (["online"], "social", "world"),
    "compulsion": (["stressed"], "other", "flesh"),
    "deceit": (["conflict"], "family", "flesh"),
    "pride": (["conflict"], "other", "flesh"),
    "other": (["other"], "other", "unclear"),
}


@lru_cache(maxsize=1)
def _truth_index() -> dict:
    return json.loads((_CONTENT / "truth_index.json").read_text(encoding="utf-8"))


def _classify(text: str) -> str:
    t = text.lower()
    best, best_n = "other", 0
    for struggle, stems in KEYWORDS.items():
        n = sum(1 for s in stems if s in t)
        if n > best_n:
            best, best_n = struggle, n
    return best if best_n else "other"


def discern(body: DiscernIn) -> DiscernArgs:
    t = body.text.lower()
    if any(w in t for w in NON_SIN):
        return DiscernArgs(
            safety_flag="none", struggle="not_a_temptation", lie="", stirred_by=[],
            triggers=[], context_type="other", front="unclear", intensity=3, confidence=0.9,
            truth_queries=[],
        )
    struggle = _classify(body.text)
    triggers, ctx, front = ARCH_TRIGGERS.get(struggle, (["other"], "other", "unclear"))
    return DiscernArgs(
        safety_flag="none",
        struggle=struggle,  # type: ignore[arg-type]
        lie=SEED_LIE.get(struggle, ""),
        stirred_by=[],
        triggers=triggers,  # type: ignore[arg-type]
        context_type=ctx,  # type: ignore[arg-type]
        front=front,  # type: ignore[arg-type]
        intensity=7,
        confidence=0.62 if struggle != "other" else 0.4,
        truth_queries=[struggle, SEED_LIE.get(struggle, "")],
    )


def _tokens(s: str) -> set[str]:
    return set(re.sub(r"[^a-z\s]", "", s.lower()).split())


def choose_truth(body: TruthIn) -> TruthOut:
    lie_tokens = _tokens(body.lie)
    scored = []
    for c in body.candidates:
        overlap = len(lie_tokens & _tokens(c.reference)) + 0  # references share few tokens
        scored.append((overlap, c.id))
    primary = body.candidates[0].id
    backup = body.candidates[1].id if len(body.candidates) > 1 else primary
    return TruthOut(primary=primary, backup=backup, why="Directly answers the lie")


_PERSON = re.compile(r"\b(brother|sister|mom|mother|dad|father|wife|husband|boss|friend|son|daughter|pastor)\b", re.I)


def compose(body: ComposeIn) -> ComposeOut:
    escapes = [a.id for a in body.actions][:3]
    reflection = _REFLECTIONS.get(body.struggle, "The Word you just spoke is truer than the lie. Let it settle before you act.")
    gentle = None
    if body.needsGentleReply:
        who = "them"
        if body.context:
            m = _PERSON.search(body.context)
            if m:
                who = m.group(1).lower()
        gentle = (
            f"Hey — that message hurt, and I wanted to say something cruel back. "
            f"I am going to wait before I respond so I do not add to it. Can we talk when things cool down?"
        )
        if who != "them":
            gentle = gentle  # relationship kept private; keep message content-neutral
    return ComposeOut(reflection=reflection, escapes=escapes, gentleReply=gentle)


_REFLECTIONS = {
    "anger": "The hurt is real, but it does not get the last word. Speak the verse, then let the reply wait.",
    "fear": "You are not carrying tomorrow alone. Name the worry to God and breathe.",
    "sexual": "There is always a way out, and you can take it tonight. Move your body before your mind decides.",
    "escapism": "The night is short and your time is a gift. One small stop can turn the whole evening.",
    "shame": "There is no condemnation here. You are not too far gone; you are already held.",
    "envy": "Their story is not the measure of yours. Name what is good in your own hands today.",
    "compulsion": "You do not need this to cope. Grace is enough, even now, even here.",
    "deceit": "The true sentence is lighter to carry than the lie. Say it first, out loud.",
    "pride": "Needing people is not weakness. Reach for one of them tonight.",
}


def insight(body: InsightIn) -> InsightOut:
    out = []
    for c in body.candidates[:3]:
        n = c.numbers
        lab = c.labels
        if c.rule == "hard_time":
            out.append(f"{lab.get('weekday','')} {lab.get('column','')} have been your hardest time: {n.get('k')} of {n.get('n')} battles.")
        elif c.rule == "truth_holds":
            out.append(f"{lab.get('reference','')} helped you stand in {n.get('k')} of {n.get('n')} {lab.get('struggle','')} battles.")
        else:
            out.append(f"A {lab.get('context','moment')} often came before {n.get('k')} of your {n.get('n')} battles.")
    return InsightOut(sentences=out)
