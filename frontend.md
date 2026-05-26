# SEMANTIC HLS — FRONTEND DESIGN PROMPT
### Terminal-Native Streaming Interface
> Full design system specification. Aesthetic DNA. Component grammar. Interaction philosophy.

---

## DESIGN IDENTITY

**Codename:** `SIGNAL`
**Aesthetic direction:** `Terminal Brutalism × Semantic Intelligence`
**One-line thesis:** *What if a video player was built by the engineers who wrote the infrastructure — not the designers who sell it.*

This is not a streaming app that looks dark.
This is an intelligence terminal that happens to play video.

Every pixel should communicate: *this system understands what you are watching.*

---

## AESTHETIC DNA (Extracted from Reference UI)

### What the reference UI does right — and must be amplified:

| Element | Reference Pattern | Semantic HLS Amplification |
|---------|------------------|---------------------------|
| Background | Pure `#000000` — absolute black | Same. No gradients. No texture. The video itself IS the only color in the room. |
| Headings | `// SECTION TITLE` comment-style in monospace | Extended: `// SEMANTIC LAYER ACTIVE` — headings read like system logs |
| Labels | `[01]` `[02]` bracketed numeric indexes | Used for everything: chunks, chapters, search results, timeline markers |
| Borders | 1px dashed `rgba(255,255,255,0.12)` | Chapter zones on timeline use dashed borders. Semantic regions use dotted. |
| Accent colors | Cyan `#00E5FF` for data, Orange `#FF8C00` for execution | Extended: Cyan = semantic signal. Orange = high-density moment. White = UI chrome. |
| Typography | `JetBrains Mono` / monospace exclusively | Primary: `JetBrains Mono`. Display: `IBM Plex Mono`. Body prose: `DM Mono`. |
| Interaction feedback | Minimal — state changes via text, not animation | Semantic HLS adds one exception: SIS score bars animate like signal meters |
| Status indicators | `● ACTIVE` green dot, `● COMING SOON` orange dot | Extended: `● INDEXING` `● READY` `● STREAMING` `● SEARCHING` |
| Spacing | Generous dead space. Information density is low and deliberate | Preserved. No information anxiety. Breathe. |
| Layout | Left sidebar nav (icon-only) + full content area | Same structure. No top nav. The left rail is the entire chrome. |

---

## COLOR SYSTEM

```css
:root {
  /* Backgrounds */
  --bg-void:        #000000;    /* absolute base — terminal black */
  --bg-surface:     #0A0A0A;    /* card / panel surface */
  --bg-elevated:    #111111;    /* hover state / active panel */
  --bg-inset:       #0D0D0D;    /* code blocks, command wells */

  /* Borders */
  --border-ghost:   rgba(255, 255, 255, 0.06);   /* invisible structural dividers */
  --border-dim:     rgba(255, 255, 255, 0.12);   /* dashed section borders */
  --border-visible: rgba(255, 255, 255, 0.22);   /* active / focused borders */
  --border-accent:  rgba(0, 229, 255, 0.35);     /* semantic-active borders */

  /* Text */
  --text-primary:   #FFFFFF;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-muted:     rgba(255, 255, 255, 0.25);
  --text-ghost:     rgba(255, 255, 255, 0.10);

  /* Semantic Signals (accent palette) */
  --signal-cyan:    #00E5FF;    /* semantic search / AI layer active */
  --signal-orange:  #FF8C00;    /* high SIS moment / highlight / hot zone */
  --signal-green:   #00FF88;    /* system ready / indexed / success */
  --signal-red:     #FF3B3B;    /* error / stall / buffer fail */
  --signal-white:   #FFFFFF;    /* UI chrome / primary actions */

  /* SIS Score gradient (Low → High density) */
  --sis-0:   rgba(255, 255, 255, 0.08);   /* very low density */
  --sis-25:  rgba(0, 229, 255, 0.20);
  --sis-50:  rgba(0, 229, 255, 0.45);
  --sis-75:  rgba(255, 140, 0, 0.55);
  --sis-100: rgba(255, 140, 0, 0.90);     /* maximum density — glows */
}
```

