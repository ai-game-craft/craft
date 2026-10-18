import * as THREE from 'three';
import type { ChunkManager } from '../world/ChunkManager';
import { CONFIG } from '../config';

interface Star {
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  alive: boolean;
  phase: number;
}

function haloTexture(): THREE.Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,250,220,1)');
  g.addColorStop(0.18, 'rgba(255,216,110,0.85)');
  g.addColorStop(0.5, 'rgba(255,180,60,0.25)');
  g.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The goal loop: a ring of glowing stars scattered on the surface.
 * Walking into one collects it; collecting all of them wins the round.
 */
export class StarField {
  private root = new THREE.Group();
  private stars: Star[] = [];
  private coreMat: THREE.MeshBasicMaterial;
  private haloMat: THREE.SpriteMaterial;
  private coreGeo: THREE.OctahedronGeometry;

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.root);
    this.coreGeo = new THREE.OctahedronGeometry(0.42, 0);
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xffd85c, toneMapped: false });
    this.haloMat = new THREE.SpriteMaterial({
      map: haloTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }

  get total(): number {
    return this.stars.length;
  }

  get remaining(): number {
    return this.stars.filter((s) => s.alive).length;
  }

  get collected(): number {
    return this.total - this.remaining;
  }

  spawn(world: ChunkManager, cx: number, cz: number, count = CONFIG.play.starCount): void {
    this.clear();
    const placed: { x: number; z: number }[] = [];
    const water = CONFIG.world.waterLevel;

    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 80; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.play.starMinRadius +
          Math.random() * (CONFIG.play.starMaxRadius - CONFIG.play.starMinRadius);
        const x = Math.round(cx + Math.cos(angle) * dist);
        const z = Math.round(cz + Math.sin(angle) * dist);

        if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 18 * 18)) continue;

        const top = world.topSolidY(x, z);
        const h = top >= 0 ? top : world.heightAt(x, z);
        if (h <= water + 1) continue;

        placed.push({ x, z });
        this.addStar(x, h + 1.7, z);
        break;
      }
    }
  }

  private addStar(x: number, y: number, z: number): void {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const core = new THREE.Mesh(this.coreGeo, this.coreMat);
    group.add(core);

    const halo = new THREE.Sprite(this.haloMat);
    halo.scale.setScalar(5.5);
    group.add(halo);

    this.root.add(group);
    this.stars.push({ group, x, y, z, alive: true, phase: Math.random() * Math.PI * 2 });
  }

  /** Collect any star the player is standing in. Returns what was picked up. */
  collectAt(px: number, py: number, pz: number): { x: number; y: number; z: number }[] {
    const picked: { x: number; y: number; z: number }[] = [];
    for (const s of this.stars) {
      if (!s.alive) continue;
      const dx = s.x - px;
      const dz = s.z - pz;
      const dy = s.y - (py + 0.9);
      if (dx * dx + dz * dz > 1.9 * 1.9) continue;
      if (Math.abs(dy) > 2.1) continue;
      s.alive = false;
      this.root.remove(s.group);
      picked.push({ x: s.x, y: s.y, z: s.z });
    }
    return picked;
  }

  /** Distance to the closest uncollected star, for the HUD hint. */
  nearest(px: number, py: number, pz: number): { dist: number; dx: number; dz: number } | null {
    let best: Star | null = null;
    let bestD = Infinity;
    for (const s of this.stars) {
      if (!s.alive) continue;
      const d = (s.x - px) ** 2 + (s.z - pz) ** 2 + (s.y - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) return null;
    return {
      dist: Math.sqrt(bestD),
      dx: best.x - px,
      dz: best.z - pz,
    };
  }

  update(dt: number, elapsed: number): void {
    for (const s of this.stars) {
      if (!s.alive) continue;
      s.group.rotation.y += dt * 1.6;
      s.group.position.y = s.y + Math.sin(elapsed * 2 + s.phase) * 0.16;
      const pulse = 5.2 + Math.sin(elapsed * 3 + s.phase) * 0.7;
      s.group.children[1].scale.setScalar(pulse);
    }
  }

  clear(): void {
    for (const s of this.stars) this.root.remove(s.group);
    this.stars = [];
  }
}
