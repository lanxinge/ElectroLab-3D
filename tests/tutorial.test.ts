import { describe, expect, it } from 'vitest';
import { COMPONENT_CATALOG, getComponentPins } from '../src/engine/componentCatalog';
import { advanceCircuitSimulation, createInitialRuntimeState } from '../src/engine/mnaSolver';
import {
  computeNiceScaleBound,
  formatScopeAxisTick,
  formatScopeChannelValue,
  getScopeChannelMeta,
} from '../src/engine/scopeChannelMeta';
import { PONDER_DATA } from '../src/ponder/ponderData';
import { useCircuitStore } from '../src/store/useCircuitStore';
import { buildTutorialEvalContext, useTutorialStore } from '../src/store/useTutorialStore';
import {
  getLessonById,
  TOTAL_TUTORIAL_STAGES,
  TUTORIAL_CHAPTERS,
  TUTORIAL_LESSONS,
} from '../src/tutorial/curriculumIndex';
import { mkCircuit, mkComp } from '../src/tutorial/tutorialHelpers';

function runForSeconds(
  circuit: ReturnType<typeof mkCircuit>,
  seconds: number,
  stepDt = 0.02
) {
  const runtime = createInitialRuntimeState();
  let lastRes = advanceCircuitSimulation(circuit, runtime, 0);
  const steps = Math.max(1, Math.round(seconds / stepDt));
  for (let i = 0; i < steps; i++) {
    lastRes = advanceCircuitSimulation(circuit, runtime, stepDt);
  }
  return lastRes;
}

