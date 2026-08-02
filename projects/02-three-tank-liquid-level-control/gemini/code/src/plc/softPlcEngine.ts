import { usePlcStore } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timer: number | null = null;

  public start(intervalMs: number = 100) {
    if (this.timer !== null) return;

    this.timer = window.setInterval(() => {
      this.scanCycle();
    }, intervalMs);

    usePlcStore.getState().setRunning(true);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    usePlcStore.getState().setRunning(false);
  }

  private scanCycle() {
    const store = usePlcStore.getState();
    store.tick();
  }
}

export const plcEngine = new SoftPlcEngine();
