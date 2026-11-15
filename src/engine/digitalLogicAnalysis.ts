import type { CircuitComponent, CircuitData, Wire } from '../../shared/types';
import { getComponentPins, world2dTo3d } from './componentCatalog';
import { createInitialRuntimeState, solveCircuitStep } from './mnaSolver';

export interface LogicInputVar {
  id: string;
  varName: string;
  label: string;
  currentVal: 0 | 1;
}

export interface LogicOutputTarget {
  key: string; // `${componentId}:${pinId}`
  label: string;
  componentId: string;
  pinId: string;
}

export interface TruthTableRow {
  index: number;
  inputs: (0 | 1)[];
  outputs: Record<string, 0 | 1>;
}

export interface AxisSpan {
  kind: 'single' | 'contiguous' | 'wrap' | 'full';
  start: number;
  end: number;
}

export interface KMapLiteral {
  varName: string;
  negated: boolean;
}

export interface KMapLoop {
  id: string;
  pattern: string;
  termText: string;
  literals: KMapLiteral[];
  minterms: number[];
  cells: Array<{ r: number; c: number }>;
  rowSpan: AxisSpan;
  colSpan: AxisSpan;
  color: string;
}

export interface KarnaughMapData {
  varNames: string[];
  rowVarLabel: string;
  colVarLabel: string;
  rowCodes: string[];
  colCodes: string[];
  grid: Array<Array<{ minterm: number; value: 0 | 1 }>>;
  minterms: number[];
  canonicalSumText: string;
  simplifiedExpr: string;
  loops: KMapLoop[];
}

export interface DigitalAnalysisResult {
  inputs: LogicInputVar[];
  outputs: LogicOutputTarget[];
  activeOutputKey: string | null;
  rows: TruthTableRow[];
  activeRowIndex: number;
  minterms: number[];
  kmap: KarnaughMapData | null;
  isSequentialOrFeedback: boolean;
  notice: string | null;
}

const LOOP_PALETTE = [
  '#38bdf8', // sky
  '#22c55e', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#ef4444', // red
];

const GRAY_1_CODES = ['0', '1'];
const GRAY_1_VALS = [0, 1];
const GRAY_2_CODES = ['00', '01', '11', '10'];
const GRAY_2_VALS = [0, 1, 3, 2];

function countOnes(s: string): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === '1') c++;
  return c;
}

function combinePatterns(a: string, b: string): string | null {
  let diffIdx = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (a[i] === '-' || b[i] === '-' || diffIdx !== -1) return null;
      diffIdx = i;
    }
  }
  if (diffIdx === -1) return null;
  return a.slice(0, diffIdx) + '-' + a.slice(diffIdx + 1);
}

function patternMatchesMinterm(pattern: string, m: number): boolean {
  const n = pattern.length;
  for (let i = 0; i < n; i++) {
    const ch = pattern[i];
    if (ch === '-') continue;
    const bit = (m >> (n - 1 - i)) & 1;
    if ((ch === '1' ? 1 : 0) !== bit) return false;
  }
  return true;
}

function literalCount(pattern: string): number {
  let count = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '-') count++;
  }
  return count;
}

function patternToLiterals(pattern: string, varNames: string[]): KMapLiteral[] {
  const lits: KMapLiteral[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      lits.push({ varName: varNames[i], negated: false });
    } else if (pattern[i] === '0') {
      lits.push({ varName: varNames[i], negated: true });
    }
  }
  return lits;
}

function patternToText(pattern: string, varNames: string[]): string {
  const lits = patternToLiterals(pattern, varNames);
  if (lits.length === 0) return '1';
  return lits.map((l) => (l.negated ? `${l.varName}'` : l.varName)).join('');
}

