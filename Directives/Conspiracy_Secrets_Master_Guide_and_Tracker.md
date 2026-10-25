# Conspiracy Secrets — Master Guide and Progress Tracker

**Project:** Top Secret  
**Document role:** Authoritative writing, localization, quality-control, and progress register  
**Last verified:** 2026-10-21  
**Target:** 633 distinct conspiratorial secrets × 5 language editions = **3,165 localized story files**

## 1. Current progress

| Metric | Current | Target |
| --- | ---: | ---: |
| Distinct secrets created | **2** | **633** |
| Distinct secrets remaining | **631** | 0 |
| Progress by distinct secrets | **0.32%** | 100% |
| Secrets with all five language versions verified | **0** | **633** |
| Existing localized drafts (not yet quality-approved) | **10** | **3,165** |

**Next secret:** `003` — **1205 points**, the third sequence entry.  
**Most recent registered secret:** `002` (Nibiru file) — **600 points**, the second sequence entry.  
**Completion notification:** When the distinct-secrets count reaches **633/633**, explicitly notify the user that the writing target has been reached. Announce full five-language completion separately; do not confuse the two milestones.

A secret counts **once**, regardless of how many translations, rewrites, or corrections it receives. Count it when its shared narrative premise and complete base-language manuscript are established. Track translation and QA completion separately. Never increment for polishing an existing secret.

## 2. The immutable creative brief

Write **633 different conspiracies**, all presented as implausible, internally coherent revelations from a world that treats the ridiculous with total seriousness.

- The user supplies the **central idea**, mandatory details, and any restrictions.
- The writer expands those instructions into an original conspiracy; do not silently replace or contradict the core premise.
- Each entry has a distinct **ID**, **unlock score**, **canon**, and **five localized versions**.
- Stories must be imaginative, sharply satirical, ironic, funny, and deliberately absurd without becoming random or incoherent.
- The narrator should sound like a competent, humorless professional delivering an impeccably sourced, profoundly stupid revelation.
- Length, tone and structure follow the **Secret format and tone standard** below (effective 2026-10-24), which replaces the earlier 250–500-word guideline.
- All texts are obviously **fictional conspiracy satire**, not purported real-world evidence.

### Secret format and tone standard (effective 2026-10-24)

Every new secret, in every language edition, follows this standard:

- **Length: 450–550 words** in `ES`, `EN` and `FR`, counted on the whole file including the title line. **`RU` and `ZH` are exempt from the word limit**: each is the translation, in its own alphabet, of a text that already has the expected number of words, and that is enough. Translate faithfully; do not pad or trim to hit a number.
- **Tone: institutional, but packed with absurd humor.** Write in the register of an official report, memorandum or ministerial statement, and let the absurdity grow inside that straight face (see the narrator rule above).
- **Regional references.** Each edition includes humorous references to the language region it is written for and to its idiosyncrasies (institutions, regional administrative habits, everyday bureaucracy, local speech), following sections 3.2 and 3.3. The canon stays the same; the local texture differs, and it avoids cliché (rule 7 of section 3.3).
- **Everything absurd is administratively possible.** The most outlandish premise must be achievable through plausible administrative mechanisms: permits, forms, budget lines, competence disputes, tenders, inspections, committees. The absurdity also reflects the administrative politics of the region of each edition (how its administrations actually divide competences, delay, delegate or classify), not a generic bureaucracy.
- **No lists.** Continuous prose in paragraphs: no bullet points, numbered lists, tables or sub-headings. The only heading is the title on the first line.
- **Self-check before delivering:** count the words of the `ES`, `EN` and `FR` editions, confirm there are no list markers in any edition, confirm the absurd events are administratively feasible, and confirm each edition contains its own regional references. Report any `ES`, `EN` or `FR` edition that falls outside the range.

### Narrative design

A typical story may contain: (1) an outrageous central assertion; (2) a historically anchored origin; (3) complicit agencies, governments, industries, or institutions; (4) escalating but causally linked revelations; (5) bureaucratic/political/cultural satire; and (6) an unexpected comedic ending. This is a **toolkit, not a rigid six-paragraph template**. Across 633 entries, vary the form: declassified report, interrogation, leaked memo, internal email, field dispatch, laboratory note, investigative exposé, intelligence briefing, etc.

Avoid repeating the same plot device, closing joke, intelligence-agency list, or narrative rhythm. Allow recurring fictional institutions and motifs only if they improve the shared universe rather than flattening the individual stories.

## 3. Five mandatory language editions

| Folder code | Language | Audience / default localization |
| --- | --- | --- |
| `ES` | Spanish | Natural European Spanish; accessible across Spanish-speaking audiences |
| `EN` | English | Idiomatic, internationally intelligible English; locally recognizable Anglo-American references when appropriate |
| `RU` | Russian (`Русский`) | Fluent contemporary Russian; culturally effective references and comic timing |
| `ZH` | Simplified Chinese (`简体中文`, `zh-Hans`) | Natural mainland-oriented Simplified Chinese; culturally intelligible settings and references |
| `FR` | French (`Français`) | Fluent metropolitan French with idiomatic satire and rhythm |

### Authoritative translation source by content type — project-wide directive

**Spanish (`ES`) is the single canonical source language of the whole game** (decision of 2026-10-24; it replaces the earlier English policy). What differs is *who* translates each content type:

| Content category | Authoritative source | Direct target editions and who produces them |
| --- | --- | --- |
| Conspiracy-secret narratives (all 633 secrets) | **Spanish (`ES`)**, the original story manuscript and locked canon | `EN`, `RU`, `ZH`, `FR` — **produced by this project** and filed in Drive |
| **Everything else in the game**: menus, common interface, options, button labels, minigame titles and instructions, rules, dialogs, accessibility/ARIA text, victory/congratulation messages, defeat/encouragement messages, and other game-facing strings | **Spanish (`ES`)** | `EN`, `RU`, `ZH`, `FR` — **not produced by this project**: Claude Code writes and translates them in the game project and mirrors them to Drive. Never edit them here |

**Mandatory operating rules:**

1. **Never use an intermediate translation.** Translate each target language directly from the Spanish source: `ES -> EN/RU/ZH/FR`. English is a target like the others, never a pivot.
2. **Do not replace an authoritative source with an existing translation.** An earlier translated `.md` does not become canonical just because it already exists in Google Drive.
3. **For game text** (handled by Claude Code, listed here for completeness), preserve localization keys, placeholders (such as `{{value}}` and `{{number}}`), markup/escape syntax, control names, gameplay semantics, and scoring logic. Translate human-facing values and accessibility labels, not identifiers. Adapt idioms or humor naturally without inventing new mechanics.
4. **For secrets**, preserve the Spanish canon, plot events, chronology, motives, core revelations, and the ending; adapt incidental cultural references only under the rules below.
5. **Quality control follows the correct source**: compare each version back to its original source language, flag ambiguous or untranslatable wording, and never claim independent native-speaker verification unless it occurred. Back-translation is a diagnostic, not proof of correctness.
6. **Historical note:** until 2026-10-24 English was the declared source of the non-secret game text. The game project has since moved all of it to Spanish-first Markdown under `Textos/<LANG>/Common`, `Games`, `Messages` and `Player`; this project does not touch those files.

