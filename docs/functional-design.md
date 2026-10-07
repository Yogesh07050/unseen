# UNSEEN

## Armor for the unseen

## battle

### A voice-first Scripture companion for the

### moment of temptation

#### Functional Design Document

#### Gloo AI Hackathon 2026, Boulder, October 6-

#### Track 2: Scripture Beyond the App, Activation Lane

#### Prepared by Praveen Dominic

#### October 5, 2026

##### Contents

##### 1. Executive summary

##### 2. Hackathon fit

##### 3. Spiritual warfare: biblical foundation and design principles

##### 4. Personas and core user journeys

##### 5. Feature set: hackathon MVP vs. stretch

##### 6. Screen-by-screen functional spec

##### 7. Battle engine: characters, animation and video

##### 8. AI pipeline and system architecture

##### 9. Pattern analytics and Kairos Watch

##### 10. Privacy, safety and theological guardrails

##### 11. Data model and API contracts

##### 12. Demo, validation, build plan and team

##### 13. Success metrics, risks and roadmap

##### 14. Appendix

### See the battle. Speak the Word. Walk free.


## 1. Executive summary

##### UNSEEN is a voice-first, cinematic companion for the moment of temptation: you speak the struggle, AI discerns the lie behind it,

##### and Scripture becomes the sword you speak aloud while a guardian angel drives the tempter off-screen. Every battle is logged

##### privately on your phone, and the patterns turn into forecasts of your hardest hours, so you are armed before they arrive.

##### Full name: UNSEEN — Armor for the unseen battle.

##### Tagline: See the battle. Speak the Word. Walk free.

##### Name: from 2 Kings 6:17, where Elisha prays for his frightened servant's eyes to be opened, and the servant sees the hills full of

##### horses and chariots of fire around them. UNSEEN opens your eyes to the battle, and to who fights with you.

##### Pitch line: Luke 4:13 says the devil left Jesus "until an opportune time." UNSEEN learns your opportune times before he does, and

##### puts the Word in your mouth when they come.

##### Spiritual warfare at the core: every feature is a piece of the armor of God (Ephesians 6:10-18), and recurring lies are strongholds

##### to tear down (2 Corinthians 10:4). Every victory is credited to Christ, who has already disarmed the powers (Colossians 2:15).

##### Recommended entry: Track 2, Scripture Beyond the App, Activation Lane (Bible track prize), competing for the Grand Prize and

##### the Best Design and Best Storytelling categories.

### The 40-second wow moment

##### 1. The user holds the glowing orb and says: "My brother just humiliated me in the family chat and I want to fire back something

##### cruel."

##### 2. The screen darkens. A smouldering shadow, The Ember, rises holding a scroll with the lie in the user's own words: "He

##### deserves it."

##### 3. "It is written" appears, and Ephesians 4:26-27 (fetched live from YouVersion) blazes onto the guardian's sword.

##### 4. The user reads the verse aloud. Each phrase the microphone recognises lands a strike; the scroll burns; The Ember flees.

##### 5. "Angels came and ministered to him" (Matthew 4:11): the scene turns calm and offers one way of escape, a gentle reply drafted

##### for the user to edit (Proverbs 15:1).

##### 6. A stone is laid on the user's Ebenezer wall. The Schemes view notes this is the fourth Sunday-night family-chat battle, so

##### Kairos Watch arms next Sunday, 8-10 pm.


## 2. Hackathon fit

##### Enter Track 2, Scripture Beyond the App, in the Activation Lane: UNSEEN brings Scripture into the exact moment and place

##### temptation happens, the lock screen, the app you were about to open, the message you were about to send. The track's own

##### examples include recovery, loneliness and messaging environments, which is precisely where these battles are fought.

### Event facts that shape the build

```
Item Detail
```
```
Event Oct 6-8, 2026, Limelight Hotel, Boulder, CO; theme "Build Together: Humans, Agents, and the Future of Flourishing"
(hackathon page)
```
```
Prizes $100,000 Grand Prize; $20,000 Best in Bible Track; $20,000 Best in Agent Track (HQ); categories may also include Best
Design, Best Storytelling or Pitch and Best Technology (rules)
```
```
Deadlines Preliminary submission 9:00 pm MT, Wed Oct 7 (video optional); finalist submission 9:00 am MT, Thu Oct 8 (video
required)
```
```
What to submit Code via the organisers' GitHub or Drive, a 250-word description, and a demo video of at most 90 seconds; every team
gives a 90-second summary
```
```
Judging Five criteria at 20% each; ties break on Impact and Execution first, then Concept/Product, then AI
```
```
Content rule Entries must be acceptable for all viewing audiences
```
```
Work rule Only work done during the competition period (from Sept 8, 2026) is judged
```
```
Recommended
tools
```
```
Gloo AI Studio (values-aligned models) and the YouVersion Platform (Bible API)
```
### Track 2 requirements, answered

```
Track 2 asks for (challenge brief) UNSEEN's answer
```
```
Need: who, what barrier, why it
matters
```
```
Christians in church recovery and accountability groups who face recurring temptation alone, late at
night, phone in hand, when Scripture is three taps and a search away
```
```
Encounter: Scripture delivered
naturally in context
```
```
The verse arrives inside the moment (voice, lock screen, app shield) and is the weapon itself
```
```
Response: reflect, pray, act,
connect
```
```
Speak the verse aloud, pray a breath prayer, take one way of escape, or signal allies
```
```
Continuation: what happens next Verses move into the Armory for memorisation, optionally sync to YouVersion highlights, and link to a
recovery group or pastor
```
```
Validation: who you learned from,
what changed
```
```
A 30-day validation log template is in section 12; it must be filled with real interviews, not assumptions
```

### Guardrails, answered

##### No pasted-on Scripture: the verse is the core mechanic, not decoration.

##### No fabricated Scripture or theology: verse text comes only from the YouVersion API and is checked character-for-character;

##### AI words are labelled "reflection".

##### No optimising for attention or data capture: no streaks, no feed, data stays on the device, and the headline metric is

##### victories won without the app.

##### No unnecessary risk to vulnerable people: no account needed, an encrypted on-device log, and a Safe Harbor route that

##### skips the battle entirely when someone is in crisis.

##### Licensing respected: the default text is the Berean Standard Bible, which YouVersion lists as dedicated to the public domain;

##### other versions follow their licences.

##### All-audiences rule, applied: the demo uses anger rather than sexual temptation, and tempters are symbolic shadows, never

##### gore or horror.

### The five questions a Track 2 judge must be able to answer

##### 1. Who are you serving? People in church recovery and accountability groups, starting with 18-35-year-olds who fight alone at

##### night.

##### 2. What barrier did you discover? In the few minutes that decide the battle, nobody can remember or find the right verse, and

##### shame stops them calling anyone.

##### 3. Why is Scripture essential? Jesus answered each temptation with "It is written" (Matthew 4); in UNSEEN the spoken verse is

##### the only way to win.

##### 4. What did you learn from validation? To be filled from the interviews in section 12.

##### 5. How could it reach more people? Through recovery ministries, church small groups and YouVersion's audience, and in any

##### language YouVersion supports.


## 3. Spiritual warfare: biblical foundation and design

## principles

##### UNSEEN treats temptation as spiritual warfare in the full biblical sense. The struggle is against spiritual forces, not people

##### (Ephesians 6:12); it is fought with spiritual weapons (2 Corinthians 10:4); and Christ has already won it (Colossians 2:15).

##### UNSEEN's core loop is the pattern of Jesus's temptation in Matthew 4:1-11: tempted, "It is written", the devil leaves, angels minister.

##### The visual language follows a 350-year-old precedent: in John Bunyan's The Pilgrim's Progress (1678), Christian is knocked down by

##### Apollyon, recovers his sword, quotes Micah 7:8, and the enemy flees. UNSEEN is that allegory, made interactive and personal.

### The battle is real, and Christ has already won it

