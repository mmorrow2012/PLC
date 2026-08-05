import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

export interface TankLevels {
  tank1: number
  tank2: number
  tank3: number
}

export interface PlcStoreState {
  systemRunning: boolean
  cycleTimeMs: number
  levels: TankLevels
  pump1Running: boolean
  valve12Open: boolean
  valve23Open: boolean
  tags: Record<string, PlcTagValue>
  setSystemRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  systemRunning: false,
  cycleTimeMs: 50,
  levels: {
    tank1: 0,
    tank2: 0,
    tank3: 0,
  },
  pump1Running: false,
  valve12Open: false,
  valve23Open: false,
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
