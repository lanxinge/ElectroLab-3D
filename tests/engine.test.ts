import { describe, expect, it } from 'vitest';
import type { CircuitComponent, CircuitData, Wire } from '../shared/types';
import {
  analyzeDigitalCircuit,
  buildKarnaughMapAndSimplify,
  synthesizeCircuitFromMinterms,
} from '../src/engine/digitalLogicAnalysis';
import { createInitialRuntimeState, solveCircuitStep } from '../src/engine/mnaSolver';
import { CIRCUIT_PRESETS } from '../src/presets/circuitPresets';

function makeComp(
  id: string,
  type: CircuitComponent['type'],
  props: Record<string, number | string | boolean> = {}
): CircuitComponent {
  return {
    id,
    type,
    label: id.toUpperCase(),
    pos3d: [0, 0, 0],
    rotationY: 0,
    pos2d: { x: 100, y: 100 },
    rot2d: 0,
    props,
  };
}

function makeWire(id: string, fc: string, fp: string, tc: string, tp: string): Wire {
  return {
    id,
    from: { componentId: fc, pinId: fp },
    to: { componentId: tc, pinId: tp },
    color: '#38bdf8',
  };
}

describe('Mixed-Signal MNA Circuit Engine', () => {
  it('solves DC voltage divider accurately (10V, 1k + 1k => 5V, 5mA, 25mW)', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000, maxPower: 0.5 }),
        makeComp('r2', 'RESISTOR', { resistance: 1000, maxPower: 0.5 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'r2', 'a'),
        makeWire('w3', 'r2', 'b', 'v1', 'neg'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.converged).toBe(true);
    expect(res.implicitGroundUsed).toBe(false);
    expect(res.telemetryById.r1.voltageDrop).toBeCloseTo(5, 2);
    expect(res.telemetryById.r2.voltageDrop).toBeCloseTo(5, 2);
    expect(res.telemetryById.r1.current).toBeCloseTo(0.005, 4);
    expect(res.telemetryById.r1.power).toBeCloseTo(0.025, 4);
    expect(res.telemetryById.r1.overloaded).toBe(false);
  });

  it('verifies parallel KCL and detects component power overload', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('r1', 'RESISTOR', { resistance: 100, maxPower: 0.5 }), // P = 10^2 / 100 = 1W > 0.5W!
        makeComp('r2', 'RESISTOR', { resistance: 200, maxPower: 1.0 }), // P = 10^2 / 200 = 0.5W <= 1.0W
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'v1', 'pos', 'r2', 'a'),
        makeWire('w3', 'r1', 'b', 'gnd', 'gnd'),
        makeWire('w4', 'r2', 'b', 'gnd', 'gnd'),
        makeWire('w5', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.telemetryById.v1.current).toBeCloseTo(0.15, 3);
    expect(res.telemetryById.r1.overloaded).toBe(true);
    expect(res.telemetryById.r1.loadRatio).toBeGreaterThan(1.5);
    expect(res.telemetryById.r2.overloaded).toBe(false);
  });

  it('handles direct short-circuit safely without NaN and triggers overload alert', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 5 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'v1', 'neg'),
        makeWire('w2', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(Number.isFinite(res.telemetryById.v1.current)).toBe(true);
    expect(res.telemetryById.v1.current).toBeGreaterThan(100);
    expect(res.telemetryById.v1.overloaded).toBe(true);
  });

  it('models silicon diode forward drop (~0.6-0.75V) and reverse blocking (~0A)', () => {
    // Forward bias: 5V -> R=1k -> Diode -> GND
    const fwdCircuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 5 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000 }),
        makeComp('d1', 'DIODE'),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'd1', 'anode'),
        makeWire('w3', 'd1', 'cathode', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const fwdRes = solveCircuitStep(fwdCircuit, createInitialRuntimeState(), 0);
    expect(fwdRes.telemetryById.d1.voltageDrop).toBeGreaterThan(0.55);
    expect(fwdRes.telemetryById.d1.voltageDrop).toBeLessThan(0.8);
    expect(fwdRes.telemetryById.d1.current).toBeGreaterThan(0.004);

    // Reverse bias: swap diode polarity
    const revCircuit: CircuitData = {
      ...fwdCircuit,
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'd1', 'cathode'),
        makeWire('w3', 'd1', 'anode', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const revRes = solveCircuitStep(revCircuit, createInitialRuntimeState(), 0);
    expect(Math.abs(revRes.telemetryById.r1.current)).toBeLessThan(1e-5);
  });

  it('simulates RC transient charging over 5*tau accurately', () => {
    // R = 1000 Ohm, C = 100 uF => tau = 0.1s; 5*tau = 0.5s
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 6 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000 }),
        makeComp('c1', 'CAPACITOR', { capacitance: 100 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'c1', 'pos'),
        makeWire('w3', 'c1', 'neg', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const runtime = createInitialRuntimeState();
    let res = solveCircuitStep(circuit, runtime, 0.005);
    for (let i = 1; i < 100; i++) {
      res = solveCircuitStep(circuit, runtime, 0.005);
    }
    // After 0.5s = 5*tau, Vc should be ~ 6 * (1 - e^-5) = 5.959V
    expect(res.telemetryById.c1.voltageDrop).toBeGreaterThan(5.9);
    expect(res.telemetryById.c1.voltageDrop).toBeLessThanOrEqual(6.0);
  });

  it('solves Op-Amp inverting amplifier accurately (Vin=1V, Rin=1k, Rf=3k => Vout=-3.0V)', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 1 }),
        makeComp('rin', 'RESISTOR', { resistance: 1000 }),
        makeComp('rf', 'RESISTOR', { resistance: 3000 }),
        makeComp('u1', 'OPAMP', { railPos: 12, railNeg: -12, gain: 50000 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'rin', 'a'),
        makeWire('w2', 'rin', 'b', 'u1', 'inm'),
        makeWire('w3', 'u1', 'inm', 'rf', 'a'),
        makeWire('w4', 'rf', 'b', 'u1', 'out'),
        makeWire('w5', 'u1', 'inp', 'gnd', 'gnd'),
        makeWire('w6', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.telemetryById.u1.voltageDrop).toBeCloseTo(-3.0, 2);
  });
});