##### Seven passages set the theology behind every battle screen. The app shows their text from YouVersion and quotes nothing from

##### memory.

```
Passage What it establishes Where UNSEEN shows it
```
```
Ephesians 6:12 The struggle is not against flesh and blood but against
spiritual forces of evil
```
```
The tempter is never a person: in the anger battle the
enemy is the lie, not the brother
```
```
2 Corinthians
10:3-
```
```
Our weapons are not the world's; they demolish strongholds
and take every thought captive
```
```
Lie-to-Truth discernment and Strongholds
```
```
1 Peter 5:8-9 The adversary prowls like a roaring lion; stay alert and resist
him, firm in the faith
```
```
Kairos Watch and Morning Armor
```
```
James 4:7 Submit to God, resist the devil, and he will flee The tempter's flight at the end of every battle
```
```
1 John 4:4 The One who is in you is greater than the one who is in the
world
```
```
Home and Morning Armor, so every day starts from
strength
```
```
Colossians 2:15 Christ disarmed the powers and triumphed over them by the
cross
```
```
The battle's climax, below
```
```
Revelation 12:11 They overcame by the blood of the Lamb and the word of
their testimony
```
```
The Testimony Reel
```
### The full armor of God is the backbone

##### Every feature is one piece of the armor in Ephesians 6:13-18. Morning Armor puts it on in 60 seconds, each morning or before a

##### watch window. At the hackathon it is a thin slice: one guided screen with the day's verse from YouVersion.

```
Armor (Ephesians 6) In UNSEEN Morning Armor step
```
```
Belt of truth (6:14) Discern names the lie and It is written answers it with truth (John
8:32)
```
```
Name the lie you expect today
```
```
Breastplate of righteousness
(6:14)
```
```
Rise Again: your standing rests on Christ's righteousness, not on a
streak (2 Corinthians 5:21)
```
```
Receive grace for yesterday
```

```
Armor (Ephesians 6) In UNSEEN Morning Armor step
```
```
Feet ready with the gospel of
peace (6:15)
```
```
Angels minister: peace, then one way of escape Choose one step toward peace
with someone
```
```
Shield of faith (6:16) Shield Interceptor stops the flaming arrows at the opportune hour Arm tonight's shields
```
```
Helmet of salvation (6:17) Hope and identity in Christ against the Accuser (1 Thessalonians 5:8) Say who you are in Christ
```
```
Sword of the Spirit (6:17) Speak the Sword: the spoken Word drives every strike Speak today's verse aloud once
```
```
Prayer in the Spirit, staying alert
(6:18)
```
```
Cry out, allies praying for one another, and Kairos Watch Pray for one ally by name
```
### Strongholds: how patterns become targets

##### A lie that keeps returning, five or more battles in eight weeks, is named a stronghold (2 Corinthians 10:4). Schemes shows each

##### stronghold with the truth that answers it and its stand rate. A stronghold is marked torn down after six stands in a row, or eight

##### weeks without returning; the wording keeps it the enemy's fortification, never the user's identity.

### Christ at the centre of every victory

##### The guardian serves (Hebrews 1:14); the victory belongs to Christ (Colossians 2:15). Four design rules follow:

##### 1. The climax is the cross. As the last phrase is spoken, the lie-scroll is nailed to a cross of light and burns away (Colossians 2:14),

##### then the tempter flees.

##### 2. The words give Christ the credit. The victory headline reads "You stood, in His strength," and a cross of light stands on the

##### horizon behind the guardian.

##### 3. The angel is never the object of devotion. No one prays to, names or thanks the guardian (Colossians 2:18); prayer always

##### goes to God.

##### 4. Every battle ends in thanks. A one-line prayer of thanks to Jesus, labelled as a prayer guide, not Scripture.

### Every feature has a verse behind it

```
Feature Scripture anchor What it means in the product
```
```
Battle loop Matthew 4:1-11 Tempted, then "It is written", then the enemy leaves, then angels minister
```
```
Speak the Sword Ephesians 6:17 The sword of the Spirit is the word of God; the Greek word there is rhema , the
spoken word, so the user speaks it aloud
```
```
Lie to Truth John 8:44, John 8:32, 2
Corinthians 10:
```
```
Temptation runs on a lie; the AI names it and answers it with truth, taking the
thought captive
```
```
Tempter flees James 4:7 Resist the devil and he will flee: the exit animation
```
```
Way of Escape 1 Corinthians 10:13 God provides a way out, so every battle ends with one concrete next step
```
```
Schemes (analytics) 2 Corinthians 2:11, Ephesians 6:11 We are not to be unaware of his schemes, so the patterns are made visible
```

```
Feature Scripture anchor What it means in the product
```
```
Kairos Watch
(forecast)
```
```
Luke 4:13, Matthew 26:41 The devil left "until an opportune time"; watch and pray before it comes
```
```
Aaron and Hur
(allies)
```
```
Exodus 17:12, Ecclesiastes 4:12,
James 5:
```
```
The battle was won while friends held up Moses's arms; nobody fights alone
```
```
Ebenezer wall (log) 1 Samuel 7:12, Malachi 3:16 Stones of remembrance mark where the LORD has helped
```
```
Rise Again (after a
fall)
```
```
Micah 7:8, Proverbs 24:16, 1 John
1:9, Romans 8:
```
```
A fall never erases a stone; there is no condemnation
```
```
Armory
(memorisation)
```
```
Psalm 119:11 The Word hidden in the heart, so the app is needed less
```
```
The Guardian Psalm 91:11, Hebrews 1:14 Angels as ministering spirits sent to serve
```
```
Testimony Reel Revelation 12:11 They overcame by the blood of the Lamb and the word of their testimony
```
```
The name 2 Kings 6:16-17 Those who are with us are more than those who are with them
```
### Design principles

##### 1. Scripture is the weapon, not the wallpaper. Verse text comes only from YouVersion and is never generated by the model.

##### 2. Name the lie, then the truth. The AI's job is discernment and retrieval, not preaching.

##### 3. Grace over streaks. No counter ever resets to zero; a fall becomes a Rise Again moment, and earlier stones stay.

##### 4. Allegory, not claims. The visuals are parables in the Pilgrim's Progress tradition; the app never claims to cast out, diagnose,

##### counsel or absolve.

##### 5. Three fronts, named honestly. Temptation can come from the world, the flesh (James 1:14) or the devil, so the app never

##### blames everything on demons.

##### 6. Reverent imagery. The Holy Spirit appears only as light, flame, wind or a dove, never as a human figure; the guardian's face

##### stays hidden in light; tempters are symbolic and suitable for all audiences.

##### 7. Private by default. A record of someone's sins is the most sensitive data they can create, so it never leaves the device in

##### readable form.

##### 8. Designed to be outgrown. Success is measured by victories won from memory, without opening the app.

##### 9. Humans stay in the loop. Allies, pastors and counsellors are one tap away, and a crisis skips the battle entirely.


## 4. Personas and core user journeys

##### The primary user is a young adult in a church recovery or accountability group who fights recurring temptation alone, late at night,

##### phone in hand. The personas below are design assumptions to be tested in validation (section 12), not research findings.

```
Persona Context Hardest moment What they need from UNSEEN
```
```
Daniel, 24
(primary)
```
```
Attends his church's recovery group for a
compulsive late-night online habit
```
```
11 pm to 1 am, alone,
accountability partner asleep
```
```
Instant Scripture without searching,
privacy, and no shame after a fall
```
```
Grace, 31 Nurse and young mother; anger and
anxiety after long shifts
```
```
In the car after work; heated
family group chats
```
```
A silent mode, a way to cool down before
replying, and patterns she can act on
```
```
Pastor Mike,
45 (ally)
```
```
Leads a men's group of eight Learning about a member's
struggle only after a relapse
```
```
A way to pray in the moment without
ever seeing private details
```
### Journey 1: the in-the-moment battle (target under 60 seconds to the first strike)

