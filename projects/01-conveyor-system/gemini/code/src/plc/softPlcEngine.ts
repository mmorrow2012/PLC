import { usePlcStore } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;

  public start(): void {
    if (this.timerId !== null) return;
    
    const tick = () => {
      this.executeScanCycle();
      const state = usePlcStore.getState();
      if (state.isRunning) {
        this.timerId = window.setTimeout(tick, state.scanTimeMs);
      } else {
        this.timerId = null;
      }
    };

    tick();
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public executeScanCycle(): void {
    const { inputs, updateOutputs } = usePlcStore.getState();

    // Basic SoftPLC engine simulation
    const estopFault = !inputs.estop;
    const motorRun = !estopFault && inputs.startPB && inputs.stopPB;
    const alarmLight = estopFault;
    const runningLight = motorRun;

    updateOutputs({
      motorRun,
      alarmLight,
      runningLight,
    });
  }
}

export const plcEngine = new SoftPlcEngine();
