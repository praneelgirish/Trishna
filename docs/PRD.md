# PRD: Trishna

*Trishna — what you actually want.*

**Status:** Draft
**Date:** 2026-09-19

## Summary

A browser-based mini-game built for the Ganesh Chaturthi Game Design Contest. The player types a real personal wish, then plays six short arcade trials — each one a lesser-known Ganesha myth (the eight avatars of the Mudgala Purana, narrowed to six) reframed as a game mechanic that embodies the inner vice it defeats. The game closes with a personalized reflection that ties the player's own wish back to what they just played, rather than a generic "you win" screen. A short cinematic intro and outro bookend the playthrough, tying the title's meaning — *what you actually want* — directly to the player's own wish.

## Core Value

The originality is structural, not decorative: the mechanic of each trial *is* the moral of its myth (e.g. greed is a catch-game where more never satisfies; jealousy is a lane-runner where watching a rival is what slows you down), and the ending is personalized to what the player actually typed. This is deliberately unlike the popular Ganesha stories (the race with Kartikeya, the broken tusk) every other entrant is likely to reach for, and unlike a generic modak-catcher or trivia quiz reskin.

## Contest Constraints (source of truth for scope)

From the Ganesh Chaturthi Game Design Contest brief (niat-web.github.io/Ganesh-chaturthi-game-design-contest):

- Submissions close **20 September 2026, 5:00 PM** — solo entry, ~24-hour build window.
- Must be a genuine playable browser game (mobile + laptop), not a utility/dashboard.
- Must connect meaningfully to Vinayaka Chaturthi; Ganesha must always be shown with care — never hurt, attacked, or mocked.
- Must have: clear win/loss/result, proper ending state, restart capability, no major bugs, no offensive content, no personal-data collection.
- Submission package needs: live link, source repo, "how to play" guide, 1–3 min demo video, team info, tools used.
- Judged on: fun/replay value, creativity/originality, completeness, UI/control clarity, technical execution, and the team's ability to explain their own code.

## Requirements

### v1 (this release)

#### Narrative / Personalization
- **N1**: Player types a free-text wish at the start of a playthrough; the game holds it in memory for the session.
- **N2**: Ganesha's intro dialogue frames the six trials as inner obstacles, not external enemies.
- **N3**: Ending screen reflects the player's own wish text and their in-game performance (not a static script).
- **N4**: The playthrough opens with a short cinematic intro — a title card; a devotee praying at a dusk pandal; Ganesha's hero reveal (reusing the 3D Ganesha model already planned for the Hub/Ending) with a small, deliberately easy-to-miss cameo of Mushika (Ganesha's own mouse vahana) crossing the scene; a spoken line from Ganesha (browser-native `SpeechSynthesis`, no external TTS API — free, instant, no signup risk before the deadline) framing the six trials as inner obstacles, with the player's own wish deliberately left unnamed/universal; a portal/dimension-shift transition with quick flash-cuts of the six trial scenes — which leads directly into the Wish Input screen. Recommended to be skippable / tap-to-continue on replay so it never costs replay value.
- **N5**: The ending cinematic mirrors the intro and **branches on overall pass/fail** across the six trials: a pull-back through the portal, the devotee returning to the pandal, and Ganesha's closing blessing (also `SpeechSynthesis`) in one of two tones — affirming on an overall pass, encouraging ("not yet") on an overall fail — plus a matching small beat from the Mushika cameo. Either branch references the player's wish and their hardest/easiest trial (per N3) and folds in the title's meaning ("Trishna — what you actually wanted...") inside that same personalized line, followed by a closing title card with a festival greeting. Per-trial score is shown as a data overlay in both branches. Optional: the ending's diya/modak visual may carry a faint tint from whichever trial the player found hardest, using data N3 already tracks.
- **N6**: Each of the six hub→trial transitions plays a short themed visual wipe plus one brief `SpeechSynthesis` line from Ganesha commenting on the trial just finished (six short scripted lines total) — reinforces progression instead of a flat cut back to the hub.

#### Hub
- **H1**: A hub screen shows a 3D Ganesha centerpiece and six trial "stations," each showing locked/beaten state.
- **H1a**: Each station shows a free AI-generated icon image matched to its vice (not a plain emoji/shape), and its label is the trial's Sanskrit demon name (e.g. "Lobhasura"). The English vice name (e.g. "Greed") is used only once a trial is opened, not on the hub.
- **H2**: Player may play the six trials in any order.
- **H3**: A beaten trial can be replayed at will.
- **H4**: Once all six trials are beaten, a path unlocks back to Ganesha for the ending.

