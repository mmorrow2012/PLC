import { usePlcStore } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;
  private scanIntervalMs: number = 100;

  public start(): void {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => {
      this.scanLoop();
    }, this.scanIntervalMs);
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private scanLoop(): void {
    const store = usePlcStore.getState();
    if (store.plcMode !== 'RUN') return;

    // Soft PLC execution cycle simulation logic
    const currentDO = store.aerationDO;
    let newBlowerStatus = store.aerationBlowerRunning;

    if (currentDO < 1.5) {
      newBlowerStatus = true;
    } else if (currentDO > 3.8) {
      newBlowerStatus = false;
    }

    const doDelta = newBlowerStatus ? 0.05 : -0.03;
    const updatedDO = Math.max(0, Math.min(8.0, currentDO + doDelta));

    store.updateState({
      aerationDO: parseFloat(updatedDO.toFixed(2)),
      aerationBlowerRunning: newBlowerStatus,
      scanTimeMs: Math.floor(Math.random() * 3) + 8,
    });
  }
}

export const plcEngine = new SoftPlcEngine();