# Trishna — what you actually want

> *A Ganesh Chaturthi mini-game: six trials against the inner vices, and a wish that comes back to you at the end.*

**Submission for the Ganesh Chaturthi Game Design Contest 2026**

---

## How to Launch and Play

You do **not** need to install anything or run a build command.

1. On this GitHub page, select **Code** → **Download ZIP**.
2. Extract the downloaded ZIP file to any folder on your computer.
3. Open that folder and double-click `index.html`. It will open in your default web browser.
4. If asked, allow the browser to play sound. Headphones are recommended for the full experience.
5. Enter a wish, then follow the on-screen instructions to complete all six trials.

Chrome, Edge, Firefox, and Safari are supported. For the smoothest experience, use the latest version of one of those browsers on a desktop or laptop. The game also supports touch input on mobile devices.

### Optional: run it from a local web server

Opening `index.html` directly is enough. If you already have Python installed, you can instead open a terminal in the project folder, run `python -m http.server 8080`, and visit `http://localhost:8080` in your browser.

### Controls while playing

- **Touch / mouse:** tap buttons and drag objects when a trial asks you to.
- **Keyboard:** use arrow keys to move or select, and **Space** or **Enter** to confirm.
- Each trial explains its specific goal before it begins. The gear icon lets you adjust music, sound effects, voiceover, captions, and visual quality.

> **Note:** `js/config.js` is gitignored (it holds a local-only key). The game works fully without it.

---

## What Is Trishna?

You type a real wish at the start. Then you face six short arcade trials — each one a demon from the Mudgala Purana, reframed as a mechanic that *embodies* the inner vice it defeats. When you finish, Ganesha reflects your wish back at you alongside what you just played.

---

## The Six Trials

| # | Vice | Demon | How to Play |
|---|------|-------|-------------|
| 1 | **Greed** | Lobhasura | Drag the bowl to catch modaks — but the win is a *sweet spot*, not a maximum. Once you've caught enough, tap "offer it now" to stop cleanly. Ignore it and it only gets faster. |
| 2 | **Anger** | Krodhasura | An argument plays out line by line. Tap the red zone to snap back (feeds the fire), or hold the green zone to bite your tongue (cools things down). |
| 3 | **Pride** | Abhimanasura | Use arrow keys or drag to keep a figure balanced on a pedestal. It has real momentum — over-correcting is as bad as ignoring a gust. |
| 4 | **Attachment** | Mamasura | Your house is burning. Pick up to 3 keepsakes, then tap EXIT. Waiting too long is what loses — the fire doesn't wait. Name your own keepsakes before starting. |
| 5 | **Delusion** | Mohasura | One lamp burns calm and steady — the rest flicker and dazzle. Tap the true one before time runs out. From round 3 a decoy may briefly mimic the real flame. |
| 6 | **Jealousy** | Matsaryasura | On your turn, tap the instant the needle crosses the glowing zone. On the rival's turn you can "DISTRACT" them — but it fills a Guilt meter that disqualifies you, and rattles your next answer. |

---

## Controls

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move / select | Tap / drag | Arrow keys |
| Confirm / act | Tap | Space or Enter |
| Anger: snap back | Tap right zone | X |
| Greed: offer now | Tap green ring | Enter |
| Quit trial | Tap the x button | — |

---

## Settings

Tap the gear icon (hub or ending screen) to adjust music, SFX, voiceover volume, captions, and visual quality.

---

## Technical

- **No build step.** Vanilla JS (ES modules), HTML5 Canvas 2D, Three.js (CDN) for the 3D Ganesha.
- **No server required.** Open `index.html` directly, or serve with `npx serve .` / `python -m http.server 8080`.
- **No data collected.** Wish text stays in `sessionStorage` only — never transmitted.
- **Procedural audio.** All music and SFX are generated via the Web Audio API — no audio files needed.
- **Voiceover:** Browser-native `SpeechSynthesis` — no external TTS API.

### Stack
| Layer | Tech |
|-------|------|
| Structure | HTML5 |
| Styling | Vanilla CSS |
| Logic | Vanilla JS (ES modules) |
| 3D hero | Three.js r128 (CDN) |
| Audio | Web Audio API (procedural) |
| Voiceover | `SpeechSynthesis` |
| Storage | `sessionStorage` only |

---

## Project Structure

```
index.html
css/style.css
js/
  main.js, shell.js, state.js, engine2d.js, hero3d.js, audio.js, voice.js, config.js (gitignored)
  screens/  intro.js  wish.js  hub.js  ending.js  settings.js
  trials/   greed.js  anger.js  pride.js  attachment.js  delusion.js  jealousy.js
assets/icons/    (trial + keepsake icons)
docs/            (PRD, TRD, UI-UX specs)
```

---

*Happy Ganesh Chaturthi. 🪔*
