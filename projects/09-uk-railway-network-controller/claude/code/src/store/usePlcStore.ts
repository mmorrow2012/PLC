import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

export type SignalAspect = 'red' | 'yellow' | 'double-yellow' | 'green'

export interface SignalStatus {
  aspect: SignalAspect
}

export interface PointStatus {
  normal: boolean
  locked: boolean
}

export interface PlcStoreState {
  systemRunning: boolean
  cycleTimeMs: number
  signals: Record<string, SignalStatus>
  points: Record<string, PointStatus>
  blockOccupied: Record<string, boolean>
  tags: Record<string, PlcTagValue>
  setSystemRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  systemRunning: false,
  cycleTimeMs: 50,
  signals: {
    'signal-1': { aspect: 'red' },
    'signal-2': { aspect: 'red' },
  },
  points: {
    'point-1': { normal: true, locked: false },
  },
  blockOccupied: {
    'block-1': false,
    'block-2': false,
  },
  tags: {
    systemReady: true,
    systemRunning: false,
    emergencyStop: false,
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