##### 1. Cry out. Hold the Spirit orb, press the phone's action button, or tap the lock-screen widget. The orb pulses with the voice and a

##### live transcript appears.

##### 2. Discern (target 3 seconds). A card reflects what was heard: the struggle, the lie behind it, the trigger. One tap on "Not quite"

##### corrects it.

##### 3. It is written (target 4 seconds). The verse appears on the guardian's sword; it can be read aloud by a calm voice.

##### 4. Speak the Sword (10-30 seconds). The user reads the verse aloud; each recognised phrase lands a strike and the lie-scroll

##### burns.

##### 5. Angels minister. A calm scene, a breath prayer, and one way of escape: a gentle reply draft, call an ally, take a walk, play a

##### worship song, or put the phone in another room.

##### 6. Lay a stone. One tap records the outcome (Stood, Still fighting, Fell) with an optional spoken note.


##### The spoken verse wins the moment, and the stones arm the next watch

```
In the moment
```
```
After the battle, then over the following weeks
```
**1. Cry out**
Hold the orb, speak,
whisper or type
**2. Discern**
AI names the struggle
and the lie behind it
**3. It is written**
A verse answers
that exact lie
**4. Speak the Sword**
Each spoken phrase
lands a strike
**5. Angels minister**
Peace, then one way
of escape
**6. Lay a stone**
Stood, still fighting
or rose again

```
Schemes
When, which lie,
which truth holds
```
```
Kairos Watch
Arms you before the
next opportune time
```
```
armed before the next one the tempter flees
```
```
Figure 1. Battle loop: 4 steps in the moment, 4 over the weeks
```
##### The top row is the battle itself; the bottom row starts the moment the tempter flees and, over the following weeks, arms the user

##### before the next opportune time.

### Other journeys

##### Silent battle (at work or in public). Type or tap a struggle chip; the verse is read silently and each phrase is tapped to strike.

##### Intercepted battle (Shield). Opening an app the user has flagged, during a forecast risk window, shows the Shield screen

##### with a verse; "Fight" opens the battle and "I'm OK" continues, because the user stays in charge.

##### After a fall (Rise Again). A grace screen with 1 John 1:9, a short confession prayer, a three-question debrief (trigger, lie, what

##### would help next time) and an optional ally ping.

##### Weekly rhythm. A Sunday-evening debrief shows the week's schemes, next week's risk windows, Armory practice and the

##### Testimony Reel.

##### Crisis (Safe Harbor). Signs of self-harm, abuse or danger skip the battle entirely and go straight to human help.


## 5. Feature set: hackathon MVP vs. stretch

##### Build one complete loop live (cry out, discern, verse, spoken strike, escape, stone, patterns, safety edge case) and show everything

##### else honestly as design. Judges reward a working slice that hits the success test over a broad tool that does not.

```
Feature What it does Hackathon scope AI or API used
```
```
Cry Out Voice capture through the Spirit orb,
with a typed fallback
```
```
Build live On-device speech recognition
```
```
Discern Names the struggle, the lie, the
trigger, the front and the risk level
```
```
Build live Gloo Completions V2 (guarded),
structured output, tradition
```
```
It Is Written Picks the verse that answers that
exact lie
```
```
Build live Curated Truth Index, YouVersion
passages and verse search
```
```
Speak the Sword The spoken verse drives the strikes,
phrase by phrase
```
```
Build live Speech recognition with fuzzy
phrase matching
```
```
Battle scene Spirit, guardian and tempter,
animated
```
```
Build live for 2 tempters (The Ember,
The Whisperer); others use a tinted
generic shadow
```
```
Pre-rendered clip graph with live
text overlays
```
```
Way of Escape One concrete next step, including a
gentle-reply draft
```
```
Build live Gloo Completions V
```
```
Safe Harbor Crisis cues skip the battle and route to
human help
```
```
Build live (the demo's edge case) On-device keyword gate plus Gloo
guardrails
```
```
Ebenezer wall Private, encrypted battle log Build live Local storage with WebCrypto
```
```
Schemes Heat map, strongholds, trigger links,
most effective verses
```
```
Build live on 8 weeks of synthetic data,
labelled as such
```
```
On-device statistics; Gloo writes
insight sentences from aggregates
only
```
```
Kairos Watch Forecasts risk windows and arms the
user before them
```
```
Thin slice: hour-of-week risk score plus
a scheduled notification
```
```
On-device model
```
```
Rise Again Grace flow after a fall, with debrief Build live Gloo Completions V2 for the
debrief summary
```
```
Graduation
metric
```
```
Counts victories won without
opening the app
```
```
Build live (one button) None
```
```
Aaron and Hur Prayer signal to 1-3 allies with no
details
```
```
Thin slice: share-sheet message None
```
```
Armory Battle verses become a memory set
with voice drills
```
```
Thin slice Speech recognition
```
```
Morning Armor Puts on the armor of God in 60
seconds, each morning or before a
watch window
```
```
Thin slice: one guided screen YouVersion verse of the day
```

```
Feature What it does Hackathon scope AI or API used
```
```
Testimony Reel Weekly cinematic of victories, private
by default
```
```
Thin slice: stitched clips plus overlays Clip library, text-to-speech
```
```
Shield
Interceptor
```
```
Scripture appears when a flagged app
or site opens in a risk window
```
```
Show as design; stretch: a Chrome
extension
```
```
iOS Screen Time shield, Android
overlay
```
```
Offline mode Core verses and a keyword classifier
work without signal
```
```
Stretch Cached public-domain text
```
```
YouVersion
highlights sync
```
```
Armory verses become highlights in
the user's Bible app
```
```
Post-hackathon YouVersion login and highlights
API
```
```
Generative
victory videos
```
```
Custom scenes generated from
symbols, never from confessions
```
```
Post-hackathon A text-to-video model
```
##### Not built at the hackathon: accounts, cloud sync, church dashboards, or anything that stores confessions on a server.


## 6. Screen-by-screen functional spec

##### Sixteen screens cover the product, and the four battle screens are the live demo path. All screenshots are design mockups with

##### demo data for the persona Daniel, not a running build.

##### Visual system. Night indigo stands for the unseen realm and fire-gold for the guardian and the chariots of fire. Vellum, an

##### illuminated-manuscript surface, is reserved for Scripture alone, so the Word never looks like anything the app writes. Alegreya sets

##### Scripture and titles, Alegreya Sans the interface; Safe Harbor is the only light screen, a signal that the battle has been set aside.

### Onboarding and home

```
Figure 2. Onboarding and home screens
```

```
Screen What the user does What the system does Edge cases
```
```
Onboarding Reads the promise and taps "Open my eyes";
optionally picks a tradition, a Bible version
and up to three allies
```
```
Creates an encrypted vault on the phone
with no account; asks for the microphone
only at the first battle
```
```
Microphone declined: typing
becomes the default
```
```
Home Holds the orb to cry out, or taps to type;
reviews tonight's watch
```
```
Shows the next forecast window and the
armor plan the user approved
```
```
No history yet: Watch says it is
still learning and shows no
forecast
```
### The battle loop (live demo path)

```
Figure 3. Cry out and Discern screens
```

```
Figure 4. Speak the Sword and Angels minister screens
```
**Screen What the user does What the system does Edge cases**

1. Cry out Speaks, whispers or types,
    then taps "I'm done speaking"

```
Transcribes speech, runs the safety gate before any
model call, then sends a redacted transcript for
discernment
```
```
8 seconds of silence: offers typing;
no signal: on-device classifier and
cached verses
```
2. Discern Confirms with "That's it.
    Fight." or taps any field to
    correct it

```
Shows the struggle, the lie, triggers, front and
intensity, plus that lie's history from the local log
```
```
Low confidence: one question with
tap answers; any safety flag: Safe
Harbor instead
```
3. Speak
the Sword

