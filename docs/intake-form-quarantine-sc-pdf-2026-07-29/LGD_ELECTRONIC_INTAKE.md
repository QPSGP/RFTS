# Electronic Life Guidance Discovery (LGD) & Goal Manifestation Script Design

Product design for a digital Life Guidance Discovery intake that (a) prepares a facilitator/hypnotherapist session and/or (b) produces a high-quality **Goal Manifestation script draft** for Customized Goal Manifestation Recording (CGMR) production.

Aligned with Success Center practice (Terry Brussel-Rogers), Platinum CGMR placement rules, and personas in `docs/personas.md` (especially Chris - Spiritual Entrepreneur).

---

## 1. Outcomes

| Outcome | Description |
|---------|-------------|
| **Session brief** | Facilitator sees a structured summary before a live LGD call |
| **Script draft** | Auto-assembled Goal Manifestation script (induction + suggestions + deepening + close) using the member’s own words |
| **Production packet** | Voice choice, frequency bed, schedule placement, approval status |
| **Member record** | Stored intake version history; linked to CGMR library item when produced |

The automated draft is designed to be **more complete and consistent** than an ad-hoc notes process: every required script block is filled, contradictions are flagged, and exact member language is preserved. A facilitator still **approves or edits** before audio production unless their practice settings allow auto-approve.

---

## 2. Access & packaging

| Surface | Behavior |
|---------|----------|
| **Public website** | `/life-guidance-discovery` (or `/lgd`) - marketing page + start intake (guest can start; account required to save/submit) |
| **Member console** | If `hadLgdSession` is false and no completed intake/CGMR: offer paid or included LGD electronic intake (plan/price configurable) |
| **Signup** | (1) Interested in LGD info → follow-up email; (2) Already had LGD → sets `hadLgdSession` (skips “need LGD” upsell later) |
| **Facilitator console** | Feature toggles (active/inactive): electronic intake, script draft, professional voices, member-own-voice (later), frequency beds, public LGD offer, member-console paid offer |

---

## 3. Facilitator feature flags

Stored per facilitator (defaults below). Admin may also set platform defaults.

| Flag | Default | Purpose |
|------|---------|---------|
| `lgdElectronicIntake` | on | Offer structured intake |
| `lgdScriptDraft` | on | Generate Goal Manifestation script draft from intake |
| `lgdProfessionalVoices` | on | Member/facilitator picks from catalog voices |
| `lgdMemberOwnVoice` | **off** | Later: voice clone / member-recorded affirmations |
| `lgdFrequencyBeds` | on | Select supportive sound beds |
| `lgdPublicOffer` | on | Show public website entry |
| `lgdMemberConsoleOffer` | on | Upsell in console if no prior LGD/CGMR |
| `lgdRequireFacilitatorApproval` | on | Block production until approve |

---

## 4. Voice options (phased)

**Phase A - Professional hypnotic voices (ship first)**  
Catalog examples (names illustrative; final talent TBD):

Every CGMR voice is judged first on **hypnotic sleep delivery** (slow, smooth, continuous, peaceful - suitable for inducing a receptive subconscious state). Tone color is secondary:

- Terry Brussel-Rogers (signature warm feminine authority)
- Nurturing - soft / feminine
- Professional - calm guide
- Deeper resonant - masculine

Member or facilitator selects one voice. AI produce uses hypnotic instructions + slower pace (`gpt-4o-mini-tts` by default); studio uploads should already be a calm hypnotic read.

**Phase B - “My own voice”**  
Consent → record a **calm, peaceful hypnotic-state** sample (not daytime speech) → clone/studio match that relaxed voice as closely as possible → QA → optional mix with induction/bed.

---

## 5. Frequency / vibrational beds

Optional layers under voice (not medical claims):

| Bed ID | Intent | Notes |
|--------|--------|-------|
| `calm_delta` | Sleep deepen | Soft low pulse / delta-friendly bed |
| `heart_coherence` | Emotional openness | Gentle rhythmic pad |
| `focus_clarity` | Mental clarity / goals | Light higher shimmer, low volume |
| `abundance_warm` | Wealth / confidence | Warm harmonic bed |
| `neutral_music` | Classic CGMR | Existing Success Center style music |

