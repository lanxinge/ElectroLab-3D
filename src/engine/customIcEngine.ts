import type {
  CircuitComponent,
  CircuitData,
  CustomIcPayload,
  CustomIcPinSpec,
  PinDefinition,
  PinRole,
  TruthChipConfig,
  TruthSlotDef,
} from '../../shared/types';

export function getDefaultTruthChipConfig(slotCount: 8 | 16): TruthChipConfig {
  if (slotCount === 8) {
    const slots: TruthSlotDef[] = [
      { pinId: 's1', name: 'A', role: 'IN' },
      { pinId: 's2', name: 'B', role: 'IN' },
      { pinId: 's3', name: 'C', role: 'IN' },
      { pinId: 's4', name: 'NC4', role: 'NC' },
      { pinId: 's5', name: 'MAJ', role: 'OUT' },
      { pinId: 's6', name: 'ODD', role: 'OUT' },
      { pinId: 's7', name: 'AND3', role: 'OUT' },
      { pinId: 's8', name: 'OR3', role: 'OUT' },
    ];
    // 3 inputs -> 8 combinations, 4 outputs (MAJ, ODD, AND3, OR3)
    const rows: Record<string, string> = {};
    for (let i = 0; i < 8; i++) {
      const a = (i >> 2) & 1;
      const b = (i >> 1) & 1;
      const c = i & 1;
      const key = `${a}${b}${c}`;
      const maj = a + b + c >= 2 ? 1 : 0;
      const odd = a ^ b ^ c;
      const and3 = a & b & c;
      const or3 = a | b | c;
      rows[key] = `${maj}${odd}${and3}${or3}`;
    }
    return {
      chipName: '表决与奇偶芯片 (8槽)',
      mode: 'table',
      slots,
      rows,
      expressions: {
        s5: '(A & B) | (B & C) | (A & C)',
        s6: 'A ^ B ^ C',
        s7: 'A & B & C',
        s8: 'A | B | C',
      },
    };
  }

  // 16-slot default: 4 inputs (D3..D0), 4 NC, 8 outputs (Y7..Y0) -> default 3-to-8/4-to-8 LUT
  const slots: TruthSlotDef[] = [
    { pinId: 's1', name: 'D3', role: 'IN' },
    { pinId: 's2', name: 'D2', role: 'IN' },
    { pinId: 's3', name: 'D1', role: 'IN' },
    { pinId: 's4', name: 'D0', role: 'IN' },
    { pinId: 's5', name: 'NC5', role: 'NC' },
    { pinId: 's6', name: 'NC6', role: 'NC' },
    { pinId: 's7', name: 'NC7', role: 'NC' },
    { pinId: 's8', name: 'NC8', role: 'NC' },
    { pinId: 's9', name: 'G3', role: 'OUT' },
    { pinId: 's10', name: 'G2', role: 'OUT' },
    { pinId: 's11', name: 'G1', role: 'OUT' },
    { pinId: 's12', name: 'G0', role: 'OUT' },
    { pinId: 's13', name: 'PAR', role: 'OUT' },
    { pinId: 's14', name: 'NZ', role: 'OUT' },
    { pinId: 's15', name: 'EQ', role: 'OUT' },
    { pinId: 's16', name: 'MAX', role: 'OUT' },
  ];

  // Binary-to-Gray + status flags
  const rows: Record<string, string> = {};
  for (let n = 0; n < 16; n++) {
    const d3 = (n >> 3) & 1;
    const d2 = (n >> 2) & 1;
    const d1 = (n >> 1) & 1;
    const d0 = n & 1;
    const key = `${d3}${d2}${d1}${d0}`;
    const g3 = d3;
    const g2 = d3 ^ d2;
    const g1 = d2 ^ d1;
    const g0 = d1 ^ d0;
    const par = d3 ^ d2 ^ d1 ^ d0;
    const nz = d3 | d2 | d1 | d0;
    const eq = (d3 === d1 && d2 === d0) ? 1 : 0;
    const max = d3 & d2 & d1 & d0;
    rows[key] = `${g3}${g2}${g1}${g0}${par}${nz}${eq}${max}`;
  }

  return {
    chipName: '格雷码转换阵列 (16槽)',
    mode: 'table',
    slots,
    rows,
    expressions: {
      s9: 'D3',
      s10: 'D3 ^ D2',
      s11: 'D2 ^ D1',
      s12: 'D1 ^ D0',
      s13: 'D3 ^ D2 ^ D1 ^ D0',
      s14: 'D3 | D2 | D1 | D0',
      s15: '!(D3 ^ D1) & !(D2 ^ D0)',
      s16: 'D3 & D2 & D1 & D0',
    },
  };
}

