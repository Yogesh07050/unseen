-- 0001_init.sql — UNSEEN initial schema.
--
-- Privacy-by-architecture: there are no users, sessions or profiles. Identity is
-- an anonymous random install UUID. Nothing a person says, the "lie" they named,
-- battle outcomes, stones or any Scripture TEXT is ever stored here — only
-- structured Scripture references, content-free prayer links and metadata.
--
-- Applied by database/migrate.py inside one transaction; must be idempotent
-- enough to re-run safely (IF NOT EXISTS everywhere).

-- ───────────────────────────── Scripture (references only) ─────────────────

CREATE TABLE IF NOT EXISTS bible_versions (
    id            integer      PRIMARY KEY,                 -- YouVersion bible id (3034 = BSB)
    abbreviation  text         NOT NULL,
    title         text         NOT NULL,
    language      text         NOT NULL DEFAULT 'eng',      -- ISO 639-3
    copyright     text         NOT NULL,                    -- licence / copyright notice
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT bible_versions_id_positive CHECK (id > 0),
    CONSTRAINT bible_versions_abbreviation_nonblank CHECK (length(btrim(abbreviation)) > 0)
);

CREATE TABLE IF NOT EXISTS scripture_references (
    id                bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bible_version_id  integer      NOT NULL REFERENCES bible_versions(id) ON DELETE RESTRICT,
    usfm              text         NOT NULL,                -- 'EPH.4.26'
    book              text         NOT NULL,                -- 'EPH'
    chapter           smallint     NOT NULL,
    verse             smallint     NOT NULL,
    reference         text         NOT NULL,                -- 'Ephesians 4:26' (label, not text)
    created_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT scripture_references_usfm_format CHECK (usfm ~ '^[1-3A-Z]{3}\.[0-9]{1,3}\.[0-9]{1,3}$'),
    CONSTRAINT scripture_references_usfm_matches_parts
        CHECK (usfm = book || '.' || chapter::text || '.' || verse::text),
    CONSTRAINT scripture_references_chapter_positive CHECK (chapter >= 1),
    CONSTRAINT scripture_references_verse_positive CHECK (verse >= 1),
    CONSTRAINT scripture_references_version_usfm_unique UNIQUE (bible_version_id, usfm)
);
CREATE INDEX IF NOT EXISTS scripture_references_book_chapter_verse_idx
    ON scripture_references (bible_version_id, book, chapter, verse);

-- ───────────────────────────── Truth Index ─────────────────────────────────

