import * as THREE from 'three';

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      // Needed so photo mode can grab the frame as a PNG.
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x87ceeb);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 65, 125);

    this.camera = new THREE.PerspectiveCamera(76, w / h, 0.08, 420);
    this.camera.rotation.order = 'YXZ';

    window.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    window.visualViewport?.addEventListener('scroll', () => this.onResize());
  }

  private onResize(): void {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