export function parseTruthChipConfig(comp: CircuitComponent): TruthChipConfig {
  const slotCount: 8 | 16 = comp.type === 'CUSTOM_TRUTH_16' ? 16 : 8;
  const raw = String(comp.props?.truthConfigJson ?? '');
  if (!raw.trim()) {
    return getDefaultTruthChipConfig(slotCount);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<TruthChipConfig>;
    if (!Array.isArray(parsed.slots) || parsed.slots.length !== slotCount) {
      return getDefaultTruthChipConfig(slotCount);
    }
    return {
      chipName: String(parsed.chipName || (slotCount === 16 ? '16槽真值芯片' : '8槽真值芯片')),
      mode: parsed.mode === 'expr' ? 'expr' : 'table',
      slots: parsed.slots.map((s, idx) => ({
        pinId: String(s.pinId || `s${idx + 1}`),
        name: String(s.name || `P${idx + 1}`).slice(0, 8),
        role: s.role === 'IN' || s.role === 'OUT' ? s.role : 'NC',
      })),
      rows: parsed.rows && typeof parsed.rows === 'object' ? { ...parsed.rows } : {},
      expressions:
        parsed.expressions && typeof parsed.expressions === 'object' ? { ...parsed.expressions } : {},
    };
  } catch {
    return getDefaultTruthChipConfig(slotCount);
  }
}

/**
 * Safe recursive-descent boolean expression evaluator (zero eval/Function).
 * Supports operators (lowest to highest precedence):
 *   OR:  |  +
 *   XOR: ^
 *   AND: &  *
 *   NOT: !  ~
 *   Atoms: 0, 1, identifier names (case-insensitive), parenthesized (...)
 */
export interface BooleanExprValidationResult {
  valid: boolean;
  error?: string;
}

interface BoolToken {
  kind: 'ident' | 'const' | 'op' | 'lparen' | 'rparen';
  value: string;
  pos: number;
}

function tokenizeBooleanExpr(
  expr: string
): { tokens: BoolToken[]; error?: string } {
  const clean = expr || '';
  const tokens: BoolToken[] = [];
  let pos = 0;

  while (pos < clean.length) {
    const ch = clean[pos];
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen', value: '(', pos });
      pos++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', value: ')', pos });
      pos++;
      continue;
    }
    if ('|+^&*!~'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch, pos });
      pos++;
      continue;
    }
    if (ch === '0' || ch === '1') {
      const next = clean[pos + 1];
      if (next && /[A-Za-z0-9_]/.test(next)) {
        return {
          tokens,
          error: `常量 “${ch}${next}” 无效：布尔字面量只能为独立的 0 或 1`,
        };
      }
      tokens.push({ kind: 'const', value: ch, pos });
      pos++;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = pos;
      pos++;
      while (pos < clean.length && /[A-Za-z0-9_]/.test(clean[pos])) {
        pos++;
      }
      tokens.push({ kind: 'ident', value: clean.slice(start, pos), pos: start });
      continue;
    }
    return {
      tokens,
      error: `存在无法识别的符号 “${ch}”（允许变量名、0/1、括号与运算符 ! ~ & * ^ | +）`,
    };
  }

  return { tokens };
}