#### Trials (six, one per vice)
- **T1 — Greed** (Lobhasura): catch-and-restrain modak-catching game. *(prototyped and approved)*
- **T2 — Anger** (Krodhasura): input-pacing game — rushed/mashed input worsens the state, paced input calms it.
- **T3 — Pride** (Abhimanasura): aim-and-release timing game — deflate an inflating ego-demon smoothly.
- **T4 — Attachment** (Mamasura): a burning-room keepsake game — pick items to carry out before the collapse. The 7 default keepsakes (photo, book, toy, letter, trophy, blanket, music box) render as free AI-generated illustrated icons rather than flat vector shapes; any personal item the player types that keyword-matches one of those 7 also gets the real icon, other matched keywords fall back to the existing procedural vector icon.
- **T5 — Delusion** (Mohasura): spot-the-real game — tap the one true lamp among escalating decoys.
- **T6 — Jealousy** (Matsaryasura): endless-lane game — a taunting rival; looking at their lane costs the player speed.
- **T7**: Every trial has a clear score/result, a win and a lose state, and instant no-penalty retry.

#### Audio
- **A1**: Each of the six trials has its own royalty-free background music loop matched to its mood, plus a shared set of SFX stingers (hit/miss/win/lose), sourced from a free royalty-free catalog — not AI-generated, to avoid generation time/cost against the deadline.
- **A2**: A Settings screen/panel exposes: music volume, SFX volume, voiceover volume, a captions toggle (for the `SpeechSynthesis` lines in N4/N5/N6), and a visual-quality toggle (particle density low/high, for weaker devices).

#### Compliance / Submission
- **C1**: Ganesha is never shown harmed, attacked, or mocked in any trial, win, or lose state.
- **C2**: No accounts, passwords, or payment data collected anywhere.
- **C3**: Works on mobile and laptop browsers without campus-specific access restrictions.
- **C4**: Includes an in-game or accompanying "how to play" explanation per trial.

### v2 (deferred)

- The remaining two Mudgala Purana vices (Lust, and either a second Delusion-adjacent or Ego-adjacent demon) as bonus trials.
- Pre-rendered AI video cinematics (Veo/Runway/Luma-style) — real-time 3D (Three.js) is the v1 approach; revisit only if a paid video-gen API is set up with time to spare.
- Cross-device save/resume of a wish across sessions.

### Out of Scope

| Excluded | Why |
|---|---|
| Accounts, login, leaderboard backend | Contest forbids personal-data collection; not needed for a single-sitting playthrough; no time budget for a server. |
| Multiplayer / real-time comparison | Out of scope for a ~24h solo build. |
| Native mobile app packaging | Contest requires a browser game. |
| Full 8-avatar vice set | 6 chosen for buildability; see v2. |
| Paid/licensed third-party art or audio assets | Trial/hub art is either procedural (Canvas/Three.js) or free AI-generated raster icons (see H1a, T4 note) — never a paid/licensed stock asset, to avoid licensing risk. |

## User Flows

1. **First playthrough**: Watch the cinematic intro (title card → pandal prayer → Ganesha's reveal with Mushika cameo → spoken framing line → portal with flash-cuts of the six trials; skippable on replay) → type wish → arrive at hub map.
2. **Play a trial**: Pick a station from the hub → read a one-line "how this works" → play → win or lose → short narrative beat tying the vice to the player's wish → themed transition with a short Ganesha line → return to hub with station lit (or not, if lost — see retry).
3. **Retry**: Lose a trial → instant retry, no penalty, no separate screen.
4. **Completion**: All six stations lit → path to Ganesha opens → personalized ending referencing the player's wish and which trial they found hardest/easiest, branching in tone on overall pass/fail, with Ganesha's blessing also revealing the title's meaning → cinematic outro mirrors the intro (portal pull-back, devotee returns to the pandal, closing title card) → option to replay any trial or adjust audio/quality in Settings.

## Success Criteria

- All six trials are playable start-to-finish on both a phone browser and a laptop browser, with no major bugs.
- Every trial has a working win state, lose state, score, and restart.
- The wish-input → ending personalization loop works end-to-end (typed text is legible in the final reflection).
- Ganesha is never depicted harmed/attacked/mocked in any state, including losses.
- The build is demo-able in a 1–3 minute video and playable via a single live link with no login barrier, meeting the submission package requirements above.

## Open Questions

- Hosting target for the live submission link (GitHub Pages assumed in the TRD — needs explicit confirmation/repo setup).
- Final per-trial difficulty tuning (timer lengths, decoy counts, etc.) — deferred to playtesting once each trial is functional.
- Exact royalty-free tracks/SFX per trial (A1) — to be sourced during implementation, not pre-decided here.

---
*Generated 2026-09-19 from project brainstorming session (no GSD project state — this is the kickoff snapshot). Not auto-synced — re-run this skill explicitly if scope shifts.*