---

## TYPOGRAPHY SYSTEM

```css
/* Display — section headers, player titles */
--font-display: 'IBM Plex Mono', monospace;

/* Primary — all UI text, labels, data */
--font-mono: 'JetBrains Mono', monospace;

/* Prose — transcript text, summaries, AI-generated content */
--font-prose: 'DM Mono', monospace;

/* Scale */
--text-xs:   10px;   /* [01] labels, timestamps, metadata */
--text-sm:   12px;   /* secondary labels, status text */
--text-base: 14px;   /* primary UI text */
--text-md:   16px;   /* search bar, chapter titles */
--text-lg:   20px;   /* section headings (with // prefix) */
--text-xl:   28px;   /* media title */
--text-2xl:  42px;   /* large stat numbers (5.7M tokens style) */
```

**Typography rules:**
- ALL CAPS for section headers, labels, column names, system states
- Sentence case for AI-generated content (summaries, chapter titles, clarifications)
- No bold weights — use letter-spacing and color contrast for hierarchy instead
- Numbers are sacred: timestamps, scores, token counts always rendered in `--font-mono` at full opacity

---

## LAYOUT ARCHITECTURE

### Grid
```
[Left Rail: 64px fixed] | [Main Content: fluid]
```

Left rail contains only icon-navigation (same as reference). No labels visible until hover.

### Main Content Regions

```
┌─────────────────────────────────────────────────────────────┐
│  [HEADER BAR: 48px]  media title + system status           │
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│   VIDEO PLAYER         │   RIGHT PANEL                      │
│   (16:9 aspect ratio)  │   (384px fixed width)              │
│                        │   — tabs: TRANSCRIPT / SEARCH      │
│                        │           CHAPTERS / HIGHLIGHTS    │
│                        │                                    │
├────────────────────────┴────────────────────────────────────┤
│  [SEMANTIC TIMELINE: 80px]                                  │
│  full-width with SIS heatmap + chapter markers              │
├─────────────────────────────────────────────────────────────┤
│  [PLAYBACK CONTROLS: 56px]                                  │
│  minimal, monospace, terminal-style                         │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPONENT SPECIFICATIONS

---

### 01 — SEMANTIC TIMELINE

The most important UI innovation in the entire system.

**Replaces:** Standard video.js scrubber bar

**What it shows:**
- Full media duration on X axis
- SIS (Semantic Importance Score) on Y axis as a heatmap bar
- Chapter boundaries as vertical dashed lines with `[01]` `[02]` labels
- Highlight windows as orange glowing zones
- Current playback head as white vertical line
- Buffered regions as dim-filled areas

**Visual spec:**
```
┌──────────────────────────────────────────────────────────────┐
│ [01] INTRO    [02] CORE CONCEPT    [03] DERIVATION   [04]... │
│ ░░░░░░▓▓▓▓░░░░░░▓▓▓▓▓▓▓▓▓▓░░░▒▒▒▒▒▒▒▒▒▒░░░░░░▓▓▓░░░░░░░░░░  │
│         ▲                   ●                                │
│       hover               playhead                          │
└──────────────────────────────────────────────────────────────┘
```

- `░` = SIS < 0.25 (dim white)
- `▓` = SIS 0.25–0.75 (cyan)
- `▒` = SIS > 0.75 (orange, glows with `box-shadow: 0 0 8px var(--signal-orange)`)
- Hover anywhere: shows `// [chapter name] — [contextual summary]` tooltip above the bar
- Chapter labels render in `--text-xs` ALL CAPS with `[N]` prefix

**Micro-interaction:**
- On hover: timeline height expands from 6px → 18px with 120ms ease
- SIS bars animate upward like an audio visualizer on first load (staggered 20ms delay per segment)
- Playhead is a 1px white line with a 4px × 4px diamond handle at the top