This source-language rule governs **the entire TopSecret game**. The literary-canon and 633-secret production rules elsewhere in this guide govern **secret narratives only**, not ordinary UI or minigame strings. File and folder conventions are in `Textos/CONVENTIONS.md`, which is the single specification shared by Claude Code and this project.

**These are five literary localizations of one secret, not five literal translations.** Each version must read as if authored for its readers, rather than translated by substitution. Do not let English become a pivot that flattens the Spanish original or weakens other editions.

### 3.1 What must stay the same

- Central conspiracy and primary revelation.
- Causal chain, chronology, motives, major actors, and consequential events.
- Meaning of the ending, even when its wording or incidental setup changes.
- Crucial historical facts, institutional identities, and canonical recurring characters.
- Scope and stakes of the secret. Five players must uncover **the same underlying event**.

### 3.2 What may change

- Incidental place names, neighborhood references, and unimportant settings.
- Idioms, register, wordplay, phrasing, culturally familiar institutions, and bureaucratic terminology.
- Small supporting details whose **narrative function** remains constant.
- The setup or mechanics of a joke when a literal translation would not land.
- References to universally recognizable public institutions **only when changing them does not alter canon**.

**Example:** If a throwaway Spanish joke takes place in **Leganés**, a Chinese edition need not inexplicably mention Leganés: select a socially and comically equivalent peripheral locality or everyday institution known to the target audience. Do **not** reflexively replace Leganés with central Shanghai: scale, social context, and comic function matter more than fame. If Leganés is a key historical location in the shared conspiracy, **keep it** and make the reference intelligible in context.

### 3.3 Localization quality standard — non-negotiable

1. **Literary naturalness:** fluent syntax, authentic idioms, correct collocations, appropriate cultural register.
2. **Cultural comprehension:** references that local readers recognize without annotations or cultural homework.
3. **Equivalent humor:** restore irony, timing, surprise, and comic contrast even if exact wording must change.
4. **Plot fidelity:** no changes to the core premise or important events in the name of better jokes.
5. **Editorial precision:** correct orthography, punctuation, typography, grammar, names, and factual anchors.
6. **No fabricated authority:** where genuine historical background is invoked, do not present invented events as non-fiction outside the clearly satirical narrative frame.
7. **No bargain-bin stereotyping:** avoid making every Russian gag about vodka, every French gag about baguettes, or every Chinese gag about rice. Prefer specific, researched cultural texture.
8. **No padding:** do not increase length with meaningless filler or translate mechanically to satisfy a numeric word quota; the 450–550 range is met by writing each edition properly, not by adding filler.
9. **No quality shortcuts:** write and revise **each language edition as prose**, rather than creating a single machine translation and stopping.
10. **Review before approval:** compare each edition with the shared canon, proofread at the sentence level, and revise awkward humor. For publication-grade assurance, obtain native-speaker editorial review, particularly where regional idiom or ambiguous wordplay is involved. AI-generated fluency must not be mistaken for a guarantee of perfection.

**Rule of thumb:** A reader in Madrid, London, Moscow, Shanghai, or Paris should laugh at different culturally familiar details while learning the **same secret**. The precise cities are illustrative, not fixed mandatory settings.

## 4. Production and verification workflow

1. **Receive premise.** Record user-provided idea, constraints, required entities, and desired comedic direction.
2. **Assign the next unused ID** from `001` through `633`. Do not assign a score by extrapolating or guessing.
3. **Load the game's scoring sequence.** Match secret ID `NNN` to its exact corresponding listed score. If the sequence is not available or ambiguous, retain `PENDING` and ask for clarification instead of inventing a threshold.
4. **Lock the canon.** Briefly identify immutable plot beats, chronology, agencies, central revelations, and the intended comedic ending.
5. **Write the base version** (default: Spanish) and get it into a complete narrative form. Increment the **distinct secrets created** counter once.
6. **Localize individually** into English, Russian, Simplified Chinese, and French. Existing language drafts can be revised as needed.
7. **Cross-language editorial pass.** Check canon alignment, idiomatic fluency, culturally appropriate gags, endings, continuity, and filename-to-language consistency.
8. **Update the registry** in Section 7: score, localized-version status, working title, and progress summary. Record any deviations or unresolved QA issues. Claude web cannot edit the content of a file that already exists in Drive, so this register is maintained by Claude Code when it collects the secrets (`textos.py pull-secrets`); the author reports title, ID and any deviation in the delivery message.
9. **Notify the user** of the new `NNN/633` count, its exact score or `PENDING` status, and which language versions are finished.
10. **At #633**, announce the **633/633** milestone; announce all-five-language completion only after each of the 3,165 files has passed QA.

### Status codes used in the register

- `—` = not started or not found.
- `D` = draft exists; localization and/or editorial verification remains outstanding.
- `Q` = version checked for language quality and conformity to the shared canon.

The **distinct-secrets counter** depends on the accepted narrative, not on all five cells being `Q`. A fully localized and reviewed secret has `Q` in all five language columns. Do not turn `D` into `Q` based solely on the presence of a file.

## 5. Files and numbering

The **stable ID** connects the same story across all languages, irrespective of its culturally adapted title. The required filename is `secreto_NNN.md`, where NNN is the one-based sequence index with **three digits** (`secreto_001.md`, `secreto_112.md`), **identical in all five language folders** (the folder gives the language). Any other name is rejected by the importer.

```text
Textos/
├── CONVENTIONS.md
├── Directives/
│   ├── Conspiracy_Secrets_Master_Guide_and_Tracker.md
│   └── sequence_to_9999550.txt
├── ES/Secrets/secreto_001.md
├── EN/Secrets/secreto_001.md
├── RU/Secrets/secreto_001.md
├── ZH/Secrets/secreto_001.md
└── FR/Secrets/secreto_001.md
```

In Drive the shared folder is `My Drive/Ramon Oliver/Top Secret/Textos` and mirrors the game project's `Textos/` folder name for name. Write each secret to `Textos/<LANG>/Secrets/secreto_NNN.md` in all five languages; do not write anywhere else. The game project imports a secret only when all five versions exist, and never overwrites one it already has without the user's confirmation. The other files in `Textos/` belong to the game project.

Keep the score **out of the ID**: `001` is permanently Secret #001 even if its unlock requirement is changed. Resolve the score using the registry and the authoritative game sequence.

### Former localization/path discrepancy — resolved 2026-10-24

- `ES/Secrets/Secret_1.md` used to contain **English** (“OPERATION SNOWBALL: The Yeti Conspiracy.”) and `EN/Secrets/Secreto_1.md` **Spanish** (“OPERACIÓN BOLA DE NIEVE: La conspiración del Yeti.”).

On 2026-10-24 all five drafts were renamed to `Secrets/secreto_001.md` in the right language folder (ES in `ES`, English in `EN`), in Drive and in the game project; the old paths were archived and `importOverrides` no longer exists. All five language drafts are integrated. Language/canon QA remains separate: do not mark a draft `Q` solely because it was imported. These remain versions of **the same Secret #001**.

