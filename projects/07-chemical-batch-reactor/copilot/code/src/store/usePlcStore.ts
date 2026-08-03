import { create } from 'zustand';

export type ReactorStage = 'IDLE' | 'CHARGE' | 'REACT' | 'DRAIN';

export interface PlcState {
  readonly isRunning: boolean;
  readonly stage: ReactorStage;
  readonly batchLevel: number;
  readonly temperatureC: number;
  setRunning: (running: boolean) => void;
  setStage: (stage: ReactorStage) => void;
  applyScan: (update: Partial<Pick<PlcState, 'batchLevel' | 'temperatureC' | 'stage'>>) => void;
}

export const usePlcStore = create<PlcState>((set) => ({
  isRunning: false,
  stage: 'IDLE',
  batchLevel: 0,
  temperatureC: 24,
  setRunning: (running) => set({ isRunning: running }),
  setStage: (stage) => set({ stage }),
  applyScan: (update) => set((state) => ({ ...state, ...update })),
}));