---

### 02 — VIDEO PLAYER

**Controls (custom, below the video):**
```
◀◀  ▶  ▶▶   [00:42:17 / 01:23:55]   ⊡ DENSITY MODE   ↩ CONCEPT JUMP   ⧉ FULLSCREEN
```

- Play/pause: Unicode characters only — `▶` `‖` — no icon libraries
- Time display: `HH:MM:SS / HH:MM:SS` in monospace, dim `/` separator
- **DENSITY MODE button:** when active, badge shows `● ON` in orange — filters to high-SIS segments only
- **CONCEPT JUMP:** `◀ PREV CHAPTER` and `NEXT CHAPTER ▶` — jumps between AI chapters, not fixed 10s
- All controls render in `--text-xs` ALL CAPS with `--text-secondary` color; active state = `--text-primary`

**Video viewport:**
- Pure black letterboxing — no gradients, no vignettes, no chrome around video
- On initial load: `// SIGNAL INDEXING...` renders over the video area in monospace until ready
- Playing state shows `● LIVE` or `● 4× REALTIME` indicator in top-left of video in `--text-xs`

---

### 03 — SEMANTIC SEARCH BAR

The emotional center of the product. Must feel like issuing a command to an intelligence system.

**Design:**
```
┌─────────────────────────────────────────────────────┐
│  $  search media for concept or moment...           │
└─────────────────────────────────────────────────────┘
```

- Prefixed with `$` (terminal prompt character) in `--signal-cyan`
- Border: 1px solid `--border-dim` by default → `--border-accent` on focus
- No rounded corners. `border-radius: 0`
- Background: `--bg-inset`
- Placeholder text: `--text-muted`
- On keypress: a cursor blink animation appears after the typed text (CSS `_` blink)
- On search: button text changes to `// QUERYING...` with a scanning animation

**Search Results:**
```
// RESULTS  [3 found · 87ms]

[01]  ████████████  0.91   ATTENTION MECHANISM EXPLAINED           ↗ 00:30:42
      "...the attention head computes a weighted sum..."

[02]  ██████░░░░░░  0.74   SELF-ATTENTION VS CROSS-ATTENTION       ↗ 00:47:18
      "...in the encoder, every token attends to every other..."

[03]  █████░░░░░░░  0.63   MULTI-HEAD ATTENTION ARCHITECTURE       ↗ 01:02:55
      "...we split the embedding dimension across 8 heads..."
```

- Score displayed as ASCII block bar (`█` filled, `░` empty, 12 chars total)
- Score number in `--signal-cyan`
- Chapter/concept name in ALL CAPS white
- Timestamp right-aligned with `↗` arrow as the seek trigger
- Snippet in `--text-secondary` italic
- Hover on result: border left becomes `2px solid var(--signal-cyan)`, background lifts to `--bg-elevated`
- Click timestamp → player seeks → result card pulses cyan once

---

### 04 — TRANSCRIPT PANEL

**Design philosophy:** Not a subtitles dump. A semantic document with live state.

```
// TRANSCRIPT  [EN]  [187 CHUNKS]

  ━━━━━━━━━━ [02] ATTENTION MECHANISM ━━━━━━━━━━

  00:30:42  The key insight behind attention is that not all
            words in a sequence are equally relevant to the
            current prediction task...

  ● 00:31:15  [ACTIVE — PLAYING]
            ...we compute three vectors from each token:
            a query, a key, and a value.

  00:31:58  The attention score between two tokens is computed
            as the dot product of their query and key vectors...

  ━━━━━━━━━━ [03] DERIVATION ━━━━━━━━━━
```

- Active chunk has `● [ACTIVE — PLAYING]` label in `--signal-green`, left border `2px solid --signal-green`
- Chapter dividers: full-width `━━━` with `[N] CHAPTER NAME` centered
- Timestamps in `--text-muted`, clickable → seek
- Chapter dividers are sticky while scrolling within that chapter
- Auto-scrolls to keep active chunk in viewport center
- Monospace throughout, `--text-sm` for timestamps, `--text-base` for content

