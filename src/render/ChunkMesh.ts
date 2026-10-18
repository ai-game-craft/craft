import * as THREE from 'three';
import { BlockId, CHUNK_HEIGHT, CHUNK_SIZE, getBlock } from '../world/BlockRegistry';
import type { Chunk } from '../world/Chunk';
import type { ChunkManager } from '../world/ChunkManager';
import type { TextureAtlas } from './TextureAtlas';

type Face = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';

const FACE_NORMALS: Record<Face, [number, number, number]> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
};

const FACE_VERTS: Record<Face, [number, number, number][]> = {
  top: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
  bottom: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]],
  north: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
  south: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  east: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
  west: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
};

const FACES: Face[] = ['top', 'bottom', 'north', 'south', 'east', 'west'];

export class ChunkMeshBuilder {
  /** One shared material for every chunk — far fewer GPU state changes. */
  private material: THREE.MeshLambertMaterial;

  constructor(
    private atlas: TextureAtlas,
    private world: ChunkManager,
  ) {
    this.material = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      side: THREE.FrontSide,
      transparent: true,
      alphaTest: 0.1,
    });
  }

  build(chunk: Chunk): THREE.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertOffset = 0;

    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          const blockId = chunk.getBlock(lx, ly, lz);
          if (blockId === BlockId.Air) continue;

          const def = getBlock(blockId);
          const wx = baseX + lx;
          const wz = baseZ + lz;

          for (const face of FACES) {
            const [nx, ny, nz] = FACE_NORMALS[face];
            if (!this.world.shouldRenderFace(wx + nx, ly + ny, wz + nz, blockId)) continue;

            const tileIndex =
              face === 'top' ? def.textures[0] : face === 'bottom' ? def.textures[1] : def.textures[2];
            const [u0, v0, u1, v1] = this.atlas.getUV(tileIndex);
            // Every face lists its corners bottom-left, bottom-right, top-right,
            // top-left — so v0 (tile bottom) goes to the lower two vertices.
            const uvCorners: [number, number][] = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

            for (let vi = 0; vi < 4; vi++) {
              const [vx, vy, vz] = FACE_VERTS[face][vi];
              positions.push(baseX + lx + vx, ly + vy, baseZ + lz + vz);
              normals.push(nx, ny, nz);
              uvs.push(uvCorners[vi][0], uvCorners[vi][1]);
            }
            // Top/bottom quads are wound the other way round in FACE_VERTS, so their
            // triangle order has to be flipped or they get back-face culled.
            if (face === 'top' || face === 'bottom') {
              indices.push(vertOffset, vertOffset + 2, vertOffset + 1, vertOffset, vertOffset + 3, vertOffset + 2);
            } else {
              indices.push(vertOffset, vertOffset + 1, vertOffset + 2, vertOffset, vertOffset + 2, vertOffset + 3);
            }
            vertOffset += 4;
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }
}

export class ChunkMeshManager {
  private meshes = new Map<string, THREE.Mesh>();
  private builder: ChunkMeshBuilder;

  constructor(
    atlas: TextureAtlas,
    world: ChunkManager,
    private scene: THREE.Scene,
  ) {
    this.builder = new ChunkMeshBuilder(atlas, world);
  }

  updateChunk(chunk: Chunk): void {
    const key = `${chunk.cx},${chunk.cz}`;
    const existing = this.meshes.get(key);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
    }

    const mesh = this.builder.build(chunk);
    mesh.userData.chunkKey = key;
    this.meshes.set(key, mesh);
    this.scene.add(mesh);
  }

  removeChunk(key: string): void {
    const mesh = this.meshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.meshes.delete(key);
    }
  }

  get meshCount(): number {
    return this.meshes.size;
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshes.clear();
  }
}
