import { create } from 'zustand';

export interface TrainState {
  id: string;
  name: string;
  currentStationIndex: number;
  progressBetweenStations: number; // 0.0 to 1.0
  speedKmH: number;
  targetSpeedKmH: number;
  status: 'RUNNING' | 'HOLDING' | 'BOARDING' | 'FAULT';
  direction: 1 | -1; // 1 = Northbound, -1 = Southbound
}

export interface TimetableEntry {
  trainName: string;
  origin: string;
  destination: string;
  nextStation: string;
  scheduledTime: string;
  estimatedTime: string;
  platform: string;
  status: 'ON TIME' | 'BOARDING' | 'DEPARTED' | 'DELAYED';
}

export interface PlcInputs {
  eStop: boolean;
  masterRun: boolean;
  resetFault: boolean;
  pointSwitchRequest: boolean; // Normal vs Reverse
}

export interface PlcOutputs {
  signalLondonGreen: boolean;
  signalBrumGreen: boolean;
  signalManchesterGreen: boolean;
  signalScotlandGreen: boolean;
  pointMotorAlignMain: boolean;
  pointMotorAlignBranch: boolean;
  platformBuzzer: boolean;
  masterSafetyRelay: boolean;
  vfdTractionSpeed1: number; // 0 - 100%
  vfdTractionSpeed2: number; // 0 - 100%
}

export interface PlcState {
  // System State
  plcRunning: boolean;
  scanTimeMs: number;
  cycleCount: number;
  systemFault: boolean;

  // Railway Network Data
  stations: string[];
  trains: TrainState[];
  timetable: TimetableEntry[];
  pointSwitchPosition: 'MAIN' | 'BRANCH';

  // PLC I/O
  inputs: PlcInputs;
  outputs: PlcOutputs;

  // Actions
  togglePlc: () => void;
  setEstop: (active: boolean) => void;
  setTrainSpeed: (trainId: string, speedKmH: number) => void;
  accelerateTrain: (trainId: string) => void;
  decelerateTrain: (trainId: string) => void;
  togglePointSwitch: () => void;
  triggerReset: () => void;
  tickScan: (dtMs: number) => void;
}

export const STATIONS = [
  'London Euston',
  'Coventry',
  'Birmingham New St',
  'Bristol Temple Meads',
  'Liverpool Lime St',
  'Manchester Piccadilly',
  'Leeds',
  'Glasgow Central',
  'Edinburgh Waverley',
];

