import { createNoise2D, createNoise3D } from 'simplex-noise';
import { BlockId, CHUNK_HEIGHT, CHUNK_SIZE, WORLD_SEED } from './BlockRegistry';
import { Chunk } from './Chunk';
import { CONFIG } from '../config';
import { hash2, hash3 } from '../util/hash';

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Terrain: rolling hills + occasional mountains, beaches, snow caps,
 * carved caves and depth-based ore veins.
 * Everything is a pure function of world coordinates + seed, so chunks
 * generate identically no matter what order you explore them in.
 */
export class WorldGenerator {
  readonly seed: number;
  private noise2D: ReturnType<typeof createNoise2D>;
  private noise3D: ReturnType<typeof createNoise3D>;
  private caveNoise: ReturnType<typeof createNoise3D>;

  constructor(seed = WORLD_SEED) {
    this.seed = seed;
    const rand = seededRandom(seed);
    this.noise2D = createNoise2D(rand);
    this.noise3D = createNoise3D(rand);
    this.caveNoise = createNoise3D(rand);
  }

  /** Height of the terrain surface (inclusive) at a world column. */
  heightAt(wx: number, wz: number): number {
    const broad = this.noise2D(wx * 0.0045, wz * 0.0045);
    const mid = this.noise2D(wx * 0.016, wz * 0.016) * 0.5;
    const fine = this.noise2D(wx * 0.06, wz * 0.06) * 0.12;
    let h = 38 + broad * 16 + mid * 7 + fine * 2.2;

    // Mountain ridges: squared abs-noise gives sharp peaks instead of rolling blobs.
    const ridge = Math.max(0, this.noise2D(wx * 0.0085 + 40, wz * 0.0085 + 40));
    h += ridge * ridge * 26;

    // Ocean basins: a very low-frequency field digs a few big depressions.
    const basin = this.noise2D(wx * 0.0026 + 300, wz * 0.0026 + 300);
    h -= Math.max(0, basin - 0.1) * 90;

    return Math.max(4, Math.min(CHUNK_HEIGHT - 12, Math.floor(h)));
  }

  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;
    const water = CONFIG.world.waterLevel;
    const snow = CONFIG.world.snowLine;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;
        const height = this.heightAt(wx, wz);

        const beach = height <= water + 1;
        const surface = beach ? BlockId.Sand : height >= snow ? BlockId.Snow : BlockId.Grass;
        const filler = beach ? BlockId.Sand : BlockId.Dirt;

        for (let y = 0; y <= height && y < CHUNK_HEIGHT; y++) {
          let block: BlockId;
          if (y === height) {
            block = surface;
          } else if (y > height - 4) {
            block = filler;
          } else {
            block = BlockId.Stone;
          }

          // Caves: never carve the top 3 blocks of a column, so oceans stay sealed.
          if (y < height - 3 && y > 5 && this.isCave(wx, y, wz)) {
            block = BlockId.Air;
          } else if (block === BlockId.Stone) {
            block = this.oreAt(wx, y, wz, height);
          }

          if (block !== BlockId.Air) chunk.setBlock(lx, y, lz, block);
        }

        if (height < water) {
          for (let y = height + 1; y <= water && y < CHUNK_HEIGHT; y++) {
            chunk.setBlock(lx, y, lz, BlockId.Water);
          }
        } else if (height === water) {
          chunk.setBlock(lx, height, lz, BlockId.Sand);
        }
      }
    }

    this.generateTrees(chunk, baseX, baseZ);
    return chunk;
  }

  /**
   * Caves are the *intersection of two near-zero noise fields*, which carves thin
   * winding tunnels instead of one giant hollow blob. Big caverns are rare.
   */
  private isCave(wx: number, wy: number, wz: number): boolean {
    const a = this.caveNoise(wx * 0.075, wy * 0.11, wz * 0.075);
    const b = this.caveNoise(wx * 0.075 + 40, wy * 0.11 + 40, wz * 0.075 + 40);
    if (Math.abs(a) < 0.075 && Math.abs(b) < 0.075) return true;
    if (wy > 50) return false;
    return this.noise3D(wx * 0.045 + 100, wy * 0.06, wz * 0.045 + 100) > 0.82;
  }

  private oreAt(wx: number, wy: number, wz: number, surfaceY: number): BlockId {
    if (wy > surfaceY - 4) return BlockId.Stone;
    const h = hash3(wx, wy, wz, this.seed);
    if (h < 0.0035 && wy < 22) return BlockId.GoldOre;
    if (h < 0.016 && wy < 34) return BlockId.IronOre;
    if (h < 0.045 && wy < 58) return BlockId.CoalOre;
    if (h < 0.052 && wy < 10) return BlockId.Obsidian;
    return BlockId.Stone;
  }

  /**
   * Trees are placed from a margin outside the chunk so canopies that cross a
   * chunk border appear complete instead of being sliced off.
   */
  private generateTrees(chunk: Chunk, baseX: number, baseZ: number): void {
    const water = CONFIG.world.waterLevel;
    const snow = CONFIG.world.snowLine;

    for (let lx = -3; lx < CHUNK_SIZE + 3; lx++) {
      for (let lz = -3; lz < CHUNK_SIZE + 3; lz++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;
        const height = this.heightAt(wx, wz);
        if (height <= water + 1 || height >= snow - 2) continue;

        // Forest patches: some areas dense, some bare.
        const density = this.noise2D(wx * 0.02 + 500, wz * 0.02 + 500);
        if (density < -0.1) continue;
        if (hash2(wx, wz, this.seed) > 0.014 + density * 0.01) continue;

        const trunk = 4 + Math.floor(hash2(wx + 7, wz + 7, this.seed) * 3);
        const topY = height + trunk;

        for (let ty = 1; ty <= trunk; ty++) {
          chunk.setBlock(lx, height + ty, lz, BlockId.Wood);
        }

        for (let dy = -2; dy <= 2; dy++) {
          const radius = dy >= 1 ? 1 : 2;
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
              if (dy === 2 && Math.abs(dx) + Math.abs(dz) > 1) continue;
              if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
              const ty = topY + dy;
              if (ty >= CHUNK_HEIGHT) continue;
              if (chunk.getBlock(lx + dx, ty, lz + dz) === BlockId.Air) {
                chunk.setBlock(lx + dx, ty, lz + dz, BlockId.Leaves);
              }
            }
          }
        }
      }
    }
  }
}