---

### 05 — CHAPTERS PANEL

```
// AI CHAPTERS  [8 DETECTED · AUTO-GENERATED]

[01]  00:00:00 → 00:08:07   INTRODUCTION & MOTIVATION
      Context on why attention replaced recurrence in sequence models.

[02]  00:08:07 → 00:18:44   THE ENCODER-DECODER PROBLEM
      ...

[03]  00:18:44 → 00:30:42   ● SELF-ATTENTION MECHANISM          ← current
      ...

[04]  00:30:42 → 00:47:18   MULTI-HEAD ATTENTION
      ...
```

- Current chapter has `●` in `--signal-green` and chapter row background lifts to `--bg-elevated`
- Duration shown as `START → END` (not just start)
- 1–2 sentence AI summary in `--text-secondary`
- Clicking any chapter → seeks to chapter start + highlights chapter in timeline

---

### 06 — HIGHLIGHTS PANEL

```
// HIGHLIGHTS  [10 TOP MOMENTS · SIS SCORED]

[01]  ████████████  0.94   ↗ 00:47:18   THE DERIVATION             ● HIGH DENSITY
[02]  ██████████░░  0.88   ↗ 00:30:42   ATTENTION EQUATION          ● HIGH DENSITY
[03]  █████████░░░  0.81   ↗ 01:02:55   ARCHITECTURE DIAGRAM        ○ MED DENSITY
...
```

- Same card pattern as search results
- SIS score bar + score number + timestamp + label + density tag
- `● HIGH DENSITY` in orange. `○ MED DENSITY` in dim white.
- **Play Highlight Reel** button at top: `▶ PLAY HIGHLIGHT REEL  [~18min → ~8min]` — triggers density mode auto-play through top highlights sequentially

---

### 07 — SMART REWIND PANEL

Only appears when triggered. Slides in from right as an overlay over the right panel.

```
┌─────────────────────────────────────────────────────┐
│  // REWIND DETECTED [2×]                            │
│                                                     │
│  System has noticed you rewound this segment        │
│  twice. Here's what this section covers:            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  This passage explains how dot-product attention    │
│  scores are scaled by √d_k to prevent vanishing     │
│  gradients in high-dimensional spaces.              │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  [  REPLAY SEGMENT  ]   [  SHOW RELATED  ]         │
└─────────────────────────────────────────────────────┘
```

- Appears with 200ms slide-in from right
- Monospace throughout
- Dismiss with `ESC` or clicking outside
- Two CTA buttons: plain bordered rectangles, no fill, 1px border

---

### 08 — STATUS BAR (Header)

```
// SEMANTIC HLS      lecture_attention_transformers.mp4      ● INDEXED [187 chunks · 8 chapters]      01:23:55 total
```

- Single line, full width, 48px height
- Left: `// SEMANTIC HLS` in `--signal-cyan` (system name as prompt)
- Center: filename in `--text-secondary`
- Right: status indicator with chunk/chapter count + total duration
- `● INDEXED` green when ready, `● INDEXING [47%]` amber during processing, `● SEARCHING` cyan during query

---

## MOTION & INTERACTION PRINCIPLES

### Rules:
1. **No decorative animation.** Motion is only used to communicate system state change.
2. **Exception: SIS signal bars** — these animate on first render like a spectrum analyzer to show the system "reading" the media
3. **Search response** gets a subtle scanning line sweep on the results area before results populate (100ms)
4. **Timeline hover expansion** — the one UX delight moment. Must feel like the system waking up.
5. **All transitions:** `120ms ease` maximum. Nothing lingers. Terminal systems are fast.
6. **Playhead** moves in real-time with `requestAnimationFrame` (no CSS transitions — it tracks actual time)

