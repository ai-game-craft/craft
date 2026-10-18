# Making CRAFT playful for Grade 8

Written after a code-level review of the demo and a rebuild of its "feel" layer.
Everything in **Already shipped** is in the code now; everything below it is a
prioritised menu of what to build next.

The audience matters: 13–14 year olds have low tolerance for friction and a very
high tolerance for chaos. They will not read instructions, they *will* press every
key, and the fastest way to lose them is a first minute where nothing responds.

---

## 1. Why the original demo felt "limited"

| What a student experiences | Root cause in the old code | Status |
|---|---|---|
| "I don't know what to do" | No goal, no score, no timer — a sandbox with no prompt | **Fixed:** 10 collectible glow-stars, timer, best time, rounds |
| "The ground is missing / it looks broken" | Top and bottom faces had inverted winding, so the ground was back-face culled | **Fixed** (`ChunkMesh.build`) |
| "It looks like static" | No mipmaps on the atlas → violent aliasing on distant terrain | **Fixed** (128×128 atlas + mipmaps) |
| "Everything is white/washed out" | Ambient 0.6 + directional 0.8 = 1.4× over-exposed | **Fixed** (ambient ≈ 0.54, sun ≈ 0.52) |
| "I can't tell what I'm about to break" | No block highlight at all | **Fixed:** crosshair outline |
| "I have to click 50 times to dig" | Break/place fired only on the mouse *edge* | **Fixed:** hold to repeat |
| "Building is painful" | No flight; you can't reach anything | **Fixed:** fly mode (F) |
| "It sounds dead" | Zero audio | **Fixed:** synthesised SFX for every action |
| "The world is boring" | Flat noise terrain, no caves, no ores, no day/night | **Fixed:** hills, mountains, oceans, caves, ores, full sky cycle |
| "It's laggy when I place a block" | Whole-chunk remesh with a fresh material per chunk | **Improved:** one shared material, typed-array saves |
| "Esc trapped me" | Losing pointer lock left you with no visible way back | **Fixed:** pause screen |
| "I can't start over" | Fixed seed, no reset | **Fixed:** seed input + New World |

The lesson: most of what felt "limited" was not missing features. It was **missing
feedback** and **three rendering bugs**.

---

## 2. Already shipped in this build

- Collect-the-stars loop with HUD timer, best time, round counter, win celebration
- 19 blocks incl. ores, glass, glowstone, brick, ice and TNT; painted 128×128 atlas
- Terrain: hills, mountains, ocean basins, beaches, snow line, caves, ore veins
- Day/night cycle: sun and moon sprites, stars, drifting clouds, fog, moonlight
- Sprint, jump buffering, coyote time, swimming, fly mode
- Hold-to-repeat breaking/placing, block outline, undo
- TNT with fuse, chain reactions, debris particles, screen shake, flash
- WebAudio SFX, mute, photo mode (PNG), F3 debug overlay
- Pause / help / start screens, mobile joystick + touch buttons
- Typed-array autosave, seed input, new-world reset

---

## 3. What to build next, ranked

Effort is for one developer who already knows the codebase.
"Kid impact" is how much it changes a 40-minute session.

### Tier 1 — give them a reason to come back (highest impact per hour)

**1.1 Build prompt of the day** — *½ day · kid impact: very high*
A single line on the HUD: "Today: build a bridge over water", "build a tower taller
than 15 blocks", "make a house with a glass roof". Check the world state and
celebrate when it matches. The star loop gives purpose; prompts give *creativity*.
Where: new `src/game/Challenges.ts`, evaluate in `Game.update()` once a second,
detect patterns with `ChunkManager.getBlock`. Start with 6 hard-coded checks.

**1.2 Share codes for builds** — *1 day · very high*
A "Share" button that exports the blocks the player changed (diff against the
generated terrain) plus the seed, as a short base64 string or URL fragment. A "Load"
paste box rebuilds it. This is the single most requested thing at that age: *let me
show you what I made*. Because terrain is a pure function of the seed, the diff is
tiny — a castle is a few kB.
Where: `ChunkManager` already funnels every change through `applyBlockChange`; record
`(x,y,z,id)` there and compare to `WorldGenerator` output on export.

**1.3 Treasure hunt** — *½ day · high*
Scatter 3 chests per world in caves/underwater, marked on a simple minimap or compass.
Opening one drops a "rare" block (gold, glowstone, obsidian) the hotbar doesn't have.
Discovery is what makes exploring feel worthwhile.

**1.4 A pet** — *½ day · high*
One wandering cube creature that follows you, hops when you jump, and can be named.
Pure charm; zero gameplay value; kids get attached instantly. Needs ~80 lines of
steering + a bobbing animation, no pathfinding.

