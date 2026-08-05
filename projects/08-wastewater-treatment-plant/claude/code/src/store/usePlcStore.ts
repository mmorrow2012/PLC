import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

export interface PumpStatus {
  influentPumpRunning: boolean
  effluentPumpRunning: boolean
}

export interface PlcStoreState {
  systemRunning: boolean
  cycleTimeMs: number
  pumps: PumpStatus
  aerationBlowerRunning: boolean
  aerationBasinLevel: number
  clarifierLevel: number
  tags: Record<string, PlcTagValue>
  setSystemRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  systemRunning: false,
  cycleTimeMs: 50,
  pumps: {
    influentPumpRunning: false,
    effluentPumpRunning: false,
  },
  aerationBlowerRunning: false,
  aerationBasinLevel: 0,
  clarifierLevel: 0,
  tags: {
    systemReady: true,
    systemRunning: false,
    highLevelAlarm: false,
  },
  setSystemRunning: (running) =>
    set((state) => ({
      systemRunning: running,
      tags: {
        ...state.tags,
        systemRunning: running,
      },
    })),
  setTag: (tagName, value) =>
    set((state) => ({
      tags: {
        ...state.tags,
        [tagName]: value,
      },
    })),
}))