### Cursor:
- Default: system cursor
- Over timeline: `cursor: col-resize` (horizontal drag signal)
- Over clickable timestamps: `cursor: crosshair`
- During search processing: `cursor: wait` (not a spinner — monospace `//` pulse in corner)

---

## PAGE / SCREEN BREAKDOWN

### Screen 01: UPLOAD / INGEST
```
// SEMANTIC HLS
// INGEST MEDIA

[  DRAG FILE HERE OR PASTE URL  ]

$ npx semantic-hls ingest <file-or-url>

── OR ──

[  browse local files  ]
```
Mirrors the reference UI's `npx taste push` command block pattern exactly.

---

### Screen 02: PROCESSING
```
// SEMANTIC HLS
// PIPELINE ACTIVE

lecture_attention.mp4  [1.2GB]

  [01] VALIDATING MEDIA        ✓ COMPLETE
  [02] TRANSCRIBING            ● IN PROGRESS  [38%  ████████░░░░░░░░░░░░]
  [03] SEMANTIC CHUNKING       ○ PENDING
  [04] GENERATING EMBEDDINGS   ○ PENDING
  [05] INDEXING VECTOR STORE   ○ PENDING
  [06] BUILDING CHAPTERS       ○ PENDING

// ETA: ~2min 40sec
```
Each stage appears with the reference UI's numbered label pattern.

---

### Screen 03: PLAYER (Primary)
Full layout as specified in the architecture section above.

---

### Screen 04: SEARCH FOCUS MODE
When search bar is focused, the right panel transitions fully to search mode:
```
// SEARCH MODE ACTIVE

$  |cursor

// RECENT
  - "transformer architecture"          ↗ 00:30:42
  - "gradient descent intuition"        ↗ 00:18:44

// SEMANTIC INDEX READY  [187 chunks searchable]
```

---

## ANTI-PATTERNS (DO NOT BUILD)

| ❌ Don't | ✓ Do instead |
|----------|-------------|
| Rounded video player corners | Sharp. 0 radius. Always. |
| Gradient overlays on video | Pure black letterbox only |
| Glowing gradient backgrounds | Glow ONLY on high-SIS zones in the timeline |
| Spinner loading indicators | ASCII progress `████░░░░` with `[N%]` |
| Color-coded everything | Only 3 colors carry semantic meaning: cyan (AI), orange (density), green (ready) |
| Hover tooltips with shadows | Flat. 1px bordered. No shadows anywhere. |
| Rounded pill buttons | Zero radius buttons. 1px border. No fill unless primary action. |
| Inter / Roboto / System fonts | JetBrains Mono. Always. Non-negotiable. |
| Hamburger menu / responsive collapse | This is a desktop-first tool. Own the viewport. |
| Progress bar with smooth animation | Progress ticks in real increments. Terminals don't lie about progress. |

---

## WHAT MAKES THIS UNFORGETTABLE

The single thing a user will remember: **the timeline.**

No streaming interface has ever shown you the *shape of information* inside the media before you watch it. The SIS heatmap — cyan valleys and orange peaks — makes the invisible visible. A user who lands on this interface for the first time will pause on the timeline and think:

*"I can see what matters before I play it."*

That is the product. Everything else is infrastructure to support that moment.

---

## IMPLEMENTATION STACK

```
Framework:       React 18 + TypeScript
Styling:         CSS Modules + CSS custom properties (no Tailwind — too generic)
Fonts:           JetBrains Mono (Google Fonts), IBM Plex Mono
Player:          Video.js with full custom skin
Timeline:        Custom Canvas element (requestAnimationFrame)
SIS bars:        SVG with CSS animation on mount
State:           Zustand (minimal, flat store)
Icons:           None. Unicode characters only.
Animations:      CSS transitions only (no Framer Motion — too soft)
```

---

*SEMANTIC HLS · SIGNAL Interface · Design Prompt v1.0*
*Terminal Brutalism × Semantic Intelligence*
*Build it like the engineers who understand what's inside the video.*