CREATE TABLE IF NOT EXISTS truth_entries (
    id           text         PRIMARY KEY,                   -- 'anger-1'
    struggle     text         NOT NULL,
    lie          text         NOT NULL,                      -- curated editorial lie label, not user text
    escapes      text[]       NOT NULL DEFAULT '{}',         -- way-of-escape action ids, best first
    reviewed_by  text,                                       -- theological reviewer (NULL = not yet)
    reviewed_at  timestamptz,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT truth_entries_id_format CHECK (id ~ '^[a-z_]+-[0-9]+$'),
    CONSTRAINT truth_entries_struggle_known CHECK (struggle IN (
        'anger','fear','sexual','escapism','shame','envy','compulsion','deceit','pride','other')),
    CONSTRAINT truth_entries_lie_short CHECK (length(lie) BETWEEN 1 AND 60),
    CONSTRAINT truth_entries_review_pair CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS truth_entries_struggle_idx ON truth_entries (struggle);

CREATE TABLE IF NOT EXISTS truth_entry_verses (
    entry_id      text      NOT NULL REFERENCES truth_entries(id) ON DELETE CASCADE,
    reference_id  bigint    NOT NULL REFERENCES scripture_references(id) ON DELETE RESTRICT,
    role          text      NOT NULL,
    position      smallint  NOT NULL,
    CONSTRAINT truth_entry_verses_pkey PRIMARY KEY (entry_id, role, position),
    CONSTRAINT truth_entry_verses_role_known CHECK (role IN ('truth', 'support')),
    CONSTRAINT truth_entry_verses_position_nonneg CHECK (position >= 0),
    CONSTRAINT truth_entry_verses_no_duplicate_ref UNIQUE (entry_id, role, reference_id)
);
CREATE INDEX IF NOT EXISTS truth_entry_verses_reference_idx ON truth_entry_verses (reference_id);

-- DEFAULTS: the verse(s) used for a struggle when no entry matched the lie.
-- A struggle can have several ordered verses (anger -> EPH.4.26, EPH.4.27), so
-- the key is (struggle, position) rather than struggle alone.
CREATE TABLE IF NOT EXISTS struggle_defaults (
    struggle      text      NOT NULL,
    position      smallint  NOT NULL,
    reference_id  bigint    NOT NULL REFERENCES scripture_references(id) ON DELETE RESTRICT,
    CONSTRAINT struggle_defaults_pkey PRIMARY KEY (struggle, position),
    CONSTRAINT struggle_defaults_struggle_known CHECK (struggle IN (
        'anger','fear','sexual','escapism','shame','envy','compulsion','deceit','pride','other')),
    CONSTRAINT struggle_defaults_position_nonneg CHECK (position >= 0),
    CONSTRAINT struggle_defaults_no_duplicate_ref UNIQUE (struggle, reference_id)
);

-- ───────────────────────────── Anonymous installs ──────────────────────────

CREATE TABLE IF NOT EXISTS installs (
    install_id      uuid         PRIMARY KEY,                -- random, generated on the phone
    first_seen      timestamptz  NOT NULL DEFAULT now(),
    last_seen       timestamptz  NOT NULL DEFAULT now(),
    client_version  text,                                    -- X-Client-Version
    platform        text         NOT NULL DEFAULT 'unknown', -- X-Client-Platform
    request_count   bigint       NOT NULL DEFAULT 0,
    CONSTRAINT installs_platform_known CHECK (platform IN ('web', 'android', 'ios', 'unknown')),
    CONSTRAINT installs_request_count_nonneg CHECK (request_count >= 0),
    CONSTRAINT installs_seen_order CHECK (last_seen >= first_seen)
);
CREATE INDEX IF NOT EXISTS installs_last_seen_idx ON installs (last_seen);

-- ───────────────────────────── Prayer links (content-free) ─────────────────

CREATE TABLE IF NOT EXISTS prayer_requests (
    token       text         PRIMARY KEY,                    -- secrets.token_urlsafe(16)
    install_id  uuid         REFERENCES installs(install_id) ON DELETE SET NULL,
    acks        smallint     NOT NULL DEFAULT 0,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    expires_at  timestamptz  NOT NULL,
    CONSTRAINT prayer_requests_token_format CHECK (token ~ '^[A-Za-z0-9_-]{16,64}$'),
    CONSTRAINT prayer_requests_acks_range CHECK (acks BETWEEN 0 AND 10),
    CONSTRAINT prayer_requests_expiry_after_create CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS prayer_requests_expires_at_idx ON prayer_requests (expires_at);
CREATE INDEX IF NOT EXISTS prayer_requests_install_idx
    ON prayer_requests (install_id) WHERE install_id IS NOT NULL;

-- ───────────────────────────── AI call metadata ────────────────────────────
-- Observability only. There is deliberately NO column for the user's words,
-- the lie, the reflection, the gentle reply or any Scripture text.

CREATE TABLE IF NOT EXISTS ai_interactions (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    install_id      uuid         REFERENCES installs(install_id) ON DELETE SET NULL,
    endpoint        text         NOT NULL,
    model           text         NOT NULL,                   -- 'gloo-anthropic-claude-haiku-4.5' | 'fallback-classifier'
    prompt_version  text         NOT NULL,                   -- 'discern@1', 'discern@fallback', ...
    latency_ms      integer      NOT NULL,
    struggle        text,
    safety_flag     text,
    confidence      real,
    intensity       smallint,
    verse_usfms     text[]       NOT NULL DEFAULT '{}',      -- structured references only
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ai_interactions_endpoint_known CHECK (endpoint IN ('discern', 'truth', 'compose', 'insight')),
    CONSTRAINT ai_interactions_latency_nonneg CHECK (latency_ms >= 0),
    CONSTRAINT ai_interactions_struggle_known CHECK (struggle IS NULL OR struggle IN (
        'anger','fear','sexual','escapism','shame','envy','compulsion','deceit','pride','other','not_a_temptation')),
    CONSTRAINT ai_interactions_safety_flag_known CHECK (safety_flag IS NULL OR safety_flag IN (
        'none','self_harm','harm_to_others','abuse','medical','eating_disorder','psychosis_signs')),
    CONSTRAINT ai_interactions_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT ai_interactions_intensity_range CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 10)
);
CREATE INDEX IF NOT EXISTS ai_interactions_install_created_idx ON ai_interactions (install_id, created_at);
CREATE INDEX IF NOT EXISTS ai_interactions_created_idx ON ai_interactions (created_at);
CREATE INDEX IF NOT EXISTS ai_interactions_endpoint_created_idx ON ai_interactions (endpoint, created_at);
