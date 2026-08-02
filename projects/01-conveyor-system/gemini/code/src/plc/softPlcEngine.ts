export class SoftPlcEngine {
  private intervalId: number | null = null;
  private cycleTimeMs: number;

  constructor(cycleTimeMs: number = 50) {
    this.cycleTimeMs = cycleTimeMs;
  }

  public start(scanCallback: () => void): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(scanCallback, this.cycleTimeMs);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}
