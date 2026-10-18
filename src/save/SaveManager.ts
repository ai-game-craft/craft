import { Chunk } from '../world/Chunk';

const DB_NAME = 'rafter-voxel';
const STORE_NAME = 'worlds';
const WORLD_KEY = 'default';
const SAVE_VERSION = 2;

interface ChunkPayload {
  cx: number;
  cz: number;
  /** Uint8Array on new saves, plain number[] on v1 saves. */
  data: Uint8Array | number[];
}

interface SavePayload {
  version: number;
  seed: number;
  playerPos: { x: number; y: number; z: number };
  chunks: ChunkPayload[];
  savedAt: number;
}

/** IndexedDB persistence. Chunks are stored as typed arrays — much smaller and faster than the old number[] copy. */
export class SaveManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(
    chunks: Chunk[],
    playerPos: { x: number; y: number; z: number },
    seed: number,
  ): Promise<void> {
    if (!this.db) await this.init();
    const payload: SavePayload = {
      version: SAVE_VERSION,
      seed,
      playerPos,
      chunks: chunks.map((c) => ({
        cx: c.cx,
        cz: c.cz,
        data: new Uint8Array(c.serialize()),
      })),
      savedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, WORLD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async load(): Promise<{
    chunks: Chunk[];
    playerPos: { x: number; y: number; z: number };
    seed: number;
  } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(WORLD_KEY);
      req.onsuccess = () => {
        const payload = req.result as SavePayload | undefined;
        if (!payload) {
          resolve(null);
          return;
        }
        const chunks = payload.chunks.map((entry) => {
          const bytes =
            entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
          const buf = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer;
          return Chunk.deserialize(buf);
        });
        resolve({
          chunks,
          playerPos: payload.playerPos,
          seed: payload.seed ?? 42,
        });
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(WORLD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async hasSave(): Promise<boolean> {
    try {
      const data = await this.load();
      return data !== null;
    } catch {
      return false;
    }
  }
}
