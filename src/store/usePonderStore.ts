import { create } from 'zustand';
import type { ComponentType } from '../../shared/types';
import { COMPONENT_CATALOG } from '../engine/componentCatalog';
import type { PonderSource, PonderTarget } from '../ponder/ponderTypes';

interface HoverHintPayload {
  type: ComponentType;
  label?: string;
  componentId?: string;
  source: PonderSource;
  anchorX: number;
  anchorY: number;
}

interface PonderStoreState {
  hoveredTarget: PonderTarget | null;
  isPopupHovered: boolean;
  hoverStartMs: number;
  modalOpen: boolean;
  activeType: ComponentType | null;

  setHoveredTarget: (target: HoverHintPayload | null) => void;
  clearHoverIfSource: (source: PonderSource) => void;
  setPopupHovered: (hovered: boolean) => void;
  openPonder: (type: ComponentType) => void;
  closePonder: () => void;
}

export const PONDER_DWELL_SHOW_MS = 180;
export const PONDER_DWELL_READY_MS = 800;
export const PONDER_EXIT_GRACE_MS = 400;

export const usePonderStore = create<PonderStoreState>((set, get) => ({
  hoveredTarget: null,
  isPopupHovered: false,
  hoverStartMs: 0,
  modalOpen: false,
  activeType: null,

  setHoveredTarget: (payload) => {
    const prev = get().hoveredTarget;
    if (!payload) {
      if (prev !== null) {
        set({ hoveredTarget: null });
      }
      return;
    }

    const label = payload.label ?? COMPONENT_CATALOG[payload.type].name;
    // Keep stable identity & lock initial anchor coordinates so moving the mouse slightly
    // onto the Ponder popup does not chase the cursor or reset dwell progress.
    if (
      prev &&
      prev.type === payload.type &&
      prev.source === payload.source &&
      prev.componentId === payload.componentId
    ) {
      return;
    }

    set({
      hoveredTarget: {
        type: payload.type,
        label,
        componentId: payload.componentId,
        source: payload.source,
        anchorX: payload.anchorX,
        anchorY: payload.anchorY,
      },
      hoverStartMs: performance.now(),
    });
  },

  clearHoverIfSource: (source) => {
    const prev = get().hoveredTarget;
    if (prev && prev.source === source) {
      set({ hoveredTarget: null });
    }
  },

  setPopupHovered: (hovered) => {
    set({ isPopupHovered: hovered });
  },

  openPonder: (type) => {
    set({
      modalOpen: true,
      activeType: type,
      hoveredTarget: null,
      isPopupHovered: false,
    });
  },

  closePonder: () => {
    set({
      modalOpen: false,
    });
  },
}));
