import { create } from 'zustand';

export interface PlcInputs {
  entryLoop: boolean;
  ticketButton: boolean;
  ticketTaken: boolean;
  entryGateOpenLS: boolean;
  entryGateCloseLS: boolean;
  exitGateOpenLS: boolean;
  exitGateCloseLS: boolean;
  safetyPhotocell: boolean;
  exitLoop: boolean;
}

export interface PlcOutputs {
  entryGateMotorOpen: boolean;
  entryGateMotorClose: boolean;
  exitGateMotorOpen: boolean;
  exitGateMotorClose: boolean;
  dispenseTicket: boolean;
  entryGreenLight: boolean;
  entryRedLight: boolean;
  exitGreenLight: boolean;
  exitRedLight: boolean;
  alarm: boolean;
}

export interface PlcState {
  inputs: PlcInputs;
  outputs: PlcOutputs;
  isAutoMode: boolean;
  scanTimeMs: number;
  availableSpots: number;
  totalCapacity: number;

  entryGatePos: number; // 0 = closed, 100 = open
  exitGatePos: number; // 0 = closed, 100 = open

  carProgress: number; // 0 to 100
  carDirection: 'entry' | 'exit' | null;
  isSimulating: boolean;

  setInputs: (inputs: Partial<PlcInputs>) => void;
  setOutputs: (outputs: Partial<PlcOutputs>) => void;
  toggleAutoMode: () => void;
  setAvailableSpots: (spots: number) => void;
  setGatePositions: (entryPos: number, exitPos: number) => void;
  setSimulating: (simulating: boolean) => void;
  runCarSequence: (type: 'entry' | 'exit') => void;
}

export const usePlcStore = create<PlcState>((set, get) => ({
  inputs: {
    entryLoop: false,
    ticketButton: false,
    ticketTaken: false,
    entryGateOpenLS: false,
    entryGateCloseLS: true,
    exitGateOpenLS: false,
    exitGateCloseLS: true,
    safetyPhotocell: false,
    exitLoop: false,
  },
  outputs: {
    entryGateMotorOpen: false,
    entryGateMotorClose: false,
    exitGateMotorOpen: false,
    exitGateMotorClose: false,
    dispenseTicket: false,
    entryGreenLight: false,
    entryRedLight: true,
    exitGreenLight: false,
    exitRedLight: true,
    alarm: false,
  },
  isAutoMode: true,
  scanTimeMs: 10,
  availableSpots: 48,
  totalCapacity: 50,

  entryGatePos: 0,
  exitGatePos: 0,
  carProgress: 0,
  carDirection: null,
  isSimulating: false,

  setInputs: (newInputs) =>
    set((state) => ({ inputs: { ...state.inputs, ...newInputs } })),
  setOutputs: (newOutputs) =>
    set((state) => ({ outputs: { ...state.outputs, ...newOutputs } })),
  toggleAutoMode: () => set((state) => ({ isAutoMode: !state.isAutoMode })),
  setAvailableSpots: (availableSpots) => set({ availableSpots }),
  setGatePositions: (entryGatePos, exitGatePos) => set({ entryGatePos, exitGatePos }),
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
        // ENTRY SEQUENCE (Cyan Car: Left -> Right into garage)
        // 1. Car approaches Entry Loop
        if (step <= 15) {
          set({ carProgress: (step / 15) * 25 }); // Move car to x=25% (at kiosk & entry loop)
          if (step === 12) {
            set((s) => ({ inputs: { ...s.inputs, entryLoop: true } }));
          }
        }
        // 2. Car at ticket machine, requests and takes ticket
        else if (step <= 30) {
          set({ carProgress: 25 }); // Stationed at kiosk
          if (step === 18) {
            set((s) => ({ inputs: { ...s.inputs, ticketButton: true } }));
          }
          if (step === 25) {
            set((s) => ({ inputs: { ...s.inputs, ticketTaken: true, ticketButton: false } }));
          }
        }
        // 3. Wait for Entry Gate to fully raise to OPEN (entryGateOpenLS = true)
        else if (step <= 65) {
          if (current.inputs.entryGateOpenLS) {
            // Car drives through under entry barrier into garage
            set({ carProgress: 25 + ((step - 30) / 35) * 60 });
          } else {
            set({ carProgress: 25 }); // Waiting for arm to open
          }
        }
        // 4. Car clears entry area into garage
        else if (step <= 90) {
          set({ carProgress: Math.min(100, 85 + ((step - 65) / 25) * 15) });
          if (step === 70) {
            // Car has passed the barrier, clear entry loop and ticket state so gate closes
            set((s) => ({
              inputs: { ...s.inputs, entryLoop: false, ticketTaken: false },
              availableSpots: Math.max(0, s.availableSpots - 1),
            }));
          }
        }

        // Wait until Entry Gate has fully closed back to CLOSED (entryGateCloseLS = true)
        if (step >= 95 && current.inputs.entryGateCloseLS) {
          clearInterval(interval);
          set({ isSimulating: false, carDirection: null, carProgress: 0 });
        }
      } else {
        // EXIT SEQUENCE (Orange Car: Right -> Left out to street)
        // 1. Car approaches Exit Loop from inside garage
        if (step <= 15) {
          set({ carProgress: (step / 15) * 25 }); // Move car to exit loop at 25% (right side of exit lane)
          if (step === 12) {
            set((s) => ({ inputs: { ...s.inputs, exitLoop: true } }));
          }
        }
        // 2. Wait for Exit Gate to fully raise to OPEN (exitGateOpenLS = true)
        else if (step <= 55) {
          if (current.inputs.exitGateOpenLS) {
            // Car drives out under exit barrier to street
            set({ carProgress: 25 + ((step - 15) / 40) * 60 });
          } else {
            set({ carProgress: 25 }); // Waiting for arm to open
          }
        }
        // 3. Car clears exit area out into street
        else if (step <= 80) {
          set({ carProgress: Math.min(100, 85 + ((step - 55) / 25) * 15) });
          if (step === 62) {
            // Car has passed the barrier out into street, clear exit loop so gate closes
            set((s) => ({
              inputs: { ...s.inputs, exitLoop: false },
              availableSpots: Math.min(s.totalCapacity, s.availableSpots + 1),
            }));
          }
        }

        // Wait until Exit Gate has fully closed back to CLOSED (exitGateCloseLS = true)
        if (step >= 85 && current.inputs.exitGateCloseLS) {
          clearInterval(interval);
          set({ isSimulating: false, carDirection: null, carProgress: 0 });
        }
      }
    }, 100);
  },
}));
