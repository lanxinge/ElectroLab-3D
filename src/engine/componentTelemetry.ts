import type { CircuitComponent, ComponentTelemetry } from '../../shared/types';
import { COMPONENT_CATALOG, getComponentPins } from './componentCatalog';
import { parseTruthChipConfig } from './customIcEngine';

import {
  CAP_HOLD_G, evalDiode, evalNmos, evalZener, formatComponentOverloadWarning, getLedParams,
  IND_COIL_R, IND_HOLD_G, parseRamInitHex, pinKey, SimulationRuntimeState, TRANSFORMER_SEC_R,
  TransformerBranch, VoltageBranch, ZeroDtSolveMode,
} from './circuitModels';

// 根据同一次求解得到的节点电位计算器件读数与引脚电流。
export function computeComponentTelemetry({ components, simState, getV, solution, numNodes, voltageBranches, transformerBranches, dt, zeroDtMode, preCapVoltages, logicDriveOut }: {
  components: CircuitComponent[];
  simState: SimulationRuntimeState;
  getV: (componentId: string, pinId: string) => number;
  solution: number[];
  numNodes: number;
  voltageBranches: VoltageBranch[];
  transformerBranches: TransformerBranch[];
  dt: number;
  zeroDtMode: ZeroDtSolveMode;
  preCapVoltages: Record<string, number>;
  logicDriveOut: Map<string, number>;
}) {
  // 6. Compute pin currents (positive = current entering component pin from net)
  const pinCurrentIn = new Map<string, number>();
  const addPinCurrent = (cid: string, pid: string, currentEntering: number) => {
    pinCurrentIn.set(pinKey(cid, pid), currentEntering);
  };

  const branchByComp = new Map<string, VoltageBranch>();
  for (const vb of voltageBranches) branchByComp.set(vb.componentId, vb);
  const transformerByComp = new Map<string, TransformerBranch>();
  for (const tb of transformerBranches) transformerByComp.set(tb.componentId, tb);

  const telemetryById: Record<string, ComponentTelemetry> = {};
  const warnings: string[] = [];

  for (const c of components) {
    const spec = COMPONENT_CATALOG[c.type];
    if (!spec) continue;
    const compPins = getComponentPins(c);
    const pinVoltages: Record<string, number> = {};
    for (const p of compPins) {
      pinVoltages[p.id] = getV(c.id, p.id);
    }

    let voltageDrop = 0;
    let current = 0;
    let power = 0;
    const maxPower =
      c.type === 'INF_SOURCE' || c.type === 'INF_RESISTOR'
        ? Number.POSITIVE_INFINITY
        : c.type === 'LAMP' && c.props.maxPower === undefined
        ? Math.max(0.05, Number(c.props.ratedPower ?? 1.5)) * 2.5
        : Number(c.props.maxPower ?? spec.maxPower);
    let logicState: number | undefined;
    let extraInfo: string | undefined;

    switch (c.type) {
      case 'DC_SOURCE':
      case 'AC_SOURCE':
      case 'INF_SOURCE': {
        const vb = branchByComp.get(c.id)!;
        const iBranch = solution[numNodes + vb.branchIdx] ?? 0;
        const iDelivered = -iBranch;
        voltageDrop = pinVoltages.pos - pinVoltages.neg;
        current = iDelivered;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'pos', -iDelivered);
        addPinCurrent(c.id, 'neg', iDelivered);
        if (c.type === 'INF_SOURCE') {
          extraInfo = '理想无穷大电源 (无功率/过载上限)';
        } else if (Math.abs(iDelivered) > 8) {
          extraInfo = '疑似短路大电流告警';
        }
        break;
      }
      case 'INF_RESISTOR': {
        const isIdeal = c.props.idealInfinite !== false;
        voltageDrop = pinVoltages.p1 - pinVoltages.p2;
        if (isIdeal) {
          current = 0;
          power = 0;
          extraInfo = '理想无穷大 R=∞ (I = 0 A)';
        } else {
          const r = Math.max(1e-6, Number(c.props.resistance ?? 1e12));
          current = voltageDrop / r;
          power = Math.abs(voltageDrop * current);
          extraInfo = `高阻模式 (${r.toExponential(1)} Ω)`;
        }
        addPinCurrent(c.id, 'p1', current);
        addPinCurrent(c.id, 'p2', -current);
        break;
      }
      case 'LAMP': {
        const vRated = Math.max(0.5, Number(c.props.ratedVoltage ?? 5));
        const pRated = Math.max(0.05, Number(c.props.ratedPower ?? 1.5));
        const rLamp = Math.max(0.5, (vRated * vRated) / pRated);
        voltageDrop = pinVoltages.p1 - pinVoltages.p2;
        current = voltageDrop / rLamp;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'p1', current);
        addPinCurrent(c.id, 'p2', -current);
        const pct = Math.min(150, (power / pRated) * 100);
        extraInfo = pct > 2 ? `亮度 ${pct.toFixed(0)}%` : '熄灭';
        break;
      }
      case 'FUSE': {
        const tripCurrent = Math.max(0.01, Number(c.props.tripCurrent ?? 0.5));
        const alreadyBlown = Boolean(c.props.blown) || Boolean(simState.blownFuses[c.id]);
        voltageDrop = pinVoltages.p1 - pinVoltages.p2;
        current = voltageDrop * (alreadyBlown ? 1e-9 : 1 / 0.02);
        if (!alreadyBlown && dt > 0 && Math.abs(current) > tripCurrent) {
          simState.blownFuses[c.id] = true;
        }
        const blownNow = Boolean(c.props.blown) || Boolean(simState.blownFuses[c.id]);
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'p1', current);
        addPinCurrent(c.id, 'p2', -current);
        extraInfo = blownNow
          ? `已熔断！(超 ${tripCurrent}A，点击复位)`
          : `导通正常 (熔断阈值 ${tripCurrent}A)`;
        break;
      }
      case 'TRANSFORMER': {
        const tb = transformerByComp.get(c.id)!;
        const x = solution[numNodes + voltageBranches.length + tb.branchIdx] ?? 0;
        const iSecOut = -x;
        const iPriIn = -tb.ratio * x;
        const vP = pinVoltages.p1 - pinVoltages.p2;
        const vS = pinVoltages.s1 - pinVoltages.s2;
        voltageDrop = vS;
        current = iSecOut;
        // Ideal coupled energy transfer VA vs tiny secondary copper dissipation I^2 * R_sec
        const transferVa = Math.max(Math.abs(vS * iSecOut), Math.abs(vP * iPriIn));
        power = iSecOut * iSecOut * TRANSFORMER_SEC_R;
        addPinCurrent(c.id, 'p1', iPriIn);
        addPinCurrent(c.id, 'p2', -iPriIn);
        addPinCurrent(c.id, 's1', -iSecOut);
        addPinCurrent(c.id, 's2', iSecOut);
        extraInfo = `变比 N=${tb.ratio.toFixed(2)} (Vp=${vP.toFixed(2)}V → Vs=${vS.toFixed(2)}V · 传输 ${transferVa.toFixed(2)} VA)`;
        break;
      }
      case 'CURRENT_SOURCE': {
        const iVal = Number(c.props.current ?? 0.02);
        voltageDrop = pinVoltages.pos - pinVoltages.neg;
        current = iVal;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'pos', -iVal);
        addPinCurrent(c.id, 'neg', iVal);
        break;
      }
      case 'GROUND': {
        voltageDrop = 0;
        current = 0;
        power = 0;
        addPinCurrent(c.id, 'gnd', 0);
        break;
      }
      case 'RESISTOR': {
        const r = Math.max(0.01, Number(c.props.resistance ?? 220));
        voltageDrop = pinVoltages.a - pinVoltages.b;
        current = voltageDrop / r;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'a', current);
        addPinCurrent(c.id, 'b', -current);
        break;
      }
      case 'POTENTIOMETER': {
        const rTotal = Math.max(1, Number(c.props.resistance ?? 1000));
        const ratio = Math.min(0.995, Math.max(0.005, Number(c.props.ratio ?? 0.5)));
        const r1 = rTotal * ratio;
        const r2 = rTotal * (1 - ratio);
        const iAW = (pinVoltages.a - pinVoltages.wiper) / r1;
        const iWB = (pinVoltages.wiper - pinVoltages.b) / r2;
        voltageDrop = pinVoltages.a - pinVoltages.b;
        current = Math.max(Math.abs(iAW), Math.abs(iWB));
        power = iAW * iAW * r1 + iWB * iWB * r2;
        addPinCurrent(c.id, 'a', iAW);
        addPinCurrent(c.id, 'wiper', iWB - iAW);
        addPinCurrent(c.id, 'b', -iWB);
        extraInfo = `滑臂 ${(ratio * 100).toFixed(0)}%`;
        break;
      }
      case 'CAPACITOR': {
        const cFarads = Math.max(1e-12, Number(c.props.capacitance ?? 100) * 1e-6);
        voltageDrop = pinVoltages.pos - pinVoltages.neg;
        if (dt > 0) {
          const prevV = preCapVoltages[c.id] ?? voltageDrop;
          current = (cFarads / dt) * (voltageDrop - prevV);
        } else if (zeroDtMode === 'holdState') {
          const prevV = preCapVoltages[c.id] ?? 0;
          current = CAP_HOLD_G * (voltageDrop - prevV);
        } else {
          current = voltageDrop * 1e-9;
        }
        // Pure capacitive storage exchanges reactive power without active heat dissipation
        power = 0;
        addPinCurrent(c.id, 'pos', current);
        addPinCurrent(c.id, 'neg', -current);
        const energyMj = 0.5 * cFarads * voltageDrop * voltageDrop * 1e3;
        const reactiveVa = Math.abs(voltageDrop * current);
        extraInfo = `储能 ${energyMj.toFixed(2)} mJ · 无功交换 ${reactiveVa.toFixed(2)} VA`;
        break;
      }
      case 'INDUCTOR': {
        voltageDrop = pinVoltages.a - pinVoltages.b;
        const lHenries = Math.max(1e-9, Number(c.props.inductance ?? 100) * 1e-3);
        const iStored = simState.indCurrents[c.id] ?? 0;
        if (dt > 0) {
          current = iStored;
        } else if (zeroDtMode === 'holdState') {
          current = iStored + voltageDrop * IND_HOLD_G;
        } else {
          current = voltageDrop / IND_COIL_R;
        }
        // Dissipative coil copper loss I^2 * R_coil (distinct from magnetic energy exchange |u*i|)
        power = current * current * IND_COIL_R;
        addPinCurrent(c.id, 'a', current);
        addPinCurrent(c.id, 'b', -current);
        const energyMj = 0.5 * lHenries * current * current * 1e3;
        const reactiveVa = Math.abs(voltageDrop * current);
        extraInfo = `磁能 ${energyMj.toFixed(2)} mJ · 无功交换 ${reactiveVa.toFixed(2)} VA`;
        break;
      }
      case 'SWITCH_SPST': {
        const closed = Boolean(c.props.closed ?? true);
        const g = closed ? 1 / 0.005 : 1e-9;
        voltageDrop = pinVoltages.a - pinVoltages.b;
        current = voltageDrop * g;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'a', current);
        addPinCurrent(c.id, 'b', -current);
        extraInfo = closed ? '闭合导通' : '断开';
        break;
      }
      case 'SWITCH_SPDT': {
        const pos = Number(c.props.position ?? 0);
        const iNc = (pinVoltages.com - pinVoltages.nc) * (pos === 0 ? 1 / 0.005 : 1e-9);
        const iNo = (pinVoltages.com - pinVoltages.no) * (pos === 1 ? 1 / 0.005 : 1e-9);
        voltageDrop = pos === 0 ? pinVoltages.com - pinVoltages.nc : pinVoltages.com - pinVoltages.no;
        current = pos === 0 ? iNc : iNo;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'com', iNc + iNo);
        addPinCurrent(c.id, 'nc', -iNc);
        addPinCurrent(c.id, 'no', -iNo);
        extraInfo = pos === 0 ? '接通 A(NC)' : '接通 B(NO)';
        break;
      }
      case 'VOLTMETER': {
        voltageDrop = pinVoltages.pos - pinVoltages.neg;
        current = voltageDrop / 1e7;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'pos', current);
        addPinCurrent(c.id, 'neg', -current);
        break;
      }
      case 'AMMETER': {
        voltageDrop = pinVoltages.pos - pinVoltages.neg;
        current = voltageDrop / 0.005;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'pos', current);
        addPinCurrent(c.id, 'neg', -current);
        break;
      }
      case 'DIODE':
      case 'LED': {
        voltageDrop = pinVoltages.anode - pinVoltages.cathode;
        const params =
          c.type === 'LED'
            ? getLedParams(String(c.props.color ?? 'red'))
            : { isVal: 1e-12, nFactor: 1.2 };
        current = evalDiode(voltageDrop, params.isVal, params.nFactor).i;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'anode', current);
        addPinCurrent(c.id, 'cathode', -current);
        if (c.type === 'LED') {
          const ma = current * 1000;
          const pct = Math.min(100, Math.max(0, (ma / 20) * 100));
          extraInfo = ma > 0.2 ? `亮度 ${pct.toFixed(0)}%` : '熄灭';
        } else {
          extraInfo = current > 1e-4 ? '正向导通' : '反向截止';
        }
        break;
      }
      case 'ZENER_DIODE': {
        const vz = Math.max(1.2, Number(c.props.vz ?? 5.1));
        voltageDrop = pinVoltages.a - pinVoltages.k;
        current = evalZener(voltageDrop, vz).i;
        power = Math.abs(voltageDrop * current);
        addPinCurrent(c.id, 'a', current);
        addPinCurrent(c.id, 'k', -current);
        if (current > 1e-4) {
          extraInfo = '正向导通';
        } else if (current < -1e-4) {
          extraInfo = `反向齐纳稳压 (Vz≈${vz.toFixed(1)}V)`;
        } else {
          extraInfo = '反向截止区';
        }
        break;
      }
      case 'NMOS': {
        const vth = Number(c.props.vth ?? 2.0);
        const kp = Math.max(1e-4, Number(c.props.kp ?? 0.08));
        const vgs = pinVoltages.g - pinVoltages.s;
        const vds = pinVoltages.d - pinVoltages.s;
        const { id } = evalNmos(vgs, vds, vth, kp);
        voltageDrop = vds;
        current = id;
        power = Math.abs(vds * id);
        addPinCurrent(c.id, 'g', 0);
        addPinCurrent(c.id, 'd', id);
        addPinCurrent(c.id, 's', -id);
        if (vgs <= vth) {
          extraInfo = `截止区 (Vgs=${vgs.toFixed(2)}V ≤ Vth=${vth.toFixed(1)}V)`;
        } else if (Math.abs(vds) < vgs - vth) {
          extraInfo = `线性可变电阻区 (Id=${(id * 1000).toFixed(1)}mA)`;
        } else {
          extraInfo = `恒流饱和区 (Id=${(id * 1000).toFixed(1)}mA)`;
        }
        break;
      }
      case 'BJT_NPN': {
        const betaF = Math.max(10, Number(c.props.beta ?? 100));
        const betaR = 2;
        const alphaF = betaF / (1 + betaF);
        const alphaR = betaR / (1 + betaR);
        const isSat = 1e-12;
        const vbe = pinVoltages.b - pinVoltages.e;
        const vbc = pinVoltages.b - pinVoltages.c;
        const iBE = evalDiode(vbe, isSat / alphaF, 1.0).i;
        const iBC = evalDiode(vbc, isSat / alphaR, 1.0).i;
        const iC = alphaF * iBE - iBC;
        const iE = -iBE + alphaR * iBC;
        const iB = (1 - alphaF) * iBE + (1 - alphaR) * iBC;
        voltageDrop = pinVoltages.c - pinVoltages.e;
        current = iC;
        power = Math.abs(voltageDrop * iC) + Math.abs(vbe * iB);
        addPinCurrent(c.id, 'b', iB);
        addPinCurrent(c.id, 'c', iC);
        addPinCurrent(c.id, 'e', iE);
        if (vbe < 0.45) {
          extraInfo = '截止区';
        } else if (vbc > 0.35) {
          extraInfo = '饱和区';
        } else {
          extraInfo = `放大区 (Ic=${(iC * 1000).toFixed(1)}mA)`;
        }
        break;
      }
      case 'OPAMP': {
        const vP = pinVoltages.inp;
        const vM = pinVoltages.inm;
        const vOut = pinVoltages.out;
        const railPos = Number(c.props.railPos ?? 12);
        const railNeg = Number(c.props.railNeg ?? -12);
        const gain = Math.max(100, Number(c.props.gain ?? 50000));
        const vMid = (railPos + railNeg) / 2;
        const vHalf = Math.max(0.1, (railPos - railNeg) / 2);
        const vTarget = vMid + vHalf * Math.tanh(Math.max(-20, Math.min(20, (gain * (vP - vM)) / vHalf)));
        const iOutOutward = (vTarget - vOut) / 1.0;
        const iIn = (vP - vM) * 1e-7;
        voltageDrop = vOut;
        current = iOutOutward;
        power = Math.abs(vOut * iOutOutward);
        addPinCurrent(c.id, 'inp', iIn);
        addPinCurrent(c.id, 'inm', -iIn);
        addPinCurrent(c.id, 'out', -iOutOutward);
        if (Math.abs(vOut) > Math.max(Math.abs(railPos), Math.abs(railNeg)) * 0.96) {
          extraInfo = '饱和限幅';
        } else {
          extraInfo = `线性放大 (ΔV=${((vP - vM) * 1000).toFixed(2)}mV)`;
        }
        break;
      }
      case 'LOGIC_IN':
      case 'CLOCK': {
        const vDrive = logicDriveOut.get(pinKey(c.id, 'out')) ?? 0;
        const vPin = pinVoltages.out;
        const iOut = (vDrive - vPin) / 10;
        voltageDrop = vPin;
        current = iOut;
        power = Math.abs(vPin * iOut);
        logicState = vPin >= 2.5 ? 1 : 0;
        addPinCurrent(c.id, 'out', -iOut);
        extraInfo = logicState ? '高电平 (1)' : '低电平 (0)';
        break;
      }
      case 'LOGIC_OUT': {
        const vIn = pinVoltages.in;
        voltageDrop = vIn;
        current = vIn * 1e-6;
        power = Math.abs(vIn * current);
        logicState = vIn >= 2.5 ? 1 : 0;
        addPinCurrent(c.id, 'in', current);
        extraInfo = logicState ? '高电平 (1)' : '低电平 (0)';
        break;
      }
      case 'IC_PORT_IN': {
        const vPin = pinVoltages.io;
        if (c.props.__packagedPort) {
          voltageDrop = vPin;
          current = 0;
          power = 0;
          logicState = vPin >= 2.5 ? 1 : 0;
          addPinCurrent(c.id, 'io', 0);
          extraInfo = `封装内部端口IN (${logicState ? '1' : '0'})`;
        } else {
          const vDrive = logicDriveOut.get(pinKey(c.id, 'io')) ?? 0;
          const iOut = (vDrive - vPin) / 10;
          voltageDrop = vPin;
          current = iOut;
          power = Math.abs(vPin * iOut);
          logicState = vPin >= 2.5 ? 1 : 0;
          addPinCurrent(c.id, 'io', -iOut);
          extraInfo = `IC输入端口 (${logicState ? '高 1' : '低 0'})`;
        }
        break;
      }
      case 'IC_PORT_OUT': {
        const vIn = pinVoltages.io;
        voltageDrop = vIn;
        current = vIn * (c.props.__packagedPort ? 1e-9 : 1e-6);
        power = Math.abs(vIn * current);
        logicState = vIn >= 2.5 ? 1 : 0;
        addPinCurrent(c.id, 'io', current);
        extraInfo = `IC输出端口 (${logicState ? '高 1' : '低 0'})`;
        break;
      }
      case 'HEX_DISPLAY':
      case 'NIXIE_TUBE': {
        const b3 = pinVoltages.d3 >= 2.5 ? 8 : 0;
        const b2 = pinVoltages.d2 >= 2.5 ? 4 : 0;
        const b1 = pinVoltages.d1 >= 2.5 ? 2 : 0;
        const b0 = pinVoltages.d0 >= 2.5 ? 1 : 0;
        const hexVal = b3 + b2 + b1 + b0;
        for (const pid of ['d3', 'd2', 'd1', 'd0']) {
          addPinCurrent(c.id, pid, (pinVoltages[pid] ?? 0) * 1e-5);
        }
        logicState = hexVal;
        voltageDrop = pinVoltages.d0;
        current = 0;
        if (c.type === 'NIXIE_TUBE') {
          const bcdBlank = Boolean(c.props.bcdBlank) && hexVal > 9;
          const char = bcdBlank ? '熄灭 (>9)' : hexVal.toString(16).toUpperCase();
          power = bcdBlank ? 0.02 : 0.18;
          extraInfo = `辉光显示: ${char} (0b${hexVal.toString(2).padStart(4, '0')})`;
        } else {
          power = 0.05;
          extraInfo = `HEX: ${hexVal.toString(16).toUpperCase()} (${hexVal})`;
        }
        break;
      }
      case 'TIMER_555': {
        const vVcc = pinVoltages.vcc ?? 0;
        const vGnd = pinVoltages.gnd ?? 0;
        const vTrig = pinVoltages.trig ?? 0;
        const vThres = pinVoltages.thres ?? 0;
        const vDis = pinVoltages.dis ?? 0;
        const vOut = pinVoltages.out ?? 0;
        const vSup = vVcc - vGnd;
        const q = (simState.timer555States[c.id] ?? 0) ? 1 : 0;

        const gOutVcc = q === 1 ? 1 / 20 : 1e-7;
        const gOutGnd = q === 1 ? 1e-7 : 1 / 20;
        const gDisGnd = q === 0 ? 1 / 12 : 1e-8;

        const iLad = vSup / 15000;
        const iOutVcc = (vOut - vVcc) * gOutVcc;
        const iOutGnd = (vOut - vGnd) * gOutGnd;
        const iDisGnd = (vDis - vGnd) * gDisGnd;
        const iTrig = (vTrig - vGnd) * 1e-6;
        const iThres = (vThres - vGnd) * 1e-6;

        addPinCurrent(c.id, 'vcc', iLad - iOutVcc);
        addPinCurrent(c.id, 'trig', iTrig);
        addPinCurrent(c.id, 'thres', iThres);
        addPinCurrent(c.id, 'dis', iDisGnd);
        addPinCurrent(c.id, 'out', iOutVcc + iOutGnd);
        addPinCurrent(c.id, 'gnd', -iLad - iTrig - iThres - iDisGnd - iOutGnd);

        voltageDrop = vOut - vGnd;
        current = -(iOutVcc + iOutGnd);
        power =
          Math.abs(vSup * iLad) +
          Math.abs((vOut - vVcc) * iOutVcc) +
          Math.abs((vOut - vGnd) * iOutGnd) +
          Math.abs((vDis - vGnd) * iDisGnd);
        logicState = vSup >= 1.5 && voltageDrop >= 0.5 * vSup ? 1 : 0;
        extraInfo =
          vSup < 1.5
            ? '未上电 (VCC-GND < 1.5V)'
            : `Q=${logicState} · 阈值[${(vGnd + vSup / 3).toFixed(2)}V, ${(vGnd + (2 * vSup) / 3).toFixed(2)}V]`;
        break;
      }
      default: {
        // Logic gates, FFs, Counters & Truth Table LUT Chips
        let lastOutState = 0;
        for (const p of compPins) {
          if (p.role === 'logic_out') {
            const vDrive = logicDriveOut.get(pinKey(c.id, p.id)) ?? 0;
            const vPin = pinVoltages[p.id] ?? 0;
            const iOut = (vDrive - vPin) / 25;
            addPinCurrent(c.id, p.id, -iOut);
            current += Math.abs(iOut);
            power += Math.abs(vPin * iOut);
            lastOutState = vPin >= 2.5 ? 1 : 0;
            voltageDrop = vPin;
          } else {
            const iIn = (pinVoltages[p.id] ?? 0) * 1e-5;
            addPinCurrent(c.id, p.id, iIn);
          }
        }
        if (c.type === 'COUNTER_4BIT') {
          const cnt = (simState.counterValues[c.id] ?? 0) & 0x0f;
          logicState = cnt;
          extraInfo = `计数值 ${cnt} (0b${cnt.toString(2).padStart(4, '0')})`;
        } else if (c.type === 'ENCODER_4_2') {
          const y1 = (pinVoltages.y1 ?? 0) >= 2.5 ? 1 : 0;
          const y0 = (pinVoltages.y0 ?? 0) >= 2.5 ? 1 : 0;
          const gs = (pinVoltages.gs ?? 0) >= 2.5 ? 1 : 0;
          logicState = (gs << 2) | (y1 << 1) | y0;
          extraInfo = gs ? `有效编码 Y=${y1}${y0} (GS=1)` : '无输入激活 (GS=0)';
        } else if (c.type === 'DECODER_2_4') {
          const inh = (pinVoltages.inh ?? 0) >= 2.5 ? 1 : 0;
          const y3 = (pinVoltages.y3 ?? 0) >= 2.5 ? 1 : 0;
          const y2 = (pinVoltages.y2 ?? 0) >= 2.5 ? 1 : 0;
          const y1 = (pinVoltages.y1 ?? 0) >= 2.5 ? 1 : 0;
          const y0 = (pinVoltages.y0 ?? 0) >= 2.5 ? 1 : 0;
          const bits = (y3 << 3) | (y2 << 2) | (y1 << 1) | y0;
          const activeIdx = y3 ? 3 : y2 ? 2 : y1 ? 1 : 0;
          logicState = bits;
          extraInfo = inh ? '输出禁止 (INH=1)' : `选通输出 Y${activeIdx}=1`;
        } else if (c.type === 'MUX_4BIT') {
          const sel = (pinVoltages.sel ?? 0) >= 2.5 ? 1 : 0;
          const yVal =
            (((pinVoltages.y3 ?? 0) >= 2.5 ? 1 : 0) << 3) |
            (((pinVoltages.y2 ?? 0) >= 2.5 ? 1 : 0) << 2) |
            (((pinVoltages.y1 ?? 0) >= 2.5 ? 1 : 0) << 1) |
            ((pinVoltages.y0 ?? 0) >= 2.5 ? 1 : 0);
          logicState = yVal;
          extraInfo = `选通 ${sel ? 'B' : 'A'}[3:0] → 0x${yVal.toString(16).toUpperCase()} (${yVal})`;
        } else if (c.type === 'REGISTER_4BIT') {
          const regVal = (simState.registerValues[c.id] ?? 0) & 0x0f;
          logicState = regVal;
          extraInfo = `锁存值 0x${regVal.toString(16).toUpperCase()} (0b${regVal.toString(2).padStart(4, '0')})`;
        } else if (c.type === 'ALU_4BIT') {
          const op =
            (((pinVoltages.op1 ?? 0) >= 2.5 ? 1 : 0) << 1) |
            ((pinVoltages.op0 ?? 0) >= 2.5 ? 1 : 0);
          const fVal =
            (((pinVoltages.f3 ?? 0) >= 2.5 ? 1 : 0) << 3) |
            (((pinVoltages.f2 ?? 0) >= 2.5 ? 1 : 0) << 2) |
            (((pinVoltages.f1 ?? 0) >= 2.5 ? 1 : 0) << 1) |
            ((pinVoltages.f0 ?? 0) >= 2.5 ? 1 : 0);
          const cout = (pinVoltages.cout ?? 0) >= 2.5 ? 1 : 0;
          const zero = (pinVoltages.zero ?? 0) >= 2.5 ? 1 : 0;
          const opNames = ['ADD', 'SUB', 'AND', 'XOR'];
          logicState = fVal;
          extraInfo = `${opNames[op]}: F=0x${fVal.toString(16).toUpperCase()} · C=${cout} Z=${zero}`;
        } else if (c.type === 'RAM_16X4') {
          const addr =
            (((pinVoltages.a3 ?? 0) >= 2.5 ? 1 : 0) << 3) |
            (((pinVoltages.a2 ?? 0) >= 2.5 ? 1 : 0) << 2) |
            (((pinVoltages.a1 ?? 0) >= 2.5 ? 1 : 0) << 1) |
            ((pinVoltages.a0 ?? 0) >= 2.5 ? 1 : 0);
          const mem = simState.ramMemory[c.id] ?? parseRamInitHex(c.props.initHex);
          const qVal = (mem[addr] ?? 0) & 0x0f;
          const we = (pinVoltages.we ?? 0) >= 2.5 ? 1 : 0;
          logicState = qVal;
          extraInfo = `MEM[0x${addr.toString(16).toUpperCase()}]=0x${qVal.toString(16).toUpperCase()} · ${we ? 'WE=1写允许' : '只读'}`;
        } else if (c.type === 'CUSTOM_TRUTH_8' || c.type === 'CUSTOM_TRUTH_16') {
          const cfg = parseTruthChipConfig(c);
          const outBits = compPins
            .filter((p) => p.role === 'logic_out')
            .map((p) => ((pinVoltages[p.id] ?? 0) >= 2.5 ? '1' : '0'))
            .join('');
          logicState = lastOutState;
          extraInfo = `${cfg.chipName} · OUT=${outBits || '无'}`;
        } else {
          logicState = lastOutState;
          extraInfo = `输出 ${lastOutState ? '1 (5V)' : '0 (0V)'}`;
        }
        break;
      }
    }

    const { loadRatio, overloaded, warning } = formatComponentOverloadWarning(
      c,
      { voltageDrop, current, power },
      maxPower,
      false
    );

    if (warning) {
      warnings.push(warning);
    }

    telemetryById[c.id] = {
      componentId: c.id,
      pinVoltages,
      voltageDrop,
      current,
      power,
      maxPower,
      loadRatio,
      overloaded,
      logicState,
      extraInfo,
    };
  }

  return { telemetryById, warnings, pinCurrentIn };
}
