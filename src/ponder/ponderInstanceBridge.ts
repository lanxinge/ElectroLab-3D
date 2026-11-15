import type {
  CircuitComponent,
  ComponentTelemetry,
  ComponentType,
  Wire,
} from '../../shared/types';
import {
  COMPONENT_CATALOG,
  formatEngineeringValue,
  getComponentPins,
} from '../engine/componentCatalog';
import { evaluateTruthChipOutputs, parseTruthChipConfig } from '../engine/customIcEngine';
import { PONDER_DATA } from './ponderData';
import type { PonderLiveMetric, PonderModuleSpec } from './ponderTypes';

export interface InstancePonderContext {
  componentId: string;
  componentLabel: string;
  initialParams: Record<string, number>;
  isOverridden: boolean;
  measuredSummary: string;
  applyPropsPatch?: Record<string, number | boolean>;
  headline: string;
  causalExplanation: string;
  liveMetrics: PonderLiveMetric[];
  pinSummary: string | null;
}

function buildDefaultParamsForType(spec: PonderModuleSpec): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of spec.controls) {
    out[c.key] = c.defaultValue;
  }
  return out;
}

function fmtCurrent(amps: number): string {
  const safe = Object.is(amps, -0) || Math.abs(amps) < 1e-12 ? 0 : amps;
  const abs = Math.abs(safe);
  if (abs === 0) return '0.00 mA';
  if (abs >= 1) return `${safe.toFixed(3)} A`;
  if (abs >= 1e-3) return `${(safe * 1e3).toFixed(2)} mA`;
  return `${(safe * 1e6).toFixed(1)} µA`;
}

function fmtBoolBit(v: number | undefined): 0 | 1 {
  return (v ?? 0) >= 2.5 ? 1 : 0;
}

function pinV(tel: ComponentTelemetry | undefined, pinId: string): number {
  return tel?.pinVoltages?.[pinId] ?? 0;
}

function paramBit(
  params: Record<string, number> | undefined,
  key: string,
  fallback: 0 | 1
): 0 | 1 {
  if (params && params[key] !== undefined) {
    return params[key] >= 0.5 ? 1 : 0;
  }
  return fallback;
}

function paramNum(
  params: Record<string, number> | undefined,
  key: string,
  fallback: number
): number {
  if (params && typeof params[key] === 'number' && !Number.isNaN(params[key])) {
    return params[key];
  }
  return fallback;
}

function getElectricalControlKeys(type: ComponentType, spec: PonderModuleSpec): string[] {
  if (type === 'CUSTOM_IC') return [];
  if (type === 'JK_FF') return ['j', 'k'];
  if (type === 'COUNTER_4BIT') return ['clr'];
  if (type === 'D_FF') return ['d', 'clk', '_q'];
  return spec.controls.map((c) => c.key);
}

function hasElectricalOverride(
  type: ComponentType,
  spec: PonderModuleSpec,
  initialParams: Record<string, number>,
  activeParams?: Record<string, number>
): boolean {
  if (!activeParams) return false;
  const keys = getElectricalControlKeys(type, spec);
  return keys.some((k) => {
    const val = activeParams[k];
    if (typeof val !== 'number' || Number.isNaN(val)) return false;
    return Math.abs(val - (initialParams[k] ?? 0)) > 1e-4;
  });
}

function formatOhmFormulaDerivation(
  label: string,
  r: number,
  vSigned: number,
  iSigned: number,
  power: number,
  loadPct: number | null,
  prefixLabel: string,
  p1Name = '1',
  p2Name = '2'
): string {
  const rStr = formatEngineeringValue(r, 'Ω');
  const vAbs = Math.abs(vSigned);
  const iAbs = Math.abs(iSigned);
  const stdI = (vAbs / 220) * 1000;
  const ratio = r / 220;
  const loadText = loadPct !== null ? `（负载率 ${loadPct}%）` : '';
  const compareText =
    Math.abs(r - 220) > 1e-6
      ? `；相比标准 220Ω 示例，阻值变为 ${ratio.toFixed(2)} 倍，因此同幅值压降下电流大小（对比 220Ω 时约 ${stdI.toFixed(
          1
        )} mA）被限流至 ${fmtCurrent(iAbs)}`
      : '';

  if (vSigned < -0.01) {
    return `${prefixLabel}电阻 ${label} 阻值设为 ${rStr}，两端压降 ΔV = V(${p1Name}) - V(${p2Name}) = ${vSigned.toFixed(
      2
    )} V（${p2Name} 端电位高于 ${p1Name} 端，压降幅值 |ΔV| = ${vAbs.toFixed(
      2
    )} V，电流由 ${p2Name} 端反向流向 ${p1Name} 端，常见于电容放电或反向激励）。依据关联参考方向欧姆定律 I = ΔV / R = ${vSigned.toFixed(
      2
    )} V / ${rStr} = ${fmtCurrent(iSigned)}（电流大小 |I| = ${vAbs.toFixed(
      2
    )} V / ${rStr} = ${fmtCurrent(iAbs)}），热功率 P = |ΔV · I| = ${formatEngineeringValue(
      power,
      'W'
    )}${loadText}${compareText}。`;
  }

  return `${prefixLabel}电阻 ${label} 阻值设为 ${rStr}，施加在它两端的正向压降 V = ${vAbs.toFixed(
    2
  )} V。依据欧姆定律 I = V / R = ${vAbs.toFixed(2)} V / ${rStr} = ${fmtCurrent(
    iAbs
  )}，电功率 P = V·I = ${formatEngineeringValue(power, 'W')}${loadText}${compareText}。`;
}