function parseValidatedBooleanAst(
  expr: string,
  allowedVars?: string[]
): { evaluate: (vars: Record<string, number>) => 0 | 1; error?: string } {
  const clean = (expr || '').trim();
  if (!clean) {
    return {
      evaluate: () => 0,
      error: '公式不能为空，请输入有效布尔表达式（例如 A * B 或 0 / 1）',
    };
  }

  const { tokens, error: lexErr } = tokenizeBooleanExpr(clean);
  if (lexErr) {
    return { evaluate: () => 0, error: lexErr };
  }
  if (tokens.length === 0) {
    return { evaluate: () => 0, error: '公式不能为空' };
  }

  const upperAllowed =
    allowedVars !== undefined
      ? new Set(allowedVars.map((v) => v.trim().toUpperCase()).filter(Boolean))
      : null;
  const availableLabel = allowedVars && allowedVars.length > 0 ? allowedVars.join(', ') : '无';

  let idx = 0;
  const peek = (): BoolToken | undefined => tokens[idx];
  const consume = (): BoolToken | undefined => tokens[idx++];

  const parseOr = (): (vars: Record<string, number>) => number => {
    let left = parseXor();
    while (peek()?.kind === 'op' && (peek()!.value === '|' || peek()!.value === '+')) {
      const op = consume()!;
      if (!peek()) {
        throw new Error(`运算符 “${op.value}” 后缺少右操作数`);
      }
      const right = parseXor();
      const l = left;
      const r = right;
      left = (vars) => (l(vars) || r(vars) ? 1 : 0);
    }
    return left;
  };

  const parseXor = (): (vars: Record<string, number>) => number => {
    let left = parseAnd();
    while (peek()?.kind === 'op' && peek()!.value === '^') {
      const op = consume()!;
      if (!peek()) {
        throw new Error(`运算符 “${op.value}” 后缺少右操作数`);
      }
      const right = parseAnd();
      const l = left;
      const r = right;
      left = (vars) => (l(vars) ^ r(vars) ? 1 : 0);
    }
    return left;
  };

  const parseAnd = (): (vars: Record<string, number>) => number => {
    let left = parseUnary();
    while (peek()?.kind === 'op' && (peek()!.value === '&' || peek()!.value === '*')) {
      const op = consume()!;
      if (!peek()) {
        throw new Error(`运算符 “${op.value}” 后缺少右操作数`);
      }
      const right = parseUnary();
      const l = left;
      const r = right;
      left = (vars) => (l(vars) && r(vars) ? 1 : 0);
    }
    return left;
  };

  const parseUnary = (): (vars: Record<string, number>) => number => {
    const tok = peek();
    if (tok?.kind === 'op' && (tok.value === '!' || tok.value === '~')) {
      consume();
      if (!peek()) {
        throw new Error(`单目非运算符 “${tok.value}” 后缺少操作数`);
      }
      const inner = parseUnary();
      return (vars) => (inner(vars) ? 0 : 1);
    }
    return parsePrimary();
  };

  const parsePrimary = (): (vars: Record<string, number>) => number => {
    const tok = peek();
    if (!tok) {
      throw new Error('表达式不完整：缺少操作数');
    }
    if (tok.kind === 'lparen') {
      consume();
      if (peek()?.kind === 'rparen') {
        throw new Error('括号内不能为空 “()”');
      }
      if (!peek()) {
        throw new Error('括号不匹配：左括号 “(” 后缺少内容和右括号 “)”');
      }
      const inner = parseOr();
      const closeTok = peek();
      if (!closeTok || closeTok.kind !== 'rparen') {
        throw new Error('括号不匹配：缺少闭合的右括号 “)”');
      }
      consume();
      return inner;
    }
    if (tok.kind === 'rparen') {
      throw new Error('括号不匹配：存在多余的右括号 “)”');
    }
    if (tok.kind === 'op') {
      throw new Error(`缺少操作数：在运算符 “${tok.value}” 之前没有合法左操作数`);
    }
    if (tok.kind === 'const') {
      consume();
      const bit = tok.value === '1' ? 1 : 0;
      return () => bit;
    }
    consume();
    const identUpper = tok.value.toUpperCase();
    if (upperAllowed && !upperAllowed.has(identUpper)) {
      throw new Error(`未知变量 “${tok.value}”（当前可用输入引脚: ${availableLabel}）`);
    }
    return (vars) => (vars[identUpper] ? 1 : 0);
  };

  try {
    const evaluator = parseOr();
    const trailing = peek();
    if (trailing) {
      if (trailing.kind === 'rparen') {
        return { evaluate: () => 0, error: '括号不匹配：存在多余的右括号 “)”' };
      }
      if (trailing.kind === 'ident' || trailing.kind === 'const' || trailing.kind === 'lparen') {
        return {
          evaluate: () => 0,
          error: `在 “${trailing.value}” 前缺少运算符（如 &、*、+、|、^）`,
        };
      }
      return {
        evaluate: () => 0,
        error: `表达式末尾存在多余符号 “${trailing.value}”`,
      };
    }
    return { evaluate: (vars) => (evaluator(vars) ? 1 : 0) };
  } catch (err) {
    return {
      evaluate: () => 0,
      error: err instanceof Error ? err.message : '布尔公式语法无效',
    };
  }
}