describe('Digital Logic Truth Table, Gray-Code K-Map & Synthesis', () => {
  it('analyzes 3-variable Majority Voter preset -> ∑m(3,5,6,7) and minimal SOP AB+BC+AC', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'preset-majority-voter')!;
    const analysis = analyzeDigitalCircuit(preset.circuit);
    expect(analysis.inputs.map((i) => i.varName)).toEqual(['A', 'B', 'C']);
    expect(analysis.minterms).toEqual([3, 5, 6, 7]);
    expect(analysis.kmap).not.toBeNull();
    expect(analysis.kmap!.colCodes).toEqual(['00', '01', '11', '10']);
    expect(analysis.kmap!.loops.length).toBe(3);
    const terms = analysis.kmap!.loops.map((l) => l.termText).sort();
    expect(terms).toEqual(['AB', 'AC', 'BC']);
  });

  it('analyzes 1-bit Full Adder preset accurately across all 8 input combinations', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'preset-full-adder-hex')!;
    const analysis = analyzeDigitalCircuit(preset.circuit);
    expect(analysis.rows.length).toBe(8);
    const sOut = analysis.outputs.find((o) => o.label === 'S')!;
    const cOut = analysis.outputs.find((o) => o.label === 'Cout')!;
    for (const row of analysis.rows) {
      const [a, b, cin] = row.inputs;
      expect(row.outputs[sOut.key]).toBe((a ^ b ^ cin) as 0 | 1);
      expect(row.outputs[cOut.key]).toBe(a + b + cin >= 2 ? 1 : 0);
    }
  });

  it('simplifies 4-variable 4-corner wrap-around K-Map ∑m(0,2,8,10) => B\'D\'', () => {
    const kmap = buildKarnaughMapAndSimplify(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
    expect(kmap).not.toBeNull();
    expect(kmap!.rowCodes).toEqual(['00', '01', '11', '10']);
    expect(kmap!.colCodes).toEqual(['00', '01', '11', '10']);
    expect(kmap!.loops.length).toBe(1);
    expect(kmap!.loops[0].rowSpan.kind).toBe('wrap');
    expect(kmap!.loops[0].colSpan.kind).toBe('wrap');
    expect(kmap!.simplifiedExpr).toBe("B'D'");
  });

  it('synthesizes a working gate circuit from minterms whose truth table matches 100%', () => {
    const targetMinterms = [1, 2, 4, 7]; // 3-var odd parity (XOR)
    const synthesized = synthesizeCircuitFromMinterms(['A', 'B', 'C'], targetMinterms);
    const verified = analyzeDigitalCircuit(synthesized);
    expect(verified.minterms).toEqual(targetMinterms);
  });
});