## 6. Scoring-sequence contract

- **Authoritative source:** `sequence_to_9999550.txt` in this directory, also copied to the game's root `Directives/` directory. It contains 633 indexed thresholds, ending at 9,999,550.
- **Mapping:** the first secret corresponds to the first specified secret threshold, the second to the second, and so on, using the exact sequence/indexing supplied by the user.
- **The former 400-point test override is retired.** There is no exception for the Yeti: `secreto_001.md` uses the first threshold, **150 points**.
- Unlock when the global score **equals or exceeds** the indexed threshold. Secrets are narrative progression milestones, equivalent to a typical final boss; this does not introduce a combat mechanic.
- `secreto_004.md` uses element 4 (**2,410**); `secreto_112.md` uses element 112. Missing manuscripts never renumber later secrets. Only available stories are registered for display.
- **Never mathematically infer missing scores** from earlier values; the game may use a deliberately irregular progression.
- Validate sequence length against 633 and ensure that no ID is missing. If thresholds repeat or fall, flag them but do not “correct” the source without permission.
- The game's import script derives thresholds from this file and updates the registry score column for all 633 IDs. Do not hand-maintain a second scoring progression.
- The score is a **game unlock threshold**, not the word count, secret index, or cumulative number of generated stories.

## 7. Master register — 633 secrets

**Registry conventions:** One row per distinct conspiracy. `PENDING` means no verified score supplied; `—` means no language file found or written. A `D` notes an existing draft, not publication readiness.