describe('ElectroLab 3D Zero-Foundation Curriculum (Vol. 1 + Vol. 2)', () => {
  it('defines 15 chapters (7 Vol.1 + 8 Vol.2), 26 lessons, and 78 progressive stages with valid pins & Ponder deep-links', () => {
    expect(TUTORIAL_CHAPTERS.length).toBe(15);
    expect(TUTORIAL_CHAPTERS.filter((c) => c.volume === 'vol1').length).toBe(7);
    expect(TUTORIAL_CHAPTERS.filter((c) => c.volume === 'vol2').length).toBe(8);
    expect(TUTORIAL_LESSONS.length).toBe(26);
    expect(TOTAL_TUTORIAL_STAGES).toBe(78);

    for (const lesson of TUTORIAL_LESSONS) {
      expect(lesson.stages.length).toBeGreaterThanOrEqual(2);
      for (const stage of lesson.stages) {
        const compMap = new Map(stage.circuit.components.map((c) => [c.id, c]));
        for (const comp of stage.circuit.components) {
          expect(COMPONENT_CATALOG[comp.type], `Invalid type ${comp.type}`).toBeDefined();
        }
        for (const wire of stage.circuit.wires) {
          const fc = compMap.get(wire.from.componentId);
          const tc = compMap.get(wire.to.componentId);
          expect(fc, `Missing fromComp ${wire.from.componentId} in ${stage.id}`).toBeDefined();
          expect(tc, `Missing toComp ${wire.to.componentId} in ${stage.id}`).toBeDefined();
          const fromPins = getComponentPins(fc!).map((p) => p.id);
          const toPins = getComponentPins(tc!).map((p) => p.id);
          expect(fromPins).toContain(wire.from.pinId);
          expect(toPins).toContain(wire.to.pinId);
        }

        expect(stage.ponderLinks.length).toBeGreaterThanOrEqual(1);
        for (const pl of stage.ponderLinks) {
          const spec = PONDER_DATA[pl.type];
          expect(spec).toBeDefined();
          if (pl.stepIndex !== undefined) {
            expect(pl.stepIndex).toBeGreaterThanOrEqual(0);
            expect(pl.stepIndex).toBeLessThan(spec.steps.length);
          }
          if (pl.componentId) {
            expect(compMap.has(pl.componentId)).toBe(true);
          }
        }

        const res = runForSeconds(stage.circuit, Math.max(0.08, stage.prewarmSeconds ?? 0.08));
        expect(res.warnings.some((w) => w.includes('发散'))).toBe(false);

        const ctx = {
          circuit: stage.circuit,
          components: stage.circuit.components,
          wires: stage.circuit.wires,
          telemetryById: res.telemetryById,
          simTime: res.time,
        };
        for (const lf of stage.liveFormulas) {
          const out = lf.evaluate(ctx);
          expect(out.result.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('computes accurate 3-phase Y0 220V/381V balance and neutral-break overvoltage fault', () => {
    const lesson11 = getLessonById('ch5-three-phase-circuits');

    // Stage 1: Symmetric Y0
    const symRes = runForSeconds(lesson11.stages[0].circuit, 0.2);
    expect(symRes.telemetryById.vm_an.vRms).toBeGreaterThan(215);
    expect(symRes.telemetryById.vm_an.vRms).toBeLessThan(225);
    expect(symRes.telemetryById.vm_ab.vRms).toBeGreaterThan(376);
    expect(symRes.telemetryById.vm_ab.vRms).toBeLessThan(386);
    expect(symRes.telemetryById.am_n.iRms).toBeLessThan(0.02);

    // Stage 2: Unbalanced Y with broken neutral vs restored neutral
    const faultCircuit = structuredClone(lesson11.stages[1].circuit);
    const faultRes = runForSeconds(faultCircuit, 0.2);
    expect(faultRes.telemetryById.vm_a.vRms).toBeGreaterThan(270);
    expect(faultRes.telemetryById.la.overloaded).toBe(true);

    const fixedCircuit = structuredClone(lesson11.stages[1].circuit);
    const kn = fixedCircuit.components.find((c) => c.id === 'k_n')!;
    kn.props.closed = true;
    const fixedRes = runForSeconds(fixedCircuit, 0.2);
    expect(fixedRes.telemetryById.vm_a.vRms).toBeGreaterThan(215);
    expect(fixedRes.telemetryById.vm_a.vRms).toBeLessThan(225);
    expect(fixedRes.telemetryById.vm_b.vRms).toBeGreaterThan(215);
    expect(fixedRes.telemetryById.vm_b.vRms).toBeLessThan(225);
    expect(fixedRes.telemetryById.la.overloaded).toBe(false);
  });

  it('models 50Hz RLC series resonance Q-factor overvoltage and PF capacitor compensation', () => {
    const lesson9 = getLessonById('ch4-ac-phasor-rlc-resonance');
    const rlcDetuned = structuredClone(lesson9.stages[2].circuit);
    const res25 = runForSeconds(rlcDetuned, 0.4);
    const i25 = res25.telemetryById.am1.iRms ?? 0;

    const rlcResonant = structuredClone(lesson9.stages[2].circuit);
    rlcResonant.components.find((c) => c.id === 'ac1')!.props.frequency = 50;
    const res50 = runForSeconds(rlcResonant, 0.4);
    const i50 = res50.telemetryById.am1.iRms ?? 0;
    expect(i50).toBeGreaterThanOrEqual(0.9);
    expect(i50).toBeGreaterThan(i25 * 3);
    expect(res50.telemetryById.ac1.powerFactor).toBeGreaterThan(0.98);
    expect(res50.telemetryById.vm_c.vRms).toBeGreaterThan(28);

    const lesson10 = getLessonById('ch4-power-factor-correction');
    const pfOpen = structuredClone(lesson10.stages[1].circuit);
    const pfOpenRes = runForSeconds(pfOpen, 0.3);
    expect(pfOpenRes.telemetryById.ac1.powerFactor).toBeGreaterThan(0.68);
    expect(pfOpenRes.telemetryById.ac1.powerFactor).toBeLessThan(0.74);

    const pfClosed = structuredClone(lesson10.stages[1].circuit);
    pfClosed.components.find((c) => c.id === 'k_comp')!.props.closed = true;
    const pfClosedRes = runForSeconds(pfClosed, 0.3);
    expect(pfClosedRes.telemetryById.ac1.powerFactor).toBeGreaterThan(0.96);
    const iLineBefore = pfOpenRes.telemetryById.am_line.iRms ?? 1;
    const iLineAfter = pfClosedRes.telemetryById.am_line.iRms ?? 1;
    expect(iLineAfter).toBeLessThan(iLineBefore * 0.75);
    const iMotBefore = pfOpenRes.telemetryById.am_motor.iRms ?? 1;
    const iMotAfter = pfClosedRes.telemetryById.am_motor.iRms ?? 1;
    expect(Math.abs(iMotAfter - iMotBefore) / iMotBefore).toBeLessThan(0.03);
  });

  it('passes all 78 stage checkpoints via TutorialStore runCheckpointAutoDemo()', () => {
    useTutorialStore.getState().exitTutorial(false);
    const tut = useTutorialStore.getState();
    tut.enterTutorial(TUTORIAL_LESSONS[0].id, 0);

    try {
      for (const lesson of TUTORIAL_LESSONS) {
        for (let idx = 0; idx < lesson.stages.length; idx++) {
          const stage = lesson.stages[idx];
          useTutorialStore.getState().selectLesson(lesson.id, idx);
          expect(useCircuitStore.getState().components.length).toBe(stage.circuit.components.length);

          expect(stage.checkpoint?.autoDemo, `Missing autoDemo in ${stage.id}`).toBeDefined();
          const passed = useTutorialStore.getState().runCheckpointAutoDemo();
          const check = stage.checkpoint!.check(buildTutorialEvalContext(stage));

          expect(passed, `${stage.id} autoDemo failed: ${check.message}`).toBe(true);
          expect(check.passed, `${stage.id} check failed: ${check.message}`).toBe(true);
          expect(useTutorialStore.getState().completedStageIds).toContain(stage.id);
        }
      }
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('preserves and restores free-play workbench circuit losslessly on exitTutorial(false)', () => {
    const customCircuit = mkCircuit(
      [
        mkComp('v_custom', 'DC_SOURCE', 'V_CUSTOM', 150, 220, 270, { voltage: 9 }),
        mkComp('r_custom', 'RESISTOR', 'R_CUSTOM', 320, 220, 90, { resistance: 470, maxPower: 1 }),
        mkComp('g_custom', 'GROUND', 'GND_C', 150, 350, 0),
      ],
      [
        ['v_custom', 'pos', 'r_custom', 'a'],
        ['r_custom', 'b', 'v_custom', 'neg'],
        ['v_custom', 'neg', 'g_custom', 'gnd'],
      ],
      'cust'
    );

    useCircuitStore.getState().loadCircuit(customCircuit, '自定义自由实验', 'custom-bench');
    useTutorialStore.getState().enterTutorial('ch4-ac-phasor-rlc-resonance', 2);
    expect(useTutorialStore.getState().isActive).toBe(true);
    expect(useCircuitStore.getState().projectTitle).not.toBe('自定义自由实验');

    useTutorialStore.getState().selectStage(0);
    useTutorialStore.getState().nextStage();

    useTutorialStore.getState().exitTutorial(false);
    const restored = useCircuitStore.getState();
    expect(useTutorialStore.getState().isActive).toBe(false);
    expect(restored.projectTitle).toBe('自定义自由实验');
    expect(restored.components.length).toBe(3);
    expect(restored.components.find((c) => c.id === 'r_custom')?.props.resistance).toBe(470);
    expect(restored.highlightedIds.length).toBe(0);
    expect(restored.timeScale).toBe(1);
  });

  it('keeps capacitor voltage continuous and prevents false completion when switching while paused', () => {
    try {
      useTutorialStore.setState({ completedStageIds: [] });
      useTutorialStore.getState().enterTutorial('ch3-rc-transient', 1); // l7-s2 (prewarmed ~10V)
      if (useCircuitStore.getState().isRunning) {
        useCircuitStore.getState().toggleRunning();
      }

      const stage = getLessonById('ch3-rc-transient').stages[1];
      const before = useCircuitStore.getState();
      const preVc = before.telemetryById['vm_c']?.voltageDrop ?? 0;
      expect(preVc).toBeGreaterThan(9.9);
      expect(stage.checkpoint!.check(buildTutorialEvalContext(stage)).passed).toBe(false);

      // Flip K1 from charging (+10V) to discharging (GND) while paused
      useCircuitStore.getState().updateComponentProp('k1', 'position', 1);
      const afterToggle = useCircuitStore.getState();
      const instantVc = afterToggle.telemetryById['vm_c']?.voltageDrop ?? 0;
      const instantIc = afterToggle.telemetryById['am_c']?.current ?? 0;
      expect(instantVc).toBeGreaterThan(9.9);
      expect(instantIc).toBeCloseTo(-0.01, 3);
      expect(stage.checkpoint!.check(buildTutorialEvalContext(stage)).passed).toBe(false);
      expect(useTutorialStore.getState().completedStageIds).not.toContain('l7-s2');

      // Step one micro-step forward: voltage decays smoothly from ~10V instead of jumping from 0V
      useCircuitStore.getState().stepOnce(0.02);
      const afterStep = useCircuitStore.getState();
      const stepVc = afterStep.telemetryById['vm_c']?.voltageDrop ?? 0;
      expect(stepVc).toBeGreaterThan(9.5);
      expect(stepVc).toBeLessThan(instantVc);

      // RL inductor continuity while paused
      useTutorialStore.getState().enterTutorial('ch3-rl-transient-freewheel', 0); // l8-s1
      if (useCircuitStore.getState().isRunning) {
        useCircuitStore.getState().toggleRunning();
      }
      useCircuitStore.getState().updateComponentProp('k1', 'closed', true);
      useCircuitStore.getState().stepOnce(0.25); // tau = 25ms -> iL should reach ~0.39A
      const iBeforePauseEdit = useCircuitStore.getState().telemetryById['am_l']?.current ?? 0;
      expect(iBeforePauseEdit).toBeGreaterThan(0.25);
      expect(iBeforePauseEdit).toBeLessThan(0.5);
      useCircuitStore.getState().updateComponentProp('r_coil', 'resistance', 10);
      const iAfterPauseEdit = useCircuitStore.getState().telemetryById['am_l']?.current ?? 0;
      expect(iAfterPauseEdit).toBeCloseTo(iBeforePauseEdit, 2);
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('samples ammeters in Amperes and provides independent current axis scaling', () => {
    try {
      useTutorialStore.getState().enterTutorial('ch3-rc-transient', 1); // l7-s2
      useCircuitStore.getState().updateComponentProp('k1', 'position', 1);
      useCircuitStore.getState().stepOnce(0.02);

      const cs = useCircuitStore.getState();
      const lastSample = cs.oscilloscopeSamples[cs.oscilloscopeSamples.length - 1];
      expect(lastSample).toBeDefined();
      expect(lastSample.values['vm_c']).toBeGreaterThan(9.4);
      expect(lastSample.values['am_c']).toBeLessThan(-0.008);
      expect(Math.abs(lastSample.values['am_c'] - (cs.telemetryById['am_c']?.current ?? 0))).toBeLessThan(
        1e-6
      );

      const amComp = cs.components.find((c) => c.id === 'am_c');
      const meta = getScopeChannelMeta(amComp);
      expect(meta.dimension).toBe('current');
      expect(meta.quantityLabel).toBe('瞬时电流');
      expect(formatScopeChannelValue(-0.0096, meta)).toBe('-9.60 mA');

      const iBound = computeNiceScaleBound(0.0096, 0.001);
      expect(iBound).toBe(0.012);
      expect(formatScopeAxisTick(iBound, 'current', iBound)).toBe('+12mA');

      // RMS ammeter channel sampling in AC stage l10-s2
      useTutorialStore.getState().enterTutorial('ch4-power-factor-correction', 1);
      const acState = useCircuitStore.getState();
      const acSample = acState.oscilloscopeSamples[acState.oscilloscopeSamples.length - 1];
      expect(acSample.values['am_line']).toBeGreaterThan(1.4);
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('distinguishes reactive VA exchange from thermal dissipation without false overload in compensation', () => {
    try {
      useTutorialStore.getState().enterTutorial('ch4-power-factor-correction', 1); // l10-s2
      useCircuitStore.getState().updateComponentProp('k_comp', 'closed', true);
      for (let i = 0; i < 40; i++) {
        useCircuitStore.getState().stepOnce(0.5); // 0.5 * 0.05 timeScale = 0.025s/step -> 1.0s AC settle
      }
      const st = useCircuitStore.getState();
      expect(st.warnings).toEqual([]);
      expect(st.telemetryById['c_comp']?.overloaded).toBe(false);
      expect(st.telemetryById['l_m']?.overloaded).toBe(false);
      expect(st.telemetryById['c_comp']?.avgPower).toBe(0);
      expect(st.telemetryById['ac1']?.powerFactor).toBeGreaterThan(0.95);

      // Genuine overvoltage on capacitor & overcurrent on inductor still warn accurately
      useCircuitStore.getState().updateComponentProp('c_comp', 'maxVoltage', 100);
      useCircuitStore.getState().updateComponentProp('l_m', 'maxCurrent', 1.0);
      useCircuitStore.getState().stepOnce(0.5);
      const faultState = useCircuitStore.getState();
      expect(faultState.telemetryById['c_comp']?.overloaded).toBe(true);
      expect(faultState.telemetryById['l_m']?.overloaded).toBe(true);
      expect(faultState.warnings.some((w) => w.includes('C_comp') && w.includes('耐压'))).toBe(true);
      expect(faultState.warnings.some((w) => w.includes('L_m') && w.includes('过流'))).toBe(true);
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('tracks transient Δt since switch toggle separately from total simTime in RC/RL formulas', () => {
    try {
      useTutorialStore.getState().enterTutorial('ch3-rc-transient', 0); // l7-s1 (timeScale=0.4)
      const stage = getLessonById('ch3-rc-transient').stages[0];

      // Run idle for 2.0s before toggling K1
      for (let i = 0; i < 5; i++) {
        useCircuitStore.getState().stepOnce(1.0); // 1.0 * 0.4 = 0.4s/step -> 2.0s
      }
      const beforeCtx = buildTutorialEvalContext(stage);
      expect(beforeCtx.simTime).toBeCloseTo(2.0, 2);
      expect(beforeCtx.hasSwitched).toBe(false);
      expect(stage.liveFormulas[0].evaluate(beforeCtx).expression).toContain('待切换 K1 开始计时');

      // Flip K1 to +10V charging and advance Δt = 0.20s
      useCircuitStore.getState().updateComponentProp('k1', 'position', 0);
      const justSwitched = buildTutorialEvalContext(stage);
      expect(justSwitched.hasSwitched).toBe(true);
      expect(justSwitched.elapsedSinceSwitch).toBeCloseTo(0, 4);
      expect(justSwitched.initialCapVoltages?.['c1']).toBeCloseTo(0, 3);

      useCircuitStore.getState().stepOnce(0.5); // 0.5 * 0.4 = 0.20s
      const afterStep = buildTutorialEvalContext(stage);
      expect(afterStep.simTime).toBeCloseTo(2.2, 2);
      expect(afterStep.elapsedSinceSwitch).toBeCloseTo(0.2, 2);
      const evalExpr = stage.liveFormulas[0].evaluate(afterStep).expression;
      expect(evalExpr).toContain('Δt=0.20s');
      expect(evalExpr).toContain('初值 0.00 V');
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('verifies Vol. 2 analog physics (BJT CE bypass C_E & op-amp series regulator)', () => {
    try {
      // Lesson 15 Stage 3: Closing emitter bypass C_E boosts AC voltage gain significantly
      useTutorialStore.getState().enterTutorial('ch8-bjt-amplifiers', 2); // l15-s3
      const l15s3 = getLessonById('ch8-bjt-amplifiers').stages[2];
      useCircuitStore.getState().updateComponentProp('k_ce', 'closed', false);
      for (let i = 0; i < 15; i++) useCircuitStore.getState().stepOnce(0.02);
      const unbypassedPass = l15s3.checkpoint!.check(buildTutorialEvalContext(l15s3)).passed;
      expect(unbypassedPass).toBe(false);

      const demoOk15 = useTutorialStore.getState().runCheckpointAutoDemo();
      expect(demoOk15).toBe(true);

      // Lesson 19 Stage 2 & Stage 3: Op-Amp series regulator stabilizes Vo around 9.0V and 5.0V
      useTutorialStore.getState().enterTutorial('ch10-linear-series-regulator', 1); // l19-s2
      expect(useTutorialStore.getState().runCheckpointAutoDemo()).toBe(true);
      const reg9V = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 0;
      expect(reg9V).toBeGreaterThanOrEqual(8.7);
      expect(reg9V).toBeLessThanOrEqual(9.5);

      useTutorialStore.getState().enterTutorial('ch10-linear-series-regulator', 2); // l19-s3
      const demoOk19 = useTutorialStore.getState().runCheckpointAutoDemo();
      expect(demoOk19).toBe(true);
      const reg5V = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 0;
      expect(reg5V).toBeGreaterThanOrEqual(4.8);
      expect(reg5V).toBeLessThanOrEqual(5.3);
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });

  it('verifies Vol. 2 NE555 monostable pulse timeout, 4-bit DACs, and 2-bit Flash ADC quantization', () => {
    try {
      // Lesson 24 Stage 2: 555 Monostable holds OUT ~5V after trigger, then resets < 0.5V after tw=1.1s
      useTutorialStore.getState().enterTutorial('ch13-timer-555-pulse-circuits', 1); // l24-s2
      useCircuitStore.getState().updateComponentProp('sw_trig', 'position', 1);
      for (let i = 0; i < 30; i++) useCircuitStore.getState().stepOnce(0.02); // t ~ +0.60s < 1.10s
      const voutMid = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 0;
      expect(voutMid).toBeGreaterThan(4.3);
      for (let i = 0; i < 45; i++) useCircuitStore.getState().stepOnce(0.02); // t ~ +1.50s > 1.10s
      const voutDone = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 9;
      expect(voutDone).toBeLessThan(0.5);

      // Lesson 25 Stage 1 & 2: Weighted DAC (1010 -> -5.0V) & R-2R Ladder (1100 -> +3.75V)
      useTutorialStore.getState().enterTutorial('ch13-dac-conversion', 0); // l25-s1
      expect(useTutorialStore.getState().runCheckpointAutoDemo()).toBe(true);
      const dacWeightedV = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 0;
      expect(dacWeightedV).toBeCloseTo(-5.0, 1);

      useTutorialStore.getState().enterTutorial('ch13-dac-conversion', 1); // l25-s2
      expect(useTutorialStore.getState().runCheckpointAutoDemo()).toBe(true);
      const dacR2RV = useCircuitStore.getState().telemetryById['vm_out']?.voltageDrop ?? 0;
      expect(dacR2RV).toBeCloseTo(3.75, 1);

      // Lesson 26 Stage 2: 2-bit Flash ADC quantizes 0.5V -> 0, 1.5V -> 1, 2.5V -> 2, 3.6V -> 3
      useTutorialStore.getState().enterTutorial('ch14-adc-and-mixed-signal-capstone', 1); // l26-s2
      const samples: Array<[number, number]> = [
        [0.5, 0],
        [1.5, 1],
        [2.5, 2],
        [3.6, 3],
      ];
      for (const [vin, expectedCode] of samples) {
        useCircuitStore.getState().updateComponentProp('vin', 'voltage', vin);
        const hex = useCircuitStore.getState().telemetryById['hex1']?.logicState;
        expect(hex, `Flash ADC Vin=${vin}V`).toBe(expectedCode);
      }
    } finally {
      useTutorialStore.getState().exitTutorial(false);
    }
  });
});