Chosen from intake answers (primary life area + sleep vs daytime preference). Always duck under voice; never replace suggestions.

---

## 6. Intake architecture (sections → script)

Each section collects **structured fields + free-text “in your words”**. Free text is copied verbatim into script suggestion lines where marked `[MEMBER_WORDS]`.

Aligned to Success Center paper form `Client_Intake_Form_fillable.pdf` (intake version **4**). Backup of the prior electronic form: `docs/intake-form-backup-2026-07-29/`.

### Section A - Instructions & subconscious programming
- Paper-form completion instructions (personal/clinical, challenges ranking, Seven Keys)
- Premise: **How would you like your subconscious programmed?** (multi-select catalog)
- Consent to store answers and generate a draft script
- Crisis / medical disclaimer (escalate to human, no auto-script)
- Already completed live LGD? (syncs `hadLgdSession`)

### Section P - Personal & clinical information (paper pages 2–4)
- Contact, address, phones/hours, employment, marital/family, children, education, occupation
- **Clinical:** doctor, emergency contact, current health issues, medications, prior hypnosis, religion
- How heard about us (+ specify), hobbies, speaker/org interest
- Hypnosis missed-appointment agreement + date

### Section B - Beliefs & life areas
- **Belief transformation** (multiple choice): select limiting beliefs → choose growth belief to install (or custom pair)
- Life areas 1–10 ratings: physical, mental, emotional, spiritual, financial, relationship, work/mission, sleep/energy

### Section C - Challenges checklist (paper page 5)
- **Full Success Center checklist** (not the short curated list) with detail subfields (drug, weight/height, cigarettes/day, income bands, etc.)
- Check applicable, then rank **top 10 priorities**
- Gratitude + “My most important challenge is…”

### Section D - Goals for your CGMR
- **Goal horizons:** short-term, long-term, one-year, **five-year**, ultimate goal
- Top 3 outcomes in **their words**; RFTS goal catalog; identity statements; timeline; income bands

### Section E - Seven Keys & how you get there (paper page 6)
- **Seven Keys ranking** - Bronze always #1; member checks and orders Copper→Platinum Keys that apply
- Known blocks, past attempts, strengths, will to learn / belief I can learn

### Section F - Language, modality & facilitator handoff
- Metaphors, words love/avoid, spiritual language, listen context, voice, frequency bed
- Questions for facilitator; live LGD interest; permission to edit draft
- After submit / CGMR path: **CGMR usage instructions** in member console

---

## 7. Automated Goal Manifestation script draft

### Script skeleton (always generated)

1. **Induction** - classic SC CGMR progressive relaxation (feet → scalp), recovered from library CGMRs  
2. **Deepener** - classic 5→0 into hypnosis + soft grass / tall tree / brook / forest vitality scene  
3. **Present → future bridge** - acknowledge current state without reinforcing blocks  
4. **Identity & goal suggestions** - member’s “I am now…” phrases, prioritized goals, USP five areas when Balanced Life / holistic selected  
5. **Behavioral / emotional supports** - sleep, stress, will to learn, specific bridges  
6. **Financial / mission** (if opted) - investment mindset, ethical success (beacon language)  
7. **Future pacing** - waking life evidence cues  
8. **Post-hypnotic sleep suggestion** - personalized suggestions continue overnight  
9. **Emergence / sleep close** - classic SC self-mastery close, 0→5 into natural sleep, nightly Reach For The Stars reinforcement  

Shared open/close text lives in `src/lib/terry-cgmr-shared-script.ts` (transcribed from SC CGMR library audio).  

### Draft quality rules
- Prefer `[MEMBER_WORDS]` over paraphrasing  
- Never put “I can’t / I always fail” into affirmative present tense without a deliberate reframe block  
- Flag contradictions (e.g. spiritual-only + high income ask without bridge) for facilitator  
- Length target: ~12–18 minutes spoken at calm pace  
- Output formats: Markdown for review + JSON blocks for TTS/studio  

