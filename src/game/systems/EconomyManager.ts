import { store } from './SaveManager';

/** Wall-clock economy: deliberately independent from rendering, menus and the 3D loop. */
export class EconomyManager {
  private last = Date.now();
  private lastPaint = 0;
  private lastSave = Date.now();
  private timer: ReturnType<typeof setInterval>;

  constructor() {
    this.timer = setInterval(() => this.tick(),100);
    const persist = () => store.save();
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',() => { if (document.hidden) { persist(); this.last = Date.now(); } });
  }

  private tick() {
    const now = Date.now();
    const elapsed = Math.max(0,(now-this.last)/1000);
    this.last = now;
    if (elapsed <= 0) return;
    // A throttled background tab still earns; extreme clock changes are bounded.
    const creditedTime = Math.min(elapsed,8*3600);
    store.addCredits(store.income*creditedTime);
    if (now-this.lastPaint >= 200) { store.notify(); this.lastPaint = now; }
    if (now-this.lastSave >= 5000) { store.save(); this.lastSave = now; }
  }
  dispose() { clearInterval(this.timer); }
}

export const economy = new EconomyManager();