| Secret ID | Unlock score (points) | Working title / concept | ES | EN | RU | ZH | FR |
| --- | ---: | --- | :---: | :---: | :---: | :---: | :---: |
| 001 | 150 | Comisión internacional para la no localización del Yeti (rewritten to the 2026-10-24 standard) | D | D | D | D | D |
| 002 | 600 | Informe del Inspector General sobre el expediente Nibiru | D | D | D | D | D |
| 003 | 1205 | — | — | — | — | — | — |
| 004 | 2410 | — | — | — | — | — | — |
| 005 | 3890 | — | — | — | — | — | — |
| 006 | 4170 | — | — | — | — | — | — |
| 007 | 5120 | — | — | — | — | — | — |
| 008 | 6585 | — | — | — | — | — | — |
| 009 | 7190 | — | — | — | — | — | — |
| 010 | 8255 | — | — | — | — | — | — |
| 011 | 8950 | — | — | — | — | — | — |
| 012 | 9730 | — | — | — | — | — | — |
| 013 | 10500 | — | — | — | — | — | — |
| 014 | 11270 | — | — | — | — | — | — |
| 015 | 12040 | — | — | — | — | — | — |
| 016 | 12810 | — | — | — | — | — | — |
| 017 | 13580 | — | — | — | — | — | — |
| 018 | 14350 | — | — | — | — | — | — |
| 019 | 15120 | — | — | — | — | — | — |
| 020 | 15890 | — | — | — | — | — | — |
| 021 | 16660 | — | — | — | — | — | — |
| 022 | 17430 | — | — | — | — | — | — |
| 023 | 18200 | — | — | — | — | — | — |
| 024 | 18970 | — | — | — | — | — | — |
| 025 | 19740 | — | — | — | — | — | — |
| 026 | 20510 | — | — | — | — | — | — |
| 027 | 21355 | — | — | — | — | — | — |
| 028 | 22200 | — | — | — | — | — | — |
| 029 | 23045 | — | — | — | — | — | — |
| 030 | 23890 | — | — | — | — | — | — |
| 031 | 24735 | — | — | — | — | — | — |
| 032 | 25580 | — | — | — | — | — | — |
| 033 | 26425 | — | — | — | — | — | — |
| 034 | 27270 | — | — | — | — | — | — |
| 035 | 28115 | — | — | — | — | — | — |
| 036 | 28960 | — | — | — | — | — | — |
| 037 | 29805 | — | — | — | — | — | — |
| 038 | 30650 | — | — | — | — | — | — |
| 039 | 31570 | — | — | — | — | — | — |
| 040 | 32490 | — | — | — | — | — | — |
| 041 | 33410 | — | — | — | — | — | — |
| 042 | 34330 | — | — | — | — | — | — |
| 043 | 35250 | — | — | — | — | — | — |
| 044 | 36170 | — | — | — | — | — | — |
| 045 | 37090 | — | — | — | — | — | — |
| 046 | 38010 | — | — | — | — | — | — |
| 047 | 38930 | — | — | — | — | — | — |
| 048 | 39850 | — | — | — | — | — | — |
| 049 | 40770 | — | — | — | — | — | — |
| 050 | 41765 | — | — | — | — | — | — |
| 051 | 42760 | — | — | — | — | — | — |
| 052 | 43755 | — | — | — | — | — | — |
| 053 | 44750 | — | — | — | — | — | — |
| 054 | 45745 | — | — | — | — | — | — |
| 055 | 46740 | — | — | — | — | — | — |
| 056 | 47735 | — | — | — | — | — | — |
| 057 | 48730 | — | — | — | — | — | — |
| 058 | 49725 | — | — | — | — | — | — |
| 059 | 50720 | — | — | — | — | — | — |
| 060 | 51790 | — | — | — | — | — | — |
| 061 | 52860 | — | — | — | — | — | — |
| 062 | 53930 | — | — | — | — | — | — |
| 063 | 55000 | — | — | — | — | — | — |
| 064 | 56070 | — | — | — | — | — | — |
| 065 | 57140 | — | — | — | — | — | — |
| 066 | 58210 | — | — | — | — | — | — |
| 067 | 59280 | — | — | — | — | — | — |
| 068 | 60350 | — | — | — | — | — | — |
| 069 | 61495 | — | — | — | — | — | — |
| 070 | 62640 | — | — | — | — | — | — |
| 071 | 63785 | — | — | — | — | — | — |
| 072 | 64930 | — | — | — | — | — | — |
| 073 | 66075 | — | — | — | — | — | — |
| 074 | 67220 | — | — | — | — | — | — |
| 075 | 68365 | — | — | — | — | — | — |
| 076 | 69510 | — | — | — | — | — | — |
| 077 | 70655 | — | — | — | — | — | — |
| 078 | 71875 | — | — | — | — | — | — |
| 079 | 73095 | — | — | — | — | — | — |
| 080 | 74315 | — | — | — | — | — | — |
| 081 | 75535 | — | — | — | — | — | — |
| 082 | 76755 | — | — | — | — | — | — |
| 083 | 77975 | — | — | — | — | — | — |
| 084 | 79195 | — | — | — | — | — | — |
| 085 | 80415 | — | — | — | — | — | — |
| 086 | 81710 | — | — | — | — | — | — |
| 087 | 83005 | — | — | — | — | — | — |
| 088 | 84300 | — | — | — | — | — | — |
| 089 | 85595 | — | — | — | — | — | — |
| 090 | 86890 | — | — | — | — | — | — |
| 091 | 88185 | — | — | — | — | — | — |
| 092 | 89480 | — | — | — | — | — | — |
| 093 | 90775 | — | — | — | — | — | — |
| 094 | 92145 | — | — | — | — | — | — |
| 095 | 93515 | — | — | — | — | — | — |
| 096 | 94885 | — | — | — | — | — | — |
| 097 | 96255 | — | — | — | — | — | — |
| 098 | 97625 | — | — | — | — | — | — |
| 099 | 98995 | — | — | — | — | — | — |
| 100 | 100365 | — | — | — | — | — | — |
| 101 | 101810 | — | — | — | — | — | — |
| 102 | 103255 | — | — | — | — | — | — |
| 103 | 104700 | — | — | — | — | — | — |
| 104 | 106145 | — | — | — | — | — | — |
| 105 | 107590 | — | — | — | — | — | — |
| 106 | 109035 | — | — | — | — | — | — |
| 107 | 110480 | — | — | — | — | — | — |
| 108 | 112000 | — | — | — | — | — | — |
| 109 | 113520 | — | — | — | — | — | — |
| 110 | 115040 | — | — | — | — | — | — |
| 111 | 116560 | — | — | — | — | — | — |
| 112 | 118080 | — | — | — | — | — | — |
| 113 | 119600 | — | — | — | — | — | — |
| 114 | 121120 | — | — | — | — | — | — |
| 115 | 122715 | — | — | — | — | — | — |
| 116 | 124310 | — | — | — | — | — | — |
| 117 | 125905 | — | — | — | — | — | — |
| 118 | 127500 | — | — | — | — | — | — |
| 119 | 129095 | — | — | — | — | — | — |
| 120 | 130690 | — | — | — | — | — | — |
| 121 | 132360 | — | — | — | — | — | — |
| 122 | 134030 | — | — | — | — | — | — |
| 123 | 135700 | — | — | — | — | — | — |
| 124 | 137370 | — | — | — | — | — | — |
| 125 | 139040 | — | — | — | — | — | — |
| 126 | 140710 | — | — | — | — | — | — |
| 127 | 142455 | — | — | — | — | — | — |
| 128 | 144200 | — | — | — | — | — | — |
| 129 | 145945 | — | — | — | — | — | — |
| 130 | 147690 | — | — | — | — | — | — |
| 131 | 149435 | — | — | — | — | — | — |
| 132 | 151180 | — | — | — | — | — | — |
| 133 | 153000 | — | — | — | — | — | — |
| 134 | 154820 | — | — | — | — | — | — |
| 135 | 156640 | — | — | — | — | — | — |
| 136 | 158460 | — | — | — | — | — | — |
| 137 | 160280 | — | — | — | — | — | — |
| 138 | 162175 | — | — | — | — | — | — |
| 139 | 164070 | — | — | — | — | — | — |
| 140 | 165965 | — | — | — | — | — | — |
| 141 | 167860 | — | — | — | — | — | — |
| 142 | 169755 | — | — | — | — | — | — |
| 143 | 171650 | — | — | — | — | — | — |
| 144 | 173620 | — | — | — | — | — | — |
| 145 | 175590 | — | — | — | — | — | — |
| 146 | 177560 | — | — | — | — | — | — |
| 147 | 179530 | — | — | — | — | — | — |
| 148 | 181500 | — | — | — | — | — | — |
| 149 | 183545 | — | — | — | — | — | — |
| 150 | 185590 | — | — | — | — | — | — |
| 151 | 187635 | — | — | — | — | — | — |
| 152 | 189680 | — | — | — | — | — | — |
| 153 | 191725 | — | — | — | — | — | — |
| 154 | 193845 | — | — | — | — | — | — |
| 155 | 195965 | — | — | — | — | — | — |
| 156 | 198085 | — | — | — | — | — | — |
| 157 | 200205 | — | — | — | — | — | — |
| 158 | 202400 | — | — | — | — | — | — |
| 159 | 204595 | — | — | — | — | — | — |
| 160 | 206790 | — | — | — | — | — | — |
| 161 | 208985 | — | — | — | — | — | — |
| 162 | 211180 | — | — | — | — | — | — |
| 163 | 213450 | — | — | — | — | — | — |
| 164 | 215720 | — | — | — | — | — | — |
| 165 | 217990 | — | — | — | — | — | — |
| 166 | 220260 | — | — | — | — | — | — |
| 167 | 222605 | — | — | — | — | — | — |
| 168 | 224950 | — | — | — | — | — | — |
| 169 | 227295 | — | — | — | — | — | — |
| 170 | 229640 | — | — | — | — | — | — |
| 171 | 231985 | — | — | — | — | — | — |
| 172 | 234405 | — | — | — | — | — | — |
| 173 | 236825 | — | — | — | — | — | — |
| 174 | 239245 | — | — | — | — | — | — |
| 175 | 241665 | — | — | — | — | — | — |
| 176 | 244160 | — | — | — | — | — | — |
| 177 | 246655 | — | — | — | — | — | — |
| 178 | 249150 | — | — | — | — | — | — |
| 179 | 251645 | — | — | — | — | — | — |
| 180 | 254215 | — | — | — | — | — | — |
| 181 | 256785 | — | — | — | — | — | — |
| 182 | 259355 | — | — | — | — | — | — |
| 183 | 261925 | — | — | — | — | — | — |
| 184 | 264570 | — | — | — | — | — | — |
| 185 | 267215 | — | — | — | — | — | — |
| 186 | 269860 | — | — | — | — | — | — |
| 187 | 272505 | — | — | — | — | — | — |
| 188 | 275225 | — | — | — | — | — | — |
| 189 | 277945 | — | — | — | — | — | — |
| 190 | 280665 | — | — | — | — | — | — |
| 191 | 283460 | — | — | — | — | — | — |
| 192 | 286255 | — | — | — | — | — | — |
| 193 | 289050 | — | — | — | — | — | — |
| 194 | 291845 | — | — | — | — | — | — |
| 195 | 294715 | — | — | — | — | — | — |
| 196 | 297585 | — | — | — | — | — | — |
| 197 | 300455 | — | — | — | — | — | — |
| 198 | 303400 | — | — | — | — | — | — |
| 199 | 306345 | — | — | — | — | — | — |
| 200 | 309290 | — | — | — | — | — | — |
| 201 | 312235 | — | — | — | — | — | — |
| 202 | 315255 | — | — | — | — | — | — |
| 203 | 318275 | — | — | — | — | — | — |
| 204 | 321295 | — | — | — | — | — | — |
| 205 | 324390 | — | — | — | — | — | — |
| 206 | 327485 | — | — | — | — | — | — |
| 207 | 330580 | — | — | — | — | — | — |
| 208 | 333750 | — | — | — | — | — | — |
| 209 | 336920 | — | — | — | — | — | — |
| 210 | 340090 | — | — | — | — | — | — |
| 211 | 343335 | — | — | — | — | — | — |
| 212 | 346580 | — | — | — | — | — | — |
| 213 | 349825 | — | — | — | — | — | — |
| 214 | 353070 | — | — | — | — | — | — |
| 215 | 356390 | — | — | — | — | — | — |
| 216 | 359710 | — | — | — | — | — | — |
| 217 | 363030 | — | — | — | — | — | — |
| 218 | 366425 | — | — | — | — | — | — |
| 219 | 369820 | — | — | — | — | — | — |
| 220 | 373215 | — | — | — | — | — | — |
| 221 | 376685 | — | — | — | — | — | — |
| 222 | 380155 | — | — | — | — | — | — |
| 223 | 383700 | — | — | — | — | — | — |
| 224 | 387245 | — | — | — | — | — | — |
| 225 | 390790 | — | — | — | — | — | — |
| 226 | 394410 | — | — | — | — | — | — |
| 227 | 398030 | — | — | — | — | — | — |
| 228 | 401650 | — | — | — | — | — | — |
| 229 | 405345 | — | — | — | — | — | — |
| 230 | 409040 | — | — | — | — | — | — |
| 231 | 412735 | — | — | — | — | — | — |
| 232 | 416505 | — | — | — | — | — | — |
| 233 | 420275 | — | — | — | — | — | — |
| 234 | 424120 | — | — | — | — | — | — |
| 235 | 427965 | — | — | — | — | — | — |
| 236 | 431810 | — | — | — | — | — | — |
| 237 | 435730 | — | — | — | — | — | — |
| 238 | 439650 | — | — | — | — | — | — |
| 239 | 443570 | — | — | — | — | — | — |
| 240 | 447565 | — | — | — | — | — | — |
| 241 | 451560 | — | — | — | — | — | — |
| 242 | 455630 | — | — | — | — | — | — |
| 243 | 459700 | — | — | — | — | — | — |
| 244 | 463770 | — | — | — | — | — | — |
| 245 | 467915 | — | — | — | — | — | — |
| 246 | 472060 | — | — | — | — | — | — |
| 247 | 476280 | — | — | — | — | — | — |
| 248 | 480500 | — | — | — | — | — | — |
| 249 | 484795 | — | — | — | — | — | — |
| 250 | 489090 | — | — | — | — | — | — |
| 251 | 493385 | — | — | — | — | — | — |
| 252 | 497755 | — | — | — | — | — | — |
| 253 | 502125 | — | — | — | — | — | — |
| 254 | 506570 | — | — | — | — | — | — |
| 255 | 511015 | — | — | — | — | — | — |
| 256 | 515535 | — | — | — | — | — | — |
| 257 | 520055 | — | — | — | — | — | — |
| 258 | 524650 | — | — | — | — | — | — |
| 259 | 529245 | — | — | — | — | — | — |
| 260 | 533840 | — | — | — | — | — | — |
| 261 | 538510 | — | — | — | — | — | — |
| 262 | 543180 | — | — | — | — | — | — |
| 263 | 547925 | — | — | — | — | — | — |
| 264 | 552670 | — | — | — | — | — | — |
| 265 | 557490 | — | — | — | — | — | — |
| 266 | 562310 | — | — | — | — | — | — |
| 267 | 567205 | — | — | — | — | — | — |
| 268 | 572100 | — | — | — | — | — | — |
| 269 | 577070 | — | — | — | — | — | — |
| 270 | 582040 | — | — | — | — | — | — |
| 271 | 587085 | — | — | — | — | — | — |
| 272 | 592130 | — | — | — | — | — | — |
| 273 | 597250 | — | — | — | — | — | — |
| 274 | 602370 | — | — | — | — | — | — |
| 275 | 607565 | — | — | — | — | — | — |
| 276 | 612760 | — | — | — | — | — | — |
| 277 | 618030 | — | — | — | — | — | — |
| 278 | 623300 | — | — | — | — | — | — |
| 279 | 628645 | — | — | — | — | — | — |
| 280 | 633990 | — | — | — | — | — | — |
| 281 | 639410 | — | — | — | — | — | — |
| 282 | 644830 | — | — | — | — | — | — |
| 283 | 650325 | — | — | — | — | — | — |
| 284 | 655895 | — | — | — | — | — | — |
| 285 | 661465 | — | — | — | — | — | — |
| 286 | 667110 | — | — | — | — | — | — |
| 287 | 672755 | — | — | — | — | — | — |
| 288 | 678475 | — | — | — | — | — | — |
| 289 | 684195 | — | — | — | — | — | — |
| 290 | 689990 | — | — | — | — | — | — |
| 291 | 695785 | — | — | — | — | — | — |
| 292 | 701655 | — | — | — | — | — | — |
| 293 | 707600 | — | — | — | — | — | — |
| 294 | 713545 | — | — | — | — | — | — |
| 295 | 719565 | — | — | — | — | — | — |
| 296 | 725585 | — | — | — | — | — | — |
| 297 | 731680 | — | — | — | — | — | — |
| 298 | 737850 | — | — | — | — | — | — |
| 299 | 744020 | — | — | — | — | — | — |
| 300 | 750265 | — | — | — | — | — | — |
| 301 | 756585 | — | — | — | — | — | — |
| 302 | 762905 | — | — | — | — | — | — |
| 303 | 769300 | — | — | — | — | — | — |
| 304 | 775695 | — | — | — | — | — | — |
| 305 | 782165 | — | — | — | — | — | — |
| 306 | 788710 | — | — | — | — | — | — |
| 307 | 795255 | — | — | — | — | — | — |
| 308 | 801875 | — | — | — | — | — | — |
| 309 | 808570 | — | — | — | — | — | — |
| 310 | 815265 | — | — | — | — | — | — |
| 311 | 822035 | — | — | — | — | — | — |
| 312 | 828880 | — | — | — | — | — | — |
| 313 | 835725 | — | — | — | — | — | — |
| 314 | 842645 | — | — | — | — | — | — |
| 315 | 849640 | — | — | — | — | — | — |
| 316 | 856635 | — | — | — | — | — | — |
| 317 | 863705 | — | — | — | — | — | — |
| 318 | 870850 | — | — | — | — | — | — |
| 319 | 878070 | — | — | — | — | — | — |
| 320 | 885290 | — | — | — | — | — | — |
| 321 | 892585 | — | — | — | — | — | — |
| 322 | 899955 | — | — | — | — | — | — |
| 323 | 907325 | — | — | — | — | — | — |
| 324 | 914770 | — | — | — | — | — | — |
| 325 | 922290 | — | — | — | — | — | — |
| 326 | 929885 | — | — | — | — | — | — |
| 327 | 937480 | — | — | — | — | — | — |
| 328 | 945150 | — | — | — | — | — | — |
| 329 | 952895 | — | — | — | — | — | — |
| 330 | 960715 | — | — | — | — | — | — |
| 331 | 968610 | — | — | — | — | — | — |
| 332 | 976505 | — | — | — | — | — | — |
| 333 | 984475 | — | — | — | — | — | — |
| 334 | 992520 | — | — | — | — | — | — |
| 335 | 1000640 | — | — | — | — | — | — |
| 336 | 1008835 | — | — | — | — | — | — |
| 337 | 1017030 | — | — | — | — | — | — |
| 338 | 1025300 | — | — | — | — | — | — |
| 339 | 1033645 | — | — | — | — | — | — |
| 340 | 1042065 | — | — | — | — | — | — |
| 341 | 1050560 | — | — | — | — | — | — |
| 342 | 1059130 | — | — | — | — | — | — |
| 343 | 1067700 | — | — | — | — | — | — |
| 344 | 1076345 | — | — | — | — | — | — |
| 345 | 1085065 | — | — | — | — | — | — |
| 346 | 1093860 | — | — | — | — | — | — |
| 347 | 1102730 | — | — | — | — | — | — |
| 348 | 1111675 | — | — | — | — | — | — |
| 349 | 1120695 | — | — | — | — | — | — |
| 350 | 1129790 | — | — | — | — | — | — |
| 351 | 1138885 | — | — | — | — | — | — |
| 352 | 1148055 | — | — | — | — | — | — |
| 353 | 1157300 | — | — | — | — | — | — |
| 354 | 1166620 | — | — | — | — | — | — |
| 355 | 1176015 | — | — | — | — | — | — |
| 356 | 1185485 | — | — | — | — | — | — |
| 357 | 1195030 | — | — | — | — | — | — |
| 358 | 1204650 | — | — | — | — | — | — |
| 359 | 1214345 | — | — | — | — | — | — |
| 360 | 1224115 | — | — | — | — | — | — |
| 361 | 1233960 | — | — | — | — | — | — |
| 362 | 1243880 | — | — | — | — | — | — |
| 363 | 1253875 | — | — | — | — | — | — |
| 364 | 1263945 | — | — | — | — | — | — |
| 365 | 1274090 | — | — | — | — | — | — |
| 366 | 1284310 | — | — | — | — | — | — |
| 367 | 1294605 | — | — | — | — | — | — |
| 368 | 1304975 | — | — | — | — | — | — |
| 369 | 1315420 | — | — | — | — | — | — |
| 370 | 1325940 | — | — | — | — | — | — |
| 371 | 1336535 | — | — | — | — | — | — |
| 372 | 1347205 | — | — | — | — | — | — |
| 373 | 1357950 | — | — | — | — | — | — |
| 374 | 1368770 | — | — | — | — | — | — |
| 375 | 1379665 | — | — | — | — | — | — |
| 376 | 1390635 | — | — | — | — | — | — |
| 377 | 1401755 | — | — | — | — | — | — |
| 378 | 1412950 | — | — | — | — | — | — |
| 379 | 1424220 | — | — | — | — | — | — |
| 380 | 1435565 | — | — | — | — | — | — |
| 381 | 1446985 | — | — | — | — | — | — |
| 382 | 1458480 | — | — | — | — | — | — |
| 383 | 1470050 | — | — | — | — | — | — |
| 384 | 1481770 | — | — | — | — | — | — |
| 385 | 1493565 | — | — | — | — | — | — |
| 386 | 1505435 | — | — | — | — | — | — |
| 387 | 1517380 | — | — | — | — | — | — |
| 388 | 1529400 | — | — | — | — | — | — |
| 389 | 1541495 | — | — | — | — | — | — |
| 390 | 1553740 | — | — | — | — | — | — |
| 391 | 1566060 | — | — | — | — | — | — |
| 392 | 1578455 | — | — | — | — | — | — |
| 393 | 1590925 | — | — | — | — | — | — |
| 394 | 1603545 | — | — | — | — | — | — |
| 395 | 1616240 | — | — | — | — | — | — |
| 396 | 1629010 | — | — | — | — | — | — |
| 397 | 1641855 | — | — | — | — | — | — |
| 398 | 1654850 | — | — | — | — | — | — |
| 399 | 1667920 | — | — | — | — | — | — |
| 400 | 1681065 | — | — | — | — | — | — |
| 401 | 1694360 | — | — | — | — | — | — |
| 402 | 1707730 | — | — | — | — | — | — |
| 403 | 1721175 | — | — | — | — | — | — |
| 404 | 1734770 | — | — | — | — | — | — |
| 405 | 1748440 | — | — | — | — | — | — |
| 406 | 1762185 | — | — | — | — | — | — |
| 407 | 1776080 | — | — | — | — | — | — |
| 408 | 1790050 | — | — | — | — | — | — |
| 409 | 1804170 | — | — | — | — | — | — |
| 410 | 1818365 | — | — | — | — | — | — |
| 411 | 1832635 | — | — | — | — | — | — |
| 412 | 1847055 | — | — | — | — | — | — |
| 413 | 1861550 | — | — | — | — | — | — |
| 414 | 1876195 | — | — | — | — | — | — |
| 415 | 1890915 | — | — | — | — | — | — |
| 416 | 1905785 | — | — | — | — | — | — |
| 417 | 1920730 | — | — | — | — | — | — |
| 418 | 1935825 | — | — | — | — | — | — |
| 419 | 1950995 | — | — | — | — | — | — |
| 420 | 1966315 | — | — | — | — | — | — |
| 421 | 1981710 | — | — | — | — | — | — |
| 422 | 1997255 | — | — | — | — | — | — |
| 423 | 2012875 | — | — | — | — | — | — |
| 424 | 2028645 | — | — | — | — | — | — |
| 425 | 2044490 | — | — | — | — | — | — |
| 426 | 2060485 | — | — | — | — | — | — |
| 427 | 2076630 | — | — | — | — | — | — |
| 428 | 2092850 | — | — | — | — | — | — |
| 429 | 2109220 | — | — | — | — | — | — |
| 430 | 2125665 | — | — | — | — | — | — |
| 431 | 2142260 | — | — | — | — | — | — |
| 432 | 2159005 | — | — | — | — | — | — |
| 433 | 2175825 | — | — | — | — | — | — |
| 434 | 2192795 | — | — | — | — | — | — |
| 435 | 2209915 | — | — | — | — | — | — |
| 436 | 2227110 | — | — | — | — | — | — |
| 437 | 2244455 | — | — | — | — | — | — |
| 438 | 2261950 | — | — | — | — | — | — |
| 439 | 2279595 | — | — | — | — | — | — |
| 440 | 2297315 | — | — | — | — | — | — |
| 441 | 2315185 | — | — | — | — | — | — |
| 442 | 2333205 | — | — | — | — | — | — |
| 443 | 2351375 | — | — | — | — | — | — |
| 444 | 2369695 | — | — | — | — | — | — |
| 445 | 2388090 | — | — | — | — | — | — |
| 446 | 2406635 | — | — | — | — | — | — |
| 447 | 2425330 | — | — | — | — | — | — |
| 448 | 2444175 | — | — | — | — | — | — |
| 449 | 2463170 | — | — | — | — | — | — |
| 450 | 2482315 | — | — | — | — | — | — |
| 451 | 2501610 | — | — | — | — | — | — |
| 452 | 2521055 | — | — | — | — | — | — |
| 453 | 2540650 | — | — | — | — | — | — |
| 454 | 2560395 | — | — | — | — | — | — |
| 455 | 2580290 | — | — | — | — | — | — |
| 456 | 2600335 | — | — | — | — | — | — |
| 457 | 2620530 | — | — | — | — | — | — |
| 458 | 2640875 | — | — | — | — | — | — |
| 459 | 2661370 | — | — | — | — | — | — |
| 460 | 2682015 | — | — | — | — | — | — |
| 461 | 2702810 | — | — | — | — | — | — |
| 462 | 2723755 | — | — | — | — | — | — |
| 463 | 2744850 | — | — | — | — | — | — |
| 464 | 2766095 | — | — | — | — | — | — |
| 465 | 2787490 | — | — | — | — | — | — |
| 466 | 2809035 | — | — | — | — | — | — |
| 467 | 2830730 | — | — | — | — | — | — |
| 468 | 2852650 | — | — | — | — | — | — |
| 469 | 2874720 | — | — | — | — | — | — |
| 470 | 2896940 | — | — | — | — | — | — |
| 471 | 2919310 | — | — | — | — | — | — |
| 472 | 2941830 | — | — | — | — | — | — |
| 473 | 2964575 | — | — | — | — | — | — |
| 474 | 2987470 | — | — | — | — | — | — |
| 475 | 3010515 | — | — | — | — | — | — |
| 476 | 3033785 | — | — | — | — | — | — |
| 477 | 3057205 | — | — | — | — | — | — |
| 478 | 3080775 | — | — | — | — | — | — |
| 479 | 3104570 | — | — | — | — | — | — |
| 480 | 3128515 | — | — | — | — | — | — |
| 481 | 3152610 | — | — | — | — | — | — |
| 482 | 3176930 | — | — | — | — | — | — |
| 483 | 3201400 | — | — | — | — | — | — |
| 484 | 3226095 | — | — | — | — | — | — |
| 485 | 3250940 | — | — | — | — | — | — |
| 486 | 3276010 | — | — | — | — | — | — |
| 487 | 3301230 | — | — | — | — | — | — |
| 488 | 3326675 | — | — | — | — | — | — |
| 489 | 3352270 | — | — | — | — | — | — |
| 490 | 3378090 | — | — | — | — | — | — |
| 491 | 3404060 | — | — | — | — | — | — |
| 492 | 3430255 | — | — | — | — | — | — |
| 493 | 3456675 | — | — | — | — | — | — |
| 494 | 3483245 | — | — | — | — | — | — |
| 495 | 3510040 | — | — | — | — | — | — |
| 496 | 3537060 | — | — | — | — | — | — |
| 497 | 3564230 | — | — | — | — | — | — |
| 498 | 3591625 | — | — | — | — | — | — |
| 499 | 3619245 | — | — | — | — | — | — |
| 500 | 3647015 | — | — | — | — | — | — |
| 501 | 3675010 | — | — | — | — | — | — |
| 502 | 3703230 | — | — | — | — | — | — |
| 503 | 3731675 | — | — | — | — | — | — |
| 504 | 3760345 | — | — | — | — | — | — |
| 505 | 3789240 | — | — | — | — | — | — |
| 506 | 3818285 | — | — | — | — | — | — |
| 507 | 3847555 | — | — | — | — | — | — |
| 508 | 3877050 | — | — | — | — | — | — |
| 509 | 3906770 | — | — | — | — | — | — |
| 510 | 3936715 | — | — | — | — | — | — |
| 511 | 3966885 | — | — | — | — | — | — |
| 512 | 3997280 | — | — | — | — | — | — |
| 513 | 4027900 | — | — | — | — | — | — |
| 514 | 4058745 | — | — | — | — | — | — |
| 515 | 4089815 | — | — | — | — | — | — |
| 516 | 4121110 | — | — | — | — | — | — |
| 517 | 4152705 | — | — | — | — | — | — |
| 518 | 4184525 | — | — | — | — | — | — |
| 519 | 4216570 | — | — | — | — | — | — |
| 520 | 4248840 | — | — | — | — | — | — |
| 521 | 4281335 | — | — | — | — | — | — |
| 522 | 4314130 | — | — | — | — | — | — |
| 523 | 4347150 | — | — | — | — | — | — |
| 524 | 4380395 | — | — | — | — | — | — |
| 525 | 4413940 | — | — | — | — | — | — |
| 526 | 4447710 | — | — | — | — | — | — |
| 527 | 4481705 | — | — | — | — | — | — |
| 528 | 4516000 | — | — | — | — | — | — |
| 529 | 4550520 | — | — | — | — | — | — |
| 530 | 4585340 | — | — | — | — | — | — |
| 531 | 4620385 | — | — | — | — | — | — |
| 532 | 4655730 | — | — | — | — | — | — |
| 533 | 4691300 | — | — | — | — | — | — |
| 534 | 4727170 | — | — | — | — | — | — |
| 535 | 4763265 | — | — | — | — | — | — |
| 536 | 4799660 | — | — | — | — | — | — |
| 537 | 4836280 | — | — | — | — | — | — |
| 538 | 4873200 | — | — | — | — | — | — |
| 539 | 4910420 | — | — | — | — | — | — |
| 540 | 4947940 | — | — | — | — | — | — |
| 541 | 4985685 | — | — | — | — | — | — |
| 542 | 5023730 | — | — | — | — | — | — |
| 543 | 5062075 | — | — | — | — | — | — |
| 544 | 5100720 | — | — | — | — | — | — |
| 545 | 5139665 | — | — | — | — | — | — |
| 546 | 5178835 | — | — | — | — | — | — |
| 547 | 5218305 | — | — | — | — | — | — |
| 548 | 5258075 | — | — | — | — | — | — |
| 549 | 5298145 | — | — | — | — | — | — |
| 550 | 5338515 | — | — | — | — | — | — |
| 551 | 5379185 | — | — | — | — | — | — |
| 552 | 5420155 | — | — | — | — | — | — |
| 553 | 5461500 | — | — | — | — | — | — |
| 554 | 5503145 | — | — | — | — | — | — |
| 555 | 5545090 | — | — | — | — | — | — |
| 556 | 5587335 | — | — | — | — | — | — |
| 557 | 5629880 | — | — | — | — | — | — |
| 558 | 5672725 | — | — | — | — | — | — |
| 559 | 5715945 | — | — | — | — | — | — |
| 560 | 5759465 | — | — | — | — | — | — |
| 561 | 5803285 | — | — | — | — | — | — |
| 562 | 5847480 | — | — | — | — | — | — |
| 563 | 5891975 | — | — | — | — | — | — |
| 564 | 5936845 | — | — | — | — | — | — |
| 565 | 5982015 | — | — | — | — | — | — |
| 566 | 6027560 | — | — | — | — | — | — |
| 567 | 6073405 | — | — | — | — | — | — |
| 568 | 6119625 | — | — | — | — | — | — |
| 569 | 6166145 | — | — | — | — | — | — |
| 570 | 6213040 | — | — | — | — | — | — |
| 571 | 6260310 | — | — | — | — | — | — |
| 572 | 6307955 | — | — | — | — | — | — |
| 573 | 6355900 | — | — | — | — | — | — |
| 574 | 6404220 | — | — | — | — | — | — |
| 575 | 6452915 | — | — | — | — | — | — |
| 576 | 6501985 | — | — | — | — | — | — |
| 577 | 6551430 | — | — | — | — | — | — |
| 578 | 6601250 | — | — | — | — | — | — |
| 579 | 6651445 | — | — | — | — | — | — |
| 580 | 6702015 | — | — | — | — | — | — |
| 581 | 6752960 | — | — | — | — | — | — |
| 582 | 6804280 | — | — | — | — | — | — |
| 583 | 6855975 | — | — | — | — | — | — |
| 584 | 6908045 | — | — | — | — | — | — |
| 585 | 6960490 | — | — | — | — | — | — |
| 586 | 7013385 | — | — | — | — | — | — |
| 587 | 7066655 | — | — | — | — | — | — |
| 588 | 7120300 | — | — | — | — | — | — |
| 589 | 7174395 | — | — | — | — | — | — |
| 590 | 7228865 | — | — | — | — | — | — |
| 591 | 7283710 | — | — | — | — | — | — |
| 592 | 7339005 | — | — | — | — | — | — |
| 593 | 7394675 | — | — | — | — | — | — |
| 594 | 7450795 | — | — | — | — | — | — |
| 595 | 7507365 | — | — | — | — | — | — |
| 596 | 7564310 | — | — | — | — | — | — |
| 597 | 7621705 | — | — | — | — | — | — |
| 598 | 7679550 | — | — | — | — | — | — |
| 599 | 7737770 | — | — | — | — | — | — |
| 600 | 7796440 | — | — | — | — | — | — |
| 601 | 7855560 | — | — | — | — | — | — |
| 602 | 7915130 | — | — | — | — | — | — |
| 603 | 7975150 | — | — | — | — | — | — |
| 604 | 8035620 | — | — | — | — | — | — |
| 605 | 8096540 | — | — | — | — | — | — |
| 606 | 8157910 | — | — | — | — | — | — |
| 607 | 8219730 | — | — | — | — | — | — |
| 608 | 8282000 | — | — | — | — | — | — |
| 609 | 8344795 | — | — | — | — | — | — |
| 610 | 8408040 | — | — | — | — | — | — |
| 611 | 8471735 | — | — | — | — | — | — |
| 612 | 8535955 | — | — | — | — | — | — |
| 613 | 8600625 | — | — | — | — | — | — |
| 614 | 8665820 | — | — | — | — | — | — |
| 615 | 8731465 | — | — | — | — | — | — |
| 616 | 8797635 | — | — | — | — | — | — |
| 617 | 8864255 | — | — | — | — | — | — |
| 618 | 8931400 | — | — | — | — | — | — |
| 619 | 8999070 | — | — | — | — | — | — |
| 620 | 9067190 | — | — | — | — | — | — |
| 621 | 9135835 | — | — | — | — | — | — |
| 622 | 9205005 | — | — | — | — | — | — |
| 623 | 9274700 | — | — | — | — | — | — |
| 624 | 9344920 | — | — | — | — | — | — |
| 625 | 9415665 | — | — | — | — | — | — |
| 626 | 9486935 | — | — | — | — | — | — |
| 627 | 9558730 | — | — | — | — | — | — |
| 628 | 9631050 | — | — | — | — | — | — |
| 629 | 9703970 | — | — | — | — | — | — |
| 630 | 9777415 | — | — | — | — | — | — |
| 631 | 9851385 | — | — | — | — | — | — |
| 632 | 9925955 | — | — | — | — | — | — |
| 633 | 9999550 | — | — | — | — | — | — |


