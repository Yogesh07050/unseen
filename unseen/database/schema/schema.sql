--
-- PostgreSQL database dump
--

\restrict XrEYZ56ylvVNjXLAvU39hPnCdHx5NeaJnHiCZCIwLCmgTDzyj8fORYnJcrwsqu0

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    install_id uuid,
    endpoint text NOT NULL,
    model text NOT NULL,
    prompt_version text NOT NULL,
    latency_ms integer NOT NULL,
    struggle text,
    safety_flag text,
    confidence real,
    intensity smallint,
    verse_usfms text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_interactions_confidence_range CHECK (((confidence IS NULL) OR ((confidence >= (0)::double precision) AND (confidence <= (1)::double precision)))),
    CONSTRAINT ai_interactions_endpoint_known CHECK ((endpoint = ANY (ARRAY['discern'::text, 'truth'::text, 'compose'::text, 'insight'::text]))),
    CONSTRAINT ai_interactions_intensity_range CHECK (((intensity IS NULL) OR ((intensity >= 1) AND (intensity <= 10)))),
    CONSTRAINT ai_interactions_latency_nonneg CHECK ((latency_ms >= 0)),
    CONSTRAINT ai_interactions_safety_flag_known CHECK (((safety_flag IS NULL) OR (safety_flag = ANY (ARRAY['none'::text, 'self_harm'::text, 'harm_to_others'::text, 'abuse'::text, 'medical'::text, 'eating_disorder'::text, 'psychosis_signs'::text])))),
    CONSTRAINT ai_interactions_struggle_known CHECK (((struggle IS NULL) OR (struggle = ANY (ARRAY['anger'::text, 'fear'::text, 'sexual'::text, 'escapism'::text, 'shame'::text, 'envy'::text, 'compulsion'::text, 'deceit'::text, 'pride'::text, 'other'::text, 'not_a_temptation'::text]))))
);


--
-- Name: bible_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bible_versions (
    id integer NOT NULL,
    abbreviation text NOT NULL,
    title text NOT NULL,
    language text DEFAULT 'eng'::text NOT NULL,
    copyright text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bible_versions_abbreviation_nonblank CHECK ((length(btrim(abbreviation)) > 0)),
    CONSTRAINT bible_versions_id_positive CHECK ((id > 0))
);


--
-- Name: installs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installs (
    install_id uuid NOT NULL,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    client_version text,
    platform text DEFAULT 'unknown'::text NOT NULL,
    request_count bigint DEFAULT 0 NOT NULL,
    CONSTRAINT installs_platform_known CHECK ((platform = ANY (ARRAY['web'::text, 'android'::text, 'ios'::text, 'unknown'::text]))),
    CONSTRAINT installs_request_count_nonneg CHECK ((request_count >= 0)),
    CONSTRAINT installs_seen_order CHECK ((last_seen >= first_seen))
);


--
-- Name: prayer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prayer_requests (
    token text NOT NULL,
    install_id uuid,
    acks smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT prayer_requests_acks_range CHECK (((acks >= 0) AND (acks <= 10))),
    CONSTRAINT prayer_requests_expiry_after_create CHECK ((expires_at > created_at)),
    CONSTRAINT prayer_requests_token_format CHECK ((token ~ '^[A-Za-z0-9_-]{16,64}$'::text))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer NOT NULL
);


--
-- Name: scripture_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scripture_references (
    id bigint NOT NULL,
    bible_version_id integer NOT NULL,
    usfm text NOT NULL,
    book text NOT NULL,
    chapter smallint NOT NULL,
    verse smallint NOT NULL,
    reference text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scripture_references_chapter_positive CHECK ((chapter >= 1)),
    CONSTRAINT scripture_references_usfm_format CHECK ((usfm ~ '^[1-3A-Z]{3}\.[0-9]{1,3}\.[0-9]{1,3}$'::text)),
    CONSTRAINT scripture_references_usfm_matches_parts CHECK ((usfm = ((((book || '.'::text) || (chapter)::text) || '.'::text) || (verse)::text))),
    CONSTRAINT scripture_references_verse_positive CHECK ((verse >= 1))
);


--
-- Name: scripture_references_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scripture_references ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scripture_references_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: struggle_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.struggle_defaults (
    struggle text NOT NULL,
    "position" smallint NOT NULL,
    reference_id bigint NOT NULL,
    CONSTRAINT struggle_defaults_position_nonneg CHECK (("position" >= 0)),
    CONSTRAINT struggle_defaults_struggle_known CHECK ((struggle = ANY (ARRAY['anger'::text, 'fear'::text, 'sexual'::text, 'escapism'::text, 'shame'::text, 'envy'::text, 'compulsion'::text, 'deceit'::text, 'pride'::text, 'other'::text])))
);


--
-- Name: truth_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.truth_entries (
    id text NOT NULL,
    struggle text NOT NULL,
    lie text NOT NULL,
    escapes text[] DEFAULT '{}'::text[] NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT truth_entries_id_format CHECK ((id ~ '^[a-z_]+-[0-9]+$'::text)),
    CONSTRAINT truth_entries_lie_short CHECK (((length(lie) >= 1) AND (length(lie) <= 60))),
    CONSTRAINT truth_entries_review_pair CHECK (((reviewed_by IS NULL) = (reviewed_at IS NULL))),
    CONSTRAINT truth_entries_struggle_known CHECK ((struggle = ANY (ARRAY['anger'::text, 'fear'::text, 'sexual'::text, 'escapism'::text, 'shame'::text, 'envy'::text, 'compulsion'::text, 'deceit'::text, 'pride'::text, 'other'::text])))
);


