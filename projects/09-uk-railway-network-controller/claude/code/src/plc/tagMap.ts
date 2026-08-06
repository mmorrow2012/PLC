/**
 * Flattens the live process image into the flat `tag -> value` dictionary the
 * ladder renderer evaluates against, adding the derived intermediates (FB
 * locals in the ST source) that the LD networks display as named signals.
 */

import { DERIVED_TAGS, type TagMap } from './ladderProgram'
import {
  BLOCK_BY_ID,
  DELAY_THRESHOLD_MIN,
  sectionBlockId,
  stationBlockId,
} from './types'
import type { HmiCommands, PlcInputs, PlcInternal, PlcOutputs } from './types'
import { trainBlock } from './networkSimulation'
import type { NetworkModel } from './networkSimulation'

export function buildTagMap(
  inputs: PlcInputs,
  outputs: PlcOutputs,
  internal: PlcInternal,
  occupancy: Record<string, boolean>,
  network: NetworkModel,
  commands: HmiCommands,
): TagMap {
  const occ = (id: string) => Boolean(occupancy[id])
  const anyNextOccupied = (id: string) => (BLOCK_BY_ID[id]?.next ?? []).some(occ)

  const trailing = network.trains.find((train) => train.id === 'IC2')
  const atpLimitTrain2 = trailing ? (BLOCK_BY_ID[trainBlock(trailing)]?.lineSpeedKmh ?? 200) : 200

  return {
    ...inputs,
    ...outputs,
    M_NetworkState: internal.M_NetworkState,
    M_TargetSpeed_Train1: internal.M_TargetSpeed_Train1,
    M_TargetSpeed_Train2: internal.M_TargetSpeed_Train2,
    M_ActiveBlockCount: internal.M_ActiveBlockCount,
    M_NetworkRun: internal.M_NetworkRun,
    M_SafetyTrip: internal.M_SafetyTrip,
    M_AlarmActive: internal.M_AlarmActive,
    M_PointDetectFault: internal.M_PointDetectFault,
    M_PointReverseCmd: internal.M_PointReverseCmd,
    M_BrakeDemand_Train1: internal.M_BrakeDemand_Train1,
    M_BrakeDemand_Train2: internal.M_BrakeDemand_Train2,
    M_PermittedSpeed_Train1: internal.M_PermittedSpeed_Train1,
    M_PermittedSpeed_Train2: internal.M_PermittedSpeed_Train2,
    M_PointDetectTimerMs: internal.M_PointDetectTimerMs,
    M_WorstDelayMin: internal.M_WorstDelayMin,

    [DERIVED_TAGS.tripCondActive]: !inputs.I_EStop_NC || internal.M_PointDetectFault,
    [DERIVED_TAGS.clearLondon]: !occ(sectionBlockId('LON', 'COV')),
    [DERIVED_TAGS.aheadLondon]: anyNextOccupied(sectionBlockId('LON', 'COV')),
    [DERIVED_TAGS.clearBrum]: !occ(stationBlockId('BHM')),
    [DERIVED_TAGS.aheadBrum]: anyNextOccupied(stationBlockId('BHM')),
    [DERIVED_TAGS.clearManchester]: !occ(stationBlockId('MAN')),
    [DERIVED_TAGS.aheadManchester]: anyNextOccupied(stationBlockId('MAN')),
    [DERIVED_TAGS.clearScotland]: !occ(stationBlockId('GLA')),
    [DERIVED_TAGS.aheadScotland]: anyNextOccupied(stationBlockId('GLA')),
    [DERIVED_TAGS.atpLimitTrain2]: atpLimitTrain2,
    [DERIVED_TAGS.atpOverspeed1]:
      inputs.AI_TractionSpeed_Intercity1 > inputs.AI_TrackCurvature_Limit,
    [DERIVED_TAGS.atpOverspeed2]: inputs.AI_TractionSpeed_Intercity2 > atpLimitTrain2,
    [DERIVED_TAGS.boardingCall]: internal.M_BuzzerTimerS > 0,
    [DERIVED_TAGS.delayAlarm]: internal.M_WorstDelayMin >= DELAY_THRESHOLD_MIN,
    [DERIVED_TAGS.junctionClear]: !occ(stationBlockId('BHM')),
    [DERIVED_TAGS.routeRequestBranch]: commands.pointReverseRequest,
  }
}