export function validateBooleanExpression(
  expr: string,
  allowedVars?: string[]
): BooleanExprValidationResult {
  const parsed = parseValidatedBooleanAst(expr, allowedVars);
  return parsed.error ? { valid: false, error: parsed.error } : { valid: true };
}

export function evalBooleanExpression(expr: string, vars: Record<string, number>): 0 | 1 {
  const parsed = parseValidatedBooleanAst(expr);
  if (parsed.error) return 0;

  const upperVars: Record<string, number> = {};
  for (const [k, v] of Object.entries(vars)) {
    upperVars[k.toUpperCase()] = v ? 1 : 0;
  }
  return parsed.evaluate(upperVars);
}

export function evaluateTruthChipOutputs(
  comp: CircuitComponent,
  getInputBit: (pinId: string) => 0 | 1
): Record<string, 0 | 1> {
  const cfg = parseTruthChipConfig(comp);
  const inSlots = cfg.slots.filter((s) => s.role === 'IN');
  const outSlots = cfg.slots.filter((s) => s.role === 'OUT');

  const vars: Record<string, number> = {};
  const bits: number[] = [];
  for (const s of inSlots) {
    const bit = getInputBit(s.pinId);
    bits.push(bit);
    vars[s.pinId] = bit;
    if (s.name) vars[s.name] = bit;
  }
  const vecKey = bits.join('');

  const result: Record<string, 0 | 1> = {};
  if (cfg.mode === 'table' && inSlots.length <= 8 && Object.keys(cfg.rows).length > 0) {
    const outStr = cfg.rows[vecKey] ?? '';
    outSlots.forEach((s, idx) => {
      result[s.pinId] = outStr[idx] === '1' ? 1 : 0;
    });
    return result;
  }

  for (const s of outSlots) {
    const expr = cfg.expressions[s.pinId] ?? '';
    result[s.pinId] = evalBooleanExpression(expr, vars);
  }
  return result;
}