```
Reads the verse aloud, taps
each line in silent mode, or
chooses "Read it to me"
```
```
Fetches the exact text from YouVersion, splits it into
phrases, matches speech to each phrase and advances
the battle clips; shows a light for each praying ally
```
```
Two missed matches on a phrase:
tap to strike; reading difficulty:
listen-and-repeat mode
```

```
Screen What the user does What the system does Edge cases
```
4. Angels
minister

```
Picks a way of escape or lays a
stone
```
```
Ranks escapes by what helped before; drafts a gentle
reply that the user edits and sends themselves
```
```
"Still fighting": a backup verse and
an ally prompt; nothing is ever sent
automatically
```
### Beyond the app

```
Figure 5. Kairos Watch alert and Shield Interceptor screens
```
```
Screen What the user does What the system does Edge cases
```
```
Kairos Watch
alert
```
```
Taps "Arm up" or "Not
tonight" on the lock
screen
```
```
Sends one local notification before a forecast
window; "Arm up" switches on the approved
plan
```
```
At most one alert a day; backs off after three
dismissals in a row
```

```
Screen What the user does What the system does Edge cases
```
```
Shield
Interceptor
```
```
Taps "Fight with the
Word" or "Close this
app"
```
```
During armed windows, iOS Screen Time
shields the apps the user flagged; the shield
shows a title, a verse and two buttons
```
```
iOS limits what shield buttons can do, so the
battle opens through a notification; shields can
be switched off at any time
```
### Community and grace

```
Figure 6. Aaron and Hur and Rise Again screens
```
```
Screen What the user does What the system does Edge cases
```
```
Aaron
and Hur
```
```
Taps "Ask them to pray
now" during or after a
battle
```
```
Sends a content-free prayer request to one to
three allies; an ally's "I'm praying" appears as a
light beside the guardian
```
```
Allies never see the struggle; removing an ally
takes effect at once
```

```
Screen What the user does What the system does Edge cases
```
```
Rise
Again
```
```
Logs a fall, prays the
guide, answers "What
came first?"
```
```
Shows grace verses, labels the prayer as written
by UNSEEN, lays a rose-again stone and feeds the
debrief to Schemes
```
```
Several falls close together: suggests an ally,
pastor or counsellor; any self-harm language:
Safe Harbor
```
### Memory and patterns

```
Figure 7. Ebenezer wall and Schemes screens
```
```
Screen What the user does What the system does Edge cases
```
```
Ebenezer
wall
```
```
Browses stones; taps "I won without
opening UNSEEN" after an unaided
victory
```
```
Keeps every stone encrypted on the phone; any
stone can be exported or deleted
```
```
"Delete everything" asks for
confirmation and cannot be
undone
```

```
Screen What the user does What the system does Edge cases
```
```
Schemes Sees when temptation comes, which
lies repeat and which truths hold
```
```
Counts everything on the phone; the model
writes one or two sentences from aggregate
numbers only
```
```
Fewer than 10 battles: says "not
enough yet" instead of guessing
```
### Forecast and growth

```
Figure 8. Kairos Watch and Armory screens
```
```
Screen What the user does What the system does Edge cases
```
```
Kairos
Watch
```
```
Reviews the week's risk
windows and approves
tonight's armor
```
```
Scores each hour of the week from past battles;
builds a plan only from actions the user allowed
```
```
"Ask me before arming" is on by
default; windows follow the phone's
time zone
```

```
Screen What the user does What the system does Edge cases
```
```
Armory Drills verses aloud from
memory
```
```
Schedules drills by spaced repetition; speech
matching sets each verse's sharpness; counts
victories won from memory
```
```
Switching translation re-fetches the
text from YouVersion
```
### Testimony and safety

```
Figure 9. Testimony Reel and Safe Harbor screens
```
```
Screen What the user does What the system does Edge cases
```
```
Testimony
Reel
```
```
Watches the weekly film;
shares a version without
details
```
```
Stitches battle clips, stone moments and verse
overlays on the phone; never uses confession text
```
```
Weeks with falls show rose-again
moments, never failure counts
```

**Screen What the user does What the system does Edge cases**

Safe
Harbor

```
Calls or texts 988, calls an
ally, messages a pastor, or
calls 911
```
```
Opens from the on-device crisis gate or the model's
safety flag; shows no battle imagery; keeps no crisis
transcript unless the user chooses
```
```
Outside the US: crisis lines by country,
for example Samaritans on 116 123 in
the UK and Ireland
```

## 7. Battle engine: characters, animation and video

##### Live battles run on a pre-rendered clip graph with live text overlays, because the guardian must strike within seconds of the verse

##### being spoken. Generative AI video is reserved for the weekly Testimony Reel, where minutes of rendering do not matter.

### The cast

```
Character Represents Look Rules
```
```
The Spirit God's presence in prayer
(Matthew 3:16, Romans 8:26)
```
```
An orb of light holding a descending dove;
it pulses with the user's voice
```
```
Never speaks; the app never puts words in
God's mouth
```
```
The
Guardian
```
```
A ministering angel (Hebrews
1:14, Psalm 91:11)
```
```
Luminous armor and wings of light, face
hidden in light, the sword of the Spirit
```
```
Never speaks and is never prayed to; its
only weapon is the verse the user speaks
```
```
The
tempters
```
```
The lie, personified as allegory Symbolic smoke-and-shadow figures,
suitable for all audiences
```
```
Hold the lie in the user's own words;
always flee; never shown winning
```
```
Allies'
lights
```
```
Aaron and Hur (Exodus 17:12) Small lights that join the guardian Appear only when a real ally taps "I'm
praying"
```
### Tempter archetypes

```
Tempter Struggle Typical lie Truth anchors Visual
```
```
The Ember Anger, resentment "He deserves it." Ephesians 4:26-27;
Proverbs 15:1
```
```
Smouldering smoke with ember
cracks
```
```
The
Whisperer
```
```
Fear, worry "It's all going to fall
apart."
```
```
Philippians 4:6-7; Isaiah
41:10
```
```
Grey-violet wisps that circle and
murmur
```
```
The Serpent Sexual temptation "No one will know." 1 Corinthians 10:13;
Galatians 5:16
```
```
A coil of shadow (Genesis 3),
never sexualised
```
```
The Fog Numbing, escapism, endless
scrolling
```
```
"Just five more
minutes."
```
```
Ephesians 5:15-16;
Philippians 4:8
```
```
A haze that dims the screen
```
```
The Accuser Shame, condemnation "You're too far gone." Romans 8:1; Colossians
2:14
```
```
Carries a ledger that is nailed to
the cross
```
```
The Mirror Envy, comparison "Their life is better than
yours."
```
```
Galatians 6:4; Philippians
4:11-13
```
```
A cracked mirror-shade
```
```
The Chain Compulsion, greed "You need this to cope." Galatians 5:1; Hebrews
13:5
```
```
Shadow links that snap
```
```
The Mask Lying, gossip "A small lie protects
everyone."
```
```
Ephesians 4:25; Proverbs
12:22
```
```
A smiling mask over smoke
```
```
The Crown Pride "You don't need
anyone."
```
```
James 4:6; Ecclesiastes
4:9-10
```
```
A tall shade in a tarnished crown
```

##### Deliberately left out: a gluttony or body-image tempter, because food struggles can overlap with eating disorders, and any

##### tempter for grief, depression, trauma or illness, which are not sins and are routed to care.

### Real-time battle: the clip graph

##### Each tempter has five kinds of pre-rendered clip, 1-3 seconds each, with matching first and last frames so they join seamlessly:

##### 1. Approach: the tempter rises holding the scroll.

##### 2. Taunt: loops while the app waits for the user to speak.

##### 3. Strike: one per verse phrase recognised.

##### 4. Flee: the lie-scroll is nailed to a cross of light and burns away (Colossians 2:14-15), then the tempter breaks and leaves (James

##### 4:7).

##### 5. Peace: plays under the way-of-escape panel (Matthew 4:11).

