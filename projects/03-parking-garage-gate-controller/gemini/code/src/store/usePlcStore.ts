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
  gatePosition: number; // 0 = closed, 100 = open
  carProgress: number; // 0 to 100 position along driveway
  carDirection: 'entry' | 'exit' | null;
  isSimulating: boolean;

  setInputs: (inputs: Partial<PlcInputs>) => void;
  setOutputs: (outputs: Partial<PlcOutputs>) => void;
  toggleAutoMode: () => void;
  setAvailableSpots: (spots: number) => void;
  setGatePosition: (pos: number) => void;
  setSimulating: (simulating: boolean) => void;
  runCarSequence: (type: 'entry' | 'exit') => void;
}

export const usePlcStore = create<PlcState>((set, get) => ({
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
  availableSpots: 48,
  totalCapacity: 50,
  gatePosition: 0,
  carProgress: 0,
  carDirection: null,
  isSimulating: false,

  setInputs: (newInputs) =>
    set((state) => ({ inputs: { ...state.inputs, ...newInputs } })),
  setOutputs: (newOutputs) =>
    set((state) => ({ outputs: { ...state.outputs, ...newOutputs } })),
  toggleAutoMode: () => set((state) => ({ isAutoMode: !state.isAutoMode })),
  setAvailableSpots: (availableSpots) => set({ availableSpots }),
  setGatePosition: (gatePosition) => set({ gatePosition }),
  setSimulating: (isSimulating) => set({ isSimulating }),

  runCarSequence: (type) => {
    const store = get();
    if (store.isSimulating) return;

    set({ isSimulating: true, carDirection: type, carProgress: 0 });

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const current = get();

      if (type === 'entry') {
        // Step 0 - 20: Car approaches Entry Loop
        if (step <= 20) {
          set({ carProgress: step * 1.5 });
          if (step === 15) {
            set((s) => ({ inputs: { ...s.inputs, entryLoop: true } }));
          }
        }
        // Step 21 - 35: Car at kiosk, presses ticket button
        else if (step <= 35) {
          if (step === 22) {
            set((s) => ({ inputs: { ...s.inputs, ticketButton: true } }));
          }
          if (step === 30) {
            set((s) => ({ inputs: { ...s.inputs, ticketTaken: true, ticketButton: false } }));
          }
        }
        // Step 36 - 70: Gate opens, car passes under gate onto exit loop
        else if (step <= 70) {
          if (current.inputs.gateOpenLS) {
            set({ carProgress: 30 + (step - 35) * 1.8 });
            if (step === 50) {
              set((s) => ({ inputs: { ...s.inputs, entryLoop: false, exitLoop: true } }));
            }
          }
        }
        // Step 71 - 100: Car leaves exit loop into garage, gate closes
        else if (step <= 100) {
          set({ carProgress: Math.min(100, 30 + (step - 35) * 1.8) });
          if (step === 80) {
            set((s) => ({
              inputs: { ...s.inputs, exitLoop: false, ticketTaken: false },
              availableSpots: Math.max(0, s.availableSpots - 1),
            }));
          }
        }

        if (step >= 110 && current.inputs.gateCloseLS) {
          clearInterval(interval);
          set({ isSimulating: false, carDirection: null, carProgress: 0 });
        }
      } else {
        // Exit Sequence
        if (step <= 25) {
          set({ carProgress: 100 - step * 1.6 });
          if (step === 10) {
            set((s) => ({ inputs: { ...s.inputs, exitLoop: true } }));
          }
        } else if (step <= 70) {
          if (current.inputs.gateOpenLS) {
            set({ carProgress: Math.max(0, 60 - (step - 25) * 1.6) });
            if (step === 50) {
              set((s) => ({ inputs: { ...s.inputs, exitLoop: false } }));
            }
          }
        } else if (step <= 95) {
          set({ carProgress: 0 });
          if (step === 80) {
            set((s) => ({
              availableSpots: Math.min(s.totalCapacity, s.availableSpots + 1),
            }));
          }
        }

        if (step >= 105 && current.inputs.gateCloseLS) {
          clearInterval(interval);
          set({ isSimulating: false, carDirection: null, carProgress: 0 });
        }
      }
    }, 100);
  },
}));