export function deriveInstancePonderContext(
  comp: CircuitComponent,
  telemetry: ComponentTelemetry | undefined,
  allComponents: CircuitComponent[],
  wires: Wire[],
  activeParams?: Record<string, number>
): InstancePonderContext {
  const spec = PONDER_DATA[comp.type];
  const cat = COMPONENT_CATALOG[comp.type];
  const initialParams = buildDefaultParamsForType(spec);
  const pins = getComponentPins(comp);

  const attachedWires = wires.filter(
    (w) => w.from.componentId === comp.id || w.to.componentId === comp.id
  );
  const isConnected = attachedWires.length > 0;

  const vDrop = telemetry?.voltageDrop ?? 0;
  const current = telemetry?.current ?? 0;
  const power = telemetry?.power ?? 0;
  const loadPct = Math.round((telemetry?.loadRatio ?? 0) * 100);

  // Pre-populate initialParams for all component types before detecting overrides
  switch (comp.type) {
    case 'RESISTOR': {
      initialParams.ohms = Math.max(0.01, Number(comp.props.resistance ?? 220));
      initialParams.voltage = Number(Math.abs(vDrop).toFixed(2));
      break;
    }
    case 'INF_RESISTOR': {
      initialParams.infiniteMode = comp.props.idealInfinite !== false ? 1 : 0;
      initialParams.vin = Math.max(0, Number(Math.abs(vDrop).toFixed(2)));
      break;
    }
    case 'POTENTIOMETER': {
      const ratio = Math.min(0.95, Math.max(0.05, Number(comp.props.ratio ?? 0.5)));
      initialParams.wiper = Number(ratio.toFixed(2));
      break;
    }
    case 'DC_SOURCE':
    case 'INF_SOURCE': {
      const vSet = Number(comp.props.voltage ?? (comp.type === 'INF_SOURCE' ? 12 : 5));
      initialParams.voltage = vSet;
      if (comp.type === 'INF_SOURCE') {
        const effR = Math.abs(current) > 1e-6 ? Math.min(500, Math.max(10, Math.abs(vDrop / current))) : 100;
        initialParams.loadR = Math.round(effR);
      }
      break;
    }
    case 'AC_SOURCE': {
      const freq = Number(comp.props.frequency ?? 2);
      initialParams.freq = Math.min(2.5, Math.max(0.4, freq));
      break;
    }
    case 'CURRENT_SOURCE': {
      const iSet = Number(comp.props.current ?? 0.02);
      const reqR = Math.abs(iSet) > 1e-9 ? Math.abs(vDrop / iSet) : 250;
      initialParams.loadRatio = Number(Math.min(2, Math.max(0.3, reqR / 250)).toFixed(1));
      break;
    }
    case 'GROUND': {
      initialParams.connected = isConnected ? 1 : 0;
      break;
    }
    case 'CAPACITOR': {
      initialParams.acMode = allComponents.some((c) => c.type === 'AC_SOURCE') ? 1 : 0;
      break;
    }
    case 'INDUCTOR': {
      initialParams.highFreq = allComponents.some(
        (c) => c.type === 'AC_SOURCE' && Number(c.props.frequency ?? 2) >= 5
      )
        ? 1
        : 0;
      break;
    }
    case 'SWITCH_SPST': {
      initialParams.closed = comp.props.closed !== false ? 1 : 0;
      break;
    }
    case 'SWITCH_SPDT': {
      initialParams.throwB = Number(comp.props.position ?? 0) === 1 ? 1 : 0;
      break;
    }
    case 'DIODE': {
      initialParams.forward = vDrop >= -0.05 ? 1 : 0;
      break;
    }
    case 'ZENER_DIODE': {
      initialParams.vz = Number(comp.props.vz ?? 5.1);
      initialParams.vin = Math.max(0, Number((-vDrop).toFixed(2)));
      break;
    }
    case 'LED': {
      initialParams.currentMa = Number((Math.max(0, current) * 1000).toFixed(2));
      break;
    }
    case 'BJT_NPN': {
      const beta = Number(comp.props.beta ?? 100);
      initialParams.ib = Math.min(120, Math.max(0, Math.round((Math.abs(current) / Math.max(1, beta)) * 1e6)));
      break;
    }
    case 'NMOS': {
      initialParams.vth = Number(comp.props.vth ?? 2.0);
      initialParams.vgs = Math.max(0, Number((pinV(telemetry, 'g') - pinV(telemetry, 's')).toFixed(2)));
      break;
    }
    case 'OPAMP': {
      initialParams.vin = Number((pinV(telemetry, 'inp') - pinV(telemetry, 'inm')).toFixed(2));
      break;
    }
    case 'TIMER_555': {
      const vSup = Math.max(0, pinV(telemetry, 'vcc') - pinV(telemetry, 'gnd'));
      initialParams.vcc = Math.min(15, Math.max(3, Number((vSup > 0.5 ? vSup : 5).toFixed(1))));
      break;
    }
    case 'TRANSFORMER': {
      const vPri = pinV(telemetry, 'p1') - pinV(telemetry, 'p2');
      initialParams.turnsRatio = Number(comp.props.ratio ?? 2.0);
      initialParams.acAmp = Math.max(0.5, Number(Math.abs(vPri).toFixed(1)));
      break;
    }
    case 'LAMP': {
      const rv = Number(comp.props.ratedVoltage ?? 5);
      const rp = Number(comp.props.ratedPower ?? 1.5);
      initialParams.voltage = Number(Math.abs(vDrop).toFixed(2));
      initialParams.resistance = Math.max(5, Number(((rv * rv) / Math.max(0.1, rp)).toFixed(1)));
      break;
    }
    case 'FUSE': {
      initialParams.current = Number(Math.abs(current).toFixed(2));
      initialParams.rated = Number(comp.props.tripCurrent ?? 0.5);
      break;
    }
    case 'LOGIC_IN':
    case 'IC_PORT_IN': {
      initialParams.state = Number(comp.props.state ?? telemetry?.logicState ?? 0) ? 1 : 0;
      break;
    }
    case 'CLOCK': {
      const freq = Number(comp.props.freq ?? comp.props.frequency ?? 1);
      initialParams.freq = Math.min(2.5, Math.max(0.4, freq));
      break;
    }
    case 'LOGIC_OUT': {
      initialParams.vin = Number(Math.min(5, Math.max(0, pinV(telemetry, 'in'))).toFixed(2));
      break;
    }
    case 'HEX_DISPLAY': {
      const b3 = fmtBoolBit(pinV(telemetry, 'd3'));
      const b2 = fmtBoolBit(pinV(telemetry, 'd2'));
      const b1 = fmtBoolBit(pinV(telemetry, 'd1'));
      const b0 = fmtBoolBit(pinV(telemetry, 'd0'));
      initialParams.hexVal = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0;
      break;
    }
    case 'NOT': {
      initialParams.a = fmtBoolBit(pinV(telemetry, 'a'));
      break;
    }
    case 'AND':
    case 'OR':
    case 'NAND':
    case 'NOR':
    case 'XOR':
    case 'XNOR':
    case 'HALF_ADDER': {
      initialParams.a = fmtBoolBit(pinV(telemetry, 'a'));
      initialParams.b = fmtBoolBit(pinV(telemetry, 'b'));
      break;
    }
    case 'FULL_ADDER': {
      initialParams.a = fmtBoolBit(pinV(telemetry, 'a'));
      initialParams.b = fmtBoolBit(pinV(telemetry, 'b'));
      initialParams.cin = fmtBoolBit(pinV(telemetry, 'cin'));
      break;
    }
    case 'MUX_2_1': {
      initialParams.sel = fmtBoolBit(pinV(telemetry, 'sel'));
      initialParams.a = fmtBoolBit(pinV(telemetry, 'd0'));
      initialParams.b = fmtBoolBit(pinV(telemetry, 'd1'));
      break;
    }
    case 'D_FF': {
      initialParams.d = fmtBoolBit(pinV(telemetry, 'd'));
      initialParams.clk = fmtBoolBit(pinV(telemetry, 'clk'));
      initialParams._q = fmtBoolBit(pinV(telemetry, 'q'));
      break;
    }
    case 'JK_FF': {
      initialParams.j = fmtBoolBit(pinV(telemetry, 'j'));
      initialParams.k = fmtBoolBit(pinV(telemetry, 'k'));
      break;
    }
    case 'COUNTER_4BIT': {
      initialParams.clr = fmtBoolBit(pinV(telemetry, 'rst'));
      break;
    }
    case 'CUSTOM_TRUTH_8':
    case 'CUSTOM_TRUTH_16': {
      const inPins = pins.filter((p) => p.role === 'logic_in');
      if (inPins[0]) initialParams.inA = fmtBoolBit(pinV(telemetry, inPins[0].id));
      if (inPins[1]) initialParams.inB = fmtBoolBit(pinV(telemetry, inPins[1].id));
      if (inPins[2]) initialParams.inC = fmtBoolBit(pinV(telemetry, inPins[2].id));
      break;
    }
    case 'IC_PORT_OUT': {
      initialParams.drive = fmtBoolBit(pinV(telemetry, 'io'));
      break;
    }
    default:
      break;
  }

  const isOverridden = hasElectricalOverride(comp.type, spec, initialParams, activeParams);
  const headline = isOverridden
    ? `${comp.label} (${cat.name}) · 交互试算推演`
    : `${comp.label} (${cat.name}) · 实测工作态解释`;

  let causalExplanation = '';
  let measuredSummary = '';
  let applyPropsPatch: Record<string, number | boolean> | undefined;
  const liveMetrics: PonderLiveMetric[] = [];
  const pinVoltageOverrides: Record<string, number> = {};

  switch (comp.type) {
    case 'RESISTOR': {
      const baseR = initialParams.ohms;
      measuredSummary = `R=${formatEngineeringValue(baseR, 'Ω')}, ΔV=${vDrop.toFixed(2)}V, I=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '当前设定 R', value: formatEngineeringValue(baseR, 'Ω'), accent: 'amber' },
          { label: '实测压降 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
          { label: '实测电流 I', value: fmtCurrent(current), accent: 'emerald' },
          {
            label: '热功耗 P',
            value: formatEngineeringValue(power, 'W'),
            accent: telemetry?.overloaded ? 'rose' : 'violet',
          }
        );
        if (!isConnected || Math.abs(vDrop) < 0.01) {
          causalExplanation = `你当前选中了工作台电阻 ${comp.label}（设定阻值 R = ${formatEngineeringValue(
            baseR,
            'Ω'
          )}），但目前两端实测压降接近 0 V${
            !isConnected ? '（尚未接入闭合回路）' : '（回路处于断路或等电位状态）'
          }。由欧姆定律 I = V/R 可知电流为 0 mA，无焦耳热产生。可拖动下方滑块试算阻值或压降，或在工作台连入电源闭合回路。`;
        } else {
          causalExplanation = formatOhmFormulaDerivation(
            comp.label,
            baseR,
            vDrop,
            current,
            power,
            loadPct,
            '你的工作台',
            '1',
            '2'
          );
        }
      } else {
        const effR = Math.max(0.01, paramNum(activeParams, 'ohms', baseR));
        const effV = Math.max(0, paramNum(activeParams, 'voltage', initialParams.voltage));
        // Preserve sign direction when user only changed R and workbench voltage wasn't changed from |vDrop|
        const voltageTouched = Math.abs(effV - initialParams.voltage) > 1e-4;
        const signedV = !voltageTouched && vDrop < -0.01 ? -effV : effV;
        const effI = signedV / effR;
        const effP = Math.abs(signedV * effI);
        liveMetrics.push(
          { label: '试算阻值 R', value: formatEngineeringValue(effR, 'Ω'), accent: 'amber' },
          { label: '试算压降 ΔV', value: `${signedV.toFixed(2)} V`, accent: 'sky' },
          { label: '试算电流 I', value: fmtCurrent(effI), accent: 'emerald' },
          {
            label: '试算功耗 P',
            value: formatEngineeringValue(effP, 'W'),
            accent: effP > (telemetry?.maxPower ?? 0.5) ? 'rose' : 'violet',
          }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】${formatOhmFormulaDerivation(
          comp.label,
          effR,
          signedV,
          effI,
          effP,
          null,
          '当前试算设置下，',
          '1',
          '2'
        )}`;
        if (Math.abs(effR - baseR) > 1e-4) {
          applyPropsPatch = { resistance: effR };
        }
      }
      break;
    }

    case 'INF_RESISTOR': {
      const baseIdeal = comp.props.idealInfinite !== false;
      const r = Number(comp.props.resistance ?? 1e12);
      measuredSummary = `${baseIdeal ? '∞ 理想开路' : formatEngineeringValue(r, 'Ω')}, ΔV=${vDrop.toFixed(2)}V, I=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '模式/阻值', value: baseIdeal ? '∞ 理想开路' : formatEngineeringValue(r, 'Ω'), accent: 'violet' },
          { label: '实测端压 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'amber' },
          { label: '实测电流', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = baseIdeal
          ? `${comp.label} 目前处于“理想无穷大断路 (R → ∞)”模式，尽管两端实测电势差为 ${vDrop.toFixed(
              2
            )} V，内部导纳 G = 0 使支路电流严格保持 0 A，实现彻底电气隔离。`
          : `${comp.label} 处于超高阻泄漏模式（${formatEngineeringValue(
              r,
              'Ω'
            )}），在 ΔV = ${vDrop.toFixed(2)} V 压差下产生支路泄漏电流 I = ΔV / R = ${fmtCurrent(
              current
            )}。`;
      } else {
        const effIdeal = paramBit(activeParams, 'infiniteMode', baseIdeal ? 1 : 0) === 1;
        const effV = Math.max(0, paramNum(activeParams, 'vin', initialParams.vin));
        const rLeak = baseIdeal ? 1e12 : r;
        const effI = effIdeal ? 0 : effV / rLeak;
        liveMetrics.push(
          { label: '试算模式', value: effIdeal ? '∞ 理想开路' : formatEngineeringValue(rLeak, 'Ω'), accent: 'violet' },
          { label: '试算端压 ΔV', value: `${effV.toFixed(2)} V`, accent: 'amber' },
          { label: '试算电流', value: fmtCurrent(effI), accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】${
          effIdeal
            ? `试算切换为“理想无穷大断路 (R → ∞)”，施压 ${effV.toFixed(2)} V 时支路电流严格保持 0.00 mA。`
            : `试算切换为超高阻泄漏模式（${formatEngineeringValue(rLeak, 'Ω')}），施压 ${effV.toFixed(
                2
              )} V 时预计泄漏电流为 ${fmtCurrent(effI)}。`
        }`;
        if (effIdeal !== baseIdeal) {
          applyPropsPatch = { idealInfinite: effIdeal };
        }
      }
      break;
    }

    case 'POTENTIOMETER': {
      const r = Number(comp.props.resistance ?? 1000);
      const baseRatio = initialParams.wiper;
      const va = pinV(telemetry, 'a');
      const vb = pinV(telemetry, 'b');
      const vw = pinV(telemetry, 'wiper');
      measuredSummary = `α=${Math.round(baseRatio * 100)}%, V_W=${vw.toFixed(2)}V`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '总阻值 / α', value: `${formatEngineeringValue(r, 'Ω')} · ${Math.round(baseRatio * 100)}%`, accent: 'amber' },
          { label: '实测抽头 V_W', value: `${vw.toFixed(2)} V`, accent: 'sky' },
          { label: '实测压降 ΔV_AB', value: `${vDrop.toFixed(2)} V`, accent: 'emerald' }
        );
        causalExplanation = `${comp.label} 总阻值 ${formatEngineeringValue(
          r,
          'Ω'
        )}，机械旋钮当前位于 α = ${Math.round(baseRatio * 100)}%，将电阻轨拆分为上段 ${(
          r * baseRatio
        ).toFixed(0)}Ω 与下段 ${(r * (1 - baseRatio)).toFixed(
          0
        )}Ω；抽头 W 对地实测电位为 ${vw.toFixed(2)} V。`;
      } else {
        const effRatio = Math.min(0.95, Math.max(0.05, paramNum(activeParams, 'wiper', baseRatio)));
        const estVw = va + (vb - va) * effRatio;
        pinVoltageOverrides.wiper = estVw;
        liveMetrics.push(
          { label: '试算 α 位置', value: `${formatEngineeringValue(r, 'Ω')} · ${Math.round(effRatio * 100)}%`, accent: 'amber' },
          { label: '推算空载 V_W', value: `${estVw.toFixed(2)} V`, accent: 'sky' },
          { label: '两端实测 ΔV_AB', value: `${vDrop.toFixed(2)} V`, accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将旋钮试算调整至 α = ${Math.round(
          effRatio * 100
        )}%（上段 ${(r * effRatio).toFixed(0)}Ω / 下段 ${(r * (1 - effRatio)).toFixed(
          0
        )}Ω），按当前端电压（VA=${va.toFixed(2)}V, VB=${vb.toFixed(
          2
        )}V）空载分压估算抽头电位 V_W ≈ ${estVw.toFixed(2)} V。`;
        applyPropsPatch = { ratio: Number(effRatio.toFixed(2)) };
      }
      break;
    }

    case 'DC_SOURCE':
    case 'INF_SOURCE': {
      const baseV = initialParams.voltage;
      const vPos = pinV(telemetry, 'pos');
      const vNeg = pinV(telemetry, 'neg');
      measuredSummary = `E=${baseV}V, I=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '设定电动势 E', value: `${baseV} V`, accent: 'sky' },
          { label: '实测输出电流 I', value: fmtCurrent(current), accent: 'emerald' },
          {
            label: '输出功率 P',
            value: formatEngineeringValue(power, 'W'),
            accent: telemetry?.overloaded ? 'rose' : 'amber',
          }
        );
        const flowText =
          current < -1e-6
            ? `外部电路当前向电源正极倒灌电流 ${fmtCurrent(Math.abs(current))}（输出参考方向读数 I = ${fmtCurrent(
                current
              )}），功率 ${formatEngineeringValue(power, 'W')}`
            : `向外电路输送电流 ${fmtCurrent(current)}、提供电功率 ${formatEngineeringValue(
                power,
                'W'
              )}`;
        causalExplanation = `${comp.label} 正作为激励源输出 ${baseV} V 恒定电势差（正端 ${vPos.toFixed(
          2
        )}V，负端 ${vNeg.toFixed(2)}V），${flowText}${
          telemetry?.overloaded ? ' —— 注意当前电流较大已触发过载提示！' : '。'
        }`;
      } else {
        const effV = paramNum(activeParams, 'voltage', baseV);
        const effLoadR =
          comp.type === 'INF_SOURCE'
            ? Math.max(1, paramNum(activeParams, 'loadR', initialParams.loadR ?? 100))
            : Math.abs(current) > 1e-6 && Math.abs(vDrop) > 0.01
              ? Math.max(0.01, Math.abs(vDrop / current))
              : 220;
        const effI = effV / effLoadR;
        const effP = Math.abs(effV * effI);
        pinVoltageOverrides.pos = vNeg + effV;
        liveMetrics.push(
          { label: '试算电动势 E', value: `${effV} V`, accent: 'sky' },
          { label: '试算输出电流 I', value: fmtCurrent(effI), accent: 'emerald' },
          { label: '试算输出功率 P', value: formatEngineeringValue(effP, 'W'), accent: 'amber' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将设定电动势试算调整为 ${effV} V，在等效负载 R ≈ ${effLoadR.toFixed(
          1
        )} Ω 下预计输出电流 ${fmtCurrent(effI)}、功率 ${formatEngineeringValue(effP, 'W')}。`;
        if (Math.abs(effV - baseV) > 1e-4) {
          applyPropsPatch = { voltage: effV };
        }
      }
      break;
    }

    case 'AC_SOURCE': {
      const amp = Number(comp.props.amplitude ?? 5);
      const baseFreq = Number(comp.props.frequency ?? 2);
      const phaseDeg = Number(comp.props.phase ?? 0);
      const vRms = telemetry?.vRms ?? amp / Math.SQRT2;
      const iRms = telemetry?.iRms;
      measuredSummary = `${amp}V∠${phaseDeg}° @ ${baseFreq}Hz, V~=${vRms.toFixed(2)}V`;
      if (!isOverridden) {
        liveMetrics.push(
          { label: '设定参数', value: `${amp}V∠${phaseDeg}° @ ${baseFreq}Hz`, accent: 'violet' },
          {
            label: '有效值 V~ / 瞬时 v',
            value: `${vRms.toFixed(2)} V~ / ${vDrop.toFixed(2)} V`,
            accent: 'sky',
          },
          {
            label: iRms !== undefined ? '有效值 I~ / 瞬时 i' : '实测瞬时电流',
            value:
              iRms !== undefined
                ? `${fmtCurrent(iRms)}~ / ${fmtCurrent(current)}`
                : fmtCurrent(current),
            accent: 'emerald',
          }
        );
        if (telemetry?.powerFactor !== undefined) {
          liveMetrics.push({
            label: '端口有功 P / cosφ',
            value: `${formatEngineeringValue(Math.abs(telemetry.avgPower ?? 0), 'W')} · ${telemetry.powerFactor.toFixed(2)}`,
            accent: 'amber',
          });
        }
        causalExplanation = `交流源 ${comp.label} 设定峰值 ${amp}V、频率 ${baseFreq}Hz、初相 ${phaseDeg}°（有效值 ${vRms.toFixed(
          2
        )}V）。当前仿真时刻瞬时端压为 ${vDrop.toFixed(2)}V、电流为 ${fmtCurrent(
          current
        )}，按正弦规律周期性输出交变能量。`;
      } else {
        const effF = paramNum(activeParams, 'freq', initialParams.freq);
        liveMetrics.push(
          { label: '试算频率 f', value: `${effF.toFixed(1)} Hz (T=${(1 / Math.max(0.1, effF)).toFixed(2)}s)`, accent: 'violet' },
          { label: '有效值 Vrms', value: `${(amp / Math.SQRT2).toFixed(2)} V`, accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将信号频率试算调整为 ${effF.toFixed(
          1
        )} Hz（周期 T = ${(1 / Math.max(0.1, effF)).toFixed(2)} s），峰值仍为 ${amp} V∠${phaseDeg}°（Vrms ≈ ${(
          amp / Math.SQRT2
        ).toFixed(2)} V）。`;
        applyPropsPatch = { frequency: Number(effF.toFixed(1)) };
      }
      break;
    }

    case 'CURRENT_SOURCE': {
      const iSet = Number(comp.props.current ?? 0.02);
      measuredSummary = `Is=${fmtCurrent(iSet)}, ΔV=${vDrop.toFixed(2)}V`;
      if (!isOverridden) {
        liveMetrics.push(
          { label: '恒流设定 Is', value: fmtCurrent(iSet), accent: 'emerald' },
          { label: '实测端压 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'amber' }
        );
        causalExplanation = `${comp.label} 强迫支路维持恒定电流 ${fmtCurrent(
          iSet
        )}，根据外电路总等效阻力大小，其端电压实测建立为 ${vDrop.toFixed(2)} V（功率 ${formatEngineeringValue(
          power,
          'W'
        )}）。`;
      } else {
        const effRatio = paramNum(activeParams, 'loadRatio', initialParams.loadRatio);
        const effV = iSet * 250 * effRatio;
        liveMetrics.push(
          { label: '恒流输出 Is', value: fmtCurrent(iSet), accent: 'emerald' },
          { label: '试算端压 ΔV', value: `${effV.toFixed(2)} V (${effRatio.toFixed(1)}×负载)`, accent: 'amber' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】恒流源输出保持 ${fmtCurrent(
          iSet
        )} 不变；当负载比例调至 ${effRatio.toFixed(1)}×（等效 ${(250 * effRatio).toFixed(
          0
        )} Ω）时，自适应端电压为 V = Is · R = ${effV.toFixed(2)} V。`;
      }
      break;
    }

    case 'GROUND': {
      measuredSummary = isConnected ? '已接 0.000 V (GND)' : '浮空未连接';
      if (!isOverridden) {
        liveMetrics.push({
          label: '实测参考电位',
          value: '0.000 V (GND)',
          accent: 'emerald',
        });
        causalExplanation = isConnected
          ? `${comp.label} 为所连接的节点网强制锁定 0.000 V 基准电位“海平面”，全电路其他所有节点的电压读数均以此为参考。`
          : `${comp.label} 目前尚未连线到电路中，请将其接入电源负极或参考点以确立唯一零电位。`;
      } else {
        const effConn = paramBit(activeParams, 'connected', isConnected ? 1 : 0) === 1;
        liveMetrics.push({
          label: '试算接地状态',
          value: effConn ? '0.000 V (稳固接地)' : '浮地状态 (基准缺失)',
          accent: effConn ? 'emerald' : 'rose',
        });
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】${
          effConn
            ? '节点网已锁定 0.000 V 参考基准，节点电压方程唯一可解。'
            : '若断开参考地使其处于“浮空未接地”状态，各点对地绝对电位将整体漂移，MNA 矩阵奇异。'
        }`;
      }
      break;
    }

    case 'CAPACITOR': {
      const cap = Number(comp.props.capacitance ?? 100);
      measuredSummary = `Vc=${vDrop.toFixed(2)}V, Ic=${fmtCurrent(current)}`;
      if (!isOverridden) {
        const viSign = vDrop * current;
        const phaseLabel =
          Math.abs(current) < 1e-4 && isConnected
            ? '稳态电流'
            : viSign < -1e-6
              ? '实测放电电流'
              : '实测充电电流';
        const phaseDesc =
          Math.abs(current) < 1e-4 && isConnected
            ? '直流模式下当前电压已接近充电稳态，电流趋近于 0（体现“隔直”开路特性）。'
            : viSign < -1e-6
              ? `当前极板正在通过外回路释放储能（放电阶段，dVc/dt < 0）：电流从 + 极板向外流出，故关联参考方向电流 I = C·dVc/dt = ${fmtCurrent(
                  current
                )}（幅值 ${fmtCurrent(Math.abs(current))}）。`
              : `当前外部电源正在向极板补充电荷（充电阶段，dVc/dt > 0），形成充电位移电流 I = C·dVc/dt = ${fmtCurrent(
                  current
                )}。`;
        liveMetrics.push(
          { label: '标称容量 C', value: `${cap} µF`, accent: 'sky' },
          {
            label: '实测极板电压 Vc',
            value:
              telemetry?.vRms !== undefined && initialParams.acMode === 1
                ? `${vDrop.toFixed(2)} V (交流 V~=${telemetry.vRms.toFixed(2)} V)`
                : `${vDrop.toFixed(2)} V`,
            accent: 'amber',
          },
          {
            label: phaseLabel,
            value:
              telemetry?.iRms !== undefined && initialParams.acMode === 1
                ? `${fmtCurrent(current)} (I~=${fmtCurrent(telemetry.iRms)})`
                : fmtCurrent(current),
            accent: 'emerald',
          }
        );
        causalExplanation = `${comp.label} (${cap} µF) 当前极板压降 Vc = V(+) - V(-) = ${vDrop.toFixed(
          2
        )} V，电流 ${fmtCurrent(current)}。${phaseDesc}`;
      } else {
        const acMode = paramBit(activeParams, 'acMode', initialParams.acMode ? 1 : 0) === 1;
        liveMetrics.push(
          { label: '标称容量 C', value: `${cap} µF`, accent: 'sky' },
          { label: '试算激励模式', value: acMode ? '交流激励 (通交)' : '直流脉冲 (隔直)', accent: 'amber' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将激励类型试算切换为“${
          acMode ? '交流激励 (通交)' : '直流脉冲 (隔直)'
        }”：${
          acMode
            ? '外加交变电压周期性充放电使外部导线持续存在位移交流电流。'
            : '直流稳态下极板充饱后 dVc/dt → 0，支路电流趋近于零。'
        }`;
      }
      break;
    }

    case 'INDUCTOR': {
      const ind = Number(comp.props.inductance ?? 100);
      measuredSummary = `I_L=${fmtCurrent(current)}, ΔV=${vDrop.toFixed(2)}V`;
      if (!isOverridden) {
        liveMetrics.push(
          { label: '标称电感 L', value: `${ind} mH`, accent: 'amber' },
          {
            label: '实测电流 I_L',
            value:
              telemetry?.iRms !== undefined && telemetry.vRms !== undefined
                ? `${fmtCurrent(current)} (I~=${fmtCurrent(telemetry.iRms)})`
                : fmtCurrent(current),
            accent: 'emerald',
          },
          {
            label: '实测感应压降 ΔV',
            value:
              telemetry?.vRms !== undefined
                ? `${vDrop.toFixed(2)} V (V~=${telemetry.vRms.toFixed(2)} V)`
                : `${vDrop.toFixed(2)} V`,
            accent: 'sky',
          }
        );
        causalExplanation = `${comp.label} (${ind} mH) 当前流过电流 ${fmtCurrent(
          current
        )}、两端电势差 ${vDrop.toFixed(2)} V。电感总是阻止电流瞬间变化（v = L·di/dt），直流稳态下等效近乎直通。`;
      } else {
        const hf = paramBit(activeParams, 'highFreq', initialParams.highFreq ? 1 : 0) === 1;
        liveMetrics.push(
          { label: '标称电感 L', value: `${ind} mH`, accent: 'amber' },
          { label: '试算信号模式', value: hf ? '高频交流 (感抗飙升受阻)' : '低频/直流 (畅通)', accent: hf ? 'rose' : 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将信号模式试算切换为“${
          hf ? '高频交流' : '低频/直流'
        }”：感抗 X_L = 2πfL，${hf ? '频率升高时感应反电动势强烈阻碍交流通过。' : '低频/直流下感抗极小，几乎无阻直通。'}`;
      }
      break;
    }

    case 'SWITCH_SPST': {
      const baseClosed = initialParams.closed === 1;
      const closed = isOverridden ? paramBit(activeParams, 'closed', baseClosed ? 1 : 0) === 1 : baseClosed;
      measuredSummary = `${baseClosed ? '闭合(ON)' : '断开(OFF)'}, ΔV=${vDrop.toFixed(2)}V, I=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '实测刀闸', value: closed ? '已闭合 (ON)' : '已断开 (OFF)', accent: closed ? 'emerald' : 'amber' },
          { label: '实测压差 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
          { label: '实测支路电流 I', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = closed
          ? `${comp.label} 处于合闸导通态，接触阻力极小使两端等电位（ΔV = ${vDrop.toFixed(
              2
            )}V），回路电流 ${fmtCurrent(current)} 畅通流过。`
          : `${comp.label} 处于分闸断开态，空气间隙切断电荷通路使电流归零（${fmtCurrent(
              current
            )}），因此全部开路电势差（${vDrop.toFixed(2)}V）都降落在开关两端！`;
      } else {
        liveMetrics.push(
          { label: '试算刀闸', value: closed ? '合闸导通 (ON)' : '分闸断开 (OFF)', accent: closed ? 'emerald' : 'amber' },
          { label: '试算压差 / 电流', value: closed ? 'ΔV≈0.00V · 导通' : 'I=0.00 mA · 断路', accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算将刀闸切为【${
          closed ? '合闸导通 (ON)' : '分闸断开 (OFF)'
        }】：${
          closed
            ? '金属接触电阻约 5 mΩ，开关两端压降接近 0 V，回路恢复导通电流。'
            : '绝缘空气隙切断支路电流至 0.00 mA，电源开路压差全部落在开关两端。'
        }`;
        applyPropsPatch = { closed };
      }
      break;
    }

    case 'SWITCH_SPDT': {
      const basePos = initialParams.throwB === 1;
      const pos = isOverridden ? paramBit(activeParams, 'throwB', basePos ? 1 : 0) === 1 : basePos;
      measuredSummary = `${basePos ? 'B(NO)' : 'A(NC)'}, COM=${pinV(telemetry, 'com').toFixed(2)}V`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '实测接通', value: pos ? 'B (常开 NO 路)' : 'A (常闭 NC 路)', accent: 'sky' },
          { label: '实测 COM 电流', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = `${comp.label} 当前公共端 COM 切向 ${
          pos ? 'B(NO)' : 'A(NC)'
        } 通道，将输入电位（COM = ${pinV(telemetry, 'com').toFixed(2)}V）导通至选定支路，同时彻底隔离另一支路。`;
      } else {
        liveMetrics.push(
          { label: '试算切换', value: pos ? 'B (常开 NO 路)' : 'A (常闭 NC 路)', accent: 'sky' },
          { label: '原 COM 实测', value: `${pinV(telemetry, 'com').toFixed(2)} V`, accent: 'amber' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算将动触片切换至 ${
          pos ? 'B(NO) 路' : 'A(NC) 路'
        }：公共端 COM 电位将导通到 ${pos ? 'B' : 'A'} 支路，${pos ? 'A' : 'B'} 支路被断开隔离。`;
        applyPropsPatch = { position: pos ? 1 : 0 };
      }
      break;
    }

    case 'DIODE': {
      const fwd = vDrop >= 0.45 && Math.abs(current) > 1e-5;
      measuredSummary = `V_AK=${vDrop.toFixed(2)}V, I=${fmtCurrent(current)}`;
      if (!isOverridden) {
        liveMetrics.push(
          {
            label: '实测导通状态',
            value: fwd ? '正向导通 (~0.7V)' : vDrop < -0.1 ? '反向截止' : '未达阈值',
            accent: fwd ? 'emerald' : 'amber',
          },
          { label: '实测压降 V_AK', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
          { label: '实测正向电流', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = fwd
          ? `${comp.label} 当前处于正向偏置导通态：阳极电位高于阴极约 ${vDrop.toFixed(
              2
            )} V，跨过硅管约 0.7V 门槛后耗尽层变薄，导通电流 ${fmtCurrent(current)}。`
          : `${comp.label} 目前处于${
              vDrop < -0.05 ? '反向截止' : '微导通/零偏置'
            }状态（V_AK = ${vDrop.toFixed(2)} V），PN 结势垒阻断电流，仅存在可忽略微弱漏流（${fmtCurrent(
              current
            )}）。`;
      } else {
        const effFwd = paramBit(activeParams, 'forward', initialParams.forward ? 1 : 0) === 1;
        liveMetrics.push(
          { label: '试算偏置极性', value: effFwd ? '正向偏置 (导通)' : '反向偏置 (截止)', accent: effFwd ? 'emerald' : 'rose' },
          { label: '典型管压降/电流', value: effFwd ? 'V_AK≈0.70V · 正向导通' : 'I≈0.00 mA · 反向封锁', accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算切换为【${
          effFwd ? '正向偏置 (+A → -K)' : '反向偏置 (-A ← +K)'
        }】：${
          effFwd ? '耗尽层变薄，跨越约 0.7V 门槛后指数级正向导通。' : '耗尽层急剧加宽，电流被 PN 结势垒彻底封堵。'
        }`;
      }
      break;
    }

    case 'ZENER_DIODE': {
      const baseVz = Number(comp.props.vz ?? 5.1);
      const revV = Math.max(0, Number((-vDrop).toFixed(2)));
      measuredSummary = `Vz=${baseVz.toFixed(1)}V, V_KA=${revV.toFixed(2)}V, I=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '设定稳压 Vz', value: `${baseVz.toFixed(1)} V`, accent: 'amber' },
          { label: '实测反向 V_KA', value: `${revV.toFixed(2)} V`, accent: 'emerald' },
          { label: '实测电流', value: fmtCurrent(current), accent: 'sky' }
        );
        causalExplanation = `${comp.label} 标称齐纳稳压值 Vz = ${baseVz.toFixed(
          1
        )}V。工作台实测两端电位差为 V_AK = ${vDrop.toFixed(2)}V（V_KA = ${revV.toFixed(
          2
        )}V），电流 ${fmtCurrent(current)}。`;
      } else {
        const effVz = paramNum(activeParams, 'vz', baseVz);
        const effVin = paramNum(activeParams, 'vin', revV);
        const clamping = effVin >= effVz;
        const estVka = clamping ? effVz : effVin;
        liveMetrics.push(
          { label: '试算稳压 Vz', value: `${effVz.toFixed(1)} V`, accent: 'amber' },
          { label: '试算输入/钳位 V_KA', value: `${effVin.toFixed(1)}V ⇒ ${estVka.toFixed(2)}V`, accent: clamping ? 'emerald' : 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算设定 Vz = ${effVz.toFixed(
          1
        )}V、反向输入 ${effVin.toFixed(1)}V：${
          clamping
            ? `已超过稳压门槛，齐纳管击穿将两端电压牢固钳位在 ≈ ${effVz.toFixed(2)} V。`
            : `尚未达到击穿门槛 ${effVz.toFixed(1)}V，稳压管处于截止态，输出跟随 ${effVin.toFixed(2)} V。`
        }`;
        if (Math.abs(effVz - baseVz) > 1e-4) {
          applyPropsPatch = { vz: Number(effVz.toFixed(1)) };
        }
      }
      break;
    }

    case 'LED': {
      const baseMa = initialParams.currentMa;
      measuredSummary = `V_F=${vDrop.toFixed(2)}V, If=${fmtCurrent(current)}`;
      if (!isOverridden) {
        liveMetrics.push(
          {
            label: '实测驱动电流 If',
            value: fmtCurrent(current),
            accent: telemetry?.overloaded ? 'rose' : 'emerald',
          },
          { label: '实测管压降 V_F', value: `${vDrop.toFixed(2)} V`, accent: 'amber' }
        );
        causalExplanation = `${comp.label} 当前正向压降 ${vDrop.toFixed(
          2
        )}V，实测流过电流 ${fmtCurrent(current)}${
          telemetry?.overloaded
            ? ' —— 电流已超额定安全区间，请增大串联限流电阻！'
            : baseMa > 0.5
              ? '，处于安全发光工作区。'
              : '，尚未明显点亮，请检查极性是否正偏及电源/限流电阻。'
        }`;
      } else {
        const effMa = Math.max(0, paramNum(activeParams, 'currentMa', baseMa));
        const over = effMa > 25;
        liveMetrics.push(
          { label: '试算驱动电流 If', value: `${effMa.toFixed(1)} mA`, accent: over ? 'rose' : 'emerald' },
          { label: '试算发光状态', value: effMa < 1 ? '熄灭' : over ? '过流告警 (>25mA)' : '安全发光', accent: over ? 'rose' : 'amber' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算驱动电流 If = ${effMa.toFixed(
          1
        )} mA：${
          effMa < 1 ? '电流过小，LED 熄灭。' : over ? '已超出 25mA 典型安全线，存在烧毁风险！' : '处于安全高效率发光区。'
        }`;
      }
      break;
    }

    case 'BJT_NPN': {
      const beta = Number(comp.props.beta ?? 100);
      const vbe = pinV(telemetry, 'b') - pinV(telemetry, 'e');
      const vce = pinV(telemetry, 'c') - pinV(telemetry, 'e');
      measuredSummary = `V_BE=${vbe.toFixed(2)}V, Ic=${fmtCurrent(current)}`;
      if (!isOverridden) {
        liveMetrics.push(
          { label: '实测 V_BE / V_CE', value: `${vbe.toFixed(2)}V / ${vce.toFixed(2)}V`, accent: 'amber' },
          { label: '实测集电极 Ic', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = `${comp.label} (β=${beta}) 实测 V_BE = ${vbe.toFixed(
          2
        )}V，V_CE = ${vce.toFixed(2)}V，集电极电流 ${fmtCurrent(current)}。${
          vbe < 0.55 ? '当前处于截止区（V_BE < 0.7V）。' : vce < 0.4 ? '当前进入饱和导通区（V_CE 很低）。' : '当前处于线性放大区，Ic ≈ β·Ib。'
        }`;
      } else {
        const effIb = Math.max(0, paramNum(activeParams, 'ib', initialParams.ib));
        const estIc = (effIb * 1e-6) * beta;
        const region = effIb <= 2 ? '截止区' : effIb >= 95 ? '接近饱和区' : '线性放大区';
        liveMetrics.push(
          { label: '试算基极 Ib', value: `${effIb.toFixed(0)} µA (${region})`, accent: 'amber' },
          { label: '估算集电极 Ic=β·Ib', value: fmtCurrent(estIc), accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算注入基极电流 Ib = ${effIb.toFixed(
          0
        )} µA（β=${beta}），处于${region}，理想线性推算集电极电流 Ic ≈ β·Ib = ${fmtCurrent(estIc)}。`;
      }
      break;
    }

    case 'NMOS': {
      const baseVth = Number(comp.props.vth ?? 2.0);
      const baseVgs = Number((pinV(telemetry, 'g') - pinV(telemetry, 's')).toFixed(2));
      measuredSummary = `V_GS=${baseVgs.toFixed(2)}V, V_th=${baseVth.toFixed(1)}V, I_D=${fmtCurrent(current)}`;

      if (!isOverridden) {
        liveMetrics.push(
          {
            label: '实测 V_GS / V_th',
            value: `${baseVgs.toFixed(2)}V / ${baseVth.toFixed(1)}V`,
            accent: baseVgs >= baseVth ? 'emerald' : 'amber',
          },
          { label: '实测漏极电流 I_D', value: fmtCurrent(current), accent: 'sky' }
        );
        causalExplanation = `${comp.label} 开启阈值 V_th = ${baseVth.toFixed(
          1
        )}V，工作台实测栅源压差 V_GS = ${baseVgs.toFixed(2)}V。${
          baseVgs >= baseVth
            ? `因为 V_GS ≥ V_th，绝缘栅下方已感生出 N 型导电沟道，驱动漏极电流 ${fmtCurrent(current)}。`
            : '因为 V_GS < V_th，沟道尚未开启，漏源极之间呈截止断路。'
        }`;
      } else {
        const effVth = paramNum(activeParams, 'vth', baseVth);
        const effVgs = paramNum(activeParams, 'vgs', baseVgs);
        const on = effVgs > effVth;
        const kp = Math.max(1e-4, Number(comp.props.kp ?? 0.08));
        const estId = on ? 0.5 * kp * Math.pow(effVgs - effVth, 2) : 0;
        pinVoltageOverrides.g = pinV(telemetry, 's') + effVgs;
        liveMetrics.push(
          { label: '试算 V_GS / V_th', value: `${effVgs.toFixed(1)}V / ${effVth.toFixed(1)}V`, accent: on ? 'emerald' : 'amber' },
          { label: '推算饱和 I_D', value: on ? fmtCurrent(estId) : '0.00 mA (截止)', accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算 V_GS = ${effVgs.toFixed(
          1
        )} V、阈值 V_th = ${effVth.toFixed(1)} V：${
          on ? `已跨越阈值开启导电沟道，饱和估算电流 ≈ ${fmtCurrent(estId)}。` : '未达开启阈值，MOS 管截止。'
        }`;
        if (Math.abs(effVth - baseVth) > 1e-4) {
          applyPropsPatch = { vth: Number(effVth.toFixed(1)) };
        }
      }
      break;
    }

    case 'OPAMP': {
      const vp = pinV(telemetry, 'inp');
      const vn = pinV(telemetry, 'inm');
      const vout = pinV(telemetry, 'out');
      const vdiff = vp - vn;
      measuredSummary = `V+=${vp.toFixed(2)}V, V-=${vn.toFixed(2)}V, Vout=${vout.toFixed(2)}V`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '实测 V+ / V-', value: `${vp.toFixed(2)}V / ${vn.toFixed(2)}V`, accent: 'sky' },
          { label: '实测输出 Vout', value: `${vout.toFixed(2)} V`, accent: 'emerald' }
        );
        causalExplanation = `${comp.label} 实测 V+ = ${vp.toFixed(2)}V，V- = ${vn.toFixed(
          2
        )}V（差分 |V+ - V-| = ${Math.abs(vdiff).toFixed(3)}V），输出端电位 Vout = ${vout.toFixed(
          2
        )}V。负反馈电路会自发调节 Vout 令“虚短”条件 V- 紧跟 V+。`;
      } else {
        const effVin = paramNum(activeParams, 'vin', initialParams.vin);
        const railPos = Number(comp.props.railPos ?? 12);
        const railNeg = Number(comp.props.railNeg ?? -12);
        const estInvOut = Math.max(railNeg, Math.min(railPos, -3 * effVin));
        liveMetrics.push(
          { label: '试算示例输入 Vin', value: `${effVin.toFixed(1)} V`, accent: 'sky' },
          { label: '典型反相推算 (-3×)', value: `${estInvOut.toFixed(1)} V`, accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】按经典 -3× 反相放大示例输入 Vin = ${effVin.toFixed(
          1
        )} V 推算，输出 Vout ≈ ${estInvOut.toFixed(1)} V（工作台实测闭环增益取决于外接 Rf/Rin 电阻）。`;
      }
      break;
    }

    case 'TIMER_555': {
      const vVcc = pinV(telemetry, 'vcc');
      const vGnd = pinV(telemetry, 'gnd');
      const vSup = Math.max(0, vVcc - vGnd);
      const vTrig = pinV(telemetry, 'trig');
      const vThres = pinV(telemetry, 'thres');
      const vOut = pinV(telemetry, 'out');
      const vLo = vGnd + vSup / 3;
      const vHi = vGnd + (2 * vSup) / 3;
      const outBit = vSup >= 1.5 && vOut - vGnd >= 0.5 * vSup ? 1 : 0;
      measuredSummary = `VCC=${vSup.toFixed(1)}V, TRIG=${vTrig.toFixed(2)}V, THRES=${vThres.toFixed(2)}V, OUT=${vOut.toFixed(2)}V (${outBit})`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '供电 VCC-GND', value: `${vSup.toFixed(2)} V`, accent: 'amber' },
          { label: '门限窗口 [1/3, 2/3]', value: `[${vLo.toFixed(2)}V, ${vHi.toFixed(2)}V]`, accent: 'sky' },
          { label: '实测触发 / 阈值', value: `${vTrig.toFixed(2)}V / ${vThres.toFixed(2)}V`, accent: 'violet' },
          { label: '输出 OUT / 内部 Q', value: `${vOut.toFixed(2)}V (Q=${outBit})`, accent: outBit ? 'emerald' : 'rose' }
        );
        causalExplanation =
          vSup < 1.5
            ? `${comp.label} 当前供电差 VCC - GND = ${vSup.toFixed(2)} V（低于 1.5 V 启动电压），内部比较器尚未建立 1/3 与 2/3 分压基准。`
            : `${comp.label} 由工作台实测供电 ${vSup.toFixed(2)} V 建立窗口 [${vLo.toFixed(2)}V, ${vHi.toFixed(
                2
              )}V]。当前 TRIG = ${vTrig.toFixed(2)} V、THRES = ${vThres.toFixed(2)} V，锁存输出 Q = ${outBit}（OUT = ${vOut.toFixed(
                2
              )} V，DIS ${outBit ? '高阻截止令电容充电' : '对地导通令电容放电'}）。`;
      } else {
        const effVcc = paramNum(activeParams, 'vcc', initialParams.vcc);
        const effR = Math.max(1, paramNum(activeParams, 'rKohm', 10)) * 1e3;
        const effC = Math.max(1, paramNum(activeParams, 'cUf', 10)) * 1e-6;
        const tPeriod = 0.693 * 3 * effR * effC;
        const freq = 1 / Math.max(1e-6, tPeriod);
        liveMetrics.push(
          { label: '试算门限 [1/3, 2/3]', value: `[${(effVcc / 3).toFixed(2)}V, ${((2 * effVcc) / 3).toFixed(2)}V]`, accent: 'amber' },
          { label: '多谐周期 T (R1=R2)', value: `${(tPeriod * 1000).toFixed(1)} ms`, accent: 'sky' },
          { label: '多谐输出频率 f', value: `${freq.toFixed(2)} Hz (D=66.7%)`, accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】设 VCC = ${effVcc.toFixed(
          1
        )} V、R₁=R₂=${(effR / 1000).toFixed(0)} kΩ、C=${(effC * 1e6).toFixed(0)} μF：内部门限窗口 [${(
          effVcc / 3
        ).toFixed(2)}V, ${((2 * effVcc) / 3).toFixed(2)}V]，典型多谐周期 T ≈ ${(tPeriod * 1000).toFixed(
          1
        )} ms（f ≈ ${freq.toFixed(2)} Hz）。`;
      }
      break;
    }

    case 'TRANSFORMER': {
      const baseRatio = Number(comp.props.ratio ?? 2.0);
      const vPri = pinV(telemetry, 'p1') - pinV(telemetry, 'p2');
      const vSec = pinV(telemetry, 's1') - pinV(telemetry, 's2');
      measuredSummary = `k=${baseRatio}, V1=${vPri.toFixed(2)}V, V2=${vSec.toFixed(2)}V`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '设定匝比 k (Ns/Np)', value: `${baseRatio}×`, accent: 'amber' },
          { label: '瞬时原边 / 副边', value: `${vPri.toFixed(2)}V / ${vSec.toFixed(2)}V`, accent: 'emerald' }
        );
        if (telemetry?.vRms !== undefined) {
          liveMetrics.push({
            label: '原边交流有效值 V1~',
            value: `${telemetry.vRms.toFixed(2)} V~ (副边约 ${(telemetry.vRms * baseRatio).toFixed(2)} V~)`,
            accent: 'sky',
          });
        }
        causalExplanation = `${comp.label} 匝数比 Ns:Np = ${baseRatio}，当前原边实测瞬时电压 ${vPri.toFixed(
          2
        )}V 经铁芯互感在副边感应出 ${vSec.toFixed(2)}V 电压，能量按比例向副边负载传递。`;
      } else {
        const effK = paramNum(activeParams, 'turnsRatio', baseRatio);
        const effV1 = paramNum(activeParams, 'acAmp', initialParams.acAmp);
        const effV2 = effV1 * effK;
        liveMetrics.push(
          { label: '试算匝比 k', value: `${effK.toFixed(2)}×`, accent: 'amber' },
          { label: '试算 V₁ → V₂', value: `${effV1.toFixed(1)}V → ${effV2.toFixed(1)}V`, accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算设定匝比 k = ${effK.toFixed(
          2
        )}、原边交流幅值 V₁ = ${effV1.toFixed(1)} V，则副边理想感应幅值 V₂ = k·V₁ = ${effV2.toFixed(1)} V。`;
        if (Math.abs(effK - baseRatio) > 1e-4) {
          applyPropsPatch = { ratio: Number(effK.toFixed(2)) };
        }
      }
      break;
    }

    case 'LAMP': {
      const rv = Number(comp.props.ratedVoltage ?? 5);
      const rp = Number(comp.props.ratedPower ?? 1.5);
      const rBulb = initialParams.resistance;
      measuredSummary = `V=${vDrop.toFixed(2)}V, I=${fmtCurrent(current)}, P=${formatEngineeringValue(power, 'W')}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '额定/等效阻值', value: `${rv}V/${rp}W (${rBulb}Ω)`, accent: 'amber' },
          { label: '实耗功率 P', value: formatEngineeringValue(power, 'W'), accent: 'emerald' },
          { label: '实测亮度占比', value: `${loadPct}%`, accent: loadPct > 110 ? 'rose' : 'sky' }
        );
        causalExplanation = `${comp.label} 当前两端实测电压 ${vDrop.toFixed(
          2
        )}V、电流 ${fmtCurrent(current)}，实耗电功率 P = ${formatEngineeringValue(
          power,
          'W'
        )}，约为额定功率（${rp}W）的 ${loadPct}%。`;
      } else {
        const effV = Math.max(0, paramNum(activeParams, 'voltage', initialParams.voltage));
        const effR = Math.max(1, paramNum(activeParams, 'resistance', rBulb));
        const effI = effV / effR;
        const effP = (effV * effV) / effR;
        const estPct = Math.round((effP / Math.max(0.1, rp)) * 100);
        liveMetrics.push(
          { label: '试算 V / R', value: `${effV.toFixed(1)}V / ${effR.toFixed(0)}Ω`, accent: 'amber' },
          { label: '试算功率 / 电流', value: `${formatEngineeringValue(effP, 'W')} (${fmtCurrent(effI)})`, accent: 'emerald' },
          { label: '推算亮度', value: `${estPct}%`, accent: estPct > 110 ? 'rose' : 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算在灯丝等效电阻 ${effR.toFixed(
          0
        )} Ω 两端施加 ${effV.toFixed(1)} V 时，电流 ${fmtCurrent(effI)}，功耗 P = V²/R = ${formatEngineeringValue(
          effP,
          'W'
        )}（额定占比 ${estPct}%）。`;
      }
      break;
    }

    case 'FUSE': {
      const baseRated = Number(comp.props.tripCurrent ?? 0.5);
      const blown = Boolean(comp.props.blown) || Boolean(telemetry?.extraInfo?.includes('已熔断'));
      measuredSummary = `${blown ? '已熔断' : '正常'}, I=${fmtCurrent(current)}, 限=${baseRated}A`;

      if (!isOverridden) {
        liveMetrics.push(
          {
            label: '实测状态 / 阈值',
            value: blown ? '已熔断!' : `正常 (限 ${baseRated}A)`,
            accent: blown ? 'rose' : 'emerald',
          },
          { label: '实测电流', value: fmtCurrent(current), accent: 'sky' }
        );
        causalExplanation = blown
          ? `${comp.label} 因通过电流曾超过熔断阈值 ${baseRated}A 已触发物理熔断切断电路，可在属性栏或工作台点击器件一键复位恢复。`
          : `${comp.label} 当前实测电流 ${fmtCurrent(current)}，低于设定阈值 ${baseRated}A，内部熔丝以毫欧级低阻正常导通。`;
      } else {
        const effI = Math.max(0, paramNum(activeParams, 'current', initialParams.current));
        const effRated = Math.max(0.05, paramNum(activeParams, 'rated', baseRated));
        const willBlow = effI >= effRated;
        liveMetrics.push(
          { label: '试算电流 / 阈值', value: `${effI.toFixed(2)}A / ${effRated.toFixed(2)}A`, accent: 'sky' },
          { label: '推算熔断判定', value: willBlow ? '触发熔断切断!' : '安全导通', accent: willBlow ? 'rose' : 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】试算电流 I = ${effI.toFixed(
          2
        )} A 对比额定阈值 ${effRated.toFixed(2)} A：${
          willBlow ? 'I ≥ I_max，熔丝将过热熔断隔离保护后级！' : 'I < I_max，熔丝维持低阻正常导通。'
        }`;
        if (Math.abs(effRated - baseRated) > 1e-4) {
          applyPropsPatch = { tripCurrent: Number(effRated.toFixed(2)) };
        }
      }
      break;
    }

    case 'VOLTMETER': {
      const isRmsMode = comp.props.mode === 'rms' && telemetry?.vRms !== undefined;
      const dispV = isRmsMode ? telemetry!.vRms! : vDrop;
      measuredSummary = isRmsMode ? `V~=${dispV.toFixed(2)}V` : `V=${vDrop.toFixed(3)}V`;
      if (!isOverridden) {
        liveMetrics.push(
          {
            label: isRmsMode ? '交流有效值 V~' : '实测电压 V',
            value: isRmsMode ? `${dispV.toFixed(2)} V~ (瞬时 ${vDrop.toFixed(2)} V)` : `${vDrop.toFixed(3)} V`,
            accent: 'sky',
          },
          { label: '分流电流', value: fmtCurrent(current), accent: 'emerald' }
        );
        causalExplanation = `${comp.label} 以高达 10MΩ 内阻跨接测得两点${
          isRmsMode ? `交流有效值电压 ${dispV.toFixed(2)} V~` : `电位差 ${vDrop.toFixed(3)} V`
        }（+端 ${pinV(telemetry, 'pos').toFixed(2)}V，-端 ${pinV(telemetry, 'neg').toFixed(
          2
        )}V），几乎不抽取原电路电流。`;
      } else {
        const ok = paramBit(activeParams, 'parallelOk', 1) === 1;
        liveMetrics.push(
          { label: '试算接法演示', value: ok ? '正确并联 (不扰动主路)' : '错误串联 (高阻卡死回路)', accent: ok ? 'emerald' : 'rose' },
          { label: '原实测压差', value: `${vDrop.toFixed(3)} V`, accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】${
          ok
            ? '正确跨接并联时，10MΩ 高阻使表头分流几乎为零，读数精确反映被测元件真实端压。'
            : '若错误地将 10MΩ 电压表串联进主回路，全支路电流瞬间被堵死趋近于零！'
        }`;
      }
      break;
    }

    case 'AMMETER': {
      const isRmsMode = comp.props.mode === 'rms' && telemetry?.iRms !== undefined;
      const dispI = isRmsMode ? telemetry!.iRms! : current;
      measuredSummary = isRmsMode ? `I~=${fmtCurrent(dispI)}` : `I=${fmtCurrent(current)}`;
      if (!isOverridden) {
        liveMetrics.push(
          {
            label: isRmsMode ? '交流有效值 I~' : '实测电流 I',
            value: isRmsMode ? `${fmtCurrent(dispI)}~ (瞬时 ${fmtCurrent(current)})` : fmtCurrent(current),
            accent: 'emerald',
          },
          { label: '表头压降', value: `${(vDrop * 1000).toFixed(2)} mV`, accent: 'amber' }
        );
        causalExplanation = `${comp.label} 串联在被测支路中实时测得${
          isRmsMode ? `交流有效值电流 ${fmtCurrent(dispI)}~` : `电流 ${fmtCurrent(current)}`
        }；自身仅产生 ${Math.abs(vDrop * 1000).toFixed(2)} mV 微小压降，不干扰主回路工况。`;
      } else {
        const r = Math.max(1, paramNum(activeParams, 'loadOhms', 200));
        const estI = 5 / r;
        liveMetrics.push(
          { label: '试算示例负载 R', value: `${r.toFixed(0)} Ω (@5V)`, accent: 'amber' },
          { label: '试算电流读数 I', value: fmtCurrent(estI), accent: 'emerald' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】按 5V 示例回路与试算串联负载 R = ${r.toFixed(
          0
        )} Ω 计算，支路电流为 I = 5V / ${r.toFixed(0)}Ω = ${fmtCurrent(estI)}。`;
      }
      break;
    }

    // ---------- Digital Logic Modules ----------
    case 'LOGIC_IN':
    case 'IC_PORT_IN': {
      const baseBit: 0 | 1 = initialParams.state >= 0.5 ? 1 : 0;
      const pinId = comp.type === 'IC_PORT_IN' ? 'io' : 'out';
      const measuredV = pinV(telemetry, pinId) || (baseBit ? 5 : 0);
      measuredSummary = `state=${baseBit} (${measuredV.toFixed(2)}V)`;

      const effBit: 0 | 1 = isOverridden ? paramBit(activeParams, 'state', baseBit) : baseBit;
      const effV = isOverridden ? (effBit ? 5 : 0) : measuredV;
      if (isOverridden) {
        pinVoltageOverrides[pinId] = effV;
        if (comp.type === 'LOGIC_IN' || !comp.props.__packagedPort) {
          applyPropsPatch = { state: effBit };
        }
      }

      liveMetrics.push({
        label: isOverridden ? '试算输出逻辑态' : '实测输出逻辑态',
        value: effBit ? '1 (HIGH +5.0V)' : '0 (LOW 0.0V)',
        accent: effBit ? 'emerald' : 'amber',
      });
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】试算将 ` : ''
      }${comp.label} ${isOverridden ? '改拨为' : '当前拨向'}逻辑 ${effBit}（${
        isOverridden ? '推算' : '实测'
      }输出电位 ${effV.toFixed(2)}V），作为数字组合/时序激励输入向后级传送。`;
      break;
    }

    case 'CLOCK': {
      const baseFreq = Number(comp.props.freq ?? comp.props.frequency ?? 1);
      const bit = (telemetry?.logicState ?? 0) ? 1 : 0;
      measuredSummary = `f=${baseFreq}Hz, level=${bit}`;

      if (!isOverridden) {
        liveMetrics.push(
          { label: '设定时钟频率', value: `${baseFreq} Hz`, accent: 'violet' },
          { label: '实测当前电平', value: bit ? '1 (HIGH)' : '0 (LOW)', accent: bit ? 'emerald' : 'amber' }
        );
        causalExplanation = `${comp.label} 当前以 ${baseFreq}Hz 周期节拍持续输出 0V/+5V 方波（此刻瞬时逻辑态 = ${bit}），每个 0→1 上升沿都会触发后级时序芯片采样。`;
      } else {
        const effF = paramNum(activeParams, 'freq', initialParams.freq);
        liveMetrics.push(
          { label: '试算时钟频率', value: `${effF.toFixed(1)} Hz`, accent: 'violet' },
          { label: '脉冲周期 T', value: `${(1 / Math.max(0.1, effF)).toFixed(2)} s`, accent: 'sky' }
        );
        causalExplanation = `【交互试算 · 工作台原实测：${measuredSummary}】将方波时钟频率试算调整为 ${effF.toFixed(
          1
        )} Hz（周期 T = ${(1 / Math.max(0.1, effF)).toFixed(2)} s），每秒产生 ${effF.toFixed(1)} 次 0→1 上升沿。`;
        applyPropsPatch = { freq: Number(effF.toFixed(1)) };
      }
      break;
    }

    case 'LOGIC_OUT': {
      const baseVin = pinV(telemetry, 'in');
      const baseBit = fmtBoolBit(baseVin);
      measuredSummary = `Vin=${baseVin.toFixed(2)}V (${baseBit})`;

      const effVin = isOverridden ? paramNum(activeParams, 'vin', baseVin) : baseVin;
      const effBit = fmtBoolBit(effVin);
      if (isOverridden) {
        pinVoltageOverrides.in = effVin;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算输入电位' : '实测输入电位', value: `${effVin.toFixed(2)} V`, accent: 'sky' },
        {
          label: isOverridden ? '试算逻辑判决' : '实测逻辑判决',
          value: `${effBit} (${effBit ? '点亮' : '熄灭'})`,
          accent: effBit ? 'emerald' : 'rose',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】试算输入电位 ` : `${comp.label} 实测输入电位 `
      }${effVin.toFixed(2)}V ${
        effBit ? '≥ 2.5V 高电平阈值，因此灯塔点亮输出逻辑 1' : '< 2.5V 阈值，因此熄灭判定为逻辑 0'
      }。`;
      break;
    }

    case 'HEX_DISPLAY': {
      const baseHex = initialParams.hexVal;
      const b3 = fmtBoolBit(pinV(telemetry, 'd3'));
      const b2 = fmtBoolBit(pinV(telemetry, 'd2'));
      const b1 = fmtBoolBit(pinV(telemetry, 'd1'));
      const b0 = fmtBoolBit(pinV(telemetry, 'd0'));
      measuredSummary = `${b3}${b2}${b1}${b0} (0x${baseHex.toString(16).toUpperCase()})`;

      const effVal = isOverridden
        ? Math.max(0, Math.min(15, Math.round(paramNum(activeParams, 'hexVal', baseHex))))
        : baseHex;
      const eb3 = (effVal >> 3) & 1;
      const eb2 = (effVal >> 2) & 1;
      const eb1 = (effVal >> 1) & 1;
      const eb0 = effVal & 1;
      if (isOverridden) {
        pinVoltageOverrides.d3 = eb3 * 5;
        pinVoltageOverrides.d2 = eb2 * 5;
        pinVoltageOverrides.d1 = eb1 * 5;
        pinVoltageOverrides.d0 = eb0 * 5;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算 D3..D0' : '实测 D3..D0', value: `${eb3}${eb2}${eb1}${eb0}`, accent: 'sky' },
        {
          label: isOverridden ? '试算译码显示' : '实测译码显示',
          value: `0x${effVal.toString(16).toUpperCase()} (${effVal})`,
          accent: 'rose',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】试算设定 ` : `${comp.label} 接收到 `
      }4 位二进制输入 D3=${eb3}, D2=${eb2}, D1=${eb1}, D0=${eb0}，按 8-4-2-1 权重求和得十进制 ${effVal}，七段译码显示十六进制 “${effVal
        .toString(16)
        .toUpperCase()}”。`;
      break;
    }

    case 'NOT': {
      const baseA = fmtBoolBit(pinV(telemetry, 'a'));
      const baseY = fmtBoolBit(pinV(telemetry, 'y'));
      measuredSummary = `A=${baseA} ⇒ Y=${baseY}`;

      const a = isOverridden ? paramBit(activeParams, 'a', baseA) : baseA;
      const y: 0 | 1 = a ? 0 : 1;
      const va = isOverridden ? a * 5 : pinV(telemetry, 'a');
      const vy = isOverridden ? y * 5 : pinV(telemetry, 'y');
      if (isOverridden) {
        pinVoltageOverrides.a = va;
        pinVoltageOverrides.y = vy;
      }

      liveMetrics.push({
        label: isOverridden ? '试算输入/输出' : '实测输入/输出',
        value: `A=${a} ⇒ Y=${y}`,
        accent: y ? 'emerald' : 'amber',
      });
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} ${isOverridden ? '试算' : '实测'}输入引脚 A=${a} (${va.toFixed(
        2
      )}V)，经反相取反后输出 Y=${y} (${vy.toFixed(2)}V)。`;
      break;
    }

    case 'AND':
    case 'OR':
    case 'NAND':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const baseA = fmtBoolBit(pinV(telemetry, 'a'));
      const baseB = fmtBoolBit(pinV(telemetry, 'b'));
      const baseY = fmtBoolBit(pinV(telemetry, 'y'));
      measuredSummary = `A=${baseA}, B=${baseB} ⇒ Y=${baseY}`;

      const a = isOverridden ? paramBit(activeParams, 'a', baseA) : baseA;
      const b = isOverridden ? paramBit(activeParams, 'b', baseB) : baseB;
      const computeGateY = (): 0 | 1 => {
        switch (comp.type) {
          case 'AND':
            return a & b ? 1 : 0;
          case 'OR':
            return a | b ? 1 : 0;
          case 'NAND':
            return a & b ? 0 : 1;
          case 'NOR':
            return a | b ? 0 : 1;
          case 'XOR':
            return a ^ b ? 1 : 0;
          case 'XNOR':
            return a === b ? 1 : 0;
          default:
            return 0;
        }
      };
      const y: 0 | 1 = isOverridden ? computeGateY() : baseY;
      const va = isOverridden ? a * 5 : pinV(telemetry, 'a');
      const vb = isOverridden ? b * 5 : pinV(telemetry, 'b');
      const vy = isOverridden ? y * 5 : pinV(telemetry, 'y');
      if (isOverridden) {
        pinVoltageOverrides.a = va;
        pinVoltageOverrides.b = vb;
        pinVoltageOverrides.y = vy;
      }

      const opDesc: Record<string, string> = {
        AND: `两输入必须全 1 才出 1，当前 ${a} · ${b} = ${y}`,
        OR: `只要有 1 个输入为 1 即出 1，当前 ${a} + ${b} = ${y}`,
        NAND: `先与后非，唯有双 1 出 0，当前 (${a} · ${b})' = ${y}`,
        NOR: `先或后非，唯有双 0 出 1，当前 (${a} + ${b})' = ${y}`,
        XOR:
          a === b
            ? `两输入状态相同（均为 ${a}），逻辑抵消故输出 Y = ${a} ⊕ ${b} = 0`
            : `两输入状态相异（A=${a}, B=${b}），故输出 Y = ${a} ⊕ ${b} = 1`,
        XNOR:
          a === b
            ? `两输入状态相同（均为 ${a}），相等比较命中故输出 Y = ${y}`
            : `两输入状态相异（A=${a}, B=${b}），故相等比较输出 Y = 0`,
      };
      liveMetrics.push(
        { label: isOverridden ? '试算输入 A, B' : '实测输入 A, B', value: `A=${a}, B=${b}`, accent: 'sky' },
        {
          label: isOverridden ? '试算输出 Y' : '实测输出 Y',
          value: `Y=${y} (${vy.toFixed(1)}V)`,
          accent: y ? 'emerald' : 'amber',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : '你的工作台 '
      }${cat.shortName} ${comp.label} 当前输入${
        isOverridden ? '试算' : '实测'
      }为 A=${a} (${va.toFixed(1)}V)、B=${b} (${vb.toFixed(1)}V)：${opDesc[comp.type]}。`;
      break;
    }

    case 'HALF_ADDER': {
      const baseA = fmtBoolBit(pinV(telemetry, 'a'));
      const baseB = fmtBoolBit(pinV(telemetry, 'b'));
      const baseS = fmtBoolBit(pinV(telemetry, 's'));
      const baseC = fmtBoolBit(pinV(telemetry, 'c'));
      measuredSummary = `${baseA}+${baseB}=${baseC}${baseS}₂`;

      const a = isOverridden ? paramBit(activeParams, 'a', baseA) : baseA;
      const b = isOverridden ? paramBit(activeParams, 'b', baseB) : baseB;
      const s = isOverridden ? ((a ^ b) as 0 | 1) : baseS;
      const c = isOverridden ? ((a & b) as 0 | 1) : baseC;
      if (isOverridden) {
        pinVoltageOverrides.a = a * 5;
        pinVoltageOverrides.b = b * 5;
        pinVoltageOverrides.s = s * 5;
        pinVoltageOverrides.c = c * 5;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算输入 A + B' : '实测输入 A + B', value: `${a} + ${b}`, accent: 'sky' },
        {
          label: isOverridden ? '试算和与进位 (C,S)' : '实测和与进位 (C,S)',
          value: `C=${c}, S=${s} (=${c * 2 + s})`,
          accent: 'emerald',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} ${isOverridden ? '试算' : '实测'}计算 ${a} + ${b} = ${c}${s}₂（本位和 S=${a}⊕${b}=${s}，进位 C=${a}·${b}=${c}）。`;
      break;
    }

    case 'FULL_ADDER': {
      const baseA = fmtBoolBit(pinV(telemetry, 'a'));
      const baseB = fmtBoolBit(pinV(telemetry, 'b'));
      const baseCin = fmtBoolBit(pinV(telemetry, 'cin'));
      const baseS = fmtBoolBit(pinV(telemetry, 's'));
      const baseCout = fmtBoolBit(pinV(telemetry, 'cout'));
      measuredSummary = `${baseA}+${baseB}+${baseCin}=${baseCout}${baseS}₂`;

      const a = isOverridden ? paramBit(activeParams, 'a', baseA) : baseA;
      const b = isOverridden ? paramBit(activeParams, 'b', baseB) : baseB;
      const cin = isOverridden ? paramBit(activeParams, 'cin', baseCin) : baseCin;
      const total = a + b + cin;
      const s = isOverridden ? ((total & 1) as 0 | 1) : baseS;
      const cout = isOverridden ? ((total >= 2 ? 1 : 0) as 0 | 1) : baseCout;
      if (isOverridden) {
        pinVoltageOverrides.a = a * 5;
        pinVoltageOverrides.b = b * 5;
        pinVoltageOverrides.cin = cin * 5;
        pinVoltageOverrides.s = s * 5;
        pinVoltageOverrides.cout = cout * 5;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算三输入' : '实测三输入', value: `${a}+${b}+${cin}`, accent: 'sky' },
        {
          label: isOverridden ? '试算结果 (Cout, S)' : '实测结果 (Cout, S)',
          value: `Cout=${cout}, S=${s} (=${cout * 2 + s})`,
          accent: 'emerald',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} ${isOverridden ? '试算' : '实测'}将 3 个输入 A=${a}, B=${b}, Cin=${cin} 相加，总和等于十进制 ${total}，因此向高位进位 Cout=${cout}、本位和 S=${s}。`;
      break;
    }

    case 'MUX_2_1': {
      const baseSel = fmtBoolBit(pinV(telemetry, 'sel'));
      const baseD0 = fmtBoolBit(pinV(telemetry, 'd0'));
      const baseD1 = fmtBoolBit(pinV(telemetry, 'd1'));
      const baseY = fmtBoolBit(pinV(telemetry, 'y'));
      measuredSummary = `SEL=${baseSel}, D0=${baseD0}, D1=${baseD1} ⇒ Y=${baseY}`;

      const sel = isOverridden ? paramBit(activeParams, 'sel', baseSel) : baseSel;
      const d0 = isOverridden ? paramBit(activeParams, 'a', baseD0) : baseD0;
      const d1 = isOverridden ? paramBit(activeParams, 'b', baseD1) : baseD1;
      const y = isOverridden ? (sel ? d1 : d0) : baseY;
      if (isOverridden) {
        pinVoltageOverrides.sel = sel * 5;
        pinVoltageOverrides.d0 = d0 * 5;
        pinVoltageOverrides.d1 = d1 * 5;
        pinVoltageOverrides.y = y * 5;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算 SEL / 通道' : '实测 SEL / 通道', value: `SEL=${sel}, D0=${d0}, D1=${d1}`, accent: 'sky' },
        { label: isOverridden ? '试算复用输出 Y' : '实测复用输出 Y', value: `Y=${y}`, accent: y ? 'emerald' : 'amber' }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} 选择端 SEL=${sel}，把通道 ${sel ? `D1 (=${d1})` : `D0 (=${d0})`} 路由接通到公共输出端 Y=${y}。`;
      break;
    }

    case 'D_FF': {
      const baseD = fmtBoolBit(pinV(telemetry, 'd'));
      const baseClk = fmtBoolBit(pinV(telemetry, 'clk'));
      const baseQ = fmtBoolBit(pinV(telemetry, 'q'));
      measuredSummary = `D=${baseD}, CLK=${baseClk}, Q=${baseQ}`;

      const d = isOverridden ? paramBit(activeParams, 'd', baseD) : baseD;
      const clk = isOverridden ? paramBit(activeParams, 'clk', baseClk) : baseClk;
      const q = isOverridden ? paramBit(activeParams, '_q', baseQ) : baseQ;
      if (isOverridden) {
        pinVoltageOverrides.d = d * 5;
        pinVoltageOverrides.clk = clk * 5;
        pinVoltageOverrides.q = q * 5;
        pinVoltageOverrides.qn = (q ^ 1) * 5;
      }

      liveMetrics.push(
        { label: isOverridden ? '试算 D / CLK' : '实测 D / CLK', value: `D=${d}, CLK=${clk}`, accent: 'sky' },
        {
          label: isOverridden ? '试算锁存状态 Q' : '实测锁存状态 Q',
          value: `Q=${q}, Q'=${q ^ 1}`,
          accent: q ? 'emerald' : 'amber',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} 当前已锁存输出 Q=${q}（互补端 Q'=${q ^ 1}）；目前数据端 D=${d}、时钟 CLK=${clk}。只有 CLK 由 0→1 上升沿跳变瞬间，Q 才会采样更新为 D。`;
      break;
    }

    case 'JK_FF': {
      const baseJ = fmtBoolBit(pinV(telemetry, 'j'));
      const baseK = fmtBoolBit(pinV(telemetry, 'k'));
      const q = fmtBoolBit(pinV(telemetry, 'q'));
      measuredSummary = `J=${baseJ}, K=${baseK}, Q=${q}`;

      const j = isOverridden ? paramBit(activeParams, 'j', baseJ) : baseJ;
      const k = isOverridden ? paramBit(activeParams, 'k', baseK) : baseK;
      if (isOverridden) {
        pinVoltageOverrides.j = j * 5;
        pinVoltageOverrides.k = k * 5;
      }

      const modeText =
        j === 0 && k === 0
          ? '保持模式'
          : j === 0 && k === 1
            ? '复位清 0 模式'
            : j === 1 && k === 0
              ? '置 1 模式'
              : '翻转(Toggle)模式';
      liveMetrics.push({
        label: isOverridden ? '试算 J / K | Q' : '实测 J / K / Q',
        value: `J=${j}, K=${k} | Q=${q}`,
        accent: 'sky',
      });
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} 当前输入 J=${j}, K=${k}（对应“${modeText}”），每当 CLK 到来上升沿即按此规则更新锁存输出（工作台当前 Q=${q}）。`;
      break;
    }

    case 'COUNTER_4BIT': {
      const baseRst = fmtBoolBit(pinV(telemetry, 'rst'));
      const baseVal = telemetry?.logicState ?? 0;
      measuredSummary = `Q=${baseVal.toString(2).padStart(4, '0')}(${baseVal}), RST=${baseRst}`;

      const rst = isOverridden ? paramBit(activeParams, 'clr', baseRst) : baseRst;
      const val = rst ? 0 : baseVal;
      if (isOverridden) {
        pinVoltageOverrides.rst = rst * 5;
        if (rst) {
          pinVoltageOverrides.q3 = 0;
          pinVoltageOverrides.q2 = 0;
          pinVoltageOverrides.q1 = 0;
          pinVoltageOverrides.q0 = 0;
        }
      }

      liveMetrics.push(
        {
          label: isOverridden ? '推算计数 Q3..Q0' : '实测计数 Q3..Q0',
          value: `${val.toString(2).padStart(4, '0')} (${val})`,
          accent: 'violet',
        },
        {
          label: isOverridden ? '试算复位 RST' : '实测复位 RST',
          value: rst ? '1 (清零锁定)' : '0 (正常递增)',
          accent: rst ? 'rose' : 'emerald',
        }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} 当前二进制状态 ${val.toString(2).padStart(4, '0')}（十进制 ${val}）${
        rst ? '；由于 RST=1 高电平有效，计数已被清零锁定。' : '；每次 CLK 上升沿递增 +1 并模 16 循环。'
      }`;
      break;
    }

    case 'CUSTOM_TRUTH_8':
    case 'CUSTOM_TRUTH_16': {
      const cfg = parseTruthChipConfig(comp);
      const inPins = pins.filter((p) => p.role === 'logic_in');
      const outPins = pins.filter((p) => p.role === 'logic_out');
      const baseInBits = inPins.map((p) => fmtBoolBit(pinV(telemetry, p.id)));
      const baseOutBits = outPins.map((p) => fmtBoolBit(pinV(telemetry, p.id)));
      measuredSummary = `[${inPins.map((p, i) => `${p.label}=${baseInBits[i]}`).join(',')}] ⇒ [${outPins
        .map((p, i) => `${p.label}=${baseOutBits[i]}`)
        .join(',')}]`;

      const inOverrides: Record<string, 0 | 1> = {};
      inPins.forEach((p, idx) => {
        const key = idx === 0 ? 'inA' : idx === 1 ? 'inB' : idx === 2 ? 'inC' : null;
        const bit = key && isOverridden ? paramBit(activeParams, key, baseInBits[idx]) : baseInBits[idx];
        inOverrides[p.id] = bit;
        if (isOverridden) pinVoltageOverrides[p.id] = bit * 5;
      });

      let computedOuts: Record<string, 0 | 1> | null = null;
      if (isOverridden) {
        computedOuts = evaluateTruthChipOutputs(comp, (pinId) => inOverrides[pinId] ?? 0);
        outPins.forEach((p) => {
          const ob = computedOuts?.[p.id] ?? 0;
          pinVoltageOverrides[p.id] = ob * 5;
        });
      }

      const inText = inPins.map((p) => `${p.label}=${inOverrides[p.id] ?? 0}`).join(', ') || '无IN';
      const outText =
        outPins
          .map((p) => `${p.label}=${isOverridden ? (computedOuts?.[p.id] ?? 0) : fmtBoolBit(pinV(telemetry, p.id))}`)
          .join(', ') || '无OUT';

      liveMetrics.push(
        { label: isOverridden ? '试算输入槽位' : '实测输入槽位', value: inText, accent: 'sky' },
        { label: isOverridden ? '试算输出槽位' : '实测输出槽位', value: outText, accent: 'emerald' }
      );
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }自定义真值芯片 ${cfg.chipName || comp.label}（${comp.label}）${
        isOverridden ? '试算' : '实时'
      }查表/求值结果：输入 [${inText}] ⇒ 输出 [${outText}]。可在属性栏点击“打开真值表与公式编程器”随时重编程内部映射。`;
      break;
    }

    case 'IC_PORT_OUT': {
      const baseV = pinV(telemetry, 'io');
      const baseBit = fmtBoolBit(baseV);
      measuredSummary = `${baseV.toFixed(2)}V (${baseBit})`;
      const effBit = isOverridden ? paramBit(activeParams, 'drive', baseBit) : baseBit;
      const effV = isOverridden ? effBit * 5 : baseV;
      if (isOverridden) {
        pinVoltageOverrides.io = effV;
      }

      liveMetrics.push({
        label: isOverridden ? '试算边界输出电位' : '实测边界输出电位',
        value: `${effV.toFixed(2)}V (${effBit})`,
        accent: effBit ? 'emerald' : 'amber',
      });
      causalExplanation = `${
        isOverridden ? `【交互试算 · 工作台原实测：${measuredSummary}】` : ''
      }${comp.label} ${isOverridden ? '试算' : '接收到'}子电路末端电位 ${effV.toFixed(
        2
      )}V（逻辑 ${effBit}），打包为自定义芯片后将直接成为外部金手指引脚。`;
      break;
    }

    case 'CUSTOM_IC': {
      const inPins = pins.filter((p) => p.role === 'logic_in');
      const outPins = pins.filter((p) => p.role === 'logic_out');
      const inStr = inPins.map((p) => `${p.label}:${pinV(telemetry, p.id).toFixed(1)}V`).join(' ');
      const outStr = outPins.map((p) => `${p.label}:${pinV(telemetry, p.id).toFixed(1)}V`).join(' ');
      measuredSummary = `${inStr || '-'} → ${outStr || '-'}`;
      liveMetrics.push(
        { label: '芯片外部输入', value: inStr || '无输入脚', accent: 'sky' },
        { label: '芯片外部输出', value: outStr || '无输出脚', accent: 'emerald' }
      );
      causalExplanation = `封装集成芯片 ${comp.label}（共 ${pins.length} 脚）在仿真求解时会完整展开内部子电路参与全网 MNA 联合求解：当前引脚测得输入 [${
        inStr || '-'
      }] → 输出 [${outStr || '-'}]。`;
      break;
    }
  }

  const rawPinSummary =
    pins.length > 0
      ? pins
          .map((p) => {
            const v =
              isOverridden && pinVoltageOverrides[p.id] !== undefined
                ? pinVoltageOverrides[p.id]
                : pinV(telemetry, p.id);
            const logicSuffix =
              p.role === 'logic_in' || p.role === 'logic_out' ? `(${v >= 2.5 ? '1' : '0'})` : '';
            return `${p.label}: ${v.toFixed(2)}V${logicSuffix}`;
          })
          .join('  |  ')
      : null;

  const pinSummary =
    rawPinSummary && isOverridden ? `试算引脚 — ${rawPinSummary}` : rawPinSummary;

  return {
    componentId: comp.id,
    componentLabel: comp.label,
    initialParams,
    isOverridden,
    measuredSummary,
    applyPropsPatch,
    headline,
    causalExplanation,
    liveMetrics,
    pinSummary,
  };
}

/**
 * Resolves the active narration for a Ponder step so that copy stays synchronized
 * with the live slider/toggle parameters instead of quoting stale fixed inputs.
 */
export function resolveStepNarration(
  spec: PonderModuleSpec,
  stepIndex: number,
  params: Record<string, number>
): string {
  const step = spec.steps[stepIndex] ?? spec.steps[0];
  if (!step) return '';
  if (typeof step.renderNarration === 'function') {
    return step.renderNarration(params);
  }
  return step.narration;
}