##### Everything personal is drawn live on top of the clips: the lie on the scroll, the verse on the vellum, strike flashes and ally lights. One

##### set of clips serves every user, and no confession ever goes into a video file.

##### State machine inputs: phrase_matched plays the next strike; silence_10s returns to the taunt loop with a gentle prompt;

##### all_phrases_done plays flee, then peace; tap_strike in silent mode behaves like phrase_matched.

##### Speech matching: the live transcript is compared with each phrase after normalising case and punctuation. A phrase counts as

##### spoken when roughly 70% of its words appear in order, a threshold to tune against the evaluation set.

##### Hackathon production: two tempters (The Ember and The Whisperer) with all five clip types, plus guardian and peace scenes;

##### the rest use a tinted generic shadow. Clips can come from an AI video tool or motion graphics, disclosed in the submission as the

##### rules require. Rive is an alternative for a vector version driven by the same state machine.

### Generated video: the Testimony Reel

##### Hackathon: assembled on the phone from the clip library, stone moments and verse overlays (Canvas plus MediaRecorder),

##### with optional text-to-speech narration.

##### Later: generative victory scenes from a text-to-video model, prompted only with symbols (tempter archetype, guardian

##### light, setting, verse reference), never with the user's words; rendered after the week ends and stored only on the phone.

##### Why live battles are not generated: text-to-video takes far longer than the seconds a battle allows, and pre-approved clips

##### keep every frame reviewable for theology and all-audience suitability.

### Accessibility and comfort

##### Reduced motion: still illustrated panels carry the same text.

##### Intensity setting: Symbolic (light and shadow only) or Cinematic (figures).

##### Senses: captions for every spoken line, a haptic tap for each strike, and strike states that never rely on colour alone.


## 8. AI pipeline and system architecture

##### A short agentic pipeline turns one spoken sentence into a verified verse within a 3-second target: an on-device safety gate, a Gloo

##### discernment call with tools, YouVersion retrieval, a code-level Scripture check, then composition. Everything that persists stays on

##### the phone.

##### Scripture reaches the screen only through the verifier

```
On the phone Stateless proxy
```
```
Holds the API keys
Logs no request bodies
```
```
Partner APIs
```
```
Receive redacted text
and aggregates only
```
```
Listen
Speech to text
Audio is never stored by UNSEEN
```
```
Safety gate and redaction
Crisis cues open Safe Harbor
Names and numbers redacted
```
```
Battle engine
Clip graph, speech matching,
strikes and live overlays
```
```
Encrypted log
Stones, lies and verses,
stored only on the phone
```
```
Schemes and Kairos Watch
Patterns and forecasts,
computed on the phone
```
```
Orchestrator
Discern, find truth,
verify, compose
```
```
Scripture verifier
Shown text must match
the API exactly
```
```
Gloo AI Studio
Guarded Completions V2
tradition-aware
```
```
YouVersion
Passages and verse
search, BSB default
```
```
Figure 10. System architecture: phone, proxy, Gloo AI Studio, YouVersion
```
##### Only verified verse text travels back to the phone. Weekly insights send aggregate counts to Gloo, never transcripts, and nothing

##### about a battle is stored off the phone.

### Pipeline steps

##### 1. Listen (phone): capture microphone audio and transcribe it server-side with OpenAI Whisper. The PWA does not use browser

##### speech-recognition APIs, extensions, or platform transcription services.

##### 2. Safety gate (phone, before any model call): a crisis lexicon and pattern rules; a hit opens Safe Harbor with no model call at

##### all.

##### 3. Redact (phone): names, numbers, emails and places become placeholders; relationship words such as "brother" are kept.


##### 4. Discern (Gloo): Completions V2 on the guarded endpoint, with tradition set from the user's choice, returns structured

##### fields through a forced tool call (schema in section 11). Gloo's guarded pipeline also screens input and output across six safety

##### dimensions: Physical, Ethical, Emotional, Factual, Theological and Security (Gloo docs).

##### 5. Find the truth (tools): truth_index_lookup returns pastor-reviewed candidates for that lie, youversion_search adds

##### more, and the model picks a primary and a backup verse with a reason.

##### 6. Fetch and verify (code, not the model): the passage comes from the YouVersion passages endpoint (API reference). The

##### verifier confirms the reference exists, that the displayed text equals the API text character for character, and that nothing else

##### is styled as Scripture. Any failure falls back to the curated default for that struggle.

##### 7. Compose (Gloo): one reflection of at most 25 words, labelled as reflection, plus up to three ways of escape chosen from an

##### approved action list. Phrase splitting for speech matching is deterministic code.

##### 8. Direct (phone): the battle state machine, speech matching and strikes.

##### 9. Remember (phone): the encrypted log updates Schemes and Kairos Watch.

##### 10. Weekly insight (Gloo): receives aggregate counts only, never transcripts, and writes two or three plain sentences.

### Latency budget (targets to verify in testing)

```
Step Target
```
```
Transcript final after release 0.3 s
```
```
Safety gate and redaction under 0.05 s
```
```
Discernment (fast model, streamed) 1.2-1.8 s
```
```
Verse fetch (curated verses cached on the phone) 0.2-0.4 s
```
```
Composition runs during the tempter's approach clip
```
```
Cry-out to verse on screen 3 s or less
```
### Model and platform choices

##### Discernment and composition: an explicit fast model on Completions V2 (Gloo's docs give examples such as gloo-

##### anthropic-claude-haiku-4.5 and gloo-openai-gpt-5-mini), temperature 0.2, tradition from settings.

##### Weekly insight: auto_routing: true, since speed does not matter there.

##### Keys: a tiny serverless proxy holds the Gloo credentials and the YouVersion app key, forwards requests, rate-limits, and never

##### logs request bodies.

### Where the AI stops and people take over

##### It never counsels, diagnoses, absolves or makes pastoral judgments; it prepares, surfaces and routes.

##### Crisis cues go to Safe Harbor; repeated falls prompt a suggestion to talk with an ally, pastor or counsellor; low confidence

##### makes it ask instead of guess.

##### It never sends a message, contacts anyone or changes a shield without the user's tap.


### Evaluation plan

##### A hand-written set of 40 synthetic utterances: 24 temptations across the eight archetypes, 6 crisis cases, 6 non-sin distress cases

##### (grief, depression, being harmed) and 4 ambiguous ones.

```
Check Pass mark
```
```
Verse text identical to the YouVersion API 100%
```
```
Crisis cases routed to Safe Harbor 100%
```
```
Non-sin distress kept out of battles 100%
```
```
Struggle classified correctly 85% or more
```
```
Lie judged faithful to the user's words by two reviewers 80% or more
```
```
Cry-out to verse, median 3 s or less
```
##### Every test run writes an auditable session log (input, model output, verifier result, route), which doubles as evidence for the AI

##### score.


## 9. Pattern analytics and Kairos Watch

##### Analytics answer three questions, all on the phone: when does temptation come, with which lie, and which truth holds. Kairos

##### Watch turns the first answer into a forecast and an armor plan the user approves.

### What is measured

```
Metric Definition Where it shows
```
```
Battles faced Cry-outs, plus shields the user chose to fight Ebenezer, Schemes
```
```
Outcome Stood, still fighting or fell, from the stone the user lays Ebenezer
```
```
Won from memory Victories recorded with one tap, without opening a battle Armory, Home
```
```
Time to peace Seconds from cry-out to laying a stone Schemes
```
```
When he comes Battles by weekday and time block Schemes heat map
```
```
Strongholds Lies grouped by meaning; one that returns 5 or more times in 8 weeks is a stronghold Schemes
```
```
What comes first Triggers that appear before a struggle more often than usual Schemes
```
```
Truth that holds Stand rate per verse, shown after three uses Schemes, Armory
```
```
Fruit check-in (optional) Weekly self-rating, 1-5, of the fruit of the Spirit (Galatians 5:22-23) Schemes
```
##### Display rules: a trigger link appears only after at least 5 battles, and only when that trigger is at least 1.5 times as common before

