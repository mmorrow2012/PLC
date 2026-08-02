import { create } from 'zustand';

export interface PlcInputs {
  entryLoop: boolean;
  ticketButton: boolean;
  ticketTaken: boolean;
  gateOpenLS: boolean;
  gateCloseLS: boolean;
  safetyPhotocell: boolean;
  exitLoop: boolean;
}

export interface PlcOutputs {
  gateMotorOpen: boolean;
  gateMotorClose: boolean;
  dispenseTicket: boolean;
  greenLight: boolean;
  redLight: boolean;
  alarm: boolean;
}

export interface PlcState {
  inputs: PlcInputs;
  outputs: PlcOutputs;
  isAutoMode: boolean;
  scanTimeMs: number;
  availableSpots: number;
  totalCapacity: number;
  setInputs: (inputs: Partial<PlcInputs>) => void;
  setOutputs: (outputs: Partial<PlcOutputs>) => void;
  toggleAutoMode: () => void;
  setAvailableSpots: (spots: number) => void;
}

export const usePlcStore = create<PlcState>((set) => ({
  inputs: {
    entryLoop: false,
    ticketButton: false,
    ticketTaken: false,
    gateOpenLS: false,
    gateCloseLS: true,
    safetyPhotocell: false,
    exitLoop: false,
  },
  outputs: {
    gateMotorOpen: false,
    gateMotorClose: false,
    dispenseTicket: false,
    greenLight: false,
    redLight: true,
    alarm: false,
  },
  isAutoMode: true,
  scanTimeMs: 10,
  availableSpots: 50,
  totalCapacity: 50,
  setInputs: (newInputs) =>
    set((state) => ({ inputs: { ...state.inputs, ...newInputs } })),
  setOutputs: (newOutputs) =>
    set((state) => ({ outputs: { ...state.outputs, ...newOutputs } })),
  toggleAutoMode: () => set((state) => ({ isAutoMode: !state.isAutoMode })),
  setAvailableSpots: (availableSpots) => set({ availableSpots }),
}));