export function buildDipPinLayout(
  pinSpecs: Array<{ id: string; label: string; role: PinRole; side?: 'left' | 'right' }>
): PinDefinition[] {
  const leftSpecs: typeof pinSpecs = [];
  const rightSpecs: typeof pinSpecs = [];

  const hasExplicitSides = pinSpecs.some((p) => p.side !== undefined);
  if (hasExplicitSides) {
    for (const p of pinSpecs) {
      if (p.side === 'right') rightSpecs.push(p);
      else leftSpecs.push(p);
    }
  } else {
    const split = Math.ceil(pinSpecs.length / 2);
    leftSpecs.push(...pinSpecs.slice(0, split));
    rightSpecs.push(...pinSpecs.slice(split));
  }

  const maxSide = Math.max(leftSpecs.length, rightSpecs.length, 2);
  const pitch3d = maxSide >= 6 ? 0.36 : 0.44;
  const halfW3d = maxSide >= 6 ? 1.15 : 0.95;
  const pitch2d = maxSide >= 6 ? 22 : 28;
  const halfW2d = maxSide >= 6 ? 56 : 48;

  const pins: PinDefinition[] = [];
  leftSpecs.forEach((p, idx) => {
    const centerIdx = idx - (leftSpecs.length - 1) / 2;
    pins.push({
      id: p.id,
      label: p.label,
      role: p.role,
      offset3d: [-halfW3d, 0.12, Number((centerIdx * pitch3d).toFixed(3))],
      offset2d: { x: -halfW2d, y: Math.round(centerIdx * pitch2d) },
    });
  });

  rightSpecs.forEach((p, idx) => {
    const centerIdx = idx - (rightSpecs.length - 1) / 2;
    pins.push({
      id: p.id,
      label: p.label,
      role: p.role,
      offset3d: [halfW3d, 0.12, Number((centerIdx * pitch3d).toFixed(3))],
      offset2d: { x: halfW2d, y: Math.round(centerIdx * pitch2d) },
    });
  });

  return pins;
}

export function getTruthChipPins(comp: CircuitComponent): PinDefinition[] {
  const cfg = parseTruthChipConfig(comp);
  const activeSlots = cfg.slots.filter((s) => s.role !== 'NC');
  const displaySlots = activeSlots.length > 0 ? activeSlots : cfg.slots;
  return buildDipPinLayout(
    displaySlots.map((s) => ({
      id: s.pinId,
      label: s.name || s.pinId,
      role: s.role === 'IN' ? 'logic_in' : s.role === 'OUT' ? 'logic_out' : 'passive',
      side: s.role === 'OUT' ? 'right' : 'left',
    }))
  );
}

const DEFAULT_FALLBACK_IC_PAYLOAD: CustomIcPayload = {
  version: 1,
  name: '封装异或模块',
  codeName: 'U_XOR',
  description: '示例封装集成芯片 (由输入输出端口与内部异或门封装而成)',
  color: '#0284c7',
  pins: [
    { pinId: 'p1', name: 'IN1', direction: 'in', anchorCompId: 'in1' },
    { pinId: 'p2', name: 'IN2', direction: 'in', anchorCompId: 'in2' },
    { pinId: 'p3', name: 'OUT', direction: 'out', anchorCompId: 'out1' },
  ],
  internalCircuit: {
    components: [
      {
        id: 'in1',
        type: 'IC_PORT_IN',
        label: 'IN1',
        pos3d: [-3, 0, -1],
        rotationY: 0,
        pos2d: { x: 180, y: 200 },
        rot2d: 0,
        props: { __packagedPort: true, state: 0 },
      },
      {
        id: 'in2',
        type: 'IC_PORT_IN',
        label: 'IN2',
        pos3d: [-3, 0, 1],
        rotationY: 0,
        pos2d: { x: 180, y: 300 },
        rot2d: 0,
        props: { __packagedPort: true, state: 0 },
      },
      {
        id: 'g1',
        type: 'XOR',
        label: 'XOR1',
        pos3d: [0, 0, 0],
        rotationY: 0,
        pos2d: { x: 380, y: 250 },
        rot2d: 0,
        props: {},
      },
      {
        id: 'out1',
        type: 'IC_PORT_OUT',
        label: 'OUT',
        pos3d: [3, 0, 0],
        rotationY: 0,
        pos2d: { x: 560, y: 250 },
        rot2d: 0,
        props: { __packagedPort: true },
      },
    ],
    wires: [
      { id: 'w1', from: { componentId: 'in1', pinId: 'io' }, to: { componentId: 'g1', pinId: 'a' }, color: '#38bdf8' },
      { id: 'w2', from: { componentId: 'in2', pinId: 'io' }, to: { componentId: 'g1', pinId: 'b' }, color: '#38bdf8' },
      { id: 'w3', from: { componentId: 'g1', pinId: 'y' }, to: { componentId: 'out1', pinId: 'io' }, color: '#22c55e' },
    ],
  },
};

