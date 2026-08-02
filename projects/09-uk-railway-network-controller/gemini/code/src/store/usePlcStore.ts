import { create } from 'zustand';

export interface TrainState {
  id: string;
  name: string;
  route: string[];
  routeStepIndex: number; // Index in route array
  progressBetweenStations: number; // 0.0 to 1.0
  speedKmH: number;
  targetSpeedKmH: number;
  status: 'RUNNING' | 'HOLDING' | 'BOARDING' | 'FAULT';
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
  pointSwitchRequest: boolean;
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
  vfdTractionSpeed1: number;
  vfdTractionSpeed2: number;
}

export interface PlcState {
  plcRunning: boolean;
  scanTimeMs: number;
  cycleCount: number;
  systemFault: boolean;

  stations: string[];
  trains: TrainState[];
  timetable: TimetableEntry[];
  pointSwitchPosition: 'MAIN' | 'BRANCH';

  inputs: PlcInputs;
  outputs: PlcOutputs;

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

export const ROUTE_WCML = [
  'London Euston',
  'Coventry',
  'Birmingham New St',
  'Liverpool Lime St',
  'Manchester Piccadilly',
  'Glasgow Central',
  'Edinburgh Waverley',
  'Glasgow Central',
  'Manchester Piccadilly',
  'Liverpool Lime St',
  'Birmingham New St',
  'Coventry',
  'London Euston',
];

export const ROUTE_CROSSCOUNTRY = [
  'Bristol Temple Meads',
  'Birmingham New St',
  'Leeds',
  'Edinburgh Waverley',
  'Leeds',
  'Birmingham New St',
  'Bristol Temple Meads',
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
      route: ROUTE_WCML,
      routeStepIndex: 0,
      progressBetweenStations: 0.25,
      speedKmH: 125,
      targetSpeedKmH: 140,
      status: 'RUNNING',
    },
    {
      id: 'train-2',
      name: 'CrossCountry Express #204',
      route: ROUTE_CROSSCOUNTRY,
      routeStepIndex: 0,
      progressBetweenStations: 0.4,
      speedKmH: 110,
      targetSpeedKmH: 125,
      status: 'RUNNING',
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
      trainName: 'CrossCountry Express #204',
      origin: 'Bristol Temple Meads',
      destination: 'Edinburgh Waverley',
      nextStation: 'Birmingham New St',
      scheduledTime: '14:35',
      estimatedTime: '14:35',
      platform: 'Plat 1',
      status: 'BOARDING',
    },
    {
      trainName: 'LNER Intercity #502',
      origin: 'London King\'s Cross',
      destination: 'Edinburgh Waverley',
      nextStation: 'Leeds',
      scheduledTime: '14:42',
      estimatedTime: '14:42',
      platform: 'Plat 5',
      status: 'ON TIME',
    },
    {
      trainName: 'TransPennine #809',
      origin: 'Liverpool Lime St',
      destination: 'Leeds',
      nextStation: 'Manchester Piccadilly',
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

    // Advance trains along their connected route waypoints
    const updatedTrains = state.trains.map((t) => {
      let newSpeed = t.speedKmH;
      if (newSpeed < t.targetSpeedKmH) {
        newSpeed = Math.min(t.targetSpeedKmH, newSpeed + 1.5);
      } else if (newSpeed > t.targetSpeedKmH) {
        newSpeed = Math.max(t.targetSpeedKmH, newSpeed - 2.5);
      }

      const step = (newSpeed / 200) * (dtMs / 3000);
      let newProgress = t.progressBetweenStations + step;
      let newRouteIdx = t.routeStepIndex;

      if (newProgress >= 1.0) {
        newProgress = 0.0;
        newRouteIdx = (newRouteIdx + 1) % t.route.length;
      }

      return {
        ...t,
        speedKmH: newSpeed,
        progressBetweenStations: newProgress,
        routeStepIndex: newRouteIdx,
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
