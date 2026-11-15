import type { ComponentType } from '../../shared/types';
import { PONDER_ANALOG_SPECS } from './ponderAnalogData';
import { PONDER_DIGITAL_SPECS } from './ponderDigitalData';
import { PONDER_EXPANDED_SPECS } from './ponderExpandedData';
import type { PonderModuleSpec } from './ponderTypes';

export const PONDER_DATA: Record<ComponentType, PonderModuleSpec> = {
  ...PONDER_ANALOG_SPECS,
  ...PONDER_DIGITAL_SPECS,
  ...PONDER_EXPANDED_SPECS,
};

export const ALL_PONDER_TYPES = Object.keys(PONDER_DATA) as ComponentType[];
