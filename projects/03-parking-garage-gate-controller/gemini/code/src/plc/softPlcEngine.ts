import { usePlcStore, PlcOutputs } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;
  private scanIntervalMs: number = 50;

  private entryGatePos: number = 0; // 0 = closed, 100 = open
  private exitGatePos: number = 0;  // 0 = closed, 100 = open

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

    // 1. ENTRY GATE LOGIC
    // Open when car is at entry loop AND ticket is taken
    const entryGateMotorOpen = inputs.entryLoop && inputs.ticketTaken;
    // Close when car clears entry loop AND gate is not closed
    const entryGateMotorClose = !inputs.entryLoop && this.entryGatePos > 0 && !inputs.safetyPhotocell;

    if (entryGateMotorOpen && this.entryGatePos < 100) {
      this.entryGatePos = Math.min(100, this.entryGatePos + 10);
    } else if (entryGateMotorClose && this.entryGatePos > 0) {
      this.entryGatePos = Math.max(0, this.entryGatePos - 10);
    }

    // 2. EXIT GATE LOGIC
    // Open when car is at exit loop
    const exitGateMotorOpen = inputs.exitLoop;
    // Close when car clears exit loop AND gate is not closed
    const exitGateMotorClose = !inputs.exitLoop && this.exitGatePos > 0 && !inputs.safetyPhotocell;

    if (exitGateMotorOpen && this.exitGatePos < 100) {
      this.exitGatePos = Math.min(100, this.exitGatePos + 10);
    } else if (exitGateMotorClose && this.exitGatePos > 0) {
      this.exitGatePos = Math.max(0, this.exitGatePos - 10);
    }

    // Update store gate positions
    store.setGatePositions(this.entryGatePos, this.exitGatePos);

    // Limit Switches
    const entryGateOpenLS = this.entryGatePos >= 100;
    const entryGateCloseLS = this.entryGatePos <= 0;
    const exitGateOpenLS = this.exitGatePos >= 100;
    const exitGateCloseLS = this.exitGatePos <= 0;

    store.setInputs({
      entryGateOpenLS,
      entryGateCloseLS,
      exitGateOpenLS,
      exitGateCloseLS,
    });

    const outputs: PlcOutputs = {
      entryGateMotorOpen: entryGateMotorOpen && !entryGateOpenLS,
      entryGateMotorClose: entryGateMotorClose && !entryGateCloseLS,
      exitGateMotorOpen: exitGateMotorOpen && !exitGateOpenLS,
      exitGateMotorClose: exitGateMotorClose && !exitGateCloseLS,
      dispenseTicket: inputs.entryLoop && inputs.ticketButton && !inputs.ticketTaken,
      entryGreenLight: entryGateOpenLS,
      entryRedLight: !entryGateOpenLS,
      exitGreenLight: exitGateOpenLS,
      exitRedLight: !exitGateOpenLS,
      alarm: inputs.safetyPhotocell && (entryGateMotorClose || exitGateMotorClose),
    };

    store.setOutputs(outputs);
  }
}

export const plcEngine = new SoftPlcEngine();
