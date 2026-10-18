# CRAFT in the classroom

A 45-minute lesson, three project briefs, and the practical stuff that goes wrong on
school hardware. Assumes students are 13–14 and have never opened a code editor.

---

## Before the lesson

**Run it offline.** `npm install` once, then `npm run dev` and leave it running.
The game makes no network requests at runtime.

**Check pointer lock.** Desktop Chrome/Edge is the happy path. If the game is embedded
in an iframe (many learning platforms), browsers block pointer lock; open it in its own
tab instead. If a student sees the pause screen right after pressing Play, a second
click on **Resume** normally fixes it.

**Check the room.** On low-end laptops, lower `world.renderDistance` to 4 in
`src/config.ts` — the biggest single performance lever.

**Plan pairs.** One drives, one reads the HUD and calls out stars. Swap every 10 min.

---

## Lesson 1 — 45 minutes: "play, then change one number"

| Time | What | Why |
|---|---|---|
| 0–5 | Everyone plays. Goal: collect 5 stars, nothing else. | Familiarity, no instructions |
| 5–10 | Stop. "What was the timer for? What happened when you got a star?" | Notice the feedback loop |
| 10–15 | Open `src/config.ts` together. Read it out loud. | Code is not scary, it's a list |
| 15–25 | Change **one** number in pairs: gravity, jump, fly speed, day length, star count. | Cause → effect in under a second |
| 25–35 | Swap and let the partner guess what the other changed. | Turns it into a game |
| 35–45 | Two or three students show their setting; class guesses the number. | Share, celebrate, no wrong answers |

**Extension for the fast finishers:** set `day.lengthSeconds` to 30 and
`starCount` to 25, then talk about why the game gets harder.

**Exit ticket:** "One thing the game does that I now know how to change."

---

## Project briefs

Each brief is designed for 2–3 lessons and can be graded on *working behaviour*
rather than code quality.

### Brief A — "Add your own block" (easiest, 1–2 lessons)

Ship a new placeable block that doesn't exist yet: a lantern, a coloured wool, a
rainbow block, a "bouncy" block.

Acceptance:
- a new id in `BlockId`
- a 16×16 texture painted in `TextureAtlas.ts` (fill a free atlas cell!)
- an entry in `PLACEABLE_BLOCKS` so it appears in the hotbar
- it can be placed and broken in game

Stretch: make it glow at night, or make it bounce the player.

### Brief B — "Make the world yours" (medium, 2–3 lessons)

Change how the world generates: floating islands, a canyon world, an archipelago,
a world that is always night.

Acceptance:
- `WorldGenerator.heightAt()` changed and the result is *consistent* (same seed →
  same world every time)
- water still only appears where it makes sense
- spawn logic still finds land (test with 3 different seeds)

Stretch: add a rare structure — a ruined tower, a pyramid, a giant tree.

### Brief C — "Build a challenge" (harder, 3 lessons)

Design and implement a new goal for the game, e.g. a countdown mode, a "build a
bridge" checker, a boss block that must be destroyed, or a combo system.

Acceptance:
- it appears in the HUD
- it has a win and a fail state, or a score
- a classmate can play it without being told the rules

This is the brief that maps directly onto `src/game/StarField.ts` and
`Game.completeRound()` — good reading material for the design phase.

---

## Marking rubric (any brief)

| Criterion | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Works | crashes or never appears | appears but breaks the game | works, minor bugs | works reliably |
| Discoverable | player would never find it | only with instructions | obvious once seen | impossible to miss |
| Feel | no feedback | one of sound/visual | both | feels *good* |
| Explanation | can't explain it | explains what | explains how | explains a trade-off |

---

## Practical notes

- **Saving.** Worlds autosave to the browser (IndexedDB), per browser profile. Shared
  laptops therefore share worlds — use **Start a brand new world** between classes, or
  copy the seed down so a student can get their world back.
- **Screenshots.** `P` saves a PNG. On a managed Chromebook the download may be
  blocked; the fallback is a phone photo of the screen, which students do anyway.
- **Printing a build.** The "share code" idea in [IDEAS.md](IDEAS.md) turns a build into
  a short string students can paste into a class document.
- **Console.** `window.game` is exposed. Students can type `game.player.flying = true`
  and watch the world respond. That single discovery has converted more reluctant
  coders than any tutorial.
- **Safety.** No chat, no accounts, no network calls, no ads. Everything runs locally.
