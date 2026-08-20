# Member conversion emails

Sample emails to convert leads into members. Copy is also seeded into **Admin → Marketing → Outreach email templates** (button: **Add missing starter templates**).

Placeholders: `{{firstName}}`, `{{siteUrl}}`, `{{yourName}}`. Default site: `https://reachforthestars.today`. Append `?ref=YOURCODE` on signup links when sending as an affiliate.

Gold trial: 14 days, then $19.95/month. Platinum Managed: 30-day trial with facilitator support.

Send cadence for the nurture sequence: every 1-2 days. If you know their interest from a lead card, send that **Convert interest** email instead of (or after) nurture 2/3.

Do not send all interest emails to one person. Use the **Convert menu** email when they checked many landing-page boxes. Use **Convert menu - Lead card interests** when they checked many paper-card boxes.

---

## Nurture sequence (covers every landing)

### 1. Imagine the best you

**Landing:** `/landing/best-you`

**Subject:** `{{firstName}}, imagine the best you - then train for it while you sleep`

Hello {{firstName}},

Imagine the best you. Then give that version a nightly practice.

Reach For The Stars turns the goals you care about into guided meditations that play while you fall asleep and during sleep. You pick up to ten priorities. We rotate them so your subconscious hears the right messages without another daytime chore.

See the conversion page:
{{siteUrl}}/landing/best-you

Press Start Session at bedtime. Intro relaxation music, then your first goal recording. Optional second audio about 2.5 hours later, during restorative sleep.

Gold membership includes a 14-day free trial, then $19.95 per month.

Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars

---

### 2. Your goals, nightly

**Landings:** `/health` `/wealth` `/relationship` `/memory` `/inspiration` `/spirituality` `/overcoming-addiction` `/balanced-life`

**Subject:** `{{firstName}}, which of these is calling you?`

Hello {{firstName}},

Membership is built around the goals you actually want. Open the page that matches you - or send this list to yourself and pick two or three to start.

Health - healthy longevity, energy, a body to delight in
{{siteUrl}}/health

Wealth - financial abundance
{{siteUrl}}/wealth

Relationship - a joyful new or deeper present relationship
{{siteUrl}}/relationship

Memory - the focus you want now and lifelong
{{siteUrl}}/memory

Inspiration - creativity and entrepreneurial drive on demand
{{siteUrl}}/inspiration

Spirituality - a greater inner connection
{{siteUrl}}/spirituality

Overcoming Addiction - freedom from smoking, overeating, and unwanted habits
{{siteUrl}}/overcoming-addiction

Balanced Life - highest potential physically, mentally, emotionally, spiritually, and financially
{{siteUrl}}/balanced-life

You can reorder priorities anytime. Your nightly lineup updates when you press Start Session.

Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars

---

### 3. Sleep, stress, and recovery

**Landings:** `/sleep-meditation` `/stress-relief` `/burnout-recovery` `/pain-relief` `/memory-improvement` `/blood-pressure-regulation` `/resilience-meditation` `/emotional-health` `/will-power` `/self-awareness`

**Subject:** `{{firstName}}, recovery that does not steal from your day`

Hello {{firstName}},

Hard days need recovery - not another self-care chore. These wellness pages match what people search for when they are tired, tense, or burned out.

Better sleep
{{siteUrl}}/sleep-meditation

Stress relief
{{siteUrl}}/stress-relief

Burnout recovery
{{siteUrl}}/burnout-recovery

Pain relief
{{siteUrl}}/pain-relief

Memory and focus
{{siteUrl}}/memory-improvement

Blood pressure regulation
{{siteUrl}}/blood-pressure-regulation

Physical and psychological resilience
{{siteUrl}}/resilience-meditation

Emotional health
{{siteUrl}}/emotional-health

Will power and habit change
{{siteUrl}}/will-power

Self-awareness
{{siteUrl}}/self-awareness

Choose the ones that fit. Your schedule mixes them with your goal list so support stays fresh over weeks.

Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars

---

### 4. How nights work

**Landings:** `/how-it-works` `/science` `/faqs`

**Subject:** `{{firstName}}, how a night actually works (and why it sticks)`

Hello {{firstName}},

Here is the whole method in one sitting.

How it works - press Start Session at bedtime. Intro relaxation music, then your first goal recording as you drift off. Optional second recording during sleep.
{{siteUrl}}/how-it-works

The science - regular meditation is linked with lower stress, better sleep, focus, mood, and pain coping. We put that practice in the window when you are already in bed.
{{siteUrl}}/science

FAQs - trial, membership, listening with a headset, and what happens after signup.
{{siteUrl}}/faqs

Repetition is the key. Two audios per night is the default for deeper reinforcement. Stay with it for weeks, not one inspired evening.

Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars

---

### 5. Practice, not paper

**Landings:** `/landing/contracts` `/landing/best-you`

**Subject:** `{{firstName}}, paper does not bind reality. Practice does.`

Hello {{firstName}},

If a "contract with the universe" were already working, you would feel it in your habits, sleep, and follow-through.

Manifestation agreements sound powerful. Practice is what actually moves the needle: clear goals, ordered by priority, repeated while you fall asleep.