export function parseCustomIcPayload(comp: CircuitComponent): CustomIcPayload {
  const raw = String(comp.props?.icJson ?? '');
  if (!raw.trim()) return DEFAULT_FALLBACK_IC_PAYLOAD;
  try {
    const parsed = JSON.parse(raw) as Partial<CustomIcPayload>;
    if (
      parsed &&
      Array.isArray(parsed.pins) &&
      parsed.pins.length > 0 &&
      parsed.internalCircuit &&
      Array.isArray(parsed.internalCircuit.components)
    ) {
      return {
        version: 1,
        name: String(parsed.name || comp.label || '自定义芯片'),
        codeName: String(parsed.codeName || comp.label || 'IC'),
        description: String(parsed.description || ''),
        color: String(parsed.color || '#0284c7'),
        pins: parsed.pins,
        internalCircuit: parsed.internalCircuit,
      };
    }
  } catch {
    // fallback below
  }
  return DEFAULT_FALLBACK_IC_PAYLOAD;
}

export function getCustomIcPins(comp: CircuitComponent): PinDefinition[] {
  const payload = parseCustomIcPayload(comp);
  return buildDipPinLayout(
    payload.pins.map((p) => ({
      id: p.pinId,
      label: p.name,
      role: p.direction === 'in' ? 'logic_in' : 'logic_out',
      side: p.direction === 'in' ? 'left' : 'right',
    }))
  );
}

/**
 * Inspects a circuit (with IC_PORT_IN / IC_PORT_OUT, or fallback LOGIC_IN / LOGIC_OUT)
 * and packages it into a reusable hierarchical CustomIcPayload.
 */
