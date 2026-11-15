import { useCircuitStore } from './useCircuitStore';

// 教学临时占用工作台时，保留运行时、示波缓存与撤销历史；返回时不重新求解。
const snapshotKeys = [
  'projectTitle', 'activePresetId', 'components', 'wires', 'selected', 'activeTool',
  'wireColor', 'isRunning', 'simTime', 'transientAnchor', 'timeScale', 'simRuntime',
  'telemetryById', 'wireTelemetryById', 'implicitGroundUsed', 'warnings',
  'oscilloscopeChannels', 'oscilloscopeSamples', 'highlightedIds', 'newlyAddedIds',
  'preferredAnalysisTab', 'show3DLabels', 'sidebarMode', 'schematicTheme',
  'historyPast', 'wiringDraftFrom',
] as const;
type CircuitState = ReturnType<typeof useCircuitStore.getState>;
export type WorkbenchSnapshot = Pick<CircuitState, (typeof snapshotKeys)[number]>;

export function captureWorkbench(): WorkbenchSnapshot {
  const state = useCircuitStore.getState();
  return structuredClone(Object.fromEntries(snapshotKeys.map(k => [k, state[k]]))) as WorkbenchSnapshot;
}

export function restoreWorkbench(snapshot: WorkbenchSnapshot): void {
  useCircuitStore.setState({
    ...structuredClone(snapshot),
    circuitLoadVersion: useCircuitStore.getState().circuitLoadVersion + 1,
  });
}
