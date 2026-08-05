/**
 * Flattens the live process image into the flat `tag -> value` dictionary the
 * ladder renderer evaluates against, adding the handful of derived
 * intermediates (DFB locals in the ST source) that the LD networks display as
 * named signals.
 */

import { DERIVED_TAGS, type TagMap } from './ladderProgram'
import type { PlantModel } from './plantSimulation'
import { COAGULANT_DOSE_FRACTION, TURBIDITY_TRIP_NTU } from './types'
import type { PlcInputs, PlcInternal, PlcOutputs } from './types'

export function buildTagMap(
  inputs: PlcInputs,
  outputs: PlcOutputs,
  internal: PlcInternal,
  plant: PlantModel,
): TagMap {
  const tripCondActive =
    !inputs.I_EStop_NC ||
    inputs.I_LSH_Equalization ||
    inputs.AI_Turbidity_Effluent > TURBIDITY_TRIP_NTU

  return {
    ...inputs,
    ...outputs,
    M_PlantState: internal.M_PlantState,
    M_TargetDO: internal.M_TargetDO,
    M_MaxTurbidity: internal.M_MaxTurbidity,
    M_LeadPumpToggle: internal.M_LeadPumpToggle,
    M_PlantRun: internal.M_PlantRun,
    M_SafetyTrip: internal.M_SafetyTrip,
    M_AlarmActive: internal.M_AlarmActive,
    M_LeadPumpCall: internal.M_LeadPumpCall,
    M_LagPumpCall: internal.M_LagPumpCall,
    M_BlowerCallA: internal.M_BlowerCallA,
    M_BlowerCallB: internal.M_BlowerCallB,
    M_WeirOpenCmd: internal.M_WeirOpenCmd,
    M_WeirClosedLS: internal.M_WeirClosedLS,

    [DERIVED_TAGS.tripCondActive]: tripCondActive,
    [DERIVED_TAGS.pumpEnable]:
      internal.M_PlantRun &&
      !internal.M_SafetyTrip &&
      !inputs.I_LSH_AerationA &&
      !inputs.I_LSH_AerationB,
    [DERIVED_TAGS.aerEnable]:
      internal.M_PlantRun && !internal.M_SafetyTrip && internal.M_PlantState >= 2,
    [DERIVED_TAGS.clarifierLevel]: plant.clarifierLevel,
    [DERIVED_TAGS.coagSetpoint]: internal.M_MaxTurbidity * COAGULANT_DOSE_FRACTION,
    [DERIVED_TAGS.leadIsPump1]: internal.M_LeadPumpToggle === 1,
    [DERIVED_TAGS.leadIsPump2]: internal.M_LeadPumpToggle === 2,
  }
}