### Schedule placement (existing product rules)
- 2 plays/night → CGMR as 2nd play every other night (current Success Center rule)  
- 1 play/night → every 4th play  
Documented in welcome/LGD emails; keep when wiring production.

---

## 8. Data model (implementation)

```
member_profiles.wants_lgd_info     -- interested in info (email follow-up)
member_profiles.had_lgd_session    -- already completed LGD (live or electronic)

lgd_intakes (
  id, user_id, facilitator_id nullable,
  status: draft | submitted | in_review | script_ready | approved | in_production | complete | cancelled,
  answers jsonb,           -- section payloads
  script_draft jsonb,      -- generated blocks
  script_draft_text text,
  voice_id text,
  frequency_bed_id text,
  price_cents int nullable,
  created_at, updated_at, submitted_at, approved_at
)

facilitator_lgd_settings (
  moderator_id,
  flags jsonb,             -- feature toggles §3
  updated_at
)
```

---

## 9. Build sequence (recommended)

1. **Signup + profile fields** - `wantsLgdInfo` vs `hadLgdSession` ✅  
2. **Intake UI (member)** - sections A–F, save draft, submit ✅ (`/member/lgd`)  
3. **Facilitator review** - brief + script draft + approve/edit ✅ (Facilitators Console → Life Guidance Discovery)  
4. **Public LGD page + console offer** ✅ (`/life-guidance-discovery`, `/lgd`; console CTA when no prior LGD)  
5. **Facilitator feature toggles** ✅ (same console panel)  
6. **Professional voice catalog + production handoff** ✅ (catalog + production packet + Produce CGMR)  
7. **Frequency beds** ✅ (selection + choose-for-me; bed path stored on CGMR; automatic duck-mix TBD)  
8. **Member own-voice** ✅ gated + consent (recording used when assigned; clone/mix TBD)  
9. **Paid Stripe checkout** ✅ (`/api/member/lgd-checkout`, product `prod_I7hhOenF6qstnH`)  
10. **Feature flag enforcement** ✅ public / console / intake / approval gate / script draft  
11. **Produce CGMR → playlist** ✅ Admin/Facilitator: AI TTS (OpenAI) or upload/assign → personalized `CGMR` library item for member  

### Ops notes (current)
- **Admin-only preview:** `LGD_ADMIN_ONLY=true` (default) - review at `/admin/lgd`; members/facilitators/public hidden. Set `false` to open.  
- **Stripe:** product `prod_I7hhOenF6qstnH` at **$397** one-time Checkout (`/api/member/lgd-checkout`). Optional `STRIPE_LGD_PRICE_ID`.  
- **Voice production:** prefer AI/internal (`LGD_VOICE_PRODUCTION=ai_internal`); studio files (Paul Griffin) as fallback.  
- **AI generate:** set `OPENAI_API_KEY` on Vercel; optional `LGD_OPENAI_VOICE_*` overrides. Without the key, upload a finished file and **Assign to playlist**.  
- **Own voice:** `/voice-recording-agreement` + device recorder upload.  
- **Beds:** place files under `public/audio/beds/`; selection is linked on produce (full under-voice mix is a follow-up).  
- **Schedule:** produced CGMR uses category `CGMR` + member email → night special slot (else T-18).  
- **Schedule cap:** `SCHEDULE_MAX_NIGHTS = 732`.  

---

## 10. Success criteria

- Facilitator can run a live LGD with the brief open and skip re-asking basics  
- Draft script uses member phrasing in ≥70% of suggestion lines  
- Members who already had LGD are not pushed the “get LGD” CTA  
- Interest checkbox still triggers Terry/staff follow-up email  
- Facilitators can disable electronic LGD / voices / beds without code deploys  

---

## 11. Related code / docs

- Personas & ideal client: `docs/personas.md`  
- CGMR email copy: `src/lib/email-templates.ts` (`getLgdInterestEmailContent`)  
- Intake field constants: `src/lib/lgd-intake.ts`  
- Signup: `src/components/MemberOnboarding.tsx`
