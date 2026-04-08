# Design System — Pakka

## Product Context
- **What this is:** India-first group trip commitment platform. The organizer creates a Trip Brief, shares a WhatsApp link, and friends RSVP in 30 seconds without signing up.
- **Who it's for:** Young urban Indian friend groups (18–35), WhatsApp-native, mostly mobile.
- **Space/industry:** Group coordination / social trip planning. Indian market. Budget in ₹.
- **Project type:** Mobile web app + responsive dashboard.
- **Core emotional arc:** Converting "maybe" to "pakka" (definitively committed). The design should make commitment feel real, weighty, and irreversible — not like another form.

---

## Aesthetic Direction
- **Direction:** Editorial/Decisive — a well-designed invitation you want to keep, not a SaaS tool. Closer to a printed train ticket or cinema poster than a dashboard.
- **Decoration level:** Intentional — warm paper grain on the background, a stamp element on the confirmation screen. Nothing decorative in the UI itself.
- **Mood:** Warm, committed, slightly physical. The Brief card should feel like an object you hold, not a page you scroll.
- **Design rule:** Nothing blue. Every Indian travel app defaults to blue. Pakka does not.

---

## Typography

- **Display / Hero:** [Young Serif](https://fonts.google.com/specimen/Young+Serif) — transitional serif by Quentinangne. Warm optical corrections, slight handset-type quality. Genuinely underused in product work. Use for: destination names, the quorum counter hero number, the "You're Pakka" confirmation headline, dashboard trip name.
- **Body / UI:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) — geometric, clean, excellent at small data sizes. Use for: body copy, form labels, button text, nav, all UI chrome.
- **Code / Tokens:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — for share URLs, token values, internal IDs.
- **Loading:** Google Fonts. Load both via `next/font/google` for performance. `display=swap`.

### Type Scale
| Level | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Display | Young Serif | 52–64px | 400 | Dashboard hero, hero sections |
| H1 | Young Serif | 36–44px | 400 | Destination name on Brief screen |
| H2 | Young Serif | 26px | 400 | Section headings |
| Italic sub | Young Serif italic | 16–20px | 400 | Dates, secondary descriptors |
| Hero stat | Young Serif | 56–80px | 400 | Quorum counter number |
| Body | Plus Jakarta Sans | 14–15px | 400 | Body copy, descriptions |
| UI label | Plus Jakarta Sans | 12–13px | 600 | Form labels, button text |
| Small | Plus Jakarta Sans | 11–12px | 500 | Captions, meta text |
| Mono | JetBrains Mono | 11px | 400 | Share links, tokens |

---

## Color

- **Approach:** Restrained — the accent appears rarely and earns its place.

| Role | Hex | Name | Usage |
|------|-----|------|-------|
| Background | `#F5F0E8` | Warm Ivory | Page background. Slightly warmer than white — paper, not screen. |
| Surface | `#FDFAF5` | Cream | Cards, modals, form containers. Lifts off background without a visible border. |
| Primary text | `#1C1208` | Warm Ink | All primary text. Near-black with brown undertone — ink, not cold gray. |
| Mid text | `#5C4A38` | Warm Brown | Secondary text, slightly stronger than muted. |
| Muted text | `#9C8A78` | Taupe | Captions, placeholders, supporting copy. |
| Faint text | `#C4B4A4` | Pale Taupe | Timestamps, very secondary labels. |
| Accent | `#A81B0A` | Deep Crimson | Primary CTA, quorum ring fill, deadline indicators, the stamp. The color of vermillion sealing wax and sindoor — decisively committed. |
| Accent hover | `#8C1508` | Dark Crimson | Hover/active state for accent elements. |
| Accent pale | `rgba(168,27,10,0.08)` | Blush | Soft accent backgrounds (action bar, alert states). |
| Committed / In | `#2D6A4F` | Forest Green | "I'm in" state, quorum-hit state, success. |
| Green pale | `rgba(45,106,79,0.08)` | Sage | Committed background tints. |
| Maybe / Pending | `#C87D1A` | Saffron | Maybe RSVP state, deadline warning, pending. |
| Saffron pale | `rgba(200,125,26,0.08)` | Pale Gold | Maybe background tints. |
| Border light | `rgba(28,18,8,0.07)` | — | Subtle dividers, card edges. |
| Border | `rgba(28,18,8,0.12)` | — | Form inputs, stronger dividers. |

### Dark mode strategy
- Background: `#110D07` (very warm near-black)
- Surface: `#1C1510`
- Reduce accent saturation ~15% in dark mode
- Increase contrast on muted text

### CSS variables
```css
:root {
  --bg:           #F5F0E8;
  --surface:      #FDFAF5;
  --text:         #1C1208;
  --text-mid:     #5C4A38;
  --text-muted:   #9C8A78;
  --text-faint:   #C4B4A4;
  --accent:       #A81B0A;
  --accent-hover: #8C1508;
  --accent-pale:  rgba(168,27,10,0.08);
  --green:        #2D6A4F;
  --green-pale:   rgba(45,106,79,0.08);
  --gold:         #C87D1A;
  --gold-pale:    rgba(200,125,26,0.08);
  --border-light: rgba(28,18,8,0.07);
  --border:       rgba(28,18,8,0.12);
}
```

---

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable (mobile-first; touch targets, breathing room)

| Token | Value | Usage |
|-------|-------|-------|
| 2xs | 4px | Icon gaps, tight pairs |
| xs | 8px | Inline spacing |
| sm | 12px | Compact padding |
| md | 16px | Standard gap |
| lg | 24px | Card internal padding |
| xl | 32px | Section padding |
| 2xl | 48px | Large section gaps |
| 3xl | 64px | Page-level spacing |

