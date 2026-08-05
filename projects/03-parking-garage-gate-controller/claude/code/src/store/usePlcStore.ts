import { create } from 'zustand'

export type PlcTagValue = boolean | number | string

export interface GateStatus {
  entryGateOpen: boolean
  exitGateOpen: boolean
}

export interface PlcStoreState {
  systemRunning: boolean
  cycleTimeMs: number
  gates: GateStatus
  vehiclePresentEntry: boolean
  vehiclePresentExit: boolean
  occupancy: number
  capacity: number
  tags: Record<string, PlcTagValue>
  setSystemRunning: (running: boolean) => void
  setTag: (tagName: string, value: PlcTagValue) => void
}

export const usePlcStore = create<PlcStoreState>((set) => ({
  systemRunning: false,
  cycleTimeMs: 50,
  gates: {
    entryGateOpen: false,
    exitGateOpen: false,
  },
  vehiclePresentEntry: false,
  vehiclePresentExit: false,
  occupancy: 0,
  capacity: 120,
  tags: {
    systemReady: true,
    systemRunning: false,
    lotFullAlarm: false,
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