export const usePlcStore = create<PlcState>((set, get) => ({
  plcRunning: true,
  scanTimeMs: 4.2,
  cycleCount: 0,
  systemFault: false,

  stations: STATIONS,
  pointSwitchPosition: 'MAIN',

  trains: [
    {
      id: 'train-1',
      name: 'Avanti West Coast #101',
      currentStationIndex: 0, // London
      progressBetweenStations: 0.15,
      speedKmH: 125,
      targetSpeedKmH: 140,
      status: 'RUNNING',
      direction: 1,
    },
    {
      id: 'train-2',
      name: 'LNER Express #204',
      currentStationIndex: 4, // Liverpool
      progressBetweenStations: 0.45,
      speedKmH: 110,
      targetSpeedKmH: 125,
      status: 'RUNNING',
      direction: 1,
    },
  ],

  timetable: [
    {
      trainName: 'Avanti West Coast #101',
      origin: 'London Euston',
      destination: 'Glasgow Central',
      nextStation: 'Coventry',
      scheduledTime: '14:30',
      estimatedTime: '14:30',
      platform: 'Plat 3',
      status: 'ON TIME',
    },
    {
      trainName: 'LNER Express #204',
      origin: 'Bristol Temple Meads',
      destination: 'Edinburgh Waverley',
      nextStation: 'Manchester Piccadilly',
      scheduledTime: '14:35',
      estimatedTime: '14:37',
      platform: 'Plat 1',
      status: 'BOARDING',
    },
    {
      trainName: 'CrossCountry #502',
      origin: 'Birmingham New St',
      destination: 'Leeds',
      nextStation: 'Sheffield',
      scheduledTime: '14:42',
      estimatedTime: '14:42',
      platform: 'Plat 5',
      status: 'ON TIME',
    },
    {
      trainName: 'TransPennine #809',
      origin: 'Liverpool Lime St',
      destination: 'Edinburgh Waverley',
      nextStation: 'Leeds',
      scheduledTime: '14:50',
      estimatedTime: '14:55',
      platform: 'Plat 2',
      status: 'DELAYED',
    },
  ],

  inputs: {
    eStop: false,
    masterRun: true,
    resetFault: false,
    pointSwitchRequest: false,
  },

  outputs: {
    signalLondonGreen: true,
    signalBrumGreen: true,
    signalManchesterGreen: true,
    signalScotlandGreen: true,
    pointMotorAlignMain: true,
    pointMotorAlignBranch: false,
    platformBuzzer: false,
    masterSafetyRelay: true,
    vfdTractionSpeed1: 65,
    vfdTractionSpeed2: 55,
  },

  togglePlc: () => set((s) => ({ plcRunning: !s.plcRunning })),

  setEstop: (active) =>
    set((s) => ({
      inputs: { ...s.inputs, eStop: active },
      systemFault: active,
      trains: s.trains.map((t) => ({
        ...t,
        speedKmH: active ? 0 : t.targetSpeedKmH,
        status: active ? 'FAULT' : 'RUNNING',
      })),
    })),

  setTrainSpeed: (trainId, targetSpeedKmH) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.max(0, Math.min(200, targetSpeedKmH)) } : t
      ),
    })),

  accelerateTrain: (trainId) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.min(200, t.targetSpeedKmH + 20) } : t
      ),
    })),

  decelerateTrain: (trainId) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.max(0, t.targetSpeedKmH - 20) } : t
      ),
    })),

  togglePointSwitch: () =>
    set((s) => {
      const nextPos = s.pointSwitchPosition === 'MAIN' ? 'BRANCH' : 'MAIN';
      return {
        pointSwitchPosition: nextPos,
        outputs: {
          ...s.outputs,
          pointMotorAlignMain: nextPos === 'MAIN',
          pointMotorAlignBranch: nextPos === 'BRANCH',
        },
      };
    }),

  triggerReset: () =>
    set((s) => ({
      systemFault: false,
      inputs: { ...s.inputs, eStop: false, resetFault: true },
      trains: s.trains.map((t) => ({ ...t, status: 'RUNNING', speedKmH: t.targetSpeedKmH })),
    })),

  tickScan: (dtMs) => {
    const state = get();
    if (!state.plcRunning || state.inputs.eStop) return;

    // Advance trains along network
    const updatedTrains = state.trains.map((t) => {
      // Smoothly ramp speed toward targetSpeedKmH (VFD acceleration curve)
      let newSpeed = t.speedKmH;
      if (newSpeed < t.targetSpeedKmH) {
        newSpeed = Math.min(t.targetSpeedKmH, newSpeed + 1.5);
      } else if (newSpeed > t.targetSpeedKmH) {
        newSpeed = Math.max(t.targetSpeedKmH, newSpeed - 2.5);
      }

      // Calculate position movement step
      const step = (newSpeed / 200) * (dtMs / 3000);
      let newProgress = t.progressBetweenStations + step;
      let newStationIdx = t.currentStationIndex;

      if (newProgress >= 1.0) {
        newProgress = 0.0;
        newStationIdx = (newStationIdx + 1) % STATIONS.length;
      }

      return {
        ...t,
        speedKmH: newSpeed,
        progressBetweenStations: newProgress,
        currentStationIndex: newStationIdx,
        status: newSpeed === 0 ? 'HOLDING' : 'RUNNING',
      };
    });

    set((s) => ({
      cycleCount: s.cycleCount + 1,
      trains: updatedTrains as TrainState[],
      outputs: {
        ...s.outputs,
        vfdTractionSpeed1: (updatedTrains[0].speedKmH / 200) * 100,
        vfdTractionSpeed2: (updatedTrains[1].speedKmH / 200) * 100,
      },
    }));
  },
}));
