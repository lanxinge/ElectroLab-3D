import { create } from 'zustand';

export type UILayoutMode = 'floating' | 'split';

interface UIState {
  layoutMode: UILayoutMode;
  paletteOpen: boolean;
  inspectorOpen: boolean;
  schematicOpen: boolean;
  analysisOpen: boolean;
  orbExpanded: boolean;
  truthEditorCompId: string | null;
  packageIcModalOpen: boolean;

  paletteWidth: number;
  rightColumnWidth: number;
  analysisHeight: number;
  splitInspectorHeight: number;

  setLayoutMode: (mode: UILayoutMode) => void;
  setPaletteWidth: (w: number) => void;
  setRightColumnWidth: (w: number) => void;
  setAnalysisHeight: (h: number) => void;
  setSplitInspectorHeight: (h: number) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  setSchematicOpen: (open: boolean) => void;
  toggleSchematic: () => void;
  setAnalysisOpen: (open: boolean) => void;
  toggleAnalysis: () => void;
  setOrbExpanded: (open: boolean) => void;
  toggleOrbExpanded: () => void;
  collapseAllPanels: () => void;
  openTruthEditor: (compId: string | null) => void;
  setPackageIcModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  layoutMode: 'floating',
  paletteOpen: false,
  inspectorOpen: false,
  schematicOpen: false,
  analysisOpen: false,
  orbExpanded: false,
  truthEditorCompId: null,
  packageIcModalOpen: false,
  paletteWidth: 248,
  rightColumnWidth: 410,
  analysisHeight: 215,
  splitInspectorHeight: 230,

  setLayoutMode: (mode) =>
    set(() =>
      mode === 'split'
        ? {
            layoutMode: 'split',
            paletteOpen: true,
            inspectorOpen: true,
            analysisOpen: true,
            orbExpanded: false,
          }
        : {
            layoutMode: 'floating',
            paletteOpen: false,
            inspectorOpen: false,
            schematicOpen: false,
            analysisOpen: false,
          }
    ),

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),

  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  setSchematicOpen: (open) => set({ schematicOpen: open }),
  toggleSchematic: () => set((s) => ({ schematicOpen: !s.schematicOpen })),

  setAnalysisOpen: (open) => set({ analysisOpen: open }),
  toggleAnalysis: () => set((s) => ({ analysisOpen: !s.analysisOpen })),

  setOrbExpanded: (open) => set({ orbExpanded: open }),
  toggleOrbExpanded: () => set((s) => ({ orbExpanded: !s.orbExpanded })),

  collapseAllPanels: () =>
    set({
      paletteOpen: false,
      inspectorOpen: false,
      schematicOpen: false,
      analysisOpen: false,
      orbExpanded: false,
    }),

  openTruthEditor: (compId) => set({ truthEditorCompId: compId }),
  setPackageIcModalOpen: (open) => set({ packageIcModalOpen: open }),
  setPaletteWidth: (w) => set({ paletteWidth: Math.round(Math.min(380, Math.max(200, w))) }),
  setRightColumnWidth: (w) => set({ rightColumnWidth: Math.round(Math.min(680, Math.max(320, w))) }),
  setAnalysisHeight: (h) => set({ analysisHeight: Math.round(Math.min(420, Math.max(140, h))) }),
  setSplitInspectorHeight: (h) => set({ splitInspectorHeight: Math.round(Math.min(420, Math.max(150, h))) }),
}));