##### the struggle as overall. The wording says "often comes before", never "causes", and the app never supplies a story about why; the

##### user writes their own meaning in the debrief.

### Kairos Watch model (hackathon version)

##### Each hour of the week is a slot. Every past battle adds weight to its slot and half as much to the neighbouring hours, and older

##### battles count less:

##### Here s is an hour-of-week slot, a_i is the age of battle i in days (a 21-day half-life), and K is 1 for the same slot, 0.5 for an adjacent

##### hour and 0 otherwise. A watch window is a run of slots scoring in the user's top 20%, backed by at least 3 battles; with fewer than 5

##### battles in total, no forecast is shown.

##### Later, and only with opt-in: context such as sleep, calendar load or a coarse place type (home, work), combined on the phone in a

##### small logistic model.

### r ( s )=

### ∑ i 2 − ai^ /21

### ∑ i^2 − ai^ /21 K ( si^ , s )


### Armor plan and alerts

##### Actions the user can allow in advance: shield chosen apps during the window, an ally check-in message (drafted by the app,

##### sent by the user), a verse for tonight, a physical step such as charging the phone in another room, and a 60-second Morning

##### Armor based on Ephesians 6:13-17.

##### Alert limits: at most one alert a day, 15-30 minutes before a window; after three dismissals in a row, alerts for that window

##### stop.

##### Control: "Ask me before arming" is on by default, and every action can be undone.

### Insight sentences

##### Rules produce candidate insights with their numbers, and only the top two go to Gloo, as aggregates such as "Sunday 20:00-

##### 22:00, anger, 5 battles, family chat before 4". The model turns them into plain sentences; no transcripts, lies, names or notes are

##### ever sent.


## 10. Privacy, safety and theological guardrails

##### UNSEEN holds the most sensitive record a person can create, so privacy, safety and theology are product features, not footnotes.

### Privacy by design

```
Data Where it lives Who can see it Kept for
```
```
Voice audio Temporary phone recording sent to Whisper for transcription; never stored by UNSEEN
```
```
Nobody Discarded after transcription
```
```
Battle transcript Sent once, redacted, for discernment; stored
encrypted on the phone
```
```
The user 30 days by default (7 days or
keep are options); stats remain
```
```
Battle log (stones, lies,
triggers, verses)
```
```
On the phone, encrypted with a key held in the
device's secure hardware
```
```
The user Until the user deletes it
```
```
Schemes and
forecasts
```
```
Computed on the phone The user Rolling
```
```
Ally prayer signal A content-free message The ally sees only the
request to pray
```
```
Not stored by UNSEEN
```
```
Testimony Reel Rendered on the phone The user; shared copies
hide struggles and dates
```
```
User controls
```
```
Backup Optional encrypted export file The user User controls
```
##### Also: no ads, no third-party analytics SDKs, no selling or sharing of data, a Face ID lock, a quick-hide gesture and one-tap "delete

##### everything".

##### Open question: confirm Gloo AI Studio's data-retention terms for guarded completions before launch.

### Safety: Safe Harbor

##### What opens it: signs of self-harm or suicide, harm to others, being abused, a medical emergency, dangerous withdrawal,

##### disordered eating, or hearing commands from voices.

##### What it does: skips the battle and all imagery, then offers 988 in the US, local lines elsewhere, a trusted ally, a pastor and the

##### emergency number; "I'm safe" returns home.

##### What it never does: promise what will happen when someone calls, or frame mental illness, grief, trauma or abuse as

##### demonic or as sin.

##### Age: 18 and over at launch, matching the hackathon's own eligibility; any youth version only with youth-ministry partners

##### and a separate design.

##### Misuse: nobody can view another person's log remotely, allies never see content, and Face ID plus quick-hide protect against

##### someone else picking up the phone.


### Theological guardrails

##### Scripture integrity: verse text comes only from the YouVersion API, is verified, always shows its reference and translation,

##### and links to the full chapter so it can be read in context.

##### Clear labels: AI words are marked "Reflection" or "Prayer guide" and never appear on vellum.

##### No impersonation: the app never speaks as God, the Holy Spirit or an angel; the orb is a symbol of God's presence in prayer.

##### Allegory, said plainly: onboarding explains that the battle is a picture, like The Pilgrim's Progress , not a literal view of the

##### spiritual realm.

##### Honest about the source: discernment names the front (world, flesh or devil) and never blames every struggle on demons

##### (James 1:14).

##### Tradition-aware: Gloo's tradition parameter supports evangelical, catholic, mainline or general Christian responses

##### (Gloo docs).

##### Reviewed library: every lie-to-truth pair is reviewed by at least two pastors from different traditions before launch, recording

##### reviewer, date and a context note.

##### No claims or promises: no deliverance claims, and no promise that a verse will make a temptation disappear.

##### Points beyond itself: confession to trusted people (James 5:16), the local church and recovery groups are always one tap

##### away.


## 11. Data model and API contracts

##### Seven local tables and three kinds of external call; nothing about a battle is stored off the phone. Battle history never leaves the

##### device either: candidate verses are re-ranked locally by each verse's past stand rate.

### Local data model (encrypted on the device)

```
Entity Key fields Notes
```
```
Battle id, started_at, ended_at, time_zone, channel (voice, whisper, text, shield), struggle,
archetype, lie_text, lie_cluster_id, triggers, front, intensity, verse_usfm, backup_usfm,
strikes, outcome, escape_taken, seconds_to_peace, ally_signal
```
```
The transcript is stored
separately, under its own
retention setting
```
```
Stone id, battle_id (empty for won-from-memory), kind (stood, rose_again, from_memory),
date, verse_usfm, note
```
```
The app never deletes stones;
only the user can
```
```
LieCluster id, label, example lies, count Grouping runs on the phone
```
```
ArmoryVerse usfm, bible_id, text, sharpness (0-5), next_drill_at, wins Text cached from YouVersion
```
```
WatchWindow weekday, start_hour, end_hour, score, confidence, approved_actions Recomputed nightly
```
```
Ally id, display_name, contact, consent_at No struggle data is ever
attached
```
```
Settings tradition, bible_id, retention_days, shielded_apps, intensity, reduced_motion A single record
```
### 1. Discern: proxy to Gloo Completions V2 (guarded)

##### Structured output comes from a forced tool call. If forcing a named tool is not supported, use "tool_choice": "auto" with a

##### strict instruction, validate the result, and retry once.

```
{
"model": "gloo-anthropic-claude-haiku-4.5",
"auto_routing": false,
"tradition": "evangelical",
"temperature": 0.2,
"messages": [
{"role": "system", "content": "<discernment prompt, appendix>"},
{"role": "user", "content": "My [relation:brother] just humiliated me in the family chat and I
want to fire back something cruel."}
],
"tools": [{
"type": "function",
"function": {
"name": "report_discernment",
"description": "Report what the user is facing",
"parameters": {
"type": "object",
"required": ["safety_flag", "struggle", "lie", "triggers", "front", "intensity",
"confidence", "truth_queries"],
"properties": {
"safety_flag": {"type": "string", "enum": ["none", "self_harm", "harm_to_others", "abuse",
```

```
"medical", "eating_disorder", "psychosis_signs"]},
"struggle": {"type": "string", "enum": ["anger", "fear", "sexual", "escapism", "shame",
"envy", "compulsion", "deceit", "pride", "other", "not_a_temptation"]},
"lie": {"type": "string", "maxLength": 60},
"triggers": {"type": "array", "items": {"type": "string", "enum": ["tired", "alone",
"hurt", "bored", "stressed", "hungry", "conflict", "online", "late_night", "other"]}},
"front": {"type": "string", "enum": ["world", "flesh", "devil", "unclear"]},
"intensity": {"type": "integer", "minimum": 1, "maximum": 10},
"confidence": {"type": "number", "minimum": 0, "maximum": 1},
"truth_queries": {"type": "array", "items": {"type": "string"}, "maxItems": 2}
}
}
}
}],
"tool_choice": {"type": "function", "function": {"name": "report_discernment"}}
}
```
##### Example arguments returned by the tool call:

