/** Thin DOM layer — everything the player sees outside the 3D canvas. */

export interface HotbarItem {
  icon: string;
  label: string;
}

function need<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`UI element #${id} is missing from index.html`);
  return el as T;
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class Ui {
  readonly startScreen = need('screen-start');
  readonly pauseScreen = need('screen-pause');
  readonly helpScreen = need('screen-help');
  readonly hud = need('hud');
  readonly hotbar = need('hotbar');
  readonly scoreEl = need('score');
  readonly scoreLine = need('score-line');
  readonly timerEl = need('timer-line');
  readonly bestEl = need('best-line');
  readonly debugEl = need('debug');
  readonly toastBox = need('toasts');
  readonly seedInput = need<HTMLInputElement>('seed-input');
  readonly startNote = need('start-note');
  readonly btnPlay = need<HTMLButtonElement>('btn-play');
  readonly btnNew = need<HTMLButtonElement>('btn-new');
  readonly btnResume = need<HTMLButtonElement>('btn-resume');
  readonly btnHelp = need<HTMLButtonElement>('btn-help');
  readonly btnQuit = need<HTMLButtonElement>('btn-quit');
  readonly btnCloseHelp = need<HTMLButtonElement>('btn-close-help');
  readonly btnMenu = need<HTMLButtonElement>('btn-menu');
  readonly mobileControls = need('mobile-controls');
  readonly hintbar = need('hintbar');

  private flashEl: HTMLDivElement;
  private slots: HTMLDivElement[] = [];

  constructor() {
    this.flashEl = document.createElement('div');
    this.flashEl.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:8;background:#fff;opacity:0;transition:opacity .35s ease;';
    document.body.appendChild(this.flashEl);
  }

  // ---------- screens ----------
  private hideScreens(): void {
    this.startScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.helpScreen.classList.add('hidden');
  }

  showStart(note?: string): void {
    this.hideScreens();
    if (note !== undefined) this.startNote.textContent = note;
    this.startScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  showPause(): void {
    this.hideScreens();
    this.pauseScreen.classList.remove('hidden');
  }

  showHelp(): void {
    this.hideScreens();
    this.helpScreen.classList.remove('hidden');
  }

  showHud(mobile: boolean): void {
    this.hideScreens();
    this.hud.classList.remove('hidden');
    this.btnMenu.classList.toggle('hidden', !mobile);
    this.mobileControls.classList.toggle('hidden', !mobile);
    this.hintbar.classList.toggle('hidden', mobile);
  }

  // ---------- hotbar ----------
  buildHotbar(items: HotbarItem[], selected: number): void {
    this.hotbar.innerHTML = '';
    this.slots = items.map((item, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot' + (i === selected ? ' selected' : '');
      slot.style.backgroundImage = `url(${item.icon})`;
      slot.title = item.label;
      if (i < 9) {
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = String(i + 1);
        slot.appendChild(num);
      }
      slot.addEventListener('click', () => this.onSlotClick?.(i));
      slot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.onSlotClick?.(i);
      });
      this.hotbar.appendChild(slot);
      return slot;
    });
  }

  onSlotClick: ((index: number) => void) | null = null;

  selectSlot(index: number): void {
    this.slots.forEach((el, i) => el.classList.toggle('selected', i === index));
    const el = this.slots[index];
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  // ---------- hud numbers ----------
  setScore(collected: number, total: number, pop = false): void {
    this.scoreEl.textContent = `${collected}/${total}`;
    if (pop) {
      this.scoreLine.classList.remove('pop');
      void this.scoreLine.offsetWidth;
      this.scoreLine.classList.add('pop');
    }
  }

  setTimer(text: string): void {
    this.timerEl.textContent = text;
  }

  setBest(ms: number | null): void {
    this.bestEl.textContent = ms === null ? '' : `best ${formatTime(ms)}`;
  }

  setDebug(text: string | null): void {
    if (text === null) {
      this.debugEl.classList.add('hidden');
      return;
    }
    this.debugEl.classList.remove('hidden');
    this.debugEl.textContent = text;
  }

  // ---------- feedback ----------
  toast(text: string, kind: 'gold' | 'green' | 'boom' | '' = ''): void {
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ` ${kind}` : '');
    el.textContent = text;
    this.toastBox.appendChild(el);
    window.setTimeout(() => el.remove(), 2100);
  }

  flash(strength = 0.5): void {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.opacity = String(Math.min(0.75, strength));
    requestAnimationFrame(() => {
      this.flashEl.style.transition = 'opacity .45s ease';
      this.flashEl.style.opacity = '0';
    });
  }
}