--
-- Name: truth_entry_verses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.truth_entry_verses (
    entry_id text NOT NULL,
    reference_id bigint NOT NULL,
    role text NOT NULL,
    "position" smallint NOT NULL,
    CONSTRAINT truth_entry_verses_position_nonneg CHECK (("position" >= 0)),
    CONSTRAINT truth_entry_verses_role_known CHECK ((role = ANY (ARRAY['truth'::text, 'support'::text])))
);


--
-- Name: ai_interactions ai_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_interactions
    ADD CONSTRAINT ai_interactions_pkey PRIMARY KEY (id);


--
-- Name: bible_versions bible_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bible_versions
    ADD CONSTRAINT bible_versions_pkey PRIMARY KEY (id);


--
-- Name: installs installs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installs
    ADD CONSTRAINT installs_pkey PRIMARY KEY (install_id);


--
-- Name: prayer_requests prayer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prayer_requests
    ADD CONSTRAINT prayer_requests_pkey PRIMARY KEY (token);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scripture_references scripture_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripture_references
    ADD CONSTRAINT scripture_references_pkey PRIMARY KEY (id);


--
-- Name: scripture_references scripture_references_version_usfm_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripture_references
    ADD CONSTRAINT scripture_references_version_usfm_unique UNIQUE (bible_version_id, usfm);


--
-- Name: struggle_defaults struggle_defaults_no_duplicate_ref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.struggle_defaults
    ADD CONSTRAINT struggle_defaults_no_duplicate_ref UNIQUE (struggle, reference_id);


--
-- Name: struggle_defaults struggle_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.struggle_defaults
    ADD CONSTRAINT struggle_defaults_pkey PRIMARY KEY (struggle, "position");


--
-- Name: truth_entries truth_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truth_entries
    ADD CONSTRAINT truth_entries_pkey PRIMARY KEY (id);


--
-- Name: truth_entry_verses truth_entry_verses_no_duplicate_ref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truth_entry_verses
    ADD CONSTRAINT truth_entry_verses_no_duplicate_ref UNIQUE (entry_id, role, reference_id);


--
-- Name: truth_entry_verses truth_entry_verses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truth_entry_verses
    ADD CONSTRAINT truth_entry_verses_pkey PRIMARY KEY (entry_id, role, "position");


--
-- Name: ai_interactions_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_interactions_created_idx ON public.ai_interactions USING btree (created_at);


--
-- Name: ai_interactions_endpoint_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_interactions_endpoint_created_idx ON public.ai_interactions USING btree (endpoint, created_at);


--
-- Name: ai_interactions_install_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_interactions_install_created_idx ON public.ai_interactions USING btree (install_id, created_at);


--
-- Name: installs_last_seen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX installs_last_seen_idx ON public.installs USING btree (last_seen);


--
-- Name: prayer_requests_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prayer_requests_expires_at_idx ON public.prayer_requests USING btree (expires_at);


--
-- Name: prayer_requests_install_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prayer_requests_install_idx ON public.prayer_requests USING btree (install_id) WHERE (install_id IS NOT NULL);


--
-- Name: scripture_references_book_chapter_verse_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scripture_references_book_chapter_verse_idx ON public.scripture_references USING btree (bible_version_id, book, chapter, verse);


--
-- Name: truth_entries_struggle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX truth_entries_struggle_idx ON public.truth_entries USING btree (struggle);


--
-- Name: truth_entry_verses_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX truth_entry_verses_reference_idx ON public.truth_entry_verses USING btree (reference_id);


--
-- Name: ai_interactions ai_interactions_install_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_interactions
    ADD CONSTRAINT ai_interactions_install_id_fkey FOREIGN KEY (install_id) REFERENCES public.installs(install_id) ON DELETE SET NULL;


--
-- Name: prayer_requests prayer_requests_install_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prayer_requests
    ADD CONSTRAINT prayer_requests_install_id_fkey FOREIGN KEY (install_id) REFERENCES public.installs(install_id) ON DELETE SET NULL;


--
-- Name: scripture_references scripture_references_bible_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripture_references
    ADD CONSTRAINT scripture_references_bible_version_id_fkey FOREIGN KEY (bible_version_id) REFERENCES public.bible_versions(id) ON DELETE RESTRICT;


--
-- Name: struggle_defaults struggle_defaults_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.struggle_defaults
    ADD CONSTRAINT struggle_defaults_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.scripture_references(id) ON DELETE RESTRICT;


--
-- Name: truth_entry_verses truth_entry_verses_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truth_entry_verses
    ADD CONSTRAINT truth_entry_verses_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.truth_entries(id) ON DELETE CASCADE;


--
-- Name: truth_entry_verses truth_entry_verses_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truth_entry_verses
    ADD CONSTRAINT truth_entry_verses_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.scripture_references(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict XrEYZ56ylvVNjXLAvU39hPnCdHx5NeaJnHiCZCIwLCmgTDzyj8fORYnJcrwsqu0