Read the challenge:
{{siteUrl}}/landing/contracts

Then come back to the best-you page and start the 14-night test:
{{siteUrl}}/landing/best-you

Gold: 14-day free trial, then $19.95/month. Platinum Managed: 30-day trial with facilitator support if you want a guided enrollment.

Tonight is enough. Pick your goals. Press Start Session.

Start your 14-day free trial tonight:
{{siteUrl}}/signup/step-1-subscription-selection

Questions? Call (800) GOAL NOW (462-5669)

Warmly,
{{yourName}}
Reach For The Stars

---

## All-interests menu (one blast)

Use when a lead checked many goals, or you do not know which page to send.

**Template name:** Convert menu - All interests

**Subject:** `{{firstName}}, your interests, one membership, nightly practice`

(Body is in Admin templates / `src/lib/member-conversion-emails.ts`. Links every goal, wellness, how-it-works, science, FAQs, best-you, and contracts page.)

---

## Interest emails (send the matching one)

Landing-page interests (Admin templates named **Convert interest - …**):

| If they care about | Template | Landing |
| --- | --- | --- |
| Health / longevity / energy | Convert interest - Health | `/health` |
| Money / abundance / income | Convert interest - Wealth | `/wealth` |
| Love / dating / partnership | Convert interest - Relationship | `/relationship` |
| Memory / exams / focus | Convert interest - Memory | `/memory` + `/memory-improvement` |
| Creativity / business ideas | Convert interest - Inspiration | `/inspiration` |
| Inner life / spirit | Convert interest - Spirituality | `/spirituality` |
| Smoking / overeating / habits | Convert interest - Overcoming Addiction | `/overcoming-addiction` |
| Whole-life potential | Convert interest - Balanced Life | `/balanced-life` |
| Sleep | Convert interest - Sleep | `/sleep-meditation` |
| Stress / anxiety | Convert interest - Stress relief | `/stress-relief` |
| Burnout | Convert interest - Burnout recovery | `/burnout-recovery` |
| Pain / tension | Convert interest - Pain relief | `/pain-relief` |
| Blood pressure | Convert interest - Blood pressure | `/blood-pressure-regulation` |
| Bounce-back / shift work | Convert interest - Resilience | `/resilience-meditation` |
| Mood / regulation | Convert interest - Emotional health | `/emotional-health` |
| Discipline / follow-through | Convert interest - Will power | `/will-power` |
| Insight / patterns | Convert interest - Self-awareness | `/self-awareness` |

---

## Lead-card checkbox emails

Paper / digital lead cards use `EVENT_LEAD_CARD_GOALS`. Send **Convert lead card - {checkbox}** when they marked that box. If they marked many, send **Convert menu - Lead card interests** instead of blasting every interest email.

| Lead card checkbox | Template | Landing |
| --- | --- | --- |
| Anger Management | Convert lead card - Anger Management | `/emotional-health` |
| Attract Love | Convert lead card - Attract Love | `/relationship` |
| Coaching | Convert lead card - Coaching | `/inspiration` |
| Confidence | Convert lead card - Confidence | `/will-power` |
| Creativity | Convert lead card - Creativity | `/inspiration` |
| End Pain | Convert lead card - End Pain | `/pain-relief` |
| End Procrastination | Convert lead card - End Procrastination | `/will-power` |
| Energy | Convert lead card - Energy | `/health` |
| Explore Past Lives | Convert lead card - Explore Past Lives | `/spirituality` |
| Health & Rejuvenation | Convert lead card - Health & Rejuvenation | `/health` |
| Life Mission | Convert lead card - Life Mission | `/inspiration` |
| Marketing | Convert lead card - Marketing | `/wealth` |
| Memory Excellence | Convert lead card - Memory Excellence | `/memory` |
| Motivation | Convert lead card - Motivation | `/will-power` |
| Psychic Abilities | Convert lead card - Psychic Abilities | `/spirituality` |
| Quit Smoking | Convert lead card - Quit Smoking | `/overcoming-addiction` |
| Raise Income | Convert lead card - Raise Income | `/wealth` |
| Relationship Joy | Convert lead card - Relationship Joy | `/relationship` |
| Retirement $ | Convert lead card - Retirement $ | `/wealth` |
| Sales Skills | Convert lead card - Sales Skills | `/wealth` |
| Sleep Well | Convert lead card - Sleep Well | `/sleep-meditation` |
| Speaking Skills | Convert lead card - Speaking Skills | `/inspiration` |
| Spiritual Growth | Convert lead card - Spiritual Growth | `/spirituality` |
| Stop Smoking | Convert lead card - Stop Smoking | `/overcoming-addiction` |
| Stress Management | Convert lead card - Stress Management | `/stress-relief` |
| Time Management | Convert lead card - Time Management | `/will-power` |
| Travel $ | Convert lead card - Travel $ | `/wealth` |
| Vision | Convert lead card - Vision | `/inspiration` |
| Weight Control | Convert lead card - Weight Control | `/overcoming-addiction` |

---

## How to load in Admin

1. Admin → Marketing → Outreach email templates
2. Click **Add missing starter templates**
3. Open a CRM contact → Send email → pick a **Convert** template
