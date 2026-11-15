import type { ComponentType } from '../../shared/types';
import {
  buildAcSourceDiorama,
  buildAmmeterDiorama,
  buildBjtNpnDiorama,
  buildCapacitorDiorama,
  buildCurrentSourceDiorama,
  buildDcSourceDiorama,
  buildDiodeDiorama,
  buildGroundDiorama,
  buildInductorDiorama,
  buildLedDiorama,
  buildOpampDiorama,
  buildPotentiometerDiorama,
  buildResistorDiorama,
  buildSwitchSpdtDiorama,
  buildSwitchSpstDiorama,
  buildVoltmeterDiorama,
} from './ponderScenesAnalog';
import {
  buildAndDiorama,
  buildClockDiorama,
  buildDFlipFlopDiorama,
  buildFullAdderDiorama,
  buildHalfAdderDiorama,
  buildHexDisplayDiorama,
  buildLogicInDiorama,
  buildLogicOutDiorama,
  buildNandDiorama,
  buildNorDiorama,
  buildNotDiorama,
  buildOrDiorama,
  buildXnorDiorama,
  buildXorDiorama,
} from './ponderScenesDigital';
import type { PonderDioramaBuilder } from './ponderTypes';

export const PONDER_SCENE_BUILDERS: Record<ComponentType, PonderDioramaBuilder> = {
  // Power & Ground
  DC_SOURCE: buildDcSourceDiorama,
  AC_SOURCE: buildAcSourceDiorama,
  CURRENT_SOURCE: buildCurrentSourceDiorama,
  GROUND: buildGroundDiorama,
  // Passive & Switches
  RESISTOR: buildResistorDiorama,
  POTENTIOMETER: buildPotentiometerDiorama,
  CAPACITOR: buildCapacitorDiorama,
  INDUCTOR: buildInductorDiorama,
  SWITCH_SPST: buildSwitchSpstDiorama,
  SWITCH_SPDT: buildSwitchSpdtDiorama,
  // Semiconductors & Op-Amp
  DIODE: buildDiodeDiorama,
  LED: buildLedDiorama,
  BJT_NPN: buildBjtNpnDiorama,
  OPAMP: buildOpampDiorama,
  // Instruments
  VOLTMETER: buildVoltmeterDiorama,
  AMMETER: buildAmmeterDiorama,
  // Digital Logic
  LOGIC_IN: buildLogicInDiorama,
  CLOCK: buildClockDiorama,
  LOGIC_OUT: buildLogicOutDiorama,
  HEX_DISPLAY: buildHexDisplayDiorama,
  AND: buildAndDiorama,
  OR: buildOrDiorama,
  NOT: buildNotDiorama,
  NAND: buildNandDiorama,
  NOR: buildNorDiorama,
  XOR: buildXorDiorama,
  XNOR: buildXnorDiorama,
  HALF_ADDER: buildHalfAdderDiorama,
  FULL_ADDER: buildFullAdderDiorama,
  D_FF: buildDFlipFlopDiorama,
};
