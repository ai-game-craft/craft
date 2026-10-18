import { BlockId, CHUNK_HEIGHT, CHUNK_SIZE, isSolid, isTransparent } from './BlockRegistry';
import { Chunk, chunkKey, worldToLocal } from './Chunk';
import { WorldGenerator } from './WorldGenerator';
import { CONFIG } from '../config';
import type { BlockUpdateMessage } from '../net/Protocol';
import { NetworkClient } from '../net/NetworkClient';

export type BlockChangeListener = (msg: BlockUpdateMessage) => void;

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private generator: WorldGenerator;
  private network: NetworkClient;
  private changeListeners: BlockChangeListener[] = [];
  seed: number;

  constructor(seed = CONFIG.world.seed) {
    this.seed = seed;
    this.generator = new WorldGenerator(seed);
    this.network = new NetworkClient();
  }

  onBlockChange(listener: BlockChangeListener): void {
    this.changeListeners.push(listener);
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz));
  }

  getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generator.generateChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getBlock(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BlockId.Air;
    const { lx, ly, lz, cx, cz } = worldToLocal(wx, wy, wz);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return BlockId.Air;
    return chunk.getBlock(lx, ly, lz);
  }

  /** Unified block change entry point — single-player writes locally; multiplayer can also send via network. */
  applyBlockChange(wx: number, wy: number, wz: number, blockId: number, playerId = 'local'): boolean {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return false;
    const { lx, ly, lz, cx, cz } = worldToLocal(wx, wy, wz);
    const chunk = this.getOrCreateChunk(cx, cz);
    const prev = chunk.getBlock(lx, ly, lz);
    if (prev === blockId) return false;

    chunk.setBlock(lx, ly, lz, blockId);

    const msg: BlockUpdateMessage = {
      type: 'block_update',
      x: wx,
      y: wy,
      z: wz,
      blockId,
      playerId,
    };

    this.network.send(msg);
    for (const listener of this.changeListeners) {
      listener(msg);
    }
    return true;
  }

  setBlock(wx: number, wy: number, wz: number, id: number): void {
    this.applyBlockChange(wx, wy, wz, id);
  }

  isBlockSolid(wx: number, wy: number, wz: number): boolean {
    return isSolid(this.getBlock(wx, wy, wz));
  }

  /**
   * Face visibility check for mesh building.
   * A face is drawn when the neighbour is air, or when the neighbour is
   * see-through and made of a different block (stone behind glass, for example).
   */
  shouldRenderFace(wx: number, wy: number, wz: number, blockId: number): boolean {
    const neighbor = this.getBlock(wx, wy, wz);
    if (neighbor === BlockId.Air) return true;
    return isTransparent(neighbor) && neighbor !== blockId;
  }

  getLoadedChunks(): Chunk[] {
    return [...this.chunks.values()];
  }

  loadChunksAround(px: number, pz: number, radius: number): void {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        this.getOrCreateChunk(pcx + dx, pcz + dz);
      }
    }
  }

  unloadDistantChunks(px: number, pz: number, radius: number): string[] {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const removed: string[] = [];
    for (const key of this.chunks.keys()) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > radius + 1 || Math.abs(cz - pcz) > radius + 1) {
        this.chunks.delete(key);
        removed.push(key);
      }
    }
    return removed;
  }

  getDirtyChunks(): Chunk[] {
    return this.getLoadedChunks().filter((c) => c.dirty);
  }

  markClean(chunk: Chunk): void {
    chunk.dirty = false;
    chunk.meshKey++;
  }

  loadFromSaved(chunks: Chunk[]): void {
    this.chunks.clear();
    for (const chunk of chunks) {
      this.chunks.set(chunkKey(chunk.cx, chunk.cz), chunk);
    }
  }

  getAllChunks(): Chunk[] {
    return [...this.chunks.values()];
  }

  /** Forget every loaded chunk — used when starting a brand new world. */
  reset(seed: number): void {
    this.chunks.clear();
    this.seed = seed;
    this.generator = new WorldGenerator(seed);
  }

  /** Terrain-only surface height (ignores player edits). */
  heightAt(wx: number, wz: number): number {
    return this.generator.heightAt(wx, wz);
  }

  /** Highest non-air block in a column of the *loaded* world, or -1 if the chunk isn't loaded. */
  topSolidY(wx: number, wz: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = this.getBlock(wx, y, wz);
      if (id !== BlockId.Air && id !== BlockId.Water) return y;
    }
    return -1;
  }
}
