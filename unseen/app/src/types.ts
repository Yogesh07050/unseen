// Normative types (Technical Design Document §4, §9)

export type Channel = 'voice' | 'whisper' | 'text' | 'shield' | 'chip';
export type Struggle =
  | 'anger' | 'fear' | 'sexual' | 'escapism' | 'shame' | 'envy'
  | 'compulsion' | 'deceit' | 'pride' | 'other' | 'not_a_temptation';
export type SafetyFlag =
  | 'none' | 'self_harm' | 'harm_to_others' | 'abuse' | 'medical'
  | 'eating_disorder' | 'psychosis_signs';
export type Outcome = 'stood' | 'still_fighting' | 'fell';
export type Trigger =
  | 'tired' | 'alone' | 'hurt' | 'bored' | 'stressed' | 'hungry'
  | 'conflict' | 'online' | 'late_night' | 'other';
export type ContextType =
  | 'family' | 'work' | 'school' | 'church' | 'online' | 'home_alone' | 'social' | 'other';
export type Front = 'world' | 'flesh' | 'devil' | 'unclear';
export type ArchetypeId =
  | 'ember' | 'whisperer' | 'serpent' | 'fog' | 'accuser'
  | 'mirror' | 'chain' | 'mask' | 'crown' | 'shadow';

export interface Discernment {
  safety_flag: SafetyFlag;
  struggle: Struggle;
  lie: string;
  stirred_by: string[];
  triggers: Trigger[];
  context_type: ContextType;
  front: Front;
  intensity: number;
  confidence: number;
  truth_queries: string[];
}

export interface VerseRef { bibleId: number; usfm: string[]; reference: string }
// version, versionTitle and copyright describe the Bible that actually served the
// text (the chosen version, or the public-domain BSB when it stood in) — the
// copyright notice must be displayed with the text (YouVersion licence terms).
export interface Passage {
  bibleId: number; usfm: string[]; reference: string; text: string;
  version: string; versionTitle: string; copyright: string;
}
// A VerifiedVerse is only ever produced by engines/verify.ts
export type VerifiedVerse = Passage & { phrases: string[]; __verified: true };

// Every record the app keeps carries `updatedAt` (ms): the sealed store and the
// server copy (database/migrations/0002_user_data.sql) merge by last write.
export interface Battle {
  id: string; startedAt: number; endedAt?: number; timeZone: string;
  channel: Channel; struggle: Struggle; archetype: ArchetypeId;
  lie: string; lieClusterId: string; stirredBy: string[];
  triggers: Trigger[]; contextType: ContextType; front: Front; intensity: number;
  verse: VerseRef; backup?: VerseRef; backups?: VerseRef[]; why?: string;
  strikes: number; outcome: Outcome; escapeTaken?: string;
  secondsToPeace?: number; allyAcks: number; offline: boolean;
  promptVersion: string; model?: string; updatedAt?: number;
}

export interface Stone {
  id: string; battleId?: string; kind: 'stood' | 'rose_again' | 'from_memory';
  date: string; verse?: VerseRef; note?: string; updatedAt?: number;
}

export interface Transcript { id: string; text: string; expiresAt: number }

export interface LieCluster {
  id: string; label: string; struggle: Struggle; tokens: string[];
  count: number; lastSeen: number; recentOutcomes: Outcome[];
}

export interface ArmoryVerse {
  id: string; verse: VerseRef; firstWords: string;
  sharpness: 0 | 1 | 2 | 3 | 4 | 5; nextDrillAt: number; wins: number; drills: number; updatedAt?: number;
}

export type PlanAction = {
  kind: 'shield' | 'ally_checkin' | 'verse' | 'physical' | 'morning_armor';
  label: string; payload?: Record<string, string>;
};

export interface WatchWindow {
  id: string; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; startHour: number; endHour: number;
  score: number; battles: number; reason: string; level: 'high' | 'medium';
  plan: PlanAction[]; approved: boolean; lastAlertAt?: number; dismissals: number; updatedAt?: number;
}

export interface Ally {
  id: string; name: string; role?: string; pronoun?: 'he' | 'she' | 'they';
  phone?: string; consentAt: number;
  lastAskedAt?: number; // when a prayer link was last created for them
  updatedAt?: number;
}

export interface Settings {
  id: 'me'; firstName?: string; tradition?: 'evangelical' | 'catholic' | 'mainline';
  bibleId: number; battleStyle: 'cinematic' | 'symbolic'; reduceMotion: boolean; sound: boolean;
  retentionDays: 7 | 30 | null;
  watchAlerts: 'off' | 'in_app' | 'calendar' | 'push'; adultConfirmedAt: number; onboardedAt: number;
  counsellorUrl?: string; crisisCountry?: string;
  theme?: 'light' | 'dark' | 'system';
  // 'gloo' = the model reads the words (default); 'instant' = on-device keyword read only, no network.
  discernMode?: 'gloo' | 'instant';
  discernChosen?: boolean; // the person picked a mode themselves (older installs defaulted to 'instant')
  armorIntention?: string; armorPeaceStep?: string; armorIdentity?: string; armorAlly?: string; armorPlanArmed?: boolean;
  updatedAt?: number;
}

export interface LocalEvent {
  id: string; ts: number;
  type: 'harbor_shown' | 'harbor_override' | 'armor_on' | 'drill' | 'reel_made' | 'alert_shown' | 'alert_dismissed';
  meta?: Record<string, string | number>;
}
