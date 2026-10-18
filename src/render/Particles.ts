import * as THREE from 'three';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  color: THREE.Color;
  hidden: boolean;
}

/** Chunky voxel debris — cheap instanced cubes that fade by shrinking. */
export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private items: Particle[] = [];
  private dummy = new THREE.Object3D();
  private tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene, private capacity = 420) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;

    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.tmpColor.setHex(0xffffff));
      this.items.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        life: 0, max: 1, size: 0.1, color: new THREE.Color(), hidden: false,
      });
    }
    scene.add(this.mesh);
  }

  spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    power = 5,
    size = 0.16,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.items[this.nextIndex()];
      const a = Math.random() * Math.PI * 2;
      const r = Math.random();
      p.x = x + (Math.random() - 0.5) * 0.7;
      p.y = y + (Math.random() - 0.5) * 0.7;
      p.z = z + (Math.random() - 0.5) * 0.7;
      p.vx = Math.cos(a) * r * power;
      p.vy = Math.random() * power * 0.9 + 1;
      p.vz = Math.sin(a) * r * power;
      p.life = 0.55 + Math.random() * 0.5;
      p.max = p.life;
      p.size = size * (0.6 + Math.random() * 0.9);
      this.tmpColor.setHex(colorHex);
      const shade = 0.75 + Math.random() * 0.45;
      p.color.copy(this.tmpColor).multiplyScalar(shade);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  private cursor = 0;
  private nextIndex(): number {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    return i;
  }

  update(dt: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (p.life <= 0) {
        if (!p.hidden) {
          p.hidden = true;
          this.dummy.scale.setScalar(0);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        continue;
      }

      p.hidden = false;
      p.life -= dt;
      p.vy -= 26 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const t = Math.max(0, p.life / p.max);
      const s = p.life > 0 ? p.size * (0.35 + t * 0.65) : 0;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.x * 2, p.y * 2, p.z * 2);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