---

## Layout

- **Approach:** Mobile-first (448px max for the Brief/confirmation screens). Dashboard is wider — grid-disciplined.
- **Brief screen:** Single column, 448px max, card-based. The Brief is one object. No sidebar, no tabs.
- **Dashboard:** Max 1100px, two-column for data (quorum + budget), single column below 700px.
- **Border radius:** Small: 6px · Medium: 10–12px · Large: 14–20px · Full: 9999px (pills only).

---

## Motion

- **Approach:** Intentional — one signature interaction.
- **Quorum ring:** Circular arc fills with slightly viscous easing (`cubic-bezier(0.2, 0.8, 0.2, 1)`, 1.2s). On quorum hit: ring stroke transitions accent → forest green (0.4s), then the "Trip confirmed!" state appears.
- **Confirmation stamp:** Pops in with slight spring overshoot (0.25s, `cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **State transitions:** 150–200ms `ease-out` for all RSVP state changes.
- **Easing:** Enter: `ease-out` · Exit: `ease-in` · Move: `ease-in-out`.
- **Duration:** Micro: 100ms · Short: 200ms · Medium: 300ms · Long: 1200ms (ring fill only).

---

## Signature UX Details

1. **"I'm Pakka" CTA copy** — the primary RSVP button says "I'm Pakka", not "Confirm RSVP" or "I'm In". The brand name becomes the verb. This is the one screen most non-registered users see.
2. **Quorum ring** — circular arc fill, not a horizontal progress bar. More analog, more satisfying. At 100%: accent → green color transition.
3. **Ticket confirmation** — the post-RSVP screen is styled as a printed ticket: crimson top half, cream details half, perforated divider, PAKKA stamp at 5° rotation. Feels physical.
4. **Organizer note** — a free-text field shown as a blockquote on the Brief screen (italic, left border). Human voice, not system copy.
5. **Paper grain** — very subtle CSS noise texture on the background (opacity ~0.025). Warm, not obvious.

---

## Interaction & Tone Layer ("Soul Layer")

The design system above defines what Pakka looks like. This section defines how it *feels*. The goal: the app should feel like sitting at a warm kitchen table planning a trip with friends. Comfortable (home) but excited (travel).

### Surface

- **Paper grain texture** on `--bg` background. CSS SVG noise at ~2.5% opacity via `body::before`. Subtle enough to be felt, not seen.
- **Soft ambient radial gradient** via `body::after`. Barely-there warmth from top center, like afternoon light through a window.

### Objects (travel artifacts on the table)

- **Postmark step numbers** (`.step-postmark`): dashed-border ring with Young Serif number. Passport stamp vibe, not filled circles.
- **Invitation-style cards** (`.card-invitation`): cream gradient background with faint warmth. Trip Brief card feels like an object you hold.
- **Dashed separators** (`.divider-dashed`): ticket tear-line language replacing solid borders where appropriate.

### Energy (group excitement)

- **Entrance animations** (`.animate-fade-in-up`): 0.5s ease-out fade + 12px rise. Stagger via inline `animation-delay` (~60ms between elements). Content arrives like laying cards on a table.
- **Button lift** (`.btn-lift`): `translateY(-1px)` + subtle shadow on hover. Eager, not static.
- **Embossed CTA** (`.btn-emboss`): inset shadow on hover for the "I'm Pakka" button. Stamping your commitment.
- **Card hover** (`.card-hover`): subtle 2px lift + shadow on dashboard stat cards.
- **RSVP option micro-interactions** (`.rsvp-option`): `scale(1.04)` on hover, `scale(0.97)` on press. Choosing feels tactile.

### Copy tone

- Warm and breezy, not corporate or confrontational.
- Landing: "Your next trip starts here. Bring everyone along this time." — inviting, not demanding.
- Steps described casually: "Two minutes and you're done", "Drop it in the WhatsApp group".
- No emojis in the design (functional labels only, no decorative emoji).

### What this layer does NOT include

- No illustrations, stock photos, heavy decoration
- No topo-line wallpaper (fights the "home" feel)
- No marketing-page gradients
- No emojis as design elements

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | Young Serif as display font | Transitional serif with handset-type warmth. Genuinely underused in product design (unlike Fraunces which is becoming AI-generated-design territory). Fits the stamp/ticket motif. |
| 2026-04-05 | Deep Crimson `#A81B0A` as accent | The color of sealing wax, vermillion, sindoor — decisively committed, not generic. Avoids the startup-orange-red that appears on Notion, Product Hunt, etc. |
| 2026-04-05 | Warm Ivory background | Every Indian tech product uses cold white or dark. #F5F0E8 is immediately different — reads as paper, not screen. |
| 2026-04-05 | Quorum ring over progress bar | Circular, analog, more physically intuitive than a horizontal fill. "Almost there" reads better as a near-complete circle. |
| 2026-04-05 | "I'm Pakka" button copy | Brand as verb. The non-registered RSVP experience is the most-seen screen in the product — make it own the brand. |
| 2026-04-05 | Ticket-style confirmation | Post-RSVP screen styled as a printed ticket with perforation, stamp, and crimson top. Makes commitment feel physical and irreversible — which is the whole product's point. |
| 2026-04-05 | Initial design system | Created via /design-consultation. Research: Doodle, Luma, Splitwise visual benchmarks. Outside voice: Claude subagent. Both converged on warm cream + red accent independently. |
| 2026-04-08 | Soul layer (interaction + tone) | Three layers added: surface (paper grain, ambient gradient), objects (postmark steps, invitation cards, dashed separators), energy (entrance animations, button lift, RSVP micro-interactions). Metaphor: "the planning table." |
