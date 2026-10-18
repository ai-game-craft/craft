import * as THREE from 'three';

const TILE = 16;
/** Power-of-two atlas (128x128) so mipmapping works — prevents the "comb" aliasing on distant blocks. */
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;

/** Deterministic per-pixel hash so textures never change between reloads. */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Tiny drawing helper scoped to one 16x16 atlas tile. */
class TilePainter {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly ox: number,
    private readonly oy: number,
    private readonly rnd: (i: number) => number,
  ) {}

  fill(color: string, alpha = 1): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.ox, this.oy, TILE, TILE);
    this.ctx.restore();
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.ox + x, this.oy + y, w, h);
  }

  px(x: number, y: number, color: string): void {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
    this.rect(x, y, 1, 1, color);
  }

  /** Scatter single pixels — the cheap way to make a flat colour read as a material. */
  mottle(colors: string[], count: number, offset = 0): void {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(this.rnd(offset + i * 3) * TILE);
      const y = Math.floor(this.rnd(offset + i * 3 + 1) * TILE);
      this.px(x, y, colors[Math.floor(this.rnd(offset + i * 3 + 2) * colors.length)]);
    }
  }

  /** Chunky 2-3px clumps, e.g. ore nuggets. */
  blobs(color: string, light: string, count: number, offset = 0): void {
    for (let i = 0; i < count; i++) {
      const x = 1 + Math.floor(this.rnd(offset + i * 4) * (TILE - 5));
      const y = 1 + Math.floor(this.rnd(offset + i * 4 + 1) * (TILE - 5));
      const w = 2 + Math.floor(this.rnd(offset + i * 4 + 2) * 2);
      const h = 2 + Math.floor(this.rnd(offset + i * 4 + 3) * 2);
      this.rect(x, y, w, h, color);
      this.rect(x, y, 1, 1, light);
    }
  }
}

type Painter = (p: TilePainter) => void;