```
{"safety_flag": "none", "struggle": "anger", "lie": "He deserves it.", "triggers": ["hurt",
"conflict", "tired"], "front": "flesh", "intensity": 8, "confidence": 0.86, "truth_queries": ["anger
without sin", "gentle answer turns away wrath"]}
```
### 2. Verse text: YouVersion Platform

##### Bible 3034 is the Berean Standard Bible in YouVersion's own example (API reference). For a range, fetch each verse and join them,

##### unless a range id is confirmed to work.

```
GET https://api.youversion.com/v1/bibles/3034/passages/EPH.4.26?format=text
x-yvp-app-key: <app key>
```
##### Illustrative response:

```
{"id": "EPH.4.26", "content": "“Be angry, yet do not sin.” Do not let the sun set upon your anger,",
"reference": "Ephesians 4:26"}
```
##### The same API reference lists verse search, topic search, verse-of-the-day and highlights endpoints, used for candidate verses,

##### Morning Armor and the optional highlight sync.

### 3. Gentle reply and weekly insight: Gloo

##### Gentle reply: the redacted context goes in, one calmer message comes out; the user edits it and sends it from their own

##### messaging app.

##### Weekly insight: aggregates only, with auto_routing: true.


### Proxy endpoints (hackathon)

```
Endpoint Purpose Forwards to
```
```
POST /api/discern Discernment through the forced tool call Gloo Completions V2, guarded
```
```
POST /api/compose Reflection, ways of escape, gentle reply Gloo Completions V2, guarded
```
```
POST /api/insight Weekly sentences from aggregates Gloo Completions V2, auto-routing
```
```
GET /api/verse/:usfm Passage text, cached for the curated set YouVersion passages endpoint
```
##### Every endpoint keeps credentials server-side, rate-limits per device and never logs request bodies.


## 12. Demo, validation, build plan and team

##### Build one golden path that never fails on stage plus one live edge case, finish the validation interviews before the event, and lock

##### the 90-second video by Wednesday afternoon.

### The 90-second demo video

```
Time On screen Voice-over
```
```
0:00-
0:10
```
```
A phone glowing in a dark room "Luke 4:13: the devil left Jesus until an opportune time. For
Daniel, that's Sunday night."
```
```
0:10-
0:45
```
```
Live battle: cry out, discern, It is written, Speak the Sword, angels
minister, gentle reply
```
```
Let the app carry it, with one line: "The lie is named, and the
truth is spoken."
```
```
0:45-
1:00
```
```
A stone is laid; Schemes shows the Sunday pattern; Kairos Watch
arms next Sunday; the Shield screen
```
```
"Every battle teaches UNSEEN when to stand guard."
```
###### 1:00-

###### 1:15

```
A typed crisis sentence opens Safe Harbor, with no battle "And when it's a crisis, not a battle, it gets out of the way."
```
###### 1:15-

###### 1:30

```
Armory: battles won from memory "UNSEEN counts success by the battles you win without it,"
plus one real validation finding
```
##### The rules require a written release from anyone identifiable in the video.

### The 250-word entry description (draft, 222 words)

```
UNSEEN is a voice-first Scripture companion for the moment of temptation. When someone in recovery or
an accountability group feels a temptation rising, often alone and late at night, they hold one
button and say what is happening. Gloo's values-aligned AI names the struggle and the lie behind it
("He deserves it"), and UNSEEN answers that exact lie with Scripture fetched live from the YouVersion
Platform, the way Jesus answered every temptation with "It is written" (Matthew 4).
```
```
The verse becomes the sword. As the user reads it aloud, speech recognition turns each phrase into a
strike: an animated guardian angel drives off a symbolic tempter holding the lie, and the scene turns
to peace with one concrete way of escape (1 Corinthians 10:13), such as a gentle reply or a prayer
request to trusted friends that shares no details.
```
```
Every battle is saved privately on the phone, never on a server. Over time UNSEEN reveals the user's
patterns (when, which lie, which truth holds) and forecasts their "opportune times" (Luke 4:13),
arming them beforehand with a shield over tempting apps and a verse for the night.
```
```
Guardrails are built in: Scripture is never generated, only retrieved and verified; crisis language
skips the battle and routes to human help; and success is measured by victories won from memory,
without opening the app.
```

### Validation plan (required for Track 2)

```
Who
```
```
How
many What to ask
```
```
What we
learned
```
```
What
changed
```
```
People in church recovery or
accountability groups, ages 18-35
```
```
5 Walk me through your last hard moment: where,
when, what you did, and what you wish had been there
```
```
Recovery or small-group leaders 2 What helps in the moment, and what hurts (shame,
streaks, exposure)?
```
```
Pastors from two traditions 2 Review 10 lie-to-truth pairs and the battle imagery
```
```
Hackathon mentors (YouVersion,
Biblica, Gloo)
```
```
2-3 Feasibility, licensing and safety
```
##### Assumptions most likely to be wrong, so test them first:

##### 1. People will speak aloud in the moment; many may prefer typing or whispering.

##### 2. Dramatic visuals help; some may find them distracting or frightening.

##### 3. Users want a log; some may fear any record existing, which argues for a no-log mode.

##### 4. Late night is the main window; mornings or commutes may matter as much.

##### 5. Allies want details; most would probably rather pray without them.


### Build plan

##### Preliminary submission lands 25 hours after hacking starts

```
Build plan by hour, Mountain Time, October 5-8, 2026
```
```
Mon 12:00 Tue 00:00 Tue 12:00 Wed 00:00 Wed 12:00 Thu 00:00 Thu 12:00
```
```
Mon 19:00 to Tue 17:00
```
```
Mon 19:00 to Tue 15:00
```
```
Tue 20:00
```
```
Tue 20:00 to Wed 04:00
```
```
Tue 22:00 to Wed 12:00
```
```
Wed 04:00-10:00
```
```
Wed 08:00-15:00
```
```
Wed 13:00-17:00
```
```
Wed 21:00
```
```
Thu 06:00-08:30
```
```
Thu 09:00
```
```
Validation interviews
```
```
Keys and demo data
```
```
Hacking starts
```
```
AI pipeline, verifier
```
```
Battle engine, speech
```
```
Safe Harbor, eval set
```
```
Log, Schemes, Watch
```
```
Polish, 90-second video
```
```
Preliminary submission
```
```
Finalist fixes
```
```
Finalist deadline
```
```
Figure 11. Build plan: Oct 5-8, 2026, Mountain Time
```
##### Interviews run tonight and tomorrow; hacking starts Tuesday at 8 pm, the preliminary submission is due Wednesday at 9 pm, and

##### finalists submit their video by 9 am Thursday.

##### Before the event:

##### Create Gloo AI Studio API credentials and test one guarded call with tradition

##### Create a YouVersion Platform app key and confirm Bible 3034 (BSB) returns text

##### Join the hackathon Discord, which the rules require

##### Book the five validation interviews for tonight and tomorrow

##### Generate and label the synthetic demo dataset (8 weeks, about 40 battles)

##### List every AI tool and paid asset used, with sources, for the submission

##### Add a license file to the repo and list third-party licenses, as the rules require

##### Collect written releases from anyone who appears in the demo video

### Tech stack

```
Layer Choice Why
```
```
App React PWA (Vite or Next.js), installable on phones Fastest path to a working phone demo; native iOS later
for shields
```

