# CRAFT — Voxel Sandbox

A browser voxel sandbox in the spirit of Minecraft: TypeScript + Three.js + Vite.
No image files, no audio files, no backend — every texture and every sound effect is
generated in code, so the whole game is one small bundle.

> Originally a demo for [KimiC](https://github.com/KimiC) — play at http://craft.rafter.com.cn/

## What you can do

**Collect the stars.** Ten glowing stars are scattered around the world each round.
Walk into one to grab it. The HUD keeps a timer and your best run; clear all ten and
a fresh ring spawns further out.

**Build something.** 19 block types, instant creative-style placing, fly mode and Ctrl+Z.

**Break something.** TNT explodes, and explosions set off other TNT. Chain reactions
are very much encouraged.

**Explore.** Hills, beaches, oceans, snow caps and mountains are generated from a seed
you can type on the start screen. Underground there are caves and coal / iron / gold veins.

**Play with the world.** A full day-night cycle (sunrise, stars, moon, drifting clouds),
procedural sound effects, and a photo mode that saves a PNG.

## Features

- 19 blocks: grass, dirt, stone, cobble, planks, logs, leaves, sand, gravel, glass,
  brick, ice, snow, glowstone, coal/iron/gold ore, obsidian and TNT
- Terrain from layered simplex noise: rolling hills, mountains, ocean basins,
  beaches and a snow line
- Caves carved from two intersecting noise fields (winding tunnels, not hollow blobs)
  plus depth-based ore veins
- Per-chunk face-culled meshing with a mipmapped, procedurally painted texture atlas
- Day/night cycle driving sky colour, fog, sun/moon sprites, stars and lighting
- Crosshair block outline, hold-to-repeat breaking and placing
- Sprint, jump buffering, coyote time, swimming, and a fly mode
- WebAudio sound effects synthesised at runtime (break, place, jump, splash, collect,
  fuse, explosion, win jingle) with an M mute toggle
- Voxel debris particles, explosion flash and camera shake
- Star-collecting challenge loop with timer, best time and round counter
- Undo, photo mode, F3 debug overlay, seed input and new-world button
- IndexedDB autosave (chunks stored as typed arrays)

## Controls

### Desktop

| Key | Action |
|-----|--------|
| W A S D / arrow keys | Move |
| Mouse | Look |
| Space | Jump · fly up |
| Shift | Sprint · fly down |
| F | Toggle fly mode |
| Left click | Break block (hold to repeat) |
| Right click | Place block (hold to repeat) |
| 1–9, mouse wheel, or click a slot | Select block |
| Ctrl+Z (⌘Z on Mac) | Undo last edit |
| P | Save a screenshot as PNG |
| M | Mute / unmute |
| H | Help |
| F3 | Debug overlay (FPS, position, nearest star) |
| Esc | Pause |

### Mobile (phone / tablet)

| Control | Action |
|---------|--------|
| Left joystick | Move |
| Drag right side of screen | Look around |
| Break / Place / Jump / Fly buttons | Actions (Fly shows a Down button when active) |
| Tap hotbar slot | Select block |
| ☰ button | Pause menu |

## Tuning it for a class

Almost everything that changes how the game *feels* lives in one file:
[`src/config.ts`](src/config.ts) — gravity, walk/sprint/fly speed, jump height, day
length, star count, world seed, render distance and so on. Change a number, save, and
the dev server hot-reloads. Great first exercise: "make the moon's gravity real" or
"how fast is too fast?".

The game object is exposed on `window.game`, so students can poke at it from the browser
console:

```js
game.player.flying = true          // start flying
game.player.position.y += 20       // teleport up
game.world.getBlock(10, 40, 10)    // read a block id
game.sky.time = 22                 // jump to night
game.audio.toggleMute()
```

See [IDEAS.md](IDEAS.md) for a prioritised list of ways to make it more playful,
and [CLASSROOM.md](CLASSROOM.md) for a lesson plan and project briefs.

## Getting started

1. Accept the GitHub collaborator invite (email from GitHub)
2. Install [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/)
3. Clone and run:

```bash
git clone https://github.com/Raft-chen/craft.git
cd craft
npm install
npm run dev
```

4. Open http://localhost:5173/ in your browser
5. Live game: http://craft.rafter.com.cn/
6. After changes: `git add .` → `git commit -m "message"` → `git push`

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173/

## Production Build

```bash
npm run build
```

Output in `dist/` — deploy to web server root.

## Deploy to craft.rafter.com.cn (Git)

### One-time server setup

SSH into ECS (web terminal or `ssh admin@47.82.233.199`), then:

```bash
# Install Node.js 20 if needed (Aliyun Linux / CentOS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Clone and first deploy
git clone https://github.com/Raft-chen/craft.git ~/craft
cd ~/craft
chmod +x deploy/setup-server.sh deploy/deploy.sh
bash deploy/setup-server.sh
```

Ensure nginx is configured — see [deploy/nginx.craft.conf.example](deploy/nginx.craft.conf.example)  
(Aliyun Linux uses `/etc/nginx/conf.d/craft.rafter.com.cn.conf`)

### Every update (your workflow)

**On your PC** — commit and push:

```powershell
cd C:\fw\Turin_BIOS_code\rafter-voxel
git add .
git commit -m "Describe your change"
git push
```

**Deploy to server** — either:

```powershell
# Option A: from PC, trigger remote build
npm run deploy
# or
.\deploy\deploy.ps1
```

```bash
# Option B: on the server directly
cd ~/craft
git pull origin main
bash deploy/deploy.sh
```

The script pulls git, runs `npm ci`, `npm run build`, and copies `dist/` to `/var/www/craft.rafter.com.cn/`.

### DNS

| Type | Host | Value |
|------|------|-------|
| A | craft | your server public IP |

Access: **http://craft.rafter.com.cn/**

### HTTPS (recommended for mobile Pointer Lock)

**Before running:** Aliyun ECS security group must allow **TCP 443** inbound.

On Aliyun Linux, `yum install certbot` often fails — use the script (tries pip, then acme.sh):

```bash
cd ~/craft
git checkout -- deploy/deploy.sh 2>/dev/null || true
git pull origin main
chmod +x deploy/setup-https.sh

export EMAIL=you@example.com
bash deploy/setup-https.sh
```

**Manual fallback (pip):**

```bash
sudo yum install -y python3-pip
sudo python3 -m pip install certbot certbot-nginx
sudo certbot --nginx -d craft.rafter.com.cn
```

**Manual fallback (acme.sh) — if pip also fails:**

```bash
curl https://get.acme.sh | sh -s email=you@example.com
~/.acme.sh/acme.sh --issue -d craft.rafter.com.cn -w /var/www/craft.rafter.com.cn
```

Then follow acme.sh nginx install hints, or re-run `bash deploy/setup-https.sh`.

Verify: `curl -I https://craft.rafter.com.cn/`

## Architecture

```
src/
├── config.ts        All the tunable numbers (start here)
├── engine/          Game loop, input, touch controls, first-person camera
├── world/           Chunks, terrain + cave/ore generation, block registry, raycast
├── render/          Renderer, chunk mesher, procedural texture atlas, sky, particles
├── player/          Movement, collision, swimming, flying
├── game/            StarField — the collect-the-stars challenge loop
├── audio/           WebAudio synthesiser (no sound files)
├── ui/              DOM HUD, toasts, menus
├── save/            IndexedDB persistence
└── net/             Protocol stubs for future multiplayer
```

Rendering pipeline in one line: voxel data lives in `Uint8Array` chunks → `ChunkMesh`
walks each chunk and emits only the faces that can be seen → one `Mesh` per chunk,
all sharing a single material and a single 128×128 procedural texture atlas.

## License

Original voxel sandbox — not affiliated with Minecraft.