import * as THREE from 'three';
import { CONFIG } from '../config';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function glowTexture(inner: string, outer: string, size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.22, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const DAY_SKY = new THREE.Color('#87ceeb');
const NIGHT_SKY = new THREE.Color('#0a1024');
const DUSK_SKY = new THREE.Color('#ff8a4c');
const DAY_SUN = new THREE.Color('#fff6e0');
const DUSK_SUN = new THREE.Color('#ffb070');
const NIGHT_AMBIENT = new THREE.Color('#6b7db3');
const DAY_AMBIENT = new THREE.Color('#ffffff');

/** Day/night cycle: sun, moon, stars, drifting clouds, fog and light colours. */
export class Sky {
  readonly sunLight: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  time: number;
  private sunDir = new THREE.Vector3(0, 1, 0);
  private sunSprite: THREE.Sprite;
  private moonSprite: THREE.Sprite;
  private stars: THREE.Points;
  private starMat: THREE.PointsMaterial;
  private clouds: THREE.Mesh[] = [];
  private cloudMat: THREE.MeshBasicMaterial;
  private skyColor = new THREE.Color();
  private tmp = new THREE.Color();

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
  ) {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambient);

    this.sunLight = new THREE.DirectionalLight(0xfff6e0, 0.6);
    this.sunLight.position.set(60, 120, 40);
    this.scene.add(this.sunLight);

    const sunMat = new THREE.SpriteMaterial({
      map: glowTexture('#fffbe8', 'rgba(255,196,92,0.55)'),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.sunSprite = new THREE.Sprite(sunMat);
    this.sunSprite.scale.setScalar(120);
    this.scene.add(this.sunSprite);

    const moonMat = new THREE.SpriteMaterial({
      map: glowTexture('#dfe9ff', 'rgba(150,180,255,0.35)'),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    this.moonSprite = new THREE.Sprite(moonMat);
    this.moonSprite.scale.setScalar(70);
    this.scene.add(this.moonSprite);

    // Stars
    const starCount = 500;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize().multiplyScalar(170);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // Clouds
    this.cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      fog: false,
    });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(cloudGeo, this.cloudMat);
      const w = 12 + Math.random() * 26;
      c.scale.set(w, 1.6 + Math.random() * 1.6, w * (0.5 + Math.random() * 0.7));
      c.position.set(
        (Math.random() - 0.5) * 260,
        92 + Math.random() * 16,
        (Math.random() - 0.5) * 260,
      );
      c.userData.speed = 0.6 + Math.random() * 1.4;
      c.frustumCulled = false;
      this.scene.add(c);
      this.clouds.push(c);
    }

    this.time = CONFIG.day.startHour;
  }

  get daylight(): number {
    return smoothstep(-0.22, 0.28, this.sunDir.y);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time = (this.time + (24 / CONFIG.day.lengthSeconds) * dt) % 24;

    // 6:00 -> east horizon, 12:00 -> overhead, 18:00 -> west horizon
    const a = ((this.time - 6) / 24) * Math.PI * 2;
    this.sunDir.set(Math.cos(a), Math.sin(a), Math.sin(a) * 0.35).normalize();

    const day = this.daylight;
    const horizon = Math.max(0, 1 - Math.abs(this.sunDir.y) / 0.4);

    this.skyColor.copy(NIGHT_SKY).lerp(DAY_SKY, day);
    if (day > 0.02) {
      this.tmp.copy(DUSK_SKY);
      this.skyColor.lerp(this.tmp, horizon * 0.55 * day);
    }
    this.renderer.setClearColor(this.skyColor);
    if (this.scene.fog) this.scene.fog.color.copy(this.skyColor);

    this.ambient.intensity = 0.3 + 0.24 * day;
    this.ambient.color.copy(NIGHT_AMBIENT).lerp(DAY_AMBIENT, day);

    // Sun by day, a faint blue moon by night. Ambient + key light stays near 1.0
    // so nothing blows out to white at noon.
    if (day > 0.01) {
      this.sunLight.intensity = 0.52 * day;
      this.tmp.copy(DUSK_SUN).lerp(DAY_SUN, smoothstep(0.05, 0.6, this.sunDir.y));
      this.sunLight.position.copy(this.sunDir).multiplyScalar(120);
    } else {
      this.sunLight.intensity = 0.16 * (1 - day);
      this.tmp.setHex(0x8fa8ff);
      this.sunLight.position.copy(this.sunDir).multiplyScalar(-120);
    }
    this.sunLight.color.copy(this.tmp);

    const camPos = camera.position;
    this.sunSprite.position.copy(camPos).addScaledVector(this.sunDir, 160);
    this.moonSprite.position.copy(camPos).addScaledVector(this.sunDir, -160);
    (this.sunSprite.material as THREE.SpriteMaterial).opacity = smoothstep(-0.1, 0.12, this.sunDir.y);
    (this.moonSprite.material as THREE.SpriteMaterial).opacity = smoothstep(0.1, -0.12, this.sunDir.y);

    this.starMat.opacity = 1 - smoothstep(-0.05, 0.28, this.sunDir.y);
    this.stars.position.copy(camPos);

    this.cloudMat.color.setScalar(0.25 + 0.75 * day);
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      const dx = c.position.x - camPos.x;
      const dz = c.position.z - camPos.z;
      if (dx > 150) c.position.x -= 300;
      else if (dx < -150) c.position.x += 300;
      if (dz > 150) c.position.z -= 300;
      else if (dz < -150) c.position.z += 300;
    }
  }
}
