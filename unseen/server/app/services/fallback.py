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


# Phrases that mark a self-justifying belief ("the lie") inside a clause.
_LIE_MARKERS = [
    "deserve", "no one", "nobody", "won't matter", "wont matter", "doesn't matter", "just once", "just this",
    "one more", "five more", "need this", "need it", "can't help", "cant help", "too far", "never change",
    "might as well", "what's the point", "whats the point", "everyone else", "better than", "always", "never",
    "have to", "no choice", "nothing wrong", "why not", "they'll never", "nobody will", "no one will",
]
_TRIGGER_WORDS: dict[str, list[str]] = {
    "tired": ["tired", "exhausted", "no sleep", "drained", "worn out"],
    "alone": ["alone", "by myself", "nobody here", "no one around", "lonely"],
    "hurt": ["hurt", "ignored", "insult", "mocked", "humiliat", "betray", "left out", "rejected"],
    "bored": ["bored", "nothing to do", "killing time"],
    "stressed": ["stress", "deadline", "pressure", "overwhelm", "too much", "anxious"],
    "hungry": ["hungry", "haven't eaten", "havent eaten", "skipped lunch"],
    "conflict": ["argu", "fight", "yell", "shout", "fired back", "text from", "message from", "he said", "she said"],
    "online": ["scroll", "instagram", "tiktok", "phone", "online", "feed", "youtube", "reddit", "x.com", "twitter"],
    "late_night": ["late", "midnight", "2am", "3am", "can't sleep", "cant sleep", "tonight", "in bed"],
}
_CONTEXT_WORDS: dict[str, list[str]] = {
    "family": ["mom", "mum", "dad", "brother", "sister", "wife", "husband", "kids", "son", "daughter", "family", "in-law", "parents"],
    "work": ["boss", "work", "job", "office", "coworker", "co-worker", "client", "manager", "shift", "deadline"],
    "school": ["school", "class", "teacher", "exam", "homework", "campus", "professor"],
    "church": ["church", "pastor", "small group", "worship team", "bible study"],
    "online": ["scroll", "instagram", "tiktok", "online", "feed", "youtube", "reddit", "twitter", "group chat"],
    "home_alone": ["alone", "by myself", "empty house", "in bed", "my room"],
    "social": ["party", "friends", "bar", "hanging out", "dinner", "wedding"],
}
_INTENSIFIERS = ["right now", "about to", "already", "can't stop", "cant stop", "so bad", "really", "!!", "going to"]


def _clauses(text: str) -> list[str]:
    """Sentences and comma-separated clauses, each at least two words."""
    parts = re.split(r"[.!?;,\n]+|\s+(?:but|and so|so|because)\s+", text)
    return [p.strip() for p in parts if p and len(p.strip().split()) >= 2]


def _extract_lie(text: str, struggle: str) -> str | None:
    """The clause of the user's own words that most sounds like the justification."""
    stems = KEYWORDS.get(struggle, [])
    best, best_score = None, 0
    for clause in _clauses(text):
        low = clause.lower()
        score = sum(2 for m in _LIE_MARKERS if m in low) + sum(1 for st in stems if st in low)
        if re.search(r"\b(i|me|my|he|she|they|it)\b", low):
            score += 1
        if score > best_score:
            best, best_score = clause, score
    if best is None or best_score < 2:
        return None
    words = re.sub(r"\s+", " ", best).strip(" \"'“”").split()
    kept = words[:12]
    while len(" ".join(kept)) > 58 and len(kept) > 3:   # fit the 60-char lie field on a word boundary
        kept.pop()
    lie = " ".join(kept).rstrip(" ,;:-")
    lie = lie[0].upper() + lie[1:]
    if not lie.endswith((".", "!", "?")):
        lie += "."
    return lie


def _pick(table: dict[str, list[str]], text: str, limit: int) -> list[str]:
    hits = [(sum(1 for w in words if w in text), key) for key, words in table.items()]
    return [k for n, k in sorted(hits, key=lambda x: -x[0]) if n > 0][:limit]


def discern(body: DiscernIn) -> DiscernArgs:
    """Deterministic read of the words (no model). Every field comes from the text:
    the lie is the user's own justifying clause when one can be found, triggers and
    context from the words present, intensity from urgency markers. Confidence
    stays below the 0.6 line so the card asks 'Is this right?' and invites a correction."""
    t = body.text.lower()
    if any(w in t for w in NON_SIN):
        return DiscernArgs(
            safety_flag="none", struggle="not_a_temptation", lie="", stirred_by=[],
            triggers=_pick(_TRIGGER_WORDS, t, 2) or [], context_type="other", front="unclear",
            intensity=3, confidence=0.9, truth_queries=[],
        )
    struggle = _classify(body.text)
    default_triggers, default_ctx, default_front = ARCH_TRIGGERS.get(struggle, (["other"], "other", "unclear"))
    triggers = _pick(_TRIGGER_WORDS, t, 3) or default_triggers
    ctx = (_pick(_CONTEXT_WORDS, t, 1) or [default_ctx])[0]
    front = default_front
    if any(w in t for w in ["god doesn", "god is tired", "worthless", "too far gone", "no point", "hopeless"]):
        front = "devil"
    elif any(w in t for w in ["everyone", "compare", "better than", "they all", "perfect life"]):
        front = "world"
    lie = _extract_lie(body.text, struggle) or SEED_LIE.get(struggle, "")
    intensity = 5 + min(4, sum(1 for w in _INTENSIFIERS if w in t)) + (1 if "!" in body.text else 0)
    stirred = [k.replace("_", " ") for k in triggers[:2]]
    queries = [q for q in [struggle, lie.rstrip(".").lower()] if q]
    return DiscernArgs(
        safety_flag="none",
        struggle=struggle,  # type: ignore[arg-type]
        lie=lie,
        stirred_by=stirred,
        triggers=triggers[:4],  # type: ignore[arg-type]
        context_type=ctx,  # type: ignore[arg-type]
        front=front,  # type: ignore[arg-type]
        intensity=min(10, intensity),
        confidence=0.55 if struggle != "other" else 0.35,
        truth_queries=queries[:3],
    )


def _tokens(s: str) -> set[str]:
    return set(re.sub(r"[^a-z\s]", "", s.lower()).split())


def choose_truth(body: TruthIn, pool: list | None = None) -> TruthOut:
    """No model: curated Truth Index candidates first (they were chosen for this
    struggle), then search hits ranked by word overlap with the lie."""
    candidates = pool if pool is not None else body.candidates
    if not candidates:
        first = (body.candidateIds or ["1CO.10.13"])[0]
        rest = body.candidateIds[1:4]
        return TruthOut(primary=first, backup=(rest or [first])[0], backups=rest, why="Curated for this struggle", pool=[first, *rest])
    lie_tokens = _tokens(body.lie)
    curated = set(body.candidateIds)
    scored = []
    for i, c in enumerate(candidates):
        overlap = len(lie_tokens & _tokens(getattr(c, "text", "")))
        scored.append(((0 if c.id in curated else 1), -overlap, i, c.id))
    ranked = [cid for *_, cid in sorted(scored)]
    primary, backups = ranked[0], ranked[1:4]
    return TruthOut(primary=primary, backup=(backups or [primary])[0], backups=backups,
                    why="Curated for this struggle" if primary in curated else "Speaks to the words you used",
                    pool=ranked)


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