```
Layer Choice Why
```
```
Speech OpenAI Whisper after recording, typed fallback One speech-to-text engine; no browser speech-recognition service
```
```
AI Gloo AI Studio Completions V2, guarded, with tradition Values-aligned guardrails and theological tone built in
```
```
Bible YouVersion Platform API and the @youversion/platform-
core SDK
```
```
Track 2's required Scripture layer, with licensed text and
references
```
```
Battle
visuals
```
```
Pre-rendered clip graph (WebM or MP4) with HTML overlays; Rive
optional
```
```
Instant, reviewable, and personal through overlays
```
```
Storage IndexedDB (Dexie) with WebCrypto AES-GCM Encrypted, on the phone, no backend database
```
```
Proxy One serverless function Keeps keys off the phone, with no logging
```
```
Reel Canvas plus MediaRecorder Video made on the phone
```
### Team roles

```
Role Owns
```
```
Builder 1: app and speech Cry out, Speak the Sword, battle state machine, Safe Harbor screen
```
```
Builder 2: AI and data Proxy, prompts, Truth Index, verifier, evaluation set, Schemes and Watch logic
```
```
Designer and storyteller Clip assets, interface polish, 90-second video, pitch
```
```
Ministry lead Validation interviews, Truth Index review, theological guardrails, judges' questions
```
##### A two-person team keeps the battle loop, Safe Harbor and Schemes live, and shows Shield, Armory and Reel as design only.


## 13. Success metrics, risks and roadmap

##### The north-star metric is victories won from memory each month; engagement metrics are deliberately not targets.

### Metrics

```
Metric Target Why it matters
```
```
Victories won from memory per month Rising month over month The Word is hidden in the heart, so the app is needed less
```
```
Cry-out to verse, median 3 s or less The moment is short
```
```
Stand rate Rising over 8 weeks Battles are being won
```
```
Way of escape taken More than half of battles Victory includes a next step, not just a feeling
```
```
Users with at least one ally A majority within a month Nobody fights alone
```
```
Crisis cases routed correctly 100% of the test set Safety comes first
```
```
Fabricated verse text Zero Scripture integrity
```
##### Not targets, on purpose: daily active use, session length, streaks or notification opens.

### Risks

```
Risk Likelihood Mitigation
```
```
Speech recognition fails in a noisy venue High Whisper mode, tap-to-strike, a headset microphone and a rehearsed
typed path
```
```
Gloo or network outage on stage Medium Curated verses cached on the phone and an on-device keyword
classifier
```
```
Theological objections to angel and demon
imagery
```
```
Medium Symbolic mode, imagery rules, pastor review and the Pilgrim's
Progress precedent
```
```
The imagery feels frightening Medium Intensity setting, no jump scares, a calm default palette
```
```
A leak of confession data Low, but severe No server storage, encryption on the phone, quick delete
```
```
A shame spiral after falls Medium Grace design, no streaks, Rise Again, prompts toward people
```
```
The app replaces church community Medium The graduation metric, allies and links to recovery groups
```
```
iOS Screen Time entitlement takes time High for the
hackathon
```
```
Shield shown as design; a Chrome extension as stretch
```
```
Licences for other translations Medium BSB by default; follow each version's YouVersion licence
```
```
The all-audiences content rule Medium Anger in the demo; symbolic tempters
```

### Roadmap

##### Each phase opens only when the previous gate is met

```
Roadmap, not to scale; dates are targets
Now
```
```
Hackathon MVP
Oct 6-8, 2026
Battle loop live
Safe Harbor live
Schemes, demo data
```
```
Pilot
Nov 2026-Jan 2027
2-3 recovery groups
Consented users
Reviewed library
```
```
Native apps
Feb-Apr 2027
On-device speech
App shields
Lock-screen widgets
```
```
Wider reach
From May 2027
Church partners
More languages
Highlights sync
```
```
Gate 1
Safety eval at 100%
Two pastors sign off
```
```
Gate 2
Stand rate rising
No privacy incidents
```
```
Gate 3
Won from memory rising
A partner church ready
```
```
Figure 12. Roadmap: 4 phases, 3 gates
```
##### The hackathon build proves the loop on demo data; real users join only in the pilot, after the safety evaluation passes and two

##### pastors sign off on the verse library.


## 14. Appendix

### A. Lie-to-Truth seed library

##### Thirteen seed pairs for the hackathon, each needing pastor review before launch. Only references are stored; verse text is fetched

##### from YouVersion at run time.

```
Struggle Lie Truth Way of escape
```
```
Anger "He deserves it." Ephesians 4:26-27 Draft a gentle reply (Proverbs 15:1)
```
```
Anger "I have to win this argument." James 1:19; Proverbs 15:1 Wait ten minutes before replying
```
```
Fear "It's all going to fall apart." Philippians 4:6-7 A breath prayer, then name three requests
```
```
Fear "You're on your own." Isaiah 41:10; Hebrews 13:5 Text an ally
```
```
Sexual temptation "No one will know." 1 Corinthians 10:13; Galatians 5:16 Leave the room; the phone goes to the kitchen
```
```
Sexual temptation "Just this once won't matter." James 1:14; Romans 6:12 Call your sponsor
```
```
Escapism "Just five more minutes." Ephesians 5:15-16; Psalm 90:12 Set a stop and stand up
```
```
Shame "You're too far gone." Romans 8:1; 1 John 1:9 Rise Again, then tell an ally
```
```
Shame "God is tired of you." Lamentations 3:22-23; Micah 7:8 Pray the confession guide
```
```
Envy "Their life is better than yours." Galatians 6:4; Philippians 4:11-13 Name three gifts from today
```
```
Compulsion "You need this to cope." Galatians 5:1; 2 Corinthians 12:9 Call your sponsor or an ally
```
```
Deceit "A small lie protects everyone." Ephesians 4:25; Proverbs 12:22 Say the true sentence out loud first
```
```
Pride "You don't need anyone." James 4:6; Ecclesiastes 4:9-10 Ask someone for help today
```
### B. Discernment prompt (draft, verbatim)

```
You are the discernment step inside UNSEEN, a Scripture companion for people facing temptation. You
never speak to the user. Call report_discernment exactly once.
```
```
From the user's words, identify:
```
1. safety_flag: any sign of self-harm or suicide, harm to others, being abused, a medical emergency,
dangerous withdrawal, disordered eating, or hearing commands from voices. If unsure, flag it.
2. struggle: the temptation, from the allowed list. Grief, depression, trauma, illness and being
harmed are not temptations: use not_a_temptation.
3. lie: the false belief that makes the temptation feel reasonable, in eight words or fewer, in the
user's own words where possible.
4. triggers, front (world, flesh, devil or unclear) and intensity (1-10).
5. truth_queries: two short phrases for finding Scripture that answers the lie.

```
Rules:
```
- Never quote Scripture or name verses; other steps choose and fetch them.
- Never diagnose, counsel, absolve or judge.
- Use front "devil" only when the user describes accusation or deception; never say the user has a


```
demon.
```
- If the words are unclear, lower your confidence rather than guess.

### C. Composer prompt (draft, verbatim)

```
You write for UNSEEN after a verse has been chosen and verified. Return:
```
1. reflection: at most 25 words connecting the verse to the user's moment. Plain and warm, no
cliches. It will be labelled "Reflection".
2. escapes: up to three ways of escape, chosen only from the provided action list, best first.
3. gentle_reply, only when the struggle involves another person: a short, calm message the user could
send after editing it.

```
Rules:
```
- Do not quote Scripture beyond the reference you were given, and never invent a verse.
- Do not promise outcomes, and never speak as God, the Holy Spirit or an angel.
- Do not shame. Assume the user wants to do right.

### D. Demo data

##### Eight weeks of synthetic battles (about 40) for the persona Daniel, generated by a script and labelled "Demo data" on every screen

##### that shows them. No real person's data is used.

### Sources

##### Gloo AI Hackathon 2026

##### Hackathon HQ: prizes, tools and agenda

##### 2026 Challenge Summary

##### 2026 Hackathon Official Rules

##### Gloo AI Studio: Completions V2

##### YouVersion Platform API: Bibles

##### Berean Standard Bible text quoted in the mockups, from the public-domain USFM edition: usfm-bible/examples.bsb
