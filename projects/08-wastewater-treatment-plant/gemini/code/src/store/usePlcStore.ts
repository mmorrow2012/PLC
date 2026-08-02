import { create } from 'zustand';

export interface PlantState {
  influentFlow: number; // L/s
  influentLevel: number; // %
  aerationDO: number; // mg/L Dissolved Oxygen
  aerationBlowerRunning: boolean;
  clarifierSludgeLevel: number; // %
  effluentTurbidity: number; // NTU
  effluentFlow: number; // L/s
  alarmActive: boolean;
  plcMode: 'RUN' | 'STOP' | 'PAUSE';
  scanTimeMs: number;
}

interface PlcStoreActions {
  setPlcMode: (mode: 'RUN' | 'STOP' | 'PAUSE') => void;
  updateState: (partial: Partial<PlantState>) => void;
  toggleBlower: () => void;
  resetAlarms: () => void;
}

export const usePlcStore = create<PlantState & PlcStoreActions>((set) => ({
  influentFlow: 45.2,
  influentLevel: 62.5,
  aerationDO: 2.1,
  aerationBlowerRunning: true,
  clarifierSludgeLevel: 28.4,
  effluentTurbidity: 1.8,
  effluentFlow: 44.8,
  alarmActive: false,
  plcMode: 'RUN',
  scanTimeMs: 10,

  setPlcMode: (mode) => set({ plcMode: mode }),
  updateState: (partial) => set((state) => ({ ...state, ...partial })),
  toggleBlower: () => set((state) => ({ aerationBlowerRunning: !state.aerationBlowerRunning })),
  resetAlarms: () => set({ alarmActive: false }),
}));