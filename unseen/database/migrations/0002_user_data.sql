-- 0002_user_data.sql — per-install user data: profile, battles, stones, allies,
-- Armory verses and Kairos Watch windows.
--
-- UNSEEN moved from "demo on the phone only" to a real product on 2026-10-08:
-- everything the app records is now kept for the install that recorded it, so a
-- reinstall or a second device can pull it back and Stones / Schemes / Armory /
-- Allies are backed by durable rows, not only the phone's IndexedDB. Identity is
-- still the anonymous install UUID (no accounts, no e-mail). Raw transcripts —
-- the user's spoken words — are deliberately NOT stored here; they stay on the
-- phone under the user's own retention setting.
--
-- Shape: every table keeps the fields the server indexes or constrains as real
-- columns and the complete client object in `data` (jsonb). The client object
-- (app/src/types.ts) is the contract; the columns make the rows queryable.
-- Rows are soft-deleted (deleted_at) so a second device learns about the
-- deletion on its next pull; DELETE /api/me hard-deletes everything.

ALTER TABLE installs ADD COLUMN IF NOT EXISTS synthetic boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN installs.synthetic IS 'true for rows created by database/seeds/seed.py (replaced on every seed run); real devices are never synthetic';

CREATE TABLE IF NOT EXISTS user_profiles (
    install_id    uuid         PRIMARY KEY REFERENCES installs(install_id) ON DELETE CASCADE,
    first_name    text,
    tradition     text,
    bible_id      integer      NOT NULL DEFAULT 3034,
    onboarded_at  timestamptz,
    data          jsonb        NOT NULL,                     -- the Settings object
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT user_profiles_tradition_known CHECK (tradition IS NULL OR tradition IN ('evangelical', 'catholic', 'mainline')),
    CONSTRAINT user_profiles_bible_positive CHECK (bible_id > 0),
    CONSTRAINT user_profiles_first_name_short CHECK (first_name IS NULL OR length(first_name) <= 60)
);

CREATE TABLE IF NOT EXISTS user_battles (
    install_id    uuid         NOT NULL REFERENCES installs(install_id) ON DELETE CASCADE,
    id            text         NOT NULL,
    started_at    timestamptz  NOT NULL,
    ended_at      timestamptz,
    struggle      text         NOT NULL,
    outcome       text         NOT NULL,
    lie           text         NOT NULL DEFAULT '',
    context_type  text,
    intensity     smallint,
    verse_usfms   text[]       NOT NULL DEFAULT '{}',        -- references only, e.g. {EPH.4.26,EPH.4.27}
    data          jsonb        NOT NULL,                     -- the Battle object
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT user_battles_pkey PRIMARY KEY (install_id, id),
    CONSTRAINT user_battles_id_short CHECK (length(id) BETWEEN 1 AND 64),
    CONSTRAINT user_battles_struggle_known CHECK (struggle IN (
        'anger','fear','sexual','escapism','shame','envy','compulsion','deceit','pride','other','not_a_temptation')),
    CONSTRAINT user_battles_outcome_known CHECK (outcome IN ('stood', 'still_fighting', 'fell')),
    CONSTRAINT user_battles_lie_short CHECK (length(lie) <= 200),
    CONSTRAINT user_battles_intensity_range CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 10),
    CONSTRAINT user_battles_ended_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS user_battles_install_started_idx ON user_battles (install_id, started_at DESC);
CREATE INDEX IF NOT EXISTS user_battles_install_updated_idx ON user_battles (install_id, updated_at);
CREATE INDEX IF NOT EXISTS user_battles_struggle_idx ON user_battles (install_id, struggle) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS user_stones (
    install_id    uuid         NOT NULL REFERENCES installs(install_id) ON DELETE CASCADE,
    id            text         NOT NULL,
    battle_id     text,
    kind          text         NOT NULL,
    date          date         NOT NULL,
    data          jsonb        NOT NULL,                     -- the Stone object
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT user_stones_pkey PRIMARY KEY (install_id, id),
    CONSTRAINT user_stones_id_short CHECK (length(id) BETWEEN 1 AND 64),
    CONSTRAINT user_stones_kind_known CHECK (kind IN ('stood', 'rose_again', 'from_memory'))
);
CREATE INDEX IF NOT EXISTS user_stones_install_date_idx ON user_stones (install_id, date DESC);
CREATE INDEX IF NOT EXISTS user_stones_install_updated_idx ON user_stones (install_id, updated_at);

CREATE TABLE IF NOT EXISTS user_allies (
    install_id    uuid         NOT NULL REFERENCES installs(install_id) ON DELETE CASCADE,
    id            text         NOT NULL,
    name          text         NOT NULL,
    consent_at    timestamptz  NOT NULL,
    data          jsonb        NOT NULL,                     -- the Ally object (name, optional phone/role)
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT user_allies_pkey PRIMARY KEY (install_id, id),
    CONSTRAINT user_allies_id_short CHECK (length(id) BETWEEN 1 AND 64),
    CONSTRAINT user_allies_name_short CHECK (length(name) BETWEEN 1 AND 80)
);
CREATE INDEX IF NOT EXISTS user_allies_install_updated_idx ON user_allies (install_id, updated_at);

CREATE TABLE IF NOT EXISTS user_armory (
    install_id     uuid         NOT NULL REFERENCES installs(install_id) ON DELETE CASCADE,
    id             text         NOT NULL,                    -- '<bibleId>:<usfm,usfm>'
    verse_usfms    text[]       NOT NULL DEFAULT '{}',
    sharpness      smallint     NOT NULL DEFAULT 0,
    next_drill_at  timestamptz,
    data           jsonb        NOT NULL,                    -- the ArmoryVerse object
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    CONSTRAINT user_armory_pkey PRIMARY KEY (install_id, id),
    CONSTRAINT user_armory_id_short CHECK (length(id) BETWEEN 1 AND 128),
    CONSTRAINT user_armory_sharpness_range CHECK (sharpness BETWEEN 0 AND 5)
);
CREATE INDEX IF NOT EXISTS user_armory_install_updated_idx ON user_armory (install_id, updated_at);

CREATE TABLE IF NOT EXISTS user_watch (
    install_id    uuid         NOT NULL REFERENCES installs(install_id) ON DELETE CASCADE,
    id            text         NOT NULL,                     -- 'w-<weekday>-<startHour>'
    weekday       smallint     NOT NULL,
    start_hour    smallint     NOT NULL,
    end_hour      smallint     NOT NULL,
    level         text         NOT NULL,
    data          jsonb        NOT NULL,                     -- the WatchWindow object (reason, plan)
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT user_watch_pkey PRIMARY KEY (install_id, id),
    CONSTRAINT user_watch_id_short CHECK (length(id) BETWEEN 1 AND 64),
    CONSTRAINT user_watch_weekday_range CHECK (weekday BETWEEN 0 AND 6),
    CONSTRAINT user_watch_hours_range CHECK (start_hour BETWEEN 0 AND 23 AND end_hour BETWEEN 1 AND 24),
    CONSTRAINT user_watch_level_known CHECK (level IN ('high', 'medium'))
);
CREATE INDEX IF NOT EXISTS user_watch_install_updated_idx ON user_watch (install_id, updated_at);
