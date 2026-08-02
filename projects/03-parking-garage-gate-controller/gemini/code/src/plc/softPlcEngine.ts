import { usePlcStore, PlcOutputs } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;
  private scanIntervalMs: number = 50;
  private gatePosition: number = 0; // 0 = fully closed, 100 = fully open

  public start(): void {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => {
      this.scan();
    }, this.scanIntervalMs);
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private scan(): void {
    const store = usePlcStore.getState();
    const inputs = store.inputs;

    if (!store.isAutoMode) return;

    // Gate motor logic rules
    const gateMotorOpen = (inputs.entryLoop && inputs.ticketTaken) || (inputs.exitLoop && !inputs.safetyPhotocell);
    const gateMotorClose = !inputs.entryLoop && !inputs.exitLoop && !inputs.gateCloseLS && !inputs.safetyPhotocell;

    // Simulate mechanical gate position movement (0% = closed, 100% = open)
    if (gateMotorOpen && this.gatePosition < 100) {
      this.gatePosition = Math.min(100, this.gatePosition + 10);
    } else if (gateMotorClose && this.gatePosition > 0 && !inputs.safetyPhotocell) {
      this.gatePosition = Math.max(0, this.gatePosition - 10);
    }

    store.setGatePosition(this.gatePosition);

    const gateOpenLS = this.gatePosition >= 100;
    const gateCloseLS = this.gatePosition <= 0;

    // Update state limit switches
    store.setInputs({
      gateOpenLS,
      gateCloseLS,
    });

    const outputs: PlcOutputs = {
      gateMotorOpen: gateMotorOpen && !gateOpenLS,
      gateMotorClose: gateMotorClose && !gateCloseLS,
      dispenseTicket: inputs.entryLoop && inputs.ticketButton && !inputs.ticketTaken,
      greenLight: gateOpenLS,
      redLight: !gateOpenLS,
      alarm: inputs.safetyPhotocell && (gateMotorClose || this.gatePosition > 0),
    };

    store.setOutputs(outputs);
  }
}

export const plcEngine = new SoftPlcEngine();