**1.5 Combo counter** — *2 hours · high*
"Blocks placed in the last 3 seconds" × a multiplier, with pitch-rising sound. Turns
aimless clicking into a skill. Every sound hook already exists in
`AudioEngine.collect()` — reuse the rising arpeggio.

### Tier 2 — delight and chaos

**2.1 More explosives** — *½ day*
TNT cannon (place TNT on obsidian), bomb arrows, a "nuke" that spawns a crater.
Explosions already chain; the code path is `Game.explode()`.

**2.2 Weather** — *½ day*
Rain/snow particle field that follows the camera, darker sky, occasional lightning
flash (`Ui.flash()` already exists). Cheap, huge atmosphere win.

**2.3 Simple mobs** — *1–2 days*
Cube sheep/pigs that wander and can be sheared or fed. Needs a spawn/despawn system
and a tiny state machine. This is the classic next step and a good group project.

**2.4 Gadget blocks** — *1 day*
Trampoline (bounce on landing), speed pad, launch pad, magnet that pulls stars.
Each is ~20 lines in `Player.update()` — an ideal first "add your own block" task.

**2.5 Flowing water** — *1–2 days*
Water spreads to neighbours on a timer. Visually satisfying, algorithmically
interesting (BFS with a level field), but it will fight the chunk mesher.

### Tier 3 — social (the real grade-8 magnet)

**3.1 Multiplayer** — *2–3 days*
`src/net/Protocol.ts` and `NetworkClient` are already stubs for exactly this. A tiny
WebSocket server (Node + `ws`) that rebroadcasts `block_update` and `player_move`
would let a class share one world. Highest wow-factor of anything on this list.

**3.2 Split-screen two-player** — *1–2 days*
Two cameras + two input sets, `renderer.setScissorTest`. Harder than networking and
needs a gamepad or a second keyboard layout.

**3.3 Class leaderboard** — *½ day*
Post star-run times to a shared sheet/endpoint. Kids will replay for a leaderboard
far more than for a personal best.

**3.4 Seed gallery** — *1 hour*
A row of buttons on the start screen with the class's favourite seeds and a tiny
screenshot each. Costs nothing, generates a lot of "try mine!".

### Tier 4 — turn the game into a CS lesson

**4.1 JSON block definitions** — *½ day*
Move `BLOCKS` out of `BlockRegistry.ts` into a JSON file so a student can add a
block without touching TypeScript. First taste of data-driven design.

**4.2 Texture pack editor** — *1 day*
In-game 16×16 pixel editor writing back into the atlas. Art students who don't
like code still get a hook. `TextureAtlas` already paints on a canvas.

**4.3 Redstone-lite** — *3–5 days*
Wire, switch, lamp, pressure plate. Boolean logic in a game. The best "real
computer science in disguise" project here, and a great extension task.

**4.4 In-game tutorial world** — *½ day*
A hand-built world with signposts made of blocks explaining controls. Better than a
text overlay for the students who skip the start screen.

---

## 4. The "juice" checklist

Anything that makes an action feel like it happened. The current build has all of
these; keep them when you add features.

- [x] sound on every meaningful action, with pitch/volume variation
- [x] particle burst on break and place
- [x] outline on the targeted block
- [x] screen shake on explosions and hard landings
- [x] instant response — no animation delay before the block disappears
- [x] a HUD number that goes up (stars, combo)
- [x] a one-line message confirming what happened ("New best!")
- [ ] **missing:** a small "pop" on the hotbar when you select a block
- [ ] **missing:** footstep dust on sand/snow
- [ ] **missing:** a subtle vignette or zoom when you take a hit / find a star

---

## 5. What to avoid

- **Long instructions.** The start screen is already at the limit. Teach by doing —
  spawn the player facing a glow-star.
- **Punishment.** No health, no hunger, no death. Falling in water should never feel
  like a mistake.
- **Menus in front of the game.** Every extra click is a kid who closes the tab.
- **Tiny text.** The HUD is 12–20 px on purpose; classrooms have projectors.
- **Silence.** A quiet game reads as a broken game to this age group.
- **Making them read code first.** Ship one visible win (fly, TNT, a new block)
  before the first TypeScript lesson.

---

## 6. A suggested 4-week outline

| Week | Students can… | Ships |
|---|---|---|
| 1 | Play the star loop, fly, dig, blow up TNT | — |
| 2 | Change `config.ts` numbers; add a block from JSON | 4.1 |
| 3 | Build a shared world; record a 30-second build video | 3.1 or 1.2 |
| 4 | Pitch + build one Tier 2/3 feature in pairs | 2.x / 3.x |

See [CLASSROOM.md](CLASSROOM.md) for lesson plans and project briefs.
