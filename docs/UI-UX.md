# UI/UX Design: Trishna

**Status:** Draft
**Date:** 2026-09-19
**Related:** [docs/PRD.md](PRD.md)

## Direction

Target platform: browser game, mobile + laptop (per contest requirement). Look-and-feel: festive and kinetic — a dusk-lit pandal scene, a glowing low-poly 3D Ganesha centerpiece, and juicy 2D arcade gameplay per trial, with a rangoli/kolam dot-and-loop motif reused as decorative ground/path texture to tie scenes together. This direction was arrived at after an explicit correction: an earlier ambient/generative-art direction read as passive and "ritualistic" rather than playable, so the standing rule for this project is that visual richness must sit on top of a real, obviously-a-game interaction loop — never substitute for one. See `docs/PRD.md` Core Value.

## Design System

| Property | Value |
|---|---|
| Component library | None — hand-built HTML/CSS + Canvas 2D + Three.js primitives. |
| Icon library | None — hub station icons and the Attachment trial's default keepsakes use free AI-generated illustrated PNGs (`assets/icons/`); everything else (props, rarer keyword-matched keepsakes) is drawn procedurally as simple canvas shapes, not an icon font. |
| Font | Baloo 2 (display/headings), Mulish (body/UI) — both via Google Fonts. |

## Typography

| Role | Size | Weight |
|---|---|---|
| Body / captions | 13–16px, Mulish | 400 / 600 |
| Heading / HUD labels | 14–16px, Baloo 2 | 700 |
| Display / screen titles | clamp(22px, 5vw, 32px), Baloo 2 | 800 |

## Color

| Role | Value | Usage |
|---|---|---|
| Dominant (60%) | Dusk gradient, `#ff9d5c → #ff6f61 → #7b2f6b` | Screen backgrounds |
| Secondary (30%) | Deep aubergine `#3a1740` (panel), `#5a2a63` (line) | HUD panels, cards, overlays |
| Accent (10%) | Gold `#ffcf4d` | Primary CTA, score/HUD highlights, hub path |

Each trial additionally carries **one vice-specific hue**, used only within that trial's own screen (never competing with the shared gold accent elsewhere): Greed `#e0b13c`, Anger `#e2542a`, Pride `#a06be0`, Attachment `#3fb6a8`, Delusion `#9a7bc4`, Jealousy `#4fbf78`.

## Spacing

Standard 4px-multiple scale. Minimum 16px side gutter on all UI chrome. HUD elements padded 8–10px, matching the built Greed prototype.

## Key Screens / Flows

- **Intro Cinematic** *(secondary priority — polish pass only, after the six trials and personalization loop are stable)* — title card; a devotee praying at a dusk pandal, built in 2D/CSS parallax; Ganesha's hero reveal (reusing the same 3D model as the Hub) with a small, deliberately unannounced cameo of Mushika (Ganesha's mouse vahana) crossing the scene, easy to miss on a first watch; a spoken framing line from Ganesha via browser-native `SpeechSynthesis` (with a captions fallback, see Settings below); a portal/dimension-shift transition with quick flash-cuts previewing the six trial scenes; hands off directly into Wish Input. Skippable / tap-to-continue on replay so it never costs replay value.
- **Wish Input** — single text field + one CTA ("Begin"); communicates that the game is about to hold onto something personal, not just start a level.
- **Hub Map** — 3D Ganesha centerpiece, six trial stations on a rangoli-patterned path, each showing locked/beaten state; communicates free choice and visible progress.
- **Trial screens (×6)** — HUD (score, timer, meter) + start overlay (one-line "how this works") + end overlay (win/lose, narrative-framed, retry CTA); communicates instant, low-friction replay. Exiting back to the hub plays a themed transition wipe (per-trial accent hue) plus one short spoken Ganesha line commenting on the trial just finished.
- **Ending Reflection** — personalized text referencing the player's own wish and performance, plus a replay-any-trial option; communicates that the playthrough meant something specific to *this* player, not a generic completion screen. *(Secondary-priority additions, once the core loop is stable:)* Ganesha's closing blessing (spoken, branching in tone on overall pass vs. fail) also folds in the title's meaning ("Trishna — what you actually wanted...") naturally inside the same personalized line, not as a separate dictionary-style beat; a matching small Mushika-cameo beat closes out each branch; optionally, the diya/modak visual carries a faint tint from whichever trial the player found hardest. Per-trial scores are shown as a data overlay. A cinematic outro (portal pull-back, devotee returns to the pandal, closing title card with a festival greeting) mirrors the Intro Cinematic.
- **Settings** — a lightweight panel (accessible from Hub and Ending) with four controls: music volume, SFX volume, voiceover volume, captions on/off (for the `SpeechSynthesis` lines above), and a visual-quality toggle (low/high particle density) for weaker devices.

These map directly to the four flows in `docs/PRD.md`'s User Flows section, with the Intro/Ending cinematic beats layered on as secondary-priority enhancements to Flows 1 and 4.

## Copy Contract

| Element | Copy |
|---|---|
| Primary CTA | "Start the trial" / "Begin" |
| Empty state (wish field left blank) | "Ganesha's listening — tell him what you're here for." |
| Loss state | Always framed narratively, never as a technical error — e.g. "The bowl overflowed — it stopped being an offering and became excess." (established pattern from the Greed trial; every other trial's loss copy should follow the same in-world framing, not a generic "Game Over.") |
| Retry CTA | "Try again" |
| Ending blessing (illustrative example, secondary-priority beat) | "...Trishna, they call this — what you actually wanted, not what you asked for. You found that out the hard way in [hardest trial]. Go on, carry it back with you." (Title's meaning folded naturally into the personalized line, never stated as a dictionary definition.) |

## Accessibility Baseline

Reference `web-rules`'s accessibility checklist and the `a11y-architect` agent for the full WCAG 2.2 baseline — not restated here. Project-specific commitments beyond that baseline:

- Every trial is distinguished by shape, icon, and motion, not color alone (colorblind-safe by construction, since six trial identities already need to read distinctly at a glance).
- Every meter/win/lose state carries a text caption alongside its color, never color-only signaling.
- Every drag/swipe-based trial control gets a keyboard fallback (arrow keys / spacebar) in addition to touch and mouse — needed because the contest requires laptop compatibility, and not every laptop tester will have a touchscreen or a comfortable trackpad.
- `prefers-reduced-motion` is respected by damping particle bursts and screen-shake intensity, not removing feedback entirely.

---
*Generated 2026-09-19 from project brainstorming session (no GSD project state — this is the kickoff snapshot). Not auto-synced — re-run this skill explicitly if design direction shifts.*