const PAINTERS: Painter[] = [
  // 0 grass top
  (p) => {
    p.fill('#66b84f');
    p.mottle(['#559e40', '#7ecb60', '#5aa845', '#74c25a'], 60);
  },
  // 1 dirt
  (p) => {
    p.fill('#8a6a46');
    p.mottle(['#755631', '#9d7d55', '#7f6039', '#93714b'], 60);
  },
  // 2 grass side
  (p) => {
    p.fill('#8a6a46');
    p.mottle(['#755631', '#9d7d55', '#7f6039'], 55);
    for (let x = 0; x < TILE; x++) {
      const d = 8 + Math.floor(hash2(x, 1, 77) * 4);
      p.rect(x, 0, 1, d, '#66b84f');
      p.px(x, d - 1, hash2(x, 2, 91) > 0.5 ? '#559e40' : '#74c25a');
    }
  },
  // 3 stone
  (p) => {
    p.fill('#8d8d94');
    p.mottle(['#77777e', '#a3a3aa', '#82828a'], 60);
    p.blobs('#7b7b83', '#9a9aa1', 4, 200);
  },
  // 4 sand
  (p) => {
    p.fill('#e0cf92');
    p.mottle(['#cbb877', '#f0e3b0', '#d6c485'], 60);
  },
  // 5 water
  (p) => {
    p.fill('#3b7ddb', 0.7);
    for (let y = 2; y < TILE; y += 5) {
      p.rect(0, y, TILE, 1, '#5b9aee');
    }
    p.mottle(['#5b9aee', '#2f68c0'], 18, 300);
  },
  // 6 log top
  (p) => {
    p.fill('#b08a52');
    for (let r = 2; r < 8; r += 2) {
      const steps = Math.floor(r * 8);
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        p.px(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), '#8d6a3a');
      }
    }
    p.rect(7, 7, 2, 2, '#8d6a3a');
  },
  // 7 log side / bark
  (p) => {
    p.fill('#6d4a26');
    for (let x = 0; x < TILE; x += 2) {
      const h = 4 + Math.floor(hash2(x, 5, 13) * 11);
      const y = Math.floor(hash2(x, 6, 17) * (TILE - h));
      p.rect(x, y, 1, h, '#553818');
    }
    p.mottle(['#835c33', '#4a3115'], 26, 400);
  },
  // 8 leaves
  (p) => {
    p.fill('#37953a');
    p.mottle(['#286f2b', '#48b04a', '#1f5c23', '#56c257'], 80);
    p.blobs('#1f5c23', '#48b04a', 3, 500);
  },
  // 9 glass
  (p) => {
    p.fill('#bfe6f5', 0.35);
    p.rect(0, 0, TILE, 1, '#ffffff');
    p.rect(0, 0, 1, TILE, '#ffffff');
    p.rect(0, TILE - 1, TILE, 1, '#8fc7e0');
    p.rect(TILE - 1, 0, 1, TILE, '#8fc7e0');
    for (let i = 0; i < 5; i++) {
      p.px(3 + i, 3 + i, '#ffffff');
      p.px(4 + i, 3 + i, '#ffffff');
    }
  },
  // 10 cobblestone
  (p) => {
    p.fill('#5e5e66');
    const stones = [
      [1, 1, 6, 5], [9, 1, 5, 4], [2, 8, 5, 5], [8, 7, 6, 4], [1, 13, 7, 2], [10, 12, 4, 3], [14, 6, 1, 6],
    ];
    for (const [x, y, w, h] of stones) {
      p.rect(x, y, w, h, '#7a7a82');
      p.rect(x, y, w, 1, '#96969e');
      p.rect(x, y + h - 1, w, 1, '#63636b');
    }
    p.mottle(['#96969e', '#63636b'], 20, 700);
  },
  // 11 planks
  (p) => {
    p.fill('#c79a63');
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      p.rect(0, y + 3, TILE, 1, '#a97f4c');
      p.rect(0, y, TILE, 1, '#dcb47c');
      const seam = Math.floor(hash2(row, 0, 23) * TILE);
      p.rect(seam, y, 1, 3, '#a97f4c');
    }
    p.mottle(['#b98c56', '#dcb47c'], 20, 800);
  },
  // 12 gravel
  (p) => {
    p.fill('#8f8a83');
    p.blobs('#6f6a63', '#a9a49c', 10, 900);
    p.mottle(['#5c5853', '#b5b0a8'], 40, 950);
  },
  // 13 coal ore
  (p) => {
    p.fill('#8d8d94');
    p.mottle(['#77777e', '#a3a3aa'], 40, 1000);
    p.blobs('#232326', '#3f3f45', 5, 1050);
  },
  // 14 iron ore
  (p) => {
    p.fill('#8d8d94');
    p.mottle(['#77777e', '#a3a3aa'], 40, 1100);
    p.blobs('#c98f63', '#e8b68d', 5, 1150);
  },
  // 15 gold ore
  (p) => {
    p.fill('#8d8d94');
    p.mottle(['#77777e', '#a3a3aa'], 40, 1200);
    p.blobs('#e8c44a', '#fff09a', 5, 1250);
  },
  // 16 tnt side
  (p) => {
    p.fill('#c33a2c');
    p.mottle(['#a82c20', '#d94b3c'], 20, 1300);
    p.rect(0, 5, TILE, 6, '#f2efe6');
    p.rect(0, 5, TILE, 1, '#cfc9bb');
    p.rect(0, 10, TILE, 1, '#cfc9bb');
    const letters: [number, number, number, number][] = [
      [2, 7, 2, 1], [2, 9, 2, 1], [2, 7, 1, 3],
      [5, 7, 1, 3], [6, 8, 1, 1], [7, 7, 1, 3],
      [9, 7, 2, 1], [9, 10, 2, 1], [10, 8, 1, 2],
    ];
    for (const [x, y, w, h] of letters) p.rect(x, y, w, h, '#3a2a24');
  },
  // 17 tnt top
  (p) => {
    p.fill('#c33a2c');
    p.mottle(['#a82c20', '#d94b3c'], 20, 1400);
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      p.px(Math.round(8 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), '#f2efe6');
    }
    p.rect(6, 6, 4, 4, '#f2efe6');
    p.rect(7, 7, 2, 2, '#3a2a24');
  },
  // 18 tnt bottom
  (p) => {
    p.fill('#8f2a20');
    p.mottle(['#6f1f17', '#a8362a'], 30, 1500);
  },
  // 19 brick
  (p) => {
    p.fill('#cfc7bb');
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      const offset = row % 2 === 0 ? 0 : 4;
      for (let x = -8; x < TILE; x += 8) {
        p.rect(x + offset, y, 7, 3, '#a34a3a');
        p.rect(x + offset, y, 7, 1, '#b85a47');
      }
    }
  },
  // 20 glowstone
  (p) => {
    p.fill('#f0c04a');
    p.mottle(['#fff0a8', '#c9932c', '#ffe07a'], 50, 1600);
    p.blobs('#fff6c9', '#ffffff', 5, 1700);
  },
  // 21 ice
  (p) => {
    p.fill('#a8d8ea', 0.72);
    p.rect(0, 0, TILE, 1, '#d6f0fa');
    p.rect(0, 0, 1, TILE, '#d6f0fa');
    p.rect(0, TILE - 1, TILE, 1, '#8ac0d8');
    for (let i = 0; i < 4; i++) {
      const x = 2 + Math.floor(hash2(i, 3, 31) * 10);
      const y = 2 + Math.floor(hash2(i, 4, 37) * 10);
      p.rect(x, y, 4, 1, '#d6f0fa');
    }
  },
  // 22 snow
  (p) => {
    p.fill('#f2f6fa');
    p.mottle(['#dde6ee', '#ffffff', '#e8eff5'], 45, 1800);
  },
  // 23 filler — keep high-contrast neighbours away from light tiles so mipmaps
  // don't bleed colour into them.
  (p) => {
    p.fill('#7c7c84');
    p.mottle(['#6e6e76', '#8a8a92'], 20, 1900);
  },
  // 24 obsidian
  (p) => {
    p.fill('#241f33');
    p.mottle(['#181426', '#463f5c', '#2e2743'], 55, 1950);
    p.blobs('#463f5c', '#6a5f8a', 3, 2000);
  },
];

