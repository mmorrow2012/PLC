import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

export interface PlcStoreState {
  conveyorRunning: boolean
  cycleTimeMs: number
  crateCount: number
  motorSpeedRpm: number
  tags: Record<string, PlcTagValue>
  setConveyorRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  conveyorRunning: false,
  cycleTimeMs: 50,
  crateCount: 0,
  motorSpeedRpm: 0,
  tags: {
    systemReady: true,
    conveyorRunning: false,
    crateSensorActive: false,
  },
  setConveyorRunning: (running) =>
    set((state) => ({
      conveyorRunning: running,
      tags: {
        ...state.tags,
        conveyorRunning: running,
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
