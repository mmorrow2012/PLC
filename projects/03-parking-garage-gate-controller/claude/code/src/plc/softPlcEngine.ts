export interface PlcScanResult {
  timestamp: number
  cycleTimeMs: number
}

export type PlcScanCallback = (result: PlcScanResult) => void

export class SoftPlcEngine {
  private intervalId: number | null = null

  public constructor(private readonly cycleTimeMs = 50) {}

  public start(onScan: PlcScanCallback): void {
    if (this.intervalId !== null) {
      return
    }

    this.intervalId = window.setInterval(() => {
      onScan({
        timestamp: Date.now(),
        cycleTimeMs: this.cycleTimeMs,
      })
    }, this.cycleTimeMs)
  }

  public stop(): void {
    if (this.intervalId === null) {
      return
    }

    window.clearInterval(this.intervalId)
    this.intervalId = null
  }

  public isRunning(): boolean {
    return this.intervalId !== null
  }
}
