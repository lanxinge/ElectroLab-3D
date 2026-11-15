import type {
  CircuitComponent,
  ComponentTelemetry,
  Wire,
} from '../../shared/types';
import {
  COMPONENT_CATALOG,
  formatEngineeringValue,
  getComponentPins,
} from '../engine/componentCatalog';
import { PONDER_DATA } from './ponderData';
import type { PonderLiveMetric, PonderModuleSpec } from './ponderTypes';

export interface InstancePonderContext {
  componentId: string;
  componentLabel: string;
  initialParams: Record<string, number>;
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
  const abs = Math.abs(amps);
  if (abs === 0) return '0.00 mA';
  if (abs >= 1) return `${amps.toFixed(3)} A`;
  if (abs >= 1e-3) return `${(amps * 1e3).toFixed(2)} mA`;
  return `${(amps * 1e6).toFixed(1)} µA`;
}

function fmtBoolBit(v: number | undefined): 0 | 1 {
  return (v ?? 0) >= 2.5 ? 1 : 0;
}

function pinV(tel: ComponentTelemetry | undefined, pinId: string): number {
  return tel?.pinVoltages?.[pinId] ?? 0;
}

export function deriveInstancePonderContext(
  comp: CircuitComponent,
  telemetry: ComponentTelemetry | undefined,
  allComponents: CircuitComponent[],
  wires: Wire[]
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

  let headline = `${comp.label} (${cat.name}) · 实测工作态解释`;
  let causalExplanation = '';
  const liveMetrics: PonderLiveMetric[] = [];

  switch (comp.type) {
    case 'RESISTOR': {
      const r = Math.max(0.01, Number(comp.props.resistance ?? 220));
      const vAbs = Number(Math.abs(vDrop).toFixed(2));
      initialParams.ohms = r;
      initialParams.voltage = vAbs;
      liveMetrics.push(
        { label: '当前设定 R', value: formatEngineeringValue(r, 'Ω'), accent: 'amber' },
        { label: '实测压降 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
        { label: '实测电流 I', value: fmtCurrent(current), accent: 'emerald' },
        { label: '热功耗 P', value: formatEngineeringValue(power, 'W'), accent: telemetry?.overloaded ? 'rose' : 'violet' }
      );
      if (!isConnected || vAbs < 0.01) {
        causalExplanation = `你当前选中了工作台电阻 ${comp.label}（设定阻值 R = ${formatEngineeringValue(
          r,
          'Ω'
        )}），但目前两端实测压降接近 0 V${
          !isConnected ? '（尚未接入闭合回路）' : '（回路处于断路或等电位状态）'
        }。由欧姆定律 I = V/R 可知电流为 0 mA，无焦耳热产生。可拖动上方电压滑块预演加压效果，或在工作台连入电源闭合回路。`;
      } else {
        const stdI = (vAbs / 220) * 1000;
        const ratio = r / 220;
        causalExplanation = `你的工作台电阻 ${comp.label} 当前阻值设为 ${formatEngineeringValue(
          r,
          'Ω'
        )}，所在电路实测施加在它两端的电压为 ${vAbs.toFixed(
          2
        )} V。依据欧姆定律 I = V / R = ${vAbs.toFixed(2)} V / ${formatEngineeringValue(
          r,
          'Ω'
        )} = ${fmtCurrent(current)}，实耗电功率 P = V·I = ${formatEngineeringValue(
          power,
          'W'
        )}（负载率 ${loadPct}%）${
          r !== 220
            ? `；相比标准 220Ω 示例，阻值变为 ${(ratio).toFixed(
                2
              )} 倍，因此同压降下电流（对比 220Ω 时约 ${stdI.toFixed(1)} mA）被限流至 ${fmtCurrent(current)}`
            : ''
        }。`;
      }
      break;
    }

    case 'INF_RESISTOR': {
      const ideal = comp.props.idealInfinite !== false;
      const r = Number(comp.props.resistance ?? 1e12);
      const vAbs = Math.max(0, Number(Math.abs(vDrop).toFixed(2)));
      initialParams.infiniteMode = ideal ? 1 : 0;
      initialParams.vin = vAbs;
      liveMetrics.push(
        { label: '模式/阻值', value: ideal ? '∞ 理想开路' : formatEngineeringValue(r, 'Ω'), accent: 'violet' },
        { label: '端压 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'amber' },
        { label: '实测电流', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = ideal
        ? `${comp.label} 目前处于“理想无穷大断路 (R → ∞)”模式，尽管两端电势差为 ${vDrop.toFixed(
            2
          )} V，内部导纳 G = 0 使支路电流严格保持 0 A，实现彻底电气隔离。`
        : `${comp.label} 处于超高阻泄漏模式（${formatEngineeringValue(
            r,
            'Ω'
          )}），在 ${vDrop.toFixed(2)} V 压差下仅产生 ${fmtCurrent(current)} 的微弱泄漏电流。`;
      break;
    }

    case 'POTENTIOMETER': {
      const r = Number(comp.props.resistance ?? 1000);
      const ratio = Math.min(0.95, Math.max(0.05, Number(comp.props.ratio ?? 0.5)));
      initialParams.wiper = Number(ratio.toFixed(2));
      const vw = pinV(telemetry, 'wiper');
      liveMetrics.push(
        { label: '总阻值 / α', value: `${formatEngineeringValue(r, 'Ω')} · ${Math.round(ratio * 100)}%`, accent: 'amber' },
        { label: '抽头电位 V_W', value: `${vw.toFixed(2)} V`, accent: 'sky' },
        { label: '实测压降', value: `${vDrop.toFixed(2)} V`, accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 总阻值 ${formatEngineeringValue(
        r,
        'Ω'
      )}，机械旋钮当前位于 α = ${Math.round(
        ratio * 100
      )}%，将电阻轨拆分为上段 ${(r * ratio).toFixed(0)}Ω 与下段 ${(
        r *
        (1 - ratio)
      ).toFixed(0)}Ω；抽头 W 对地实测电位为 ${vw.toFixed(2)} V。`;
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
      liveMetrics.push(
        { label: '设定电动势 E', value: `${vSet} V`, accent: 'sky' },
        { label: '输出电流 I', value: fmtCurrent(current), accent: 'emerald' },
        { label: '输出功率 P', value: formatEngineeringValue(power, 'W'), accent: telemetry?.overloaded ? 'rose' : 'amber' }
      );
      causalExplanation = `${comp.label} 正作为激励源输出 ${vSet} V 恒定电势差（正端 ${pinV(
        telemetry,
        'pos'
      ).toFixed(2)}V，负端 ${pinV(telemetry, 'neg').toFixed(
        2
      )}V），向外电路输送电流 ${fmtCurrent(current)}、提供电功率 ${formatEngineeringValue(
        power,
        'W'
      )}${telemetry?.overloaded ? ' —— 注意当前电流较大已触发过载提示！' : '。'}`;
      break;
    }

    case 'AC_SOURCE': {
      const amp = Number(comp.props.amplitude ?? 5);
      const freq = Number(comp.props.frequency ?? 2);
      initialParams.freq = Math.min(2.5, Math.max(0.4, freq));
      liveMetrics.push(
        { label: '设定参数', value: `${amp}V @ ${freq}Hz`, accent: 'violet' },
        { label: '当前瞬时电压', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
        { label: '当前瞬时电流', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = `交流源 ${comp.label} 设定幅值 ${amp}V、频率 ${freq}Hz（有效值约 ${(
        amp / Math.SQRT2
      ).toFixed(2)}V）。当前仿真时刻瞬时端压为 ${vDrop.toFixed(2)}V、电流为 ${fmtCurrent(
        current
      )}，正负半周周期性反向驱动负载。`;
      break;
    }

    case 'CURRENT_SOURCE': {
      const iSet = Number(comp.props.current ?? 0.02);
      const reqR = Math.abs(iSet) > 1e-9 ? Math.abs(vDrop / iSet) : 250;
      initialParams.loadRatio = Number(Math.min(2, Math.max(0.3, reqR / 250)).toFixed(1));
      liveMetrics.push(
        { label: '恒流设定 Is', value: fmtCurrent(iSet), accent: 'emerald' },
        { label: '实际端压 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'amber' }
      );
      causalExplanation = `${comp.label} 强迫支路维持恒定电流 ${fmtCurrent(
        iSet
      )}，根据外电路总等效阻力大小，其端电压自动建立为 ${vDrop.toFixed(2)} V（功率 ${formatEngineeringValue(
        power,
        'W'
      )}）。`;
      break;
    }

    case 'GROUND': {
      initialParams.connected = isConnected ? 1 : 0;
      liveMetrics.push({
        label: '参考电位',
        value: '0.000 V (GND)',
        accent: 'emerald',
      });
      causalExplanation = isConnected
        ? `${comp.label} 为所连接的节点网强制锁定 0.000 V 基准电位“海平面”，全电路其他所有节点的电压读数均以此为参考。`
        : `${comp.label} 目前尚未连线到电路中，请将其接入电源负极或参考点以确立唯一零电位。`;
      break;
    }

    case 'CAPACITOR': {
      const cap = Number(comp.props.capacitance ?? 100);
      const hasAc = allComponents.some((c) => c.type === 'AC_SOURCE');
      initialParams.acMode = hasAc ? 1 : 0;
      liveMetrics.push(
        { label: '标称容量 C', value: `${cap} µF`, accent: 'sky' },
        { label: '当前极板电压 Vc', value: `${vDrop.toFixed(2)} V`, accent: 'amber' },
        { label: '暂态充放电电流', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = `${comp.label} (${cap} µF) 当前极板电压 Vc = ${vDrop.toFixed(
        2
      )} V，流过电流 ${fmtCurrent(current)}。${
        Math.abs(current) < 1e-4 && isConnected
          ? '直流模式下当前电压已接近充电稳态，电流趋近于 0（体现“隔直”开路特性）。'
          : '电压正在变化或存在交流激励，极板持续充放电使外电路维持位移动态电流。'
      }`;
      break;
    }

    case 'INDUCTOR': {
      const ind = Number(comp.props.inductance ?? 100);
      const hasHighFreqAc = allComponents.some(
        (c) => c.type === 'AC_SOURCE' && Number(c.props.frequency ?? 2) >= 5
      );
      initialParams.highFreq = hasHighFreqAc ? 1 : 0;
      liveMetrics.push(
        { label: '标称电感 L', value: `${ind} mH`, accent: 'amber' },
        { label: '实测电流 I_L', value: fmtCurrent(current), accent: 'emerald' },
        { label: '感应压降 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'sky' }
      );
      causalExplanation = `${comp.label} (${ind} mH) 当前流过电流 ${fmtCurrent(
        current
      )}、两端电势差 ${vDrop.toFixed(2)} V。电感总是阻止电流瞬间变化（v = L·di/dt），直流稳态下等效近乎直通。`;
      break;
    }

    case 'SWITCH_SPST': {
      const closed = comp.props.closed !== false;
      initialParams.closed = closed ? 1 : 0;
      liveMetrics.push(
        { label: '当前刀闸', value: closed ? '已闭合 (ON)' : '已断开 (OFF)', accent: closed ? 'emerald' : 'amber' },
        { label: '两端压差 ΔV', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
        { label: '支路电流 I', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = closed
        ? `${comp.label} 处于合闸导通态，接触阻力极小使两端等电位（ΔV = ${vDrop.toFixed(
            2
          )}V），回路电流 ${fmtCurrent(current)} 畅通流过。`
        : `${comp.label} 处于分闸断开态，空气间隙切断电荷通路使电流归零（${fmtCurrent(
            current
          )}），因此全部开路电势差（${vDrop.toFixed(2)}V）都降落在开关两端！`;
      break;
    }

    case 'SWITCH_SPDT': {
      const pos = Number(comp.props.position ?? 0) === 1;
      initialParams.throwB = pos ? 1 : 0;
      liveMetrics.push(
        { label: '当前接通', value: pos ? 'B (常开 NO 路)' : 'A (常闭 NC 路)', accent: 'sky' },
        { label: 'COM 电流', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 当前公共端 COM 切向 ${
        pos ? 'B(NO)' : 'A(NC)'
      } 通道，将输入电位（COM = ${pinV(telemetry, 'com').toFixed(2)}V）导通至选定支路，同时彻底隔离另一支路。`;
      break;
    }

    case 'DIODE': {
      const fwd = vDrop >= 0.45 && Math.abs(current) > 1e-5;
      initialParams.forward = vDrop >= -0.05 ? 1 : 0;
      liveMetrics.push(
        { label: '导通状态', value: fwd ? '正向导通 (~0.7V)' : vDrop < -0.1 ? '反向截止' : '未达阈值', accent: fwd ? 'emerald' : 'amber' },
        { label: '压降 V_AK', value: `${vDrop.toFixed(2)} V`, accent: 'sky' },
        { label: '正向电流', value: fmtCurrent(current), accent: 'emerald' }
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
      break;
    }

    case 'ZENER_DIODE': {
      const vz = Number(comp.props.vz ?? 5.1);
      const revV = Math.max(0, Number((-vDrop).toFixed(2)));
      initialParams.vz = vz;
      initialParams.vin = revV;
      liveMetrics.push(
        { label: '设定稳压 Vz', value: `${vz.toFixed(1)} V`, accent: 'amber' },
        { label: '反向钳位 V_KA', value: `${revV.toFixed(2)} V`, accent: 'emerald' },
        { label: '实测电流', value: fmtCurrent(current), accent: 'sky' }
      );
      causalExplanation = `${comp.label} 标称齐纳稳压值 Vz = ${vz.toFixed(
        1
      )}V。工作台实测两端电位差为 V_AK = ${vDrop.toFixed(2)}V（V_KA = ${revV.toFixed(
        2
      )}V），电流 ${fmtCurrent(current)}。`;
      break;
    }

    case 'LED': {
      const iMa = Number((Math.max(0, current) * 1000).toFixed(2));
      initialParams.currentMa = iMa;
      liveMetrics.push(
        { label: '实测驱动电流 If', value: fmtCurrent(current), accent: telemetry?.overloaded ? 'rose' : 'emerald' },
        { label: '管压降 V_F', value: `${vDrop.toFixed(2)} V`, accent: 'amber' }
      );
      causalExplanation = `${comp.label} 当前正向压降 ${vDrop.toFixed(
        2
      )}V，实测流过电流 ${fmtCurrent(current)}${
        telemetry?.overloaded
          ? ' —— 电流已超额定安全区间，请增大串联限流电阻！'
          : iMa > 0.5
          ? '，处于安全发光工作区。'
          : '，尚未明显点亮，请检查极性是否正偏及电源/限流电阻。'
      }`;
      break;
    }

    case 'BJT_NPN': {
      const beta = Number(comp.props.beta ?? 100);
      const vbe = pinV(telemetry, 'b') - pinV(telemetry, 'e');
      const vce = pinV(telemetry, 'c') - pinV(telemetry, 'e');
      const estIbUa = Math.min(120, Math.max(0, Math.round((Math.abs(current) / Math.max(1, beta)) * 1e6)));
      initialParams.ib = estIbUa;
      liveMetrics.push(
        { label: 'V_BE / V_CE', value: `${vbe.toFixed(2)}V / ${vce.toFixed(2)}V`, accent: 'amber' },
        { label: '集电极电流 Ic', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = `${comp.label} (β=${beta}) 实测 V_BE = ${vbe.toFixed(
        2
      )}V，V_CE = ${vce.toFixed(2)}V，集电极电流 ${fmtCurrent(current)}。${
        vbe < 0.55 ? '当前处于截止区（V_BE < 0.7V）。' : vce < 0.4 ? '当前进入饱和导通区（V_CE 很低）。' : '当前处于线性放大区，Ic ≈ β·Ib。'
      }`;
      break;
    }

    case 'NMOS': {
      const vth = Number(comp.props.vth ?? 2.0);
      const vgs = Number((pinV(telemetry, 'g') - pinV(telemetry, 's')).toFixed(2));
      initialParams.vth = vth;
      initialParams.vgs = Math.max(0, vgs);
      liveMetrics.push(
        { label: '实测 V_GS / V_th', value: `${vgs.toFixed(2)}V / ${vth.toFixed(1)}V`, accent: vgs >= vth ? 'emerald' : 'amber' },
        { label: '漏极电流 I_D', value: fmtCurrent(current), accent: 'sky' }
      );
      causalExplanation = `${comp.label} 开启阈值 V_th = ${vth.toFixed(
        1
      )}V，工作台实测栅源压差 V_GS = ${vgs.toFixed(2)}V。${
        vgs >= vth
          ? `因为 V_GS ≥ V_th，绝缘栅下方已感生出 N 型导电沟道，驱动漏极电流 ${fmtCurrent(current)}。`
          : `因为 V_GS < V_th，沟道尚未开启，漏源极之间呈截止断路。`
      }`;
      break;
    }

    case 'OPAMP': {
      const vp = pinV(telemetry, 'inp');
      const vn = pinV(telemetry, 'inm');
      const vout = pinV(telemetry, 'out');
      const vdiff = vp - vn;
      initialParams.vin = Number(vdiff.toFixed(2));
      liveMetrics.push(
        { label: '同相/反相 V+/V-', value: `${vp.toFixed(2)}V / ${vn.toFixed(2)}V`, accent: 'sky' },
        { label: '输出电压 Vout', value: `${vout.toFixed(2)} V`, accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 实测 V+ = ${vp.toFixed(2)}V，V- = ${vn.toFixed(
        2
      )}V（差分 |V+ - V-| = ${Math.abs(vdiff).toFixed(3)}V），输出端电位 Vout = ${vout.toFixed(
        2
      )}V。负反馈电路会自发调节 Vout 令“虚短”条件 V- 紧跟 V+。`;
      break;
    }

    case 'TRANSFORMER': {
      const ratio = Number(comp.props.ratio ?? 2.0);
      const vPri = pinV(telemetry, 'p1') - pinV(telemetry, 'p2');
      const vSec = pinV(telemetry, 's1') - pinV(telemetry, 's2');
      initialParams.turnsRatio = ratio;
      initialParams.acAmp = Math.max(0.5, Number(Math.abs(vPri).toFixed(1)));
      liveMetrics.push(
        { label: '匝比 k (Ns/Np)', value: `${ratio}×`, accent: 'amber' },
        { label: '原边 / 副边电压', value: `${vPri.toFixed(2)}V / ${vSec.toFixed(2)}V`, accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 匝数比 Ns:Np = ${ratio}，当前原边瞬时电压 ${vPri.toFixed(
        2
      )}V 经铁芯互感在副边感应出 ${vSec.toFixed(2)}V 电压，能量按比例向副边负载传递。`;
      break;
    }

    case 'LAMP': {
      const rv = Number(comp.props.ratedVoltage ?? 5);
      const rp = Number(comp.props.ratedPower ?? 1.5);
      const rBulb = Math.max(5, Number(((rv * rv) / Math.max(0.1, rp)).toFixed(1)));
      initialParams.voltage = Number(Math.abs(vDrop).toFixed(2));
      initialParams.resistance = rBulb;
      liveMetrics.push(
        { label: '额定/等效阻值', value: `${rv}V/${rp}W (${rBulb}Ω)`, accent: 'amber' },
        { label: '实耗功率 P', value: formatEngineeringValue(power, 'W'), accent: 'emerald' },
        { label: '亮度占比', value: `${loadPct}%`, accent: loadPct > 110 ? 'rose' : 'sky' }
      );
      causalExplanation = `${comp.label} 当前两端电压 ${vDrop.toFixed(
        2
      )}V、电流 ${fmtCurrent(current)}，实耗电功率 P = ${formatEngineeringValue(
        power,
        'W'
      )}，约为额定功率（${rp}W）的 ${loadPct}%。`;
      break;
    }

    case 'FUSE': {
      const rated = Number(comp.props.tripCurrent ?? 0.5);
      const blown = Boolean(comp.props.blown) || Boolean(telemetry?.extraInfo?.includes('已熔断'));
      initialParams.current = Number(Math.abs(current).toFixed(2));
      initialParams.rated = rated;
      liveMetrics.push(
        { label: '状态 / 阈值', value: blown ? '已熔断!' : `正常 (限 ${rated}A)`, accent: blown ? 'rose' : 'emerald' },
        { label: '实测电流', value: fmtCurrent(current), accent: 'sky' }
      );
      causalExplanation = blown
        ? `${comp.label} 因通过电流曾超过熔断阈值 ${rated}A 已触发物理熔断切断电路，可在属性栏或工作台点击器件一键复位恢复。`
        : `${comp.label} 当前实测电流 ${fmtCurrent(current)}，低于设定阈值 ${rated}A，内部熔丝以毫欧级低阻正常导通。`;
      break;
    }

    case 'VOLTMETER': {
      liveMetrics.push(
        { label: '测得电压 V', value: `${vDrop.toFixed(3)} V`, accent: 'sky' },
        { label: '分流电流', value: fmtCurrent(current), accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 以高达 10MΩ 内阻跨接测得两点电位差 ${vDrop.toFixed(
        3
      )} V（+端 ${pinV(telemetry, 'pos').toFixed(2)}V，-端 ${pinV(telemetry, 'neg').toFixed(
        2
      )}V），几乎不抽取原电路电流。`;
      break;
    }

    case 'AMMETER': {
      liveMetrics.push(
        { label: '测得电流 I', value: fmtCurrent(current), accent: 'emerald' },
        { label: '表头压降', value: `${(vDrop * 1000).toFixed(2)} mV`, accent: 'amber' }
      );
      causalExplanation = `${comp.label} 串联在被测支路中实时测得电流 ${fmtCurrent(
        current
      )}；自身仅产生 ${Math.abs(vDrop * 1000).toFixed(2)} mV 微小压降，不干扰主回路工况。`;
      break;
    }

    // ---------- Digital Logic Modules ----------
    case 'LOGIC_IN':
    case 'IC_PORT_IN': {
      const bit = Number(comp.props.state ?? telemetry?.logicState ?? 0) ? 1 : 0;
      initialParams.state = bit;
      liveMetrics.push({
        label: '输出逻辑态',
        value: bit ? '1 (HIGH +5.0V)' : '0 (LOW 0.0V)',
        accent: bit ? 'emerald' : 'amber',
      });
      causalExplanation = `${comp.label} 当前拨向逻辑 ${bit}（实测输出电位 ${(
        pinV(telemetry, comp.type === 'IC_PORT_IN' ? 'io' : 'out') || (bit ? 5 : 0)
      ).toFixed(2)}V），作为数字组合/时序激励输入向后级传送。`;
      break;
    }

    case 'CLOCK': {
      const freq = Number(comp.props.freq ?? comp.props.frequency ?? 1);
      initialParams.freq = Math.min(2.5, Math.max(0.4, freq));
      const bit = (telemetry?.logicState ?? 0) ? 1 : 0;
      liveMetrics.push(
        { label: '时钟频率', value: `${freq} Hz`, accent: 'violet' },
        { label: '当前电平', value: bit ? '1 (HIGH)' : '0 (LOW)', accent: bit ? 'emerald' : 'amber' }
      );
      causalExplanation = `${comp.label} 当前以 ${freq}Hz 周期节拍持续输出 0V/+5V 方波（此刻瞬时逻辑态 = ${bit}），每个 0→1 上升沿都会触发后级时序芯片采样。`;
      break;
    }

    case 'LOGIC_OUT': {
      const vin = pinV(telemetry, 'in');
      const bit = fmtBoolBit(vin);
      initialParams.vin = Number(Math.min(5, Math.max(0, vin)).toFixed(2));
      liveMetrics.push(
        { label: '输入电位', value: `${vin.toFixed(2)} V`, accent: 'sky' },
        { label: '逻辑判决', value: `${bit} (${bit ? '点亮' : '熄灭'})`, accent: bit ? 'emerald' : 'rose' }
      );
      causalExplanation = `${comp.label} 实测输入电位 ${vin.toFixed(2)}V ${
        bit ? '≥ 2.5V 高电平阈值，因此灯塔点亮输出逻辑 1' : '< 2.5V 阈值，因此熄灭判定为逻辑 0'
      }。`;
      break;
    }

    case 'HEX_DISPLAY': {
      const b3 = fmtBoolBit(pinV(telemetry, 'd3'));
      const b2 = fmtBoolBit(pinV(telemetry, 'd2'));
      const b1 = fmtBoolBit(pinV(telemetry, 'd1'));
      const b0 = fmtBoolBit(pinV(telemetry, 'd0'));
      const hexVal = (b3 << 3) | (b2 << 2) | (b1 << 1) | b0;
      initialParams.hexVal = hexVal;
      liveMetrics.push(
        { label: 'D3..D0 输入', value: `${b3}${b2}${b1}${b0}`, accent: 'sky' },
        { label: '译码显示', value: `0x${hexVal.toString(16).toUpperCase()} (${hexVal})`, accent: 'rose' }
      );
      causalExplanation = `${comp.label} 接收到 4 位二进制输入 D3=${b3}, D2=${b2}, D1=${b1}, D0=${b0}，按 8-4-2-1 权重求和得十进制 ${hexVal}，七段译码显示十六进制 “${hexVal
        .toString(16)
        .toUpperCase()}”。`;
      break;
    }

    case 'NOT': {
      const a = fmtBoolBit(pinV(telemetry, 'a'));
      const y = fmtBoolBit(pinV(telemetry, 'y'));
      initialParams.a = a;
      liveMetrics.push({ label: '实测输入/输出', value: `A=${a} ⇒ Y=${y}`, accent: y ? 'emerald' : 'amber' });
      causalExplanation = `${comp.label} 实测输入引脚 A=${a} (${pinV(telemetry, 'a').toFixed(
        2
      )}V)，经反相取反后输出 Y=${y} (${pinV(telemetry, 'y').toFixed(2)}V)。`;
      break;
    }

    case 'AND':
    case 'OR':
    case 'NAND':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const a = fmtBoolBit(pinV(telemetry, 'a'));
      const b = fmtBoolBit(pinV(telemetry, 'b'));
      const y = fmtBoolBit(pinV(telemetry, 'y'));
      initialParams.a = a;
      initialParams.b = b;
      const opDesc: Record<string, string> = {
        AND: `两输入必须全 1 才出 1，当前 ${a} · ${b} = ${y}`,
        OR: `只要有 1 个输入为 1 即出 1，当前 ${a} + ${b} = ${y}`,
        NAND: `先与后非，唯有双 1 出 0，当前 (${a} · ${b})' = ${y}`,
        NOR: `先或后非，唯有双 0 出 1，当前 (${a} + ${b})' = ${y}`,
        XOR: a === b
          ? `两输入状态相同（均为 ${a}），逻辑抵消故输出 Y = ${a} ⊕ ${b} = 0`
          : `两输入状态相异（A=${a}, B=${b}），故输出 Y = ${a} ⊕ ${b} = 1`,
        XNOR: a === b
          ? `两输入状态相同（均为 ${a}），相等比较命中故输出 Y = ${y}`
          : `两输入状态相异（A=${a}, B=${b}），故相等比较输出 Y = 0`,
      };
      liveMetrics.push(
        { label: '实测输入 A, B', value: `A=${a}, B=${b}`, accent: 'sky' },
        { label: '实测输出 Y', value: `Y=${y} (${pinV(telemetry, 'y').toFixed(1)}V)`, accent: y ? 'emerald' : 'amber' }
      );
      causalExplanation = `你的工作台 ${cat.shortName} ${comp.label} 当前输入实测为 A=${a} (${pinV(
        telemetry,
        'a'
      ).toFixed(1)}V)、B=${b} (${pinV(telemetry, 'b').toFixed(1)}V)：${opDesc[comp.type]}。`;
      break;
    }

    case 'HALF_ADDER': {
      const a = fmtBoolBit(pinV(telemetry, 'a'));
      const b = fmtBoolBit(pinV(telemetry, 'b'));
      const s = fmtBoolBit(pinV(telemetry, 's'));
      const c = fmtBoolBit(pinV(telemetry, 'c'));
      initialParams.a = a;
      initialParams.b = b;
      liveMetrics.push(
        { label: '输入 A + B', value: `${a} + ${b}`, accent: 'sky' },
        { label: '和与进位 (C,S)', value: `C=${c}, S=${s} (=${c * 2 + s})`, accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 实测计算 ${a} + ${b} = ${c}${s}₂（本位和 S=${a}⊕${b}=${s}，进位 C=${a}·${b}=${c}）。`;
      break;
    }

    case 'FULL_ADDER': {
      const a = fmtBoolBit(pinV(telemetry, 'a'));
      const b = fmtBoolBit(pinV(telemetry, 'b'));
      const cin = fmtBoolBit(pinV(telemetry, 'cin'));
      const s = fmtBoolBit(pinV(telemetry, 's'));
      const cout = fmtBoolBit(pinV(telemetry, 'cout'));
      initialParams.a = a;
      initialParams.b = b;
      initialParams.cin = cin;
      liveMetrics.push(
        { label: '三输入', value: `${a}+${b}+${cin}`, accent: 'sky' },
        { label: '结果 (Cout, S)', value: `Cout=${cout}, S=${s} (=${cout * 2 + s})`, accent: 'emerald' }
      );
      causalExplanation = `${comp.label} 实测将 3 个输入 A=${a}, B=${b}, Cin=${cin} 相加，总和等于十进制 ${
        a + b + cin
      }，因此向高位进位 Cout=${cout}、本位和 S=${s}。`;
      break;
    }

    case 'MUX_2_1': {
      const sel = fmtBoolBit(pinV(telemetry, 'sel'));
      const d0 = fmtBoolBit(pinV(telemetry, 'd0'));
      const d1 = fmtBoolBit(pinV(telemetry, 'd1'));
      const y = fmtBoolBit(pinV(telemetry, 'y'));
      initialParams.sel = sel;
      initialParams.a = d0;
      initialParams.b = d1;
      liveMetrics.push(
        { label: 'SEL / 通道', value: `SEL=${sel}, D0=${d0}, D1=${d1}`, accent: 'sky' },
        { label: '复用输出 Y', value: `Y=${y}`, accent: y ? 'emerald' : 'amber' }
      );
      causalExplanation = `${comp.label} 选择端 SEL=${sel}，把通道 ${
        sel ? `D1 (=${d1})` : `D0 (=${d0})`
      } 路由接通到公共输出端 Y=${y}。`;
      break;
    }

    case 'D_FF': {
      const d = fmtBoolBit(pinV(telemetry, 'd'));
      const clk = fmtBoolBit(pinV(telemetry, 'clk'));
      const q = fmtBoolBit(pinV(telemetry, 'q'));
      initialParams.d = d;
      initialParams.clk = clk;
      liveMetrics.push(
        { label: 'D / CLK', value: `D=${d}, CLK=${clk}`, accent: 'sky' },
        { label: '锁存状态 Q', value: `Q=${q}, Q'=${q ^ 1}`, accent: q ? 'emerald' : 'amber' }
      );
      causalExplanation = `${comp.label} 当前已锁存输出 Q=${q}（互补端 Q'=${
        q ^ 1
      }）；目前数据端 D=${d}、时钟 CLK=${clk}。只有 CLK 下一次由 0→1 跳变瞬间，Q 才会更新为 D。`;
      break;
    }

    case 'JK_FF': {
      const j = fmtBoolBit(pinV(telemetry, 'j'));
      const k = fmtBoolBit(pinV(telemetry, 'k'));
      const q = fmtBoolBit(pinV(telemetry, 'q'));
      initialParams.j = j;
      initialParams.k = k;
      liveMetrics.push(
        { label: 'J / K / Q', value: `J=${j}, K=${k} | Q=${q}`, accent: 'sky' }
      );
      const modeText =
        j === 0 && k === 0
          ? '保持模式'
          : j === 0 && k === 1
          ? '复位清 0 模式'
          : j === 1 && k === 0
          ? '置 1 模式'
          : '翻转(Toggle)模式';
      causalExplanation = `${comp.label} 当前输入 J=${j}, K=${k}（对应“${modeText}”），每当 CLK 到来上升沿即按此规则更新锁存输出（当前 Q=${q}）。`;
      break;
    }

    case 'COUNTER_4BIT': {
      const rst = fmtBoolBit(pinV(telemetry, 'rst'));
      const val = telemetry?.logicState ?? 0;
      initialParams.clr = rst;
      liveMetrics.push(
        { label: '当前计数 Q3..Q0', value: `${val.toString(2).padStart(4, '0')} (${val})`, accent: 'violet' },
        { label: '复位信号 RST', value: rst ? '1 (清零锁定)' : '0 (正常递增)', accent: rst ? 'rose' : 'emerald' }
      );
      causalExplanation = `${comp.label} 当前输出二进制状态 ${val
        .toString(2)
        .padStart(4, '0')}（十进制 ${val}）${
        rst ? '；由于 RST=1 高电平有效，计数已被清零锁定。' : '；每次 CLK 上升沿递增 +1 并模 16 循环。'
      }`;
      break;
    }

    case 'CUSTOM_TRUTH_8':
    case 'CUSTOM_TRUTH_16': {
      const inPins = pins.filter((p) => p.role === 'logic_in');
      const outPins = pins.filter((p) => p.role === 'logic_out');
      if (inPins[0]) initialParams.inA = fmtBoolBit(pinV(telemetry, inPins[0].id));
      if (inPins[1]) initialParams.inB = fmtBoolBit(pinV(telemetry, inPins[1].id));
      if (inPins[2]) initialParams.inC = fmtBoolBit(pinV(telemetry, inPins[2].id));
      const inText = inPins.map((p) => `${p.label}=${fmtBoolBit(pinV(telemetry, p.id))}`).join(', ') || '无IN';
      const outText = outPins.map((p) => `${p.label}=${fmtBoolBit(pinV(telemetry, p.id))}`).join(', ') || '无OUT';
      liveMetrics.push(
        { label: '输入槽位状态', value: inText, accent: 'sky' },
        { label: '输出槽位结果', value: outText, accent: 'emerald' }
      );
      causalExplanation = `自定义真值芯片 ${comp.label} 实时查表/求值结果：输入 [${inText}] ⇒ 输出 [${outText}]。可在属性栏点击“打开真值表与公式编程器”随时重编程内部映射。`;
      break;
    }

    case 'IC_PORT_OUT': {
      const bit = fmtBoolBit(pinV(telemetry, 'io'));
      initialParams.drive = bit;
      liveMetrics.push({ label: '边界输出电位', value: `${pinV(telemetry, 'io').toFixed(2)}V (${bit})`, accent: bit ? 'emerald' : 'amber' });
      causalExplanation = `${comp.label} 接收到子电路末端电位 ${pinV(telemetry, 'io').toFixed(
        2
      )}V（逻辑 ${bit}），打包为自定义芯片后将直接成为外部金手指引脚。`;
      break;
    }

    case 'CUSTOM_IC': {
      const inPins = pins.filter((p) => p.role === 'logic_in');
      const outPins = pins.filter((p) => p.role === 'logic_out');
      const inStr = inPins.map((p) => `${p.label}:${pinV(telemetry, p.id).toFixed(1)}V`).join(' ');
      const outStr = outPins.map((p) => `${p.label}:${pinV(telemetry, p.id).toFixed(1)}V`).join(' ');
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

  const pinSummary =
    pins.length > 0
      ? pins
          .map((p) => {
            const v = pinV(telemetry, p.id);
            const logicSuffix =
              p.role === 'logic_in' || p.role === 'logic_out' ? `(${v >= 2.5 ? '1' : '0'})` : '';
            return `${p.label}: ${v.toFixed(2)}V${logicSuffix}`;
          })
          .join('  |  ')
      : null;

  return {
    componentId: comp.id,
    componentLabel: comp.label,
    initialParams,
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
