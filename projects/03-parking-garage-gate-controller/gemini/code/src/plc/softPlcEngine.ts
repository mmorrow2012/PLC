import { usePlcStore, PlcInputs, PlcOutputs } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;
  private scanIntervalMs: number = 50;

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
    const state = usePlcStore.getState();
    if (!state.isAutoMode) return;

    const inputs = state.inputs;
    const outputs = this.evaluateLogic(inputs);

    state.setOutputs(outputs);
  }

  private evaluateLogic(inputs: PlcInputs): PlcOutputs {
    const gateMotorOpen = inputs.entryLoop && (inputs.ticketTaken || inputs.ticketButton);
    const gateMotorClose = !inputs.entryLoop && !inputs.exitLoop && !inputs.gateCloseLS && !inputs.safetyPhotocell;

    return {
      gateMotorOpen,
      gateMotorClose,
      dispenseTicket: inputs.entryLoop && inputs.ticketButton,
      greenLight: inputs.gateOpenLS,
      redLight: !inputs.gateOpenLS,
      alarm: inputs.safetyPhotocell && inputs.gateMotorClose,
    };
  }
}

export const plcEngine = new SoftPlcEngine();