export function packageCircuitAsIc(
  sourceCircuit: CircuitData,
  meta: { name: string; codeName?: string; description?: string; color?: string }
): CustomIcPayload {
  const cleanName = meta.name.trim();
  if (!cleanName) {
    throw new Error('请输入封装芯片的名称');
  }
  if (!sourceCircuit.components.length) {
    throw new Error('当前电路为空，无法封装');
  }

  const cloned: CircuitData = JSON.parse(JSON.stringify(sourceCircuit));

  const explicitPorts = cloned.components.filter(
    (c) => c.type === 'IC_PORT_IN' || c.type === 'IC_PORT_OUT'
  );
  const useFallbackPorts = explicitPorts.length === 0;

  const portComponents = useFallbackPorts
    ? cloned.components.filter((c) => c.type === 'LOGIC_IN' || c.type === 'LOGIC_OUT')
    : explicitPorts;

  if (portComponents.length === 0) {
    throw new Error(
      '未检测到封装端口！请在电路中添加「IC输入端口 / IC输出端口」（或至少保留数字输入/输出端子）'
    );
  }
  if (portComponents.length > 24) {
    throw new Error('单个自定义集成芯片最多支持 24 个外部引脚');
  }

  const coreComponents = cloned.components.filter(
    (c) =>
      c.type !== 'IC_PORT_IN' &&
      c.type !== 'IC_PORT_OUT' &&
      (!useFallbackPorts || (c.type !== 'LOGIC_IN' && c.type !== 'LOGIC_OUT'))
  );
  if (coreComponents.length === 0) {
    throw new Error('请至少在端口之间连接 1 个内部功能元件或逻辑门');
  }

  const inPorts: CircuitComponent[] = [];
  const outPorts: CircuitComponent[] = [];

  for (const c of portComponents) {
    const isInput = c.type === 'IC_PORT_IN' || c.type === 'LOGIC_IN';
    if (c.type === 'LOGIC_IN') {
      c.type = 'IC_PORT_IN';
      for (const w of cloned.wires) {
        if (w.from.componentId === c.id) w.from.pinId = 'io';
        if (w.to.componentId === c.id) w.to.pinId = 'io';
      }
    } else if (c.type === 'LOGIC_OUT') {
      c.type = 'IC_PORT_OUT';
      for (const w of cloned.wires) {
        if (w.from.componentId === c.id) w.from.pinId = 'io';
        if (w.to.componentId === c.id) w.to.pinId = 'io';
      }
    }
    c.props = { ...c.props, __packagedPort: true };
    if (isInput) inPorts.push(c);
    else outPorts.push(c);
  }

  inPorts.sort((a, b) => a.pos3d[2] - b.pos3d[2] || a.pos2d.y - b.pos2d.y);
  outPorts.sort((a, b) => a.pos3d[2] - b.pos3d[2] || a.pos2d.y - b.pos2d.y);

  const ordered = [...inPorts, ...outPorts];
  const pins: CustomIcPinSpec[] = ordered.map((c, idx) => ({
    pinId: `p${idx + 1}`,
    name: String(
      c.props?.portName ||
        c.props?.varName ||
        c.props?.outName ||
        c.label ||
        (c.type === 'IC_PORT_IN' ? `IN${idx + 1}` : `OUT${idx + 1}`)
    ).slice(0, 10),
    direction: c.type === 'IC_PORT_IN' ? 'in' : 'out',
    anchorCompId: c.id,
  }));

  return {
    version: 1,
    name: cleanName,
    codeName: (meta.codeName?.trim() || 'IC').slice(0, 8),
    description: meta.description?.trim() || `包含 ${coreComponents.length} 个内部元件与 ${pins.length} 个引脚`,
    color: meta.color?.trim() || '#0284c7',
    pins,
    internalCircuit: cloned,
  };
}

export interface ExpandedHierarchyResult {
  flatCircuit: CircuitData;
  hasExpanded: boolean;
  /** Maps `${topLevelIcId}:${pinId}` -> flattened boundary port reference */
  portAnchorMap: Map<string, { anchorCompId: string; pinId: string; direction: 'in' | 'out' }>;
  /** Maps topLevelIcId -> list of all flattened internal component IDs */
  childrenByIcId: Map<string, string[]>;
}

/**
 * Recursively expands all CUSTOM_IC modules into flat components and wires so both MNA
 * analog solving and digital Truth Table / Karnaugh Map analysis execute transparently.
 */