function computeAxisSpan(indices: number[], axisLength: number): AxisSpan {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  if (sorted.length >= axisLength) {
    return { kind: 'full', start: 0, end: axisLength - 1 };
  }
  if (sorted.length === 1) {
    return { kind: 'single', start: sorted[0], end: sorted[0] };
  }
  // Check contiguous
  let contiguous = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      contiguous = false;
      break;
    }
  }
  if (contiguous) {
    return { kind: 'contiguous', start: sorted[0], end: sorted[sorted.length - 1] };
  }
  // Wrap-around on 4-cell Gray axis (indices 0 and 3)
  return { kind: 'wrap', start: sorted[0], end: sorted[sorted.length - 1] };
}

export function buildKarnaughMapAndSimplify(
  varNames: string[],
  rawMinterms: number[]
): KarnaughMapData | null {
  const n = varNames.length;
  if (n < 1 || n > 4) return null;

  const totalCells = 1 << n;
  const minterms = [...new Set(rawMinterms.filter((m) => m >= 0 && m < totalCells))].sort(
    (a, b) => a - b
  );
  const mintermSet = new Set(minterms);

  // Configure Gray-code axes
  let rowVarLabel = '';
  let colVarLabel = '';
  let rowCodes: string[] = [];
  let rowVals: number[] = [];
  let colCodes: string[] = [];
  let colVals: number[] = [];
  let colBits = 1;

  if (n === 1) {
    rowVarLabel = '';
    colVarLabel = varNames[0];
    rowCodes = [''];
    rowVals = [0];
    colCodes = GRAY_1_CODES;
    colVals = GRAY_1_VALS;
    colBits = 1;
  } else if (n === 2) {
    rowVarLabel = varNames[0];
    colVarLabel = varNames[1];
    rowCodes = GRAY_1_CODES;
    rowVals = GRAY_1_VALS;
    colCodes = GRAY_1_CODES;
    colVals = GRAY_1_VALS;
    colBits = 1;
  } else if (n === 3) {
    rowVarLabel = varNames[0];
    colVarLabel = `${varNames[1]}${varNames[2]}`;
    rowCodes = GRAY_1_CODES;
    rowVals = GRAY_1_VALS;
    colCodes = GRAY_2_CODES;
    colVals = GRAY_2_VALS;
    colBits = 2;
  } else {
    rowVarLabel = `${varNames[0]}${varNames[1]}`;
    colVarLabel = `${varNames[2]}${varNames[3]}`;
    rowCodes = GRAY_2_CODES;
    rowVals = GRAY_2_VALS;
    colCodes = GRAY_2_CODES;
    colVals = GRAY_2_VALS;
    colBits = 2;
  }

  const grid = rowVals.map((rv) =>
    colVals.map((cv) => {
      const m = (rv << colBits) | cv;
      return { minterm: m, value: (mintermSet.has(m) ? 1 : 0) as 0 | 1 };
    })
  );

  const canonicalSumText =
    minterms.length === 0 ? '0' : `∑m(${minterms.join(', ')})`;

  if (minterms.length === 0) {
    return {
      varNames,
      rowVarLabel,
      colVarLabel,
      rowCodes,
      colCodes,
      grid,
      minterms,
      canonicalSumText,
      simplifiedExpr: '0',
      loops: [],
    };
  }

  // Quine-McCluskey Prime Implicant Generation
  interface Implicant {
    pattern: string;
    minterms: number[];
  }

  let currentGroup = new Map<string, Implicant>();
  for (const m of minterms) {
    const pat = m.toString(2).padStart(n, '0');
    currentGroup.set(pat, { pattern: pat, minterms: [m] });
  }

  const primeImplicants: Implicant[] = [];

  while (currentGroup.size > 0) {
    const buckets: Implicant[][] = Array.from({ length: n + 1 }, () => []);
    for (const imp of currentGroup.values()) {
      buckets[countOnes(imp.pattern)].push(imp);
    }

    const used = new Set<string>();
    const nextGroup = new Map<string, Implicant>();

    for (let b = 0; b < n; b++) {
      for (const a of buckets[b]) {
        for (const c of buckets[b + 1]) {
          const combined = combinePatterns(a.pattern, c.pattern);
          if (combined) {
            used.add(a.pattern);
            used.add(c.pattern);
            if (!nextGroup.has(combined)) {
              const merged = [...new Set([...a.minterms, ...c.minterms])].sort((x, y) => x - y);
              nextGroup.set(combined, { pattern: combined, minterms: merged });
            }
          }
        }
      }
    }

    for (const imp of currentGroup.values()) {
      if (!used.has(imp.pattern)) {
        primeImplicants.push(imp);
      }
    }
    currentGroup = nextGroup;
  }

  // Prime Implicant Chart -> Essential PIs + Exact Minimal Cover
  const selectedPIs: Implicant[] = [];
  const remainingMinterms = new Set<number>(minterms);
  const availablePIs = [...primeImplicants];

  // Iteratively pull essential PIs
  let foundEssential = true;
  while (foundEssential && remainingMinterms.size > 0) {
    foundEssential = false;
    for (const m of [...remainingMinterms]) {
      const covering = availablePIs.filter((pi) => patternMatchesMinterm(pi.pattern, m));
      if (covering.length === 1) {
        const epi = covering[0];
        if (!selectedPIs.includes(epi)) {
          selectedPIs.push(epi);
          for (const cm of epi.minterms) remainingMinterms.delete(cm);
          const idx = availablePIs.indexOf(epi);
          if (idx >= 0) availablePIs.splice(idx, 1);
          foundEssential = true;
        }
      }
    }
  }

  // Branch-and-bound for any cyclic remainder (e.g. Petrick's method)
  if (remainingMinterms.size > 0) {
    const uncovered = [...remainingMinterms];
    const remPIs = availablePIs.filter((pi) =>
      uncovered.some((m) => patternMatchesMinterm(pi.pattern, m))
    );

    let bestCover: Implicant[] | null = null;
    let bestTermCount = Infinity;
    let bestLitCount = Infinity;

    const search = (coveredMask: number, chosen: Implicant[], litSum: number) => {
      if (chosen.length > bestTermCount) return;
      if (chosen.length === bestTermCount && litSum >= bestLitCount) return;

      if (coveredMask === (1 << uncovered.length) - 1) {
        bestCover = [...chosen];
        bestTermCount = chosen.length;
        bestLitCount = litSum;
        return;
      }

      // Pick the first uncovered minterm to branch on
      let targetIdx = 0;
      while ((coveredMask & (1 << targetIdx)) !== 0) targetIdx++;
      const targetM = uncovered[targetIdx];

      const candidates = remPIs
        .filter((pi) => patternMatchesMinterm(pi.pattern, targetM))
        .sort((a, b) => b.minterms.length - a.minterms.length);

      for (const cand of candidates) {
        let nextMask = coveredMask;
        for (let i = 0; i < uncovered.length; i++) {
          if (patternMatchesMinterm(cand.pattern, uncovered[i])) {
            nextMask |= 1 << i;
          }
        }
        chosen.push(cand);
        search(nextMask, chosen, litSum + literalCount(cand.pattern));
        chosen.pop();
      }
    };

    search(0, [], 0);
    if (bestCover) {
      selectedPIs.push(...(bestCover as Implicant[]));
    }
  }

  // Sort PIs nicely: largest blocks first, then lexicographical
  selectedPIs.sort((a, b) => {
    if (b.minterms.length !== a.minterms.length) return b.minterms.length - a.minterms.length;
    return a.pattern.localeCompare(b.pattern);
  });

  const loops: KMapLoop[] = selectedPIs.map((pi, idx) => {
    const cells: Array<{ r: number; c: number }> = [];
    const matchedRows: number[] = [];
    const matchedCols: number[] = [];

    for (let r = 0; r < grid.length; r++) {
      let rowHas = false;
      for (let c = 0; c < grid[r].length; c++) {
        if (patternMatchesMinterm(pi.pattern, grid[r][c].minterm)) {
          cells.push({ r, c });
          rowHas = true;
          matchedCols.push(c);
        }
      }
      if (rowHas) matchedRows.push(r);
    }

    return {
      id: `loop-${idx}`,
      pattern: pi.pattern,
      termText: patternToText(pi.pattern, varNames),
      literals: patternToLiterals(pi.pattern, varNames),
      minterms: pi.minterms,
      cells,
      rowSpan: computeAxisSpan(matchedRows, rowVals.length),
      colSpan: computeAxisSpan(matchedCols, colVals.length),
      color: LOOP_PALETTE[idx % LOOP_PALETTE.length],
    };
  });

  const simplifiedExpr =
    loops.length === 1 && loops[0].literals.length === 0
      ? '1'
      : loops.map((l) => l.termText).join(' + ');

  return {
    varNames,
    rowVarLabel,
    colVarLabel,
    rowCodes,
    colCodes,
    grid,
    minterms,
    canonicalSumText,
    simplifiedExpr,
    loops,
  };
}

