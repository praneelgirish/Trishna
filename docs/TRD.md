# TRD: Trishna

**Status:** Draft
**Date:** 2026-09-19
**Related:** [docs/PRD.md](PRD.md)

## Architecture Overview

A single-page static web app — no backend, no build tooling, no database. One "game shell" (a small JS state machine) drives navigation between screens: `Intro → WishInput → Hub → Trial[1..6] → Ending`. Each trial is an isolated module exposing `start()` / `end()`, called by the shell, drawing into its own `<canvas>`. All six trials are built on one shared 2D engine (pointer input, particle bursts, meter/timer UI, screen-shake) established in the already-built Greed prototype ("Modak Overflow") — this is the single biggest scope-control decision in the project: six bespoke game engines was never realistic for a solo overnight build, but six configurations of one engine is. A separate, shared Three.js scene renders the low-poly 3D Ganesha hero, reused on the Intro, Hub, and Ending screens only; trial screens stay plain 2D canvas for mobile performance. The Intro and Ending screens themselves are otherwise built in 2D/CSS (pandal, portal, parallax) rather than new 3D geometry — the only 3D touched is the existing hero model.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS, no framework | Zero build step, fastest iteration, no tooling risk under a ~24h deadline. |
| 3D | Three.js r128 (UMD build, pinned, via cdnjs) | Low-poly primitive geometry (spheres/cones) needs no modeled assets or asset pipeline. |
| Backend | None | Fully static; no server to build, deploy, or keep alive during judging. |
| Database | None | Wish text and progress live in memory / `sessionStorage` only, for one sitting. |
| Hosting | GitHub Pages (proposed — see Open Questions in PRD) | Meets the "live, functional link, accessible cross-campus" submission requirement with no server-uptime risk. |

## Key Technical Decisions

| Decision | Rationale | Status |
|---|---|---|
| No backend or build tooling | Deploys as static files; minimizes setup/risk before the deadline. | Locked |
| One shared 2D canvas engine, six configs | Consistent quality and a fraction of the code of six bespoke engines, given solo development overnight. | Locked |
| Three.js reserved for hero/hub/ending only, never gameplay screens | Keeps trial screens light and smooth on low/mid-range mobile; spends the "wow" budget where it's cheapest and most visible. | Locked |
| Free player choice of trial order from the hub | More replayable; lets each trial be built and playtested independently rather than in a forced sequence. | Locked |
| Wish text stored client-side only, never transmitted | Contest explicitly forbids personal-data collection; removes an entire privacy/compliance surface. | Locked |
| No-penalty instant retry on any trial loss | Matches the contest's "easy to start" judging criterion and keeps the game kid-friendly rather than punishing. | Locked |
| Intro/outro pandal & portal beats built in 2D/CSS, not new 3D geometry | Reuses the existing Three.js hero component instead of adding a modeling/asset task this late; the only 3D asset touched is Ganesha's hero reveal. | Locked |
| Motion feel achieved via tuned easing/momentum curves, not a physics engine | Reads as "real-world weight" (ease-out drops, swipe momentum-decay, impact overshoot) without the integration risk of a physics engine under a same-day deadline. | Locked |

## Non-Functional Requirements

- **Performance:** No dropped-frame stutter on mid-range mobile browsers; keep total asset weight minimal (no large images/audio — everything is procedural/vector). No hard numeric target set by the user; revisit if playtesting surfaces a specific device problem.
- **Security:** No accounts, no passwords, no payment data anywhere (matches contest rule C2 in the PRD directly). Wish text never leaves the browser.
- **Scalability:** Not a v1 concern — single-player, static hosting, no server load.
- **Availability:** Must stay reachable through the contest's stated "cross-campus play period" after submission — static hosting on a platform like GitHub Pages is chosen specifically to avoid this being a live operational risk.

## Phase / Build Sequencing

1. Shared engine + shell (state machine, particle/meter helpers, Three.js hero component) — largely already proven in the Modak Overflow prototype; port it into the shell rather than rewrite it.
2. **Greed** trial — already built; integrate into the shell.
3. **Anger** and **Pride** — both variants of the same "pacing/timing precision" physics, so build together.
4. **Attachment** and **Delusion** — both variants of "swipe/tap timing against a spawning field," build together.
5. **Jealousy** — the one genuinely different mechanic (a lane-runner); flagged as the highest remaining build risk, so it gets an early start rather than being left last.
6. Wish input + ending reflection logic (string interpolation over the six trial results — no NLP needed, just templated sentences keyed to which trials were hardest/easiest), plus the intro/outro cinematic (title card, pandal/portal 2D scenes, Mushika cameo, Ganesha's hero reveal and closing title-meaning blessing) — built after the trials are stable, kept deliberately lower priority than them.
7. Polish pass: screen transitions, mobile touch testing on a real device, "how to play" copy per trial, demo video recording, intro/outro skip behavior on replay.

This order front-loads the trial already de-risked by prototyping and schedules the structurally different mechanic (Jealousy) with buffer before the final polish pass, rather than leaving the least-proven piece for last.

## External Dependencies / Integrations

- Three.js r128 — `cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (pinned).
- Google Fonts — Baloo 2, Mulish.
- No analytics, no auth providers, no other third-party services.

## Risks / Technical Unknowns

- **Deadline risk** (submissions close 2026-09-20 17:00, roughly one day out from kickoff) is the dominant risk to the whole project — mitigated by the shared-engine architecture and by treating Jealousy's lane-runner as the one trial that might need a simplified fallback (a static side-by-side comparison meter instead of a full scrolling runner) if time runs out.
- **Solo development** — mitigated the same way: one engine, six configs, rather than six independent builds.
- **Touch (mobile) vs. mouse/keyboard (laptop) control parity** for drag- and swipe-based trials needs an explicit test pass on a real phone, not just an assumption that pointer events cover both — see the keyboard-fallback commitment in `docs/UI-UX.md`.
- **Hosting choice** is still open (see PRD Open Questions) — needs to be settled before the "live link" submission requirement can be satisfied.

---
*Generated 2026-09-19 from project brainstorming session (no GSD project state — this is the kickoff snapshot). Not auto-synced — re-run this skill explicitly if architecture shifts.*