export function expandCircuitHierarchy(
  circuit: CircuitData,
  maxDepth = 4
): ExpandedHierarchyResult {
  const hasIc = circuit.components.some((c) => c.type === 'CUSTOM_IC');
  if (!hasIc) {
    return {
      flatCircuit: circuit,
      hasExpanded: false,
      portAnchorMap: new Map(),
      childrenByIcId: new Map(),
    };
  }

  // Track mapping from any `${icId}:${pinId}` that has been flattened to its current anchor ref
  const endpointRedirect = new Map<string, { componentId: string; pinId: string }>();
  const topIcIds = circuit.components.filter((c) => c.type === 'CUSTOM_IC').map((c) => c.id);
  const topChildren = new Map<string, string[]>();
  const directPinMap = new Map<string, { anchorCompId: string; pinId: string; direction: 'in' | 'out' }>();

  let currentComponents = [...circuit.components];
  let currentWires = [...circuit.wires];

  for (let depth = 0; depth < maxDepth; depth++) {
    const icComps = currentComponents.filter((c) => c.type === 'CUSTOM_IC');
    if (icComps.length === 0) break;

    const icIdSet = new Set(icComps.map((c) => c.id));
    const nextComponents = currentComponents.filter((c) => !icIdSet.has(c.id));
    const pinMap = new Map<string, { componentId: string; pinId: string }>();

    for (const ic of icComps) {
      const payload = parseCustomIcPayload(ic);
      const prefix = `${ic.id}__`;

      // Determine which top-level IC owns this nested instance (if any)
      let ownerTopIcId: string | null = topIcIds.includes(ic.id) ? ic.id : null;
      if (!ownerTopIcId) {
        for (const tid of topIcIds) {
          if (ic.id.startsWith(`${tid}__`)) {
            ownerTopIcId = tid;
            break;
          }
        }
      }

      for (const inner of payload.internalCircuit.components) {
        const clonedInner: CircuitComponent = {
          ...inner,
          id: `${prefix}${inner.id}`,
          props: { ...inner.props },
        };
        if (clonedInner.type === 'IC_PORT_IN' || clonedInner.type === 'IC_PORT_OUT') {
          clonedInner.props.__packagedPort = true;
        }
        nextComponents.push(clonedInner);
        if (ownerTopIcId && clonedInner.type !== 'CUSTOM_IC') {
          const list = topChildren.get(ownerTopIcId) ?? [];
          list.push(clonedInner.id);
          topChildren.set(ownerTopIcId, list);
        }
      }

      for (const innerWire of payload.internalCircuit.wires) {
        currentWires.push({
          ...innerWire,
          id: `${prefix}${innerWire.id}`,
          from: {
            componentId: `${prefix}${innerWire.from.componentId}`,
            pinId: innerWire.from.pinId,
          },
          to: {
            componentId: `${prefix}${innerWire.to.componentId}`,
            pinId: innerWire.to.pinId,
          },
        });
      }

      for (const pinSpec of payload.pins) {
        const targetRef = { componentId: `${prefix}${pinSpec.anchorCompId}`, pinId: 'io' };
        pinMap.set(`${ic.id}:${pinSpec.pinId}`, targetRef);
        endpointRedirect.set(`${ic.id}:${pinSpec.pinId}`, targetRef);
        if (depth === 0) {
          directPinMap.set(`${ic.id}:${pinSpec.pinId}`, {
            anchorCompId: targetRef.componentId,
            pinId: targetRef.pinId,
            direction: pinSpec.direction,
          });
        }
      }
    }

    currentWires = currentWires.map((w) => {
      const fromRedirect = pinMap.get(`${w.from.componentId}:${w.from.pinId}`);
      const toRedirect = pinMap.get(`${w.to.componentId}:${w.to.pinId}`);
      if (!fromRedirect && !toRedirect) return w;
      return {
        ...w,
        from: fromRedirect ?? w.from,
        to: toRedirect ?? w.to,
      };
    });

    currentComponents = nextComponents;
  }

  // Follow transitive redirects if any boundary port itself pointed into a nested CUSTOM_IC
  const portAnchorMap = new Map<string, { anchorCompId: string; pinId: string; direction: 'in' | 'out' }>();
  for (const [k, info] of directPinMap.entries()) {
    let cur = { componentId: info.anchorCompId, pinId: info.pinId };
    let guard = 0;
    while (guard++ < maxDepth && endpointRedirect.has(`${cur.componentId}:${cur.pinId}`)) {
      cur = endpointRedirect.get(`${cur.componentId}:${cur.pinId}`)!;
    }
    portAnchorMap.set(k, {
      anchorCompId: cur.componentId,
      pinId: cur.pinId,
      direction: info.direction,
    });
  }

  return {
    flatCircuit: {
      components: currentComponents,
      wires: currentWires,
    },
    hasExpanded: true,
    portAnchorMap,
    childrenByIcId: topChildren,
  };
}