export function analyzeDigitalCircuit(
  circuit: CircuitData,
  selectedOutputKey?: string | null
): DigitalAnalysisResult {
  const allInputs = circuit.components
    .filter((c) => c.type === 'LOGIC_IN' || (c.type === 'IC_PORT_IN' && !c.props.__packagedPort))
    .map((c) => ({
      id: c.id,
      varName: String(c.props.varName || c.label || 'X').trim(),
      label: c.label,
      currentVal: (Number(c.props.state) ? 1 : 0) as 0 | 1,
    }))
    .sort((a, b) => a.varName.localeCompare(b.varName, 'en'));

  let notice: string | null = null;
  let inputs = allInputs;
  if (allInputs.length > 5) {
    inputs = allInputs.slice(0, 5);
    notice = `检测到 ${allInputs.length} 个逻辑输入变量，为保证实时分析速度，真值表仅展示前 5 个变量。`;
  }

  // Gather output probes (LOGIC_OUT / IC_PORT_OUT first; fallback to combinational gate / IC outputs)
  const outputs: LogicOutputTarget[] = [];
  const logicOuts = circuit.components.filter(
    (c) => c.type === 'LOGIC_OUT' || (c.type === 'IC_PORT_OUT' && !c.props.__packagedPort)
  );
  for (const c of logicOuts) {
    const pinId = c.type === 'IC_PORT_OUT' ? 'io' : 'in';
    outputs.push({
      key: `${c.id}:${pinId}`,
      label: String(c.props.outName || c.label),
      componentId: c.id,
      pinId,
    });
  }
  if (outputs.length === 0) {
    for (const c of circuit.components) {
      if (['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'MUX_2_1'].includes(c.type)) {
        outputs.push({
          key: `${c.id}:y`,
          label: `${c.label}.Y`,
          componentId: c.id,
          pinId: 'y',
        });
      } else if (c.type === 'HALF_ADDER') {
        outputs.push({ key: `${c.id}:s`, label: `${c.label}.S`, componentId: c.id, pinId: 's' });
        outputs.push({ key: `${c.id}:c`, label: `${c.label}.C`, componentId: c.id, pinId: 'c' });
      } else if (c.type === 'FULL_ADDER') {
        outputs.push({ key: `${c.id}:s`, label: `${c.label}.S`, componentId: c.id, pinId: 's' });
        outputs.push({
          key: `${c.id}:cout`,
          label: `${c.label}.Cout`,
          componentId: c.id,
          pinId: 'cout',
        });
      } else if (
        c.type === 'CUSTOM_TRUTH_8' ||
        c.type === 'CUSTOM_TRUTH_16' ||
        c.type === 'CUSTOM_IC'
      ) {
        for (const p of getComponentPins(c)) {
          if (p.role === 'logic_out') {
            outputs.push({
              key: `${c.id}:${p.id}`,
              label: `${c.label}.${p.label}`,
              componentId: c.id,
              pinId: p.id,
            });
          }
        }
      }
    }
  }

  const isSequentialOrFeedback = circuit.components.some(
    (c) =>
      c.type === 'D_FF' ||
      c.type === 'JK_FF' ||
      c.type === 'COUNTER_4BIT' ||
      c.type === 'CLOCK' ||
      c.type === 'TIMER_555'
  );
  if (isSequentialOrFeedback && !notice) {
    notice = '电路包含时钟或触发器/计数器（时序逻辑），真值表反映当前锁存状态下的组合响应。';
  }

  if (inputs.length === 0 || outputs.length === 0) {
    return {
      inputs,
      outputs,
      activeOutputKey: null,
      rows: [],
      activeRowIndex: -1,
      minterms: [],
      kmap: null,
      isSequentialOrFeedback,
      notice:
        inputs.length === 0
          ? '请在电路中添加“逻辑电平开关 (LOGIC_IN)”作为输入变量以生成真值表与卡诺图。'
          : '请在电路中添加“逻辑探针 (LOGIC_OUT)”或逻辑门作为输出观测端。',
    };
  }

  const activeOutputKey =
    selectedOutputKey && outputs.some((o) => o.key === selectedOutputKey)
      ? selectedOutputKey
      : outputs[0].key;

  const n = inputs.length;
  const numRows = 1 << n;
  const rows: TruthTableRow[] = [];

  for (let idx = 0; idx < numRows; idx++) {
    const inputBits: (0 | 1)[] = [];
    const overrideLogicInputs: Record<string, number> = {};
    for (let bitIdx = 0; bitIdx < n; bitIdx++) {
      const bit = ((idx >> (n - 1 - bitIdx)) & 1) as 0 | 1;
      inputBits.push(bit);
      overrideLogicInputs[inputs[bitIdx].id] = bit;
    }

    const freshState = createInitialRuntimeState();
    const res = solveCircuitStep(circuit, freshState, 0, { overrideLogicInputs });
    const rowOutputs: Record<string, 0 | 1> = {};
    for (const out of outputs) {
      const v = res.nodeVoltagesByPinKey[out.key] ?? 0;
      rowOutputs[out.key] = v >= 2.5 ? 1 : 0;
    }

    rows.push({
      index: idx,
      inputs: inputBits,
      outputs: rowOutputs,
    });
  }

  let activeRowIndex = 0;
  for (let bitIdx = 0; bitIdx < n; bitIdx++) {
    activeRowIndex = (activeRowIndex << 1) | inputs[bitIdx].currentVal;
  }

  const minterms = rows
    .filter((r) => r.outputs[activeOutputKey] === 1)
    .map((r) => r.index);

  const kmap =
    n <= 4
      ? buildKarnaughMapAndSimplify(
          inputs.map((i) => i.varName),
          minterms
        )
      : null;

  if (n > 4 && !notice) {
    notice = '卡诺图支持 1~4 变量可视化化简；当前变量超过 4 个，仅展示真值表。';
  }

  return {
    inputs,
    outputs,
    activeOutputKey,
    rows,
    activeRowIndex,
    minterms,
    kmap,
    isSequentialOrFeedback,
    notice,
  };
}

export function synthesizeCircuitFromMinterms(
  varNames: string[],
  minterms: number[]
): CircuitData {
  const kmap = buildKarnaughMapAndSimplify(varNames, minterms);
  const components: CircuitComponent[] = [];
  const wires: Wire[] = [];

  let uidCounter = 1;
  const nextId = (prefix: string) => `${prefix}_syn_${uidCounter++}`;
  const addComp = (
    type: CircuitComponent['type'],
    label: string,
    x2d: number,
    y2d: number,
    props: Record<string, number | string | boolean> = {}
  ): CircuitComponent => {
    const comp: CircuitComponent = {
      id: nextId(type.toLowerCase()),
      type,
      label,
      pos2d: { x: x2d, y: y2d },
      rot2d: 0,
      pos3d: world2dTo3d({ x: x2d, y: y2d }),
      rotationY: 0,
      props,
    };
    components.push(comp);
    return comp;
  };

  const connect = (
    fromComp: CircuitComponent,
    fromPin: string,
    toComp: CircuitComponent,
    toPin: string,
    color = '#38bdf8'
  ) => {
    wires.push({
      id: nextId('w'),
      from: { componentId: fromComp.id, pinId: fromPin },
      to: { componentId: toComp.id, pinId: toPin },
      color,
    });
  };

  // Create LOGIC_IN inputs
  const inputComps = new Map<string, CircuitComponent>();
  varNames.forEach((vn, idx) => {
    const c = addComp('LOGIC_IN', `IN_${vn}`, 120, 120 + idx * 110, {
      state: 0,
      varName: vn,
    });
    inputComps.set(vn, c);
  });

  const outComp = addComp('LOGIC_OUT', 'Y', 760, 260, { outName: 'Y' });

  if (!kmap || kmap.loops.length === 0) {
    // Constant 0: leave Y unconnected or tied to GND
    const gnd = addComp('GROUND', 'GND1', 640, 320);
    connect(gnd, 'gnd', outComp, 'in', '#475569');
    return { components, wires };
  }

  // Constant 1 case (single loop with 0 literals)
  if (kmap.loops.length === 1 && kmap.loops[0].literals.length === 0) {
    const vcc = addComp('DC_SOURCE', 'VCC', 580, 260, { voltage: 5 });
    const gnd = addComp('GROUND', 'GND1', 500, 340);
    connect(vcc, 'neg', gnd, 'gnd', '#475569');
    connect(vcc, 'pos', outComp, 'in', '#ef4444');
    return { components, wires };
  }

  // Create shared NOT gates for any negated literal
  const negatedSources = new Map<string, { comp: CircuitComponent; pin: string }>();
  let notIdx = 1;
  for (const loop of kmap.loops) {
    for (const lit of loop.literals) {
      if (lit.negated && !negatedSources.has(lit.varName)) {
        const inComp = inputComps.get(lit.varName)!;
        const notGate = addComp('NOT', `U_NOT${notIdx++}`, 250, inComp.pos2d.y + 40);
        connect(inComp, 'out', notGate, 'a', '#eab308');
        negatedSources.set(lit.varName, { comp: notGate, pin: 'y' });
      }
    }
  }

  // Build each product term with 2-input AND cascade
  let gateCounter = 1;
  const termOutputs: Array<{ comp: CircuitComponent; pin: string }> = [];

  kmap.loops.forEach((loop, lIdx) => {
    const termY = 120 + lIdx * 105;
    const sources = loop.literals.map((lit) => {
      if (lit.negated) return negatedSources.get(lit.varName)!;
      return { comp: inputComps.get(lit.varName)!, pin: 'out' };
    });

    if (sources.length === 1) {
      termOutputs.push(sources[0]);
      return;
    }

    let prev = sources[0];
    for (let i = 1; i < sources.length; i++) {
      const andGate = addComp(
        'AND',
        `U${gateCounter++}`,
        390 + (i - 1) * 110,
        termY
      );
      connect(prev.comp, prev.pin, andGate, 'a', '#38bdf8');
      connect(sources[i].comp, sources[i].pin, andGate, 'b', '#38bdf8');
      prev = { comp: andGate, pin: 'y' };
    }
    termOutputs.push(prev);
  });

  // Combine product terms with 2-input OR cascade
  if (termOutputs.length === 1) {
    connect(termOutputs[0].comp, termOutputs[0].pin, outComp, 'in', '#22c55e');
  } else {
    let prev = termOutputs[0];
    for (let i = 1; i < termOutputs.length; i++) {
      const orGate = addComp(
        'OR',
        `U${gateCounter++}`,
        560 + Math.floor((i - 1) / 2) * 90,
        160 + (i - 1) * 90
      );
      connect(prev.comp, prev.pin, orGate, 'a', '#22c55e');
      connect(termOutputs[i].comp, termOutputs[i].pin, orGate, 'b', '#22c55e');
      prev = { comp: orGate, pin: 'y' };
    }
    outComp.pos2d = { x: prev.comp.pos2d.x + 120, y: prev.comp.pos2d.y };
    outComp.pos3d = world2dTo3d(outComp.pos2d);
    connect(prev.comp, prev.pin, outComp, 'in', '#22c55e');
  }

  return { components, wires };
}
