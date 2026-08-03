import { usePlcStore, type ReactorStage } from '../store/usePlcStore';

export interface PlcScanSnapshot {
  readonly stage: ReactorStage;
  readonly batchLevel: number;
  readonly temperatureC: number;
}

const STAGE_SEQUENCE: ReactorStage[] = ['IDLE', 'CHARGE', 'REACT', 'DRAIN'];
const DEFAULT_SCAN_INTERVAL_MS = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nextStage = (stage: ReactorStage): ReactorStage => {
  const currentIndex = STAGE_SEQUENCE.indexOf(stage);
  return STAGE_SEQUENCE[(currentIndex + 1) % STAGE_SEQUENCE.length] ?? 'IDLE';
};

class SoftPlcEngine {
  private timer: number | null = null;

  start(intervalMs = DEFAULT_SCAN_INTERVAL_MS) {
    if (this.timer !== null || typeof window === 'undefined') {
      return;
    }

    this.timer = window.setInterval(() => {
      const { isRunning, stage, batchLevel, temperatureC, applyScan } = usePlcStore.getState();
      if (!isRunning) {
        return;
      }

      const levelDelta = stage === 'DRAIN' ? -4 : 3;
      const temperatureDelta = stage === 'REACT' ? 1.5 : -0.4;
      const nextLevel = clamp(batchLevel + levelDelta, 0, 100);
      const nextTemperature = clamp(Number((temperatureC + temperatureDelta).toFixed(1)), 20, 95);
      const shouldAdvanceStage =
        (stage === 'CHARGE' && nextLevel >= 100) ||
        (stage === 'REACT' && nextTemperature >= 80) ||
        (stage === 'DRAIN' && nextLevel <= 0);

      applyScan({
        batchLevel: nextLevel,
        temperatureC: nextTemperature,
        stage: shouldAdvanceStage ? nextStage(stage) : stage,
      });
    }, intervalMs);
  }

  stop() {
    if (this.timer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  snapshot(): PlcScanSnapshot {
    const { stage, batchLevel, temperatureC } = usePlcStore.getState();
    return { stage, batchLevel, temperatureC };
  }
}

export const softPlcEngine = new SoftPlcEngine();