## 8. Change log and mandatory user notifications

| Date | Event | Distinct secrets | Points | Language state |
| --- | --- | ---: | ---: | --- |
| 2026-10-21 | Registered existing Yeti conspiracy as #001 (historical test setup) | 1/633 | 400 (retired) | Initial Spanish and English drafts were filed under the opposite language folders |
| 2026-10-21 | Adopted the authoritative 633-entry sequence | 1/633 | 150 | Yeti uses entry 1; all registry thresholds populated; five localized drafts integrated; new files use Secretos_x.md |
| 2026-10-24 | Unified naming between Drive and the game: `Textos/<LANG>/Secrets/secreto_NNN.md`; Spanish is the single source language | 1/633 | 150 | Yeti files renamed in all five languages and the swapped ES/EN paths fixed; the old files were archived |
| 2026-10-24 | Adopted the secret format and tone standard (450–550 words, institutional tone with absurd humor and regional references, no lists, administratively possible absurdity) | 1/633 | 150 | Applies to new secrets; the Yeti drafts predate it (word counts: ES 461, EN 417, FR 478, RU 362; ZH 955 characters) and are not rewritten without the user's approval. Same day: RU and ZH exempted from the word limit; secret 001 was rewritten by the author to the new standard |
| 2026-10-24 | Secret 001 replaced by the author's rewrite (Comisión internacional para la no localización del Yeti); secret 002 registered (Informe del inspector general sobre el expediente Nibiru) | 2/633 | 150, 600 | Both in five language drafts. 001: ES 501, EN 519, FR 546 words. 002: ES 528, EN 536, FR 552 (2 over the range, not blocking); RU/ZH exempt from the word limit. The register is now updated by Claude Code on collection |
| 2026-10-24 | Secret 002 definitive version collected, replacing the earlier draft | 2/633 | 600 | ES, EN and FR 550 words each; RU and ZH exempt from the word limit. Length tolerance: 20 words outside 450–550 pass; beyond that Claude Code asks the user before importing |