/** Procedurally generated 16x16 block texture atlas. */
export class TextureAtlas {
  readonly texture: THREE.Texture;
  readonly tileSize: number;
  readonly atlasSize: number;
  readonly canvas: HTMLCanvasElement;
  private tileAvg: number[] = [];

  constructor() {
    this.tileSize = 1 / ATLAS_COLS;
    this.atlasSize = TILE * ATLAS_COLS;
    const canvas = document.createElement('canvas');
    canvas.width = TILE * ATLAS_COLS;
    canvas.height = TILE * ATLAS_ROWS;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < PAINTERS.length; i++) {
      const ox = (i % ATLAS_COLS) * TILE;
      const oy = Math.floor(i / ATLAS_COLS) * TILE;
      PAINTERS[i](new TilePainter(ctx, ox, oy, (n: number) => hash2(n, i * 17 + 3, i + 11)));
    }

    // Every remaining atlas cell must be opaque: with mipmaps enabled the unused
    // transparent cells would bleed alpha into real tiles and punch holes in
    // distant terrain once alphaTest runs.
    const unused: Painter = (p) => {
      p.fill('#6a6a70');
      p.mottle(['#5c5c62', '#78787e'], 20);
    };
    for (let i = PAINTERS.length; i < ATLAS_COLS * ATLAS_ROWS; i++) {
      const ox = (i % ATLAS_COLS) * TILE;
      const oy = Math.floor(i / ATLAS_COLS) * TILE;
      unused(new TilePainter(ctx, ox, oy, (n: number) => hash2(n, i * 17 + 3, i + 11)));
    }

    this.canvas = canvas;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = true;
    this.texture.anisotropy = 4;

    this.readAverages(ctx);
  }

  private readAverages(ctx: CanvasRenderingContext2D): void {
    const data = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    const tileCount = ATLAS_COLS * ATLAS_ROWS;
    for (let tile = 0; tile < tileCount; tile++) {
      const ox = (tile % ATLAS_COLS) * TILE;
      const oy = Math.floor(tile / ATLAS_COLS) * TILE;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const i = ((oy + y) * this.canvas.width + (ox + x)) * 4;
          if (data[i + 3] < 40) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
      }
      n = Math.max(1, n);
      this.tileAvg[tile] = ((Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n));
    }
  }

  /** Average colour of a tile, e.g. for block debris particles. */
  averageColor(tileIndex: number): number {
    return this.tileAvg[tileIndex] ?? 0x888888;
  }

  getUV(tileIndex: number): [number, number, number, number] {
    const col = tileIndex % ATLAS_COLS;
    const row = Math.floor(tileIndex / ATLAS_COLS);
    const u0 = col * this.tileSize;
    const v1 = 1 - row * this.tileSize;
    const u1 = u0 + this.tileSize;
    const v0 = v1 - this.tileSize;
    return [u0, v0, u1, v1];
  }

  /** Crisp scaled-up tile as a data URL, used for hotbar icons. */
  iconDataURL(tileIndex: number, size = 48): string {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const sx = (tileIndex % ATLAS_COLS) * TILE;
    const sy = Math.floor(tileIndex / ATLAS_COLS) * TILE;
    ctx.drawImage(this.canvas, sx, sy, TILE, TILE, 0, 0, size, size);
    return c.toDataURL();
  }
}
