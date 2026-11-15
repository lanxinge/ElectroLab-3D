import { afterEach, describe, expect, it } from 'vitest';
import { parseProjectFile, serializeProjectFile } from '../src/utils/projectFileIO';
import { CIRCUIT_PRESETS } from '../src/presets/circuitPresets';
import { useCircuitStore } from '../src/store/useCircuitStore';
import { useTutorialStore } from '../src/store/useTutorialStore';
import { captureWorkbench } from '../src/store/workbenchSnapshot';
import { TUTORIAL_LESSONS } from '../src/tutorial/curriculumIndex';

const circuit = CIRCUIT_PRESETS.find(p => p.id === 'preset-rc-transient')!.circuit;
afterEach(() => { if (useTutorialStore.getState().isActive) useTutorialStore.getState().exitTutorial(false); });

describe('工程文件与教学切换', () => {
  it('教学滑块能准确表示电路初始值，不被浏览器自动吸附到其他刻度', () => {
    for (const lesson of TUTORIAL_LESSONS) for (const stage of lesson.stages) {
      for (const q of stage.quickControls ?? []) {
        if (q.kind !== 'slider') continue;
        const value = Number(stage.circuit.components.find(c => c.id === q.targetId)?.props[q.propKey]);
        const tick = (value - (q.min ?? 0)) / (q.step ?? 1);
        expect(value, q.id).toBeGreaterThanOrEqual(q.min ?? 0);
        expect(value, q.id).toBeLessThanOrEqual(q.max ?? 100);
        expect(tick, q.id).toBeCloseTo(Math.round(tick), 7);
      }
    }
  });
  it('新版工程和旧网表使用同一入口，保留名称、参数与接线', () => {
    const current = parseProjectFile(JSON.stringify(serializeProjectFile('充放电实验', circuit)));
    const legacy = parseProjectFile(JSON.stringify({ title: '充放电实验', ...circuit }));
    expect(current.title).toBe('充放电实验');
    expect(current.circuit).toEqual(legacy.circuit);
    expect(current.circuit.wires).toEqual(circuit.wires);
    for (const c of circuit.components) expect(current.circuit.components.find(x => x.id === c.id)).toMatchObject(JSON.parse(JSON.stringify(c)));
  });

  it.each([
    [null],
    [{ id: 'x', type: 'UNKNOWN' }],
    [{ id: 'x', type: 'RESISTOR', props: null }],
    [{ id: 'x', type: 'RESISTOR', pos2d: { x: 'bad', y: 0 } }],
    [{ id: 'x', type: 'RESISTOR' }, { id: 'x', type: 'RESISTOR' }],
  ])('在载入前拒绝无效元件：%j', (...components) => {
    expect(() => parseProjectFile(JSON.stringify({ components, wires: [] }))).toThrow();
  });

  it('拒绝悬空引用，同时允许仅带基础参数的旧网表', () => {
    const data = { components: [{ id: 'r', type: 'RESISTOR' }], wires: [] as unknown[] };
    expect(parseProjectFile(JSON.stringify(data)).circuit.components[0].props.resistance).toBeGreaterThan(0);
    data.wires.push({ id: 'w', from: { componentId: 'r', pinId: 'missing' }, to: { componentId: 'r', pinId: 'b' } });
    expect(() => parseProjectFile(JSON.stringify(data))).toThrow('不存在的元件或引脚');
  });

  it('进入教学再返回时，暂停、电容状态、仿真时间和撤销记录均保留', () => {
    const cs = useCircuitStore.getState();
    cs.loadCircuit(structuredClone(circuit), '尚未结束的实验', null, { prewarmSeconds: 0.15, isRunning: false });
    cs.setTimeScale(0.2);
    cs.pushUndoSnapshot();
    const before = captureWorkbench();
    useTutorialStore.getState().enterTutorial('ch13-timer-555-pulse-circuits', 1);
    useTutorialStore.getState().runCheckpointAutoDemo();
    useTutorialStore.getState().exitTutorial(false);
    expect(captureWorkbench()).toEqual(before);
  });

  it('继续学习保留所选步骤，带电路离开保留正在观察的仿真状态', () => {
    const tut = useTutorialStore.getState();
    tut.enterTutorial('ch3-rc-transient', 1);
    tut.exitTutorial(false);
    tut.enterTutorial(undefined, undefined, 'all');
    expect(useTutorialStore.getState().currentLessonId).toBe('ch3-rc-transient');
    expect(useTutorialStore.getState().currentStageIndex).toBe(1);
    useCircuitStore.getState().toggleRunning();
    const time = useCircuitStore.getState().simTime;
    const scale = useCircuitStore.getState().timeScale;
    tut.exitTutorial(true);
    expect(useCircuitStore.getState().isRunning).toBe(false);
    expect(useCircuitStore.getState().simTime).toBe(time);
    expect(useCircuitStore.getState().timeScale).toBe(scale);
  });
});