For each new secret, state in the response:

```text
Secret #NNN / 633 — [title]
Unlock score: [exact threshold] points (or PENDING)
Distinct secrets created: NNN/633
Remaining secrets: [633 - NNN]
Language status: ES [status] · EN [status] · RU [status] · ZH [status] · FR [status]
```

**At secret #633**, explicitly state:

> The 633-secret writing target is complete. No further distinct secrets are required.

Then give the independent localization status (`Q` out of 3,165 language editions) and any unresolved editorial issues. A project with 633 written base stories but 100 missing translations is **not** fully localized.

## 9. Maintaining the source of truth

This Markdown file is a **manual, versioned project register**, not a live database or an automatic background process. Update and save the actual `.md` after creating or editing each secret; never merely describe an update in chat and assume the Drive copy changed. Exception (2026-10-24): Claude web cannot edit a file that already exists in Drive, so this register is updated by Claude Code from the delivery message when it collects the secrets; Claude web must still report the ID, title and any deviation in its message. When resuming in another chat, read the **latest saved register plus scoring sequence**, check the story files, then reconcile differences before incrementing counts. If the saved register is stale, do not rely on conversational memory to overwrite it.

All content must stay CommonMark-compatible, encoded as UTF-8, and readable in Obsidian, MarkText, and ordinary Markdown readers. No proprietary editor syntax is required.
