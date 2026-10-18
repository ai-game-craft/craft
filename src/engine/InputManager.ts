export class InputManager {
  keys = new Set<string>();
  mouseLocked = false;
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  mouseLeft = false;
  mouseRight = false;
  mouseLeftPressed = false;
  mouseRightPressed = false;
  readonly mobile: boolean;
  mobileActive = false;
  /** Accumulated wheel notches, consumed by the hotbar. */
  private wheel = 0;

  private canvas: HTMLCanvasElement;
  private prevMouseLeft = false;
  private prevMouseRight = false;
  private pressedThisFrame = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mobile =
      'ontouchstart' in window &&
      (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900);

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressedThisFrame.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseLeft = false;
      this.mouseRight = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.mouseLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.mouseLocked) return;
      if (e.button === 0) this.mouseLeft = true;
      if (e.button === 2) this.mouseRight = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.mouseLocked) return;
        this.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === this.canvas;
      if (!this.mouseLocked) {
        this.mouseLeft = false;
        this.mouseRight = false;
      }
    });
  }

  requestPointerLock(): void {
    if (this.mobile || this.mouseLocked) return;
    try {
      const result = this.canvas.requestPointerLock() as unknown;
      // Chrome returns a promise here and rejects if called too soon after Esc.
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => undefined);
      }
    } catch {
      /* Some embedded browsers refuse pointer lock entirely. */
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Desktop needs pointer lock; mobile uses touch controls */
  isGameActive(): boolean {
    return this.mobile ? this.mobileActive : this.mouseLocked;
  }

  setMobileActive(active: boolean): void {
    this.mobileActive = active;
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True only on the frame the key went down. */
  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** Call once per frame after processing */
  endFrame(): void {
    this.mouseLeftPressed = this.mouseLeft && !this.prevMouseLeft;
    this.mouseRightPressed = this.mouseRight && !this.prevMouseRight;
    this.prevMouseLeft = this.mouseLeft;
    this.prevMouseRight = this.mouseRight;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.pressedThisFrame.clear();
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }
}
