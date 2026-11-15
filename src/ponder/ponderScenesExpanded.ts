import * as THREE from 'three';
import { evaluateAlu4Bit } from '../engine/mnaSolver';
import {
  buildCopperTrack,
  buildCreatePedestal,
  buildGateChipHousing,
  buildLampTower,
  buildLevelBar,
  buildParticleStream,
  buildPipeSegment,
  buildSeg7Display3D,
  buildTerminalPost,
  buildToggleLever,
  makeBrassMaterial,
  makeDarkMetalMaterial,
  makeEmissiveMaterial,
  makeGlassMaterial,
} from './ponderPrimitives';
import type { PonderDioramaBuilder } from './ponderTypes';

function buildWireNode(x: number, y: number, z: number, color = 0xd97706): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 12),
    makeBrassMaterial(color)
  );
  m.position.set(x, y, z);
  return m;
}

export const buildInfSourceDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 0.9), makeDarkMetalMaterial(0x0f172a));
  body.position.set(-0.9, 0.43, 0);
  const coreRingMat = makeEmissiveMaterial(0xf43f5e, 1.0);
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.075, 12, 28), coreRingMat);
  coreRing.position.set(-0.9, 0.92, 0);
  const coreInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), makeEmissiveMaterial(0x38bdf8, 1.1));
  coreInner.position.set(-0.9, 0.92, 0);

  const track = buildCopperTrack([[-0.4, 0.45, 0], [0.85, 0.45, 0], [1.35, 0.45, 0]]);
  const loadTower = buildLampTower(1.35, 0, 0.88, 0x38bdf8);
  const bar = buildLevelBar(1.5, -0.8, 1.4, 0xf43f5e);
  const stream = buildParticleStream([
    [-0.35, 0.56, 0],
    [0.55, 0.56, 0],
    [1.25, 0.56, 0],
  ], 10, 0x38bdf8);

  root.add(body, coreRing, coreInner, track, loadTower.group, bar.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const v = params.voltage ?? 1200;
      const r = Math.max(10, params.loadR ?? 100);
      const current = v / r;
      coreRing.rotation.x = elapsed * 2.1;
      coreRing.rotation.y = elapsed * 1.4;
      coreInner.rotation.y = -elapsed * 2.6;
      const speed = Math.min(4.5, Math.max(0.7, current / 12));
      stream.update(elapsed, speed, true, false, 0x38bdf8);
      loadTower.setLit(true, 0x38bdf8, Math.min(1.8, 0.6 + current / 25));
      bar.setRatio(Math.min(1, Math.log10(Math.max(10, v)) / 4.2), 0xf43f5e);
    },
    getLiveReadout: (_e, _s, params) => {
      const v = params.voltage ?? 1200;
      const r = Math.max(10, params.loadR ?? 100);
      const i = v / r;
      return [
        { label: '稳恒输出电压 V∞', value: `${v.toFixed(0)} V`, accent: 'rose' },
        { label: '内阻跌落', value: '0.000 Ω (绝对恒压)', accent: 'sky' },
        { label: '输出电流 I', value: `${i.toFixed(2)} A`, accent: 'amber' },
      ];
    },
  };
};

export const buildInfResistorDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const leftPost = buildTerminalPost(-1.35, 0, 0.6, 0xf97316);
  const rightPost = buildTerminalPost(1.35, 0, 0.6, 0x38bdf8);
  const shieldMat = makeEmissiveMaterial(0xa855f7, 0.85);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 1.3), shieldMat);
  barrier.position.set(0, 0.56, 0);
  const casing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.52), makeGlassMaterial(0xe9d5ff, 0.35));
  casing.position.set(0, 0.48, 0);
  const trackIn = buildPipeSegment(new THREE.Vector3(-1.35, 0.5, 0), new THREE.Vector3(-0.22, 0.5, 0), 0.055, 0xf97316);
  const trackOut = buildPipeSegment(new THREE.Vector3(0.22, 0.5, 0), new THREE.Vector3(1.35, 0.5, 0), 0.055, 0x38bdf8);
  const barRight = buildLevelBar(1.35, -0.75, 1.15, 0x38bdf8);
  const stream = buildParticleStream([
    [-1.3, 0.52, 0],
    [0, 0.52, 0],
    [1.3, 0.52, 0],
  ], 8, 0xa855f7);

  root.add(leftPost, rightPost, barrier, casing, trackIn, trackOut, barRight.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const inf = (params.infiniteMode ?? 1) > 0.5;
      const vin = params.vin ?? 220;
      shieldMat.emissiveIntensity = inf ? 0.9 + Math.sin(elapsed * 3) * 0.2 : 0.35;
      stream.update(elapsed, inf ? 0 : 0.22 * (vin / 220), !inf, false, 0xa855f7);
      barRight.setRatio(inf ? 0.01 : Math.min(0.18, vin / 1200), 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const inf = (params.infiniteMode ?? 1) > 0.5;
      const vin = params.vin ?? 220;
      const rVal = inf ? 1e15 : 1e9;
      return [
        { label: '等效阻塞电阻 R', value: inf ? '∞ (10¹⁵ Ω 开路)' : '1.0 GΩ', accent: 'violet' },
        { label: '渗透电流 I = V/R', value: `${((vin / rVal) * 1e9).toFixed(2)} nA`, accent: 'sky' },
        { label: '隔离态', value: inf ? '完全电气隔断' : '极微弱漏导', accent: 'amber' },
      ];
    },
  };
};

export const buildZenerDiodeDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const rBlock = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.34, 0.36), makeBrassMaterial(0x0284c7));
  rBlock.position.set(-1.15, 0.5, 0);
  const diodeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 16), makeDarkMetalMaterial(0x111827));
  diodeBody.rotation.z = Math.PI / 2;
  diodeBody.position.set(0, 0.52, 0);
  const zBand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16), makeEmissiveMaterial(0xf59e0b, 0.8));
  zBand.rotation.z = Math.PI / 2;
  zBand.position.set(-0.22, 0.52, 0);
  const drainNode = buildWireNode(0.55, 0.52, 0, 0x22c55e);
  const voutBar = buildLevelBar(1.38, 0, 1.35, 0x22c55e);
  const track = buildCopperTrack([[-1.65, 0.52, 0], [0.55, 0.52, 0], [1.38, 0.52, 0]]);
  const shuntStream = buildParticleStream([
    [0.05, 0.52, 0],
    [0.05, 0.25, 0.45],
    [0.05, 0.12, 1.15],
  ], 7, 0xf59e0b);

  root.add(rBlock, diodeBody, zBand, drainNode, voutBar.group, track, shuntStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const vin = params.vin ?? 9.0;
      const vz = params.vz ?? 5.1;
      const clamped = vin >= vz;
      const vout = Math.min(vin, vz);
      voutBar.setRatio(vout / 12, clamped ? 0x22c55e : 0x38bdf8);
      shuntStream.update(elapsed, clamped ? 0.6 + (vin - vz) * 0.28 : 0.05, clamped, false, 0xf59e0b);
    },
    getLiveReadout: (_e, _s, params) => {
      const vin = params.vin ?? 9.0;
      const vz = params.vz ?? 5.1;
      const breakdown = vin >= vz;
      const vout = Math.min(vin, vz);
      const iShunt = breakdown ? ((vin - vz) / 0.15) : 0;
      return [
        { label: '输出稳压 V_out', value: `${vout.toFixed(2)} V`, accent: 'emerald' },
        { label: '工作状态', value: breakdown ? `反向击穿稳压 (Vz=${vz.toFixed(1)}V)` : '未击穿截止', accent: 'amber' },
        { label: '旁路泄流 I_Z', value: `${iShunt.toFixed(1)} mA`, accent: 'sky' },
      ];
    },
  };
};

export const buildNmosDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, 1.1), makeDarkMetalMaterial(0x1e293b));
  substrate.position.set(0, 0.22, 0);
  const oxide = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.8), makeGlassMaterial(0xbae6fd, 0.5));
  oxide.position.set(0, 0.44, 0);
  const gatePlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.68), makeBrassMaterial(0xa855f7));
  gatePlate.position.set(0, 0.56, 0);
  const channelMat = makeEmissiveMaterial(0x38bdf8, 0.85);
  const channel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.52), channelMat);
  channel.position.set(0, 0.36, 0);
  const lamp = buildLampTower(1.38, -0.35, 0.85, 0x22c55e);
  const stream = buildParticleStream([
    [-1.35, 0.36, 0],
    [0, 0.36, 0],
    [1.35, 0.36, -0.35],
  ], 10, 0x38bdf8);

  root.add(substrate, oxide, gatePlate, channel, lamp.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const vgs = params.vgs ?? 3.8;
      const vth = params.vth ?? 2.0;
      const over = Math.max(0, vgs - vth);
      const on = over > 0.05;
      channel.scale.z = Math.max(0.08, Math.min(1.15, over / 3.0));
      channelMat.emissiveIntensity = on ? Math.min(1.4, 0.3 + over * 0.3) : 0.02;
      stream.update(elapsed, 0.4 + over * 0.65, on, false, 0x38bdf8);
      lamp.setLit(on, 0x22c55e, Math.min(1.5, 0.3 + over * 0.35));
    },
    getLiveReadout: (_e, _s, params) => {
      const vgs = params.vgs ?? 3.8;
      const vth = params.vth ?? 2.0;
      const on = vgs > vth;
      const id = on ? Math.pow(vgs - vth, 1.5) * 3.8 : 0;
      return [
        { label: '沟道状态', value: on ? '已感生反型沟道 (导通)' : '截止关断 (V_GS < V_th)', accent: on ? 'emerald' : 'rose' },
        { label: '栅压裕量 V_GS - V_th', value: `${(vgs - vth).toFixed(2)} V`, accent: 'violet' },
        { label: '漏极电流 I_D', value: `${id.toFixed(1)} mA`, accent: 'sky' },
      ];
    },
  };
};

export const buildTransformerDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  // Laminated square iron core made of 4 frame bars
  const coreMat = makeDarkMetalMaterial(0x475569);
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 0.32), coreMat);
  topBar.position.set(0, 1.05, 0);
  const botBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 0.32), coreMat);
  botBar.position.set(0, 0.22, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.32), coreMat);
  leftLeg.position.set(-0.92, 0.64, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.32), coreMat);
  rightLeg.position.set(0.92, 0.64, 0);

  const pCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.56, 16), makeBrassMaterial(0x0284c7));
  pCoil.position.set(-0.92, 0.64, 0);
  const sCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.56, 16), makeBrassMaterial(0x16a34a));
  sCoil.position.set(0.92, 0.64, 0);
  const fluxStream = buildParticleStream([
    [-0.92, 1.05, 0],
    [0.92, 1.05, 0],
    [0.92, 0.22, 0],
    [-0.92, 0.22, 0],
  ], 12, 0xfbbf24);
  const barPrim = buildLevelBar(-1.6, 0, 1.25, 0x38bdf8);
  const barSec = buildLevelBar(1.6, 0, 1.25, 0x34d399);

  root.add(topBar, botBar, leftLeg, rightLeg, pCoil, sCoil, fluxStream.group, barPrim.group, barSec.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ratio = params.turnsRatio ?? 0.5;
      const v1 = params.acAmp ?? 12;
      const v2 = v1 * ratio;
      const osc = Math.abs(Math.sin(elapsed * 3.0));
      sCoil.scale.y = Math.max(0.45, Math.min(1.4, 0.6 + ratio * 0.35));
      fluxStream.update(elapsed, 0.9, true, Math.sin(elapsed * 3.0) < 0, 0xfbbf24);
      barPrim.setRatio((v1 / 35) * osc, 0x38bdf8);
      barSec.setRatio(Math.min(1, (v2 / 35) * osc), 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const ratio = params.turnsRatio ?? 0.5;
      const v1 = params.acAmp ?? 12;
      return [
        { label: '原边输入幅值 V₁', value: `${v1.toFixed(1)} V AC`, accent: 'sky' },
        { label: '变比 N₂ : N₁', value: `${ratio.toFixed(2)} : 1`, accent: 'amber' },
        { label: '副边感应 V₂ = k·V₁', value: `${(v1 * ratio).toFixed(2)} V AC`, accent: 'emerald' },
      ];
    },
  };
};

export const buildLampDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.32, 18), makeBrassMaterial(0xd97706));
  base.position.set(0, 0.16, 0);
  const bulbMat = makeEmissiveMaterial(0xfacc15, 0.8);
  const filament = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 20), bulbMat);
  filament.position.set(0, 0.92, 0);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), makeGlassMaterial(0xfef08a, 0.28));
  globe.position.set(0, 0.94, 0);
  const pBar = buildLevelBar(1.38, 0, 1.35, 0xfbbf24);
  const track = buildCopperTrack([[-1.45, 0.22, 0], [0, 0.22, 0], [1.38, 0.22, 0]]);
  root.add(base, filament, globe, pBar.group, track);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const v = params.voltage ?? 9;
      const r = Math.max(10, params.resistance ?? 30);
      const p = (v * v) / r;
      const norm = Math.min(1, p / 3.5);
      bulbMat.emissiveIntensity = 0.15 + norm * 1.4;
      bulbMat.color.setHex(norm > 0.7 ? 0xfef08a : 0xf59e0b);
      pBar.setRatio(norm, norm > 0.9 ? 0xf43f5e : 0xfbbf24);
    },
    getLiveReadout: (_e, _s, params) => {
      const v = params.voltage ?? 9;
      const r = Math.max(10, params.resistance ?? 30);
      const p = (v * v) / r;
      return [
        { label: '实耗焦耳功率 P', value: `${p.toFixed(2)} W`, accent: 'amber' },
        { label: '灯丝电流 I', value: `${(v / r).toFixed(2)} A`, accent: 'sky' },
        { label: '光辐射亮度', value: `${Math.min(100, Math.round((p / 2.5) * 100))}%`, accent: 'emerald' },
      ];
    },
  };
};

export const buildFuseDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16), makeBrassMaterial(0xd97706));
  capL.rotation.z = Math.PI / 2;
  capL.position.set(-0.7, 0.55, 0);
  const capR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16), makeBrassMaterial(0xd97706));
  capR.rotation.z = Math.PI / 2;
  capR.position.set(0.7, 0.55, 0);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.15, 16), makeGlassMaterial(0xe0f2fe, 0.32));
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, 0.55, 0);
  const wireMat = makeEmissiveMaterial(0xfbbf24, 0.8);
  const wireL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.56, 8), wireMat);
  wireL.rotation.z = Math.PI / 2;
  wireL.position.set(-0.3, 0.55, 0);
  const wireR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.56, 8), wireMat);
  wireR.rotation.z = Math.PI / 2;
  wireR.position.set(0.3, 0.55, 0);
  const lamp = buildLampTower(1.4, 0, 0.82, 0x22c55e);

  root.add(capL, capR, tube, wireL, wireR, lamp.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const i = params.current ?? 0.9;
      const rated = params.rated ?? 1.5;
      const blown = i >= rated;
      wireL.position.x = blown ? -0.44 : -0.28;
      wireR.position.x = blown ? 0.44 : 0.28;
      wireL.rotation.y = blown ? 0.28 : 0;
      wireR.rotation.y = blown ? -0.28 : 0;
      wireMat.color.setHex(blown ? 0xef4444 : 0xfbbf24);
      wireMat.emissive.setHex(blown ? 0xef4444 : 0xfbbf24);
      lamp.setLit(!blown, blown ? 0xef4444 : 0x22c55e, blown ? 0.1 : 1.0);
    },
    getLiveReadout: (_e, _s, params) => {
      const i = params.current ?? 0.9;
      const rated = params.rated ?? 1.5;
      const blown = i >= rated;
      return [
        { label: '电路保险状态', value: blown ? '已过流熔断 (安全断路)' : '完整导通 (R≈0.05Ω)', accent: blown ? 'rose' : 'emerald' },
        { label: '干路电流 / 额定阈值', value: `${i.toFixed(1)} A / ${rated.toFixed(2)} A`, accent: 'amber' },
      ];
    },
  };
};

export const buildMux21Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.25, 0.46, 1.05, 0x38bdf8);
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 0.68, 0);
  const armRod = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.14), makeEmissiveMaterial(0xfbbf24, 0.9));
  armGroup.add(armRod);

  const lampA = buildLampTower(-1.35, -0.48, 0.65, 0x38bdf8);
  const lampB = buildLampTower(-1.35, 0.48, 0.65, 0xa855f7);
  const lampY = buildLampTower(1.38, 0, 0.88, 0x22c55e);

  root.add(housing, armGroup, lampA.group, lampB.group, lampY.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const sel = (params.sel ?? 0) > 0.5;
      const a = (params.a ?? 1) > 0.5;
      const b = (params.b ?? 0) > 0.5;
      const y = sel ? b : a;
      armGroup.rotation.y = sel ? 0.42 : -0.42;
      lampA.setLit(a, 0x38bdf8, 1.0);
      lampB.setLit(b, 0xa855f7, 1.0);
      lampY.setLit(y, 0x22c55e, 1.15);
    },
    getLiveReadout: (_e, _s, params) => {
      const sel = (params.sel ?? 0) > 0.5 ? 1 : 0;
      const a = (params.a ?? 1) > 0.5 ? 1 : 0;
      const b = (params.b ?? 0) > 0.5 ? 1 : 0;
      const y = sel ? b : a;
      return [
        { label: '当前选中路由', value: sel ? '通道 B → 输出 Y' : '通道 A → 输出 Y', accent: 'amber' },
        { label: '输出布尔状态 Y', value: `${y} (${y ? '+5.0V' : '0.0V'})`, accent: 'emerald' },
      ];
    },
  };
};

export const buildJkFfDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.25, 0.48, 1.05, 0xa855f7);
  const lampJ = buildLampTower(-1.35, -0.45, 0.6, 0x38bdf8);
  const lampK = buildLampTower(-1.35, 0.45, 0.6, 0xf59e0b);
  const lampQ = buildLampTower(1.35, -0.35, 0.86, 0x22c55e);
  const lampQn = buildLampTower(1.35, 0.35, 0.86, 0xf43f5e);
  const pulseSphereMat = makeEmissiveMaterial(0xfbbf24, 0.9);
  const clkPulse = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), pulseSphereMat);
  clkPulse.position.set(0, 0.85, 0);

  root.add(housing, lampJ.group, lampK.group, lampQ.group, lampQn.group, clkPulse);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const j = (params.j ?? 1) > 0.5;
      const k = (params.k ?? 1) > 0.5;
      const rate = params.clkRate ?? 1.0;
      const cycle = Math.floor(elapsed * rate);
      let q = false;
      if (j && k) q = cycle % 2 === 1;
      else if (j && !k) q = true;
      else if (!j && k) q = false;
      else q = true;

      const edgeGlow = Math.pow(Math.max(0, Math.sin(elapsed * rate * Math.PI * 2)), 4);
      pulseSphereMat.emissiveIntensity = 0.25 + edgeGlow * 1.4;
      lampJ.setLit(j, 0x38bdf8, 0.95);
      lampK.setLit(k, 0xf59e0b, 0.95);
      lampQ.setLit(q, 0x22c55e, 1.15);
      lampQn.setLit(!q, 0xf43f5e, 1.0);
    },
    getLiveReadout: (elapsed, _s, params) => {
      const j = (params.j ?? 1) > 0.5 ? 1 : 0;
      const k = (params.k ?? 1) > 0.5 ? 1 : 0;
      const mode = j === 1 && k === 1 ? '翻转模式 (Toggle f/2)' : j === 1 ? '置位 Q=1' : k === 1 ? '清零 Q=0' : '锁存保持';
      const q = j === 1 && k === 1 ? Math.floor(elapsed * (params.clkRate ?? 1.0)) % 2 : j;
      return [
        { label: 'JK 工作模式', value: mode, accent: 'violet' },
        { label: '当前输出 Q / ¬Q', value: `${q} / ${1 - q}`, accent: 'emerald' },
      ];
    },
  };
};

export const buildCounter4BitDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.4, 0.45, 1.15, 0x38bdf8);
  const seg7 = buildSeg7Display3D();
  seg7.group.position.set(1.38, 0, 0);
  seg7.group.scale.setScalar(0.8);
  const bitLamps = [0, 1, 2, 3].map((i) => buildLampTower(-0.75 + i * 0.42, -0.78, 0.65, 0x22c55e));

  root.add(housing, seg7.group, ...bitLamps.map((l) => l.group));

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const clr = (params.clr ?? 0) > 0.5;
      const speed = params.speed ?? 1.25;
      const val = clr ? 0 : Math.floor(elapsed * speed) % 16;
      seg7.setDigit(val, clr ? 0x64748b : 0x38bdf8);
      for (let b = 0; b < 4; b++) {
        const lit = ((val >> b) & 1) === 1;
        bitLamps[b].setLit(lit, 0x22c55e, 1.1);
      }
    },
    getLiveReadout: (elapsed, _s, params) => {
      const clr = (params.clr ?? 0) > 0.5;
      const val = clr ? 0 : Math.floor(elapsed * (params.speed ?? 1.25)) % 16;
      const bin = val.toString(2).padStart(4, '0');
      return [
        { label: '4位输出 Q3 Q2 Q1 Q0', value: `${bin} (0x${val.toString(16).toUpperCase()})`, accent: 'sky' },
        { label: '计数模式', value: clr ? 'CLR 异步清零' : '上升沿累加 0→15', accent: 'emerald' },
      ];
    },
  };
};

export const buildCustomTruth8Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.45, 0.48, 1.25, 0xa855f7);
  const matrix = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.8), makeEmissiveMaterial(0x38bdf8, 0.8));
  matrix.position.set(0, 0.68, 0);
  const inLamps = [0, 1, 2].map((i) => buildLampTower(-1.35, -0.5 + i * 0.5, 0.55, 0x38bdf8));
  const outLamps = [0, 1].map((i) => buildLampTower(1.35, -0.3 + i * 0.6, 0.72, 0x22c55e));

  root.add(housing, matrix, ...inLamps.map((l) => l.group), ...outLamps.map((l) => l.group));

  return {
    root,
    update: (_e, _s, _p, params) => {
      const a = (params.inA ?? 1) > 0.5 ? 1 : 0;
      const b = (params.inB ?? 1) > 0.5 ? 1 : 0;
      const c = (params.inC ?? 0) > 0.5 ? 1 : 0;
      const bits = [a, b, c];
      inLamps.forEach((l, i) => l.setLit(bits[i] === 1, 0x38bdf8, 1.0));
      const y0 = (a ^ b) === 1;
      const y1 = (a & b & (c ? 1 : 1)) === 1 || (c === 1 && (a | b) === 1);
      outLamps[0].setLit(y0, 0x22c55e, 1.1);
      outLamps[1].setLit(y1, 0xfbbf24, 1.1);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.inA ?? 1) > 0.5 ? 1 : 0;
      const b = (params.inB ?? 1) > 0.5 ? 1 : 0;
      const c = (params.inC ?? 0) > 0.5 ? 1 : 0;
      const y0 = a ^ b;
      const y1 = (a & b) | (c & (a ^ b));
      return [
        { label: '输入槽态 A,B,C', value: `${a}, ${b}, ${c}`, accent: 'sky' },
        { label: '编程公式输出 Y0,Y1', value: `Y0(Sum)=${y0}, Y1(Cout)=${y1}`, accent: 'emerald' },
      ];
    },
  };
};

export const buildCustomTruth16Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.85, 0.5, 1.45, 0xf59e0b);
  const grid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.0), makeEmissiveMaterial(0xfbbf24, 0.75));
  grid.position.set(0, 0.72, 0);
  const inLamps = [0, 1, 2].map((i) => buildLampTower(-1.55, -0.5 + i * 0.5, 0.55, 0x38bdf8));
  const outLamps = [0, 1, 2, 3].map((i) => buildLampTower(1.55, -0.6 + i * 0.4, 0.65, 0x22c55e));

  root.add(housing, grid, ...inLamps.map((l) => l.group), ...outLamps.map((l) => l.group));

  return {
    root,
    update: (_e, _s, _p, params) => {
      const d2 = (params.inA ?? 1) > 0.5 ? 1 : 0;
      const d1 = (params.inB ?? 0) > 0.5 ? 1 : 0;
      const d0 = (params.inC ?? 1) > 0.5 ? 1 : 0;
      [d2, d1, d0].forEach((bit, i) => inLamps[i].setLit(bit === 1, 0x38bdf8, 1.0));
      const addr = (d2 << 2) | (d1 << 1) | d0;
      outLamps.forEach((l, i) => l.setLit((addr % 4) === i, 0x22c55e, 1.15));
    },
    getLiveReadout: (_e, _s, params) => {
      const d2 = (params.inA ?? 1) > 0.5 ? 1 : 0;
      const d1 = (params.inB ?? 0) > 0.5 ? 1 : 0;
      const d0 = (params.inC ?? 1) > 0.5 ? 1 : 0;
      const addr = (d2 << 2) | (d1 << 1) | d0;
      return [
        { label: '16槽寻址输入 D2..D0', value: `${d2}${d1}${d0} (索引 #${addr})`, accent: 'amber' },
        { label: '激活通道译码', value: `OUT${addr % 4} = HIGH (5.0V)`, accent: 'emerald' },
      ];
    },
  };
};

export const buildIcPortInDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const flange = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.56, 0.8), makeBrassMaterial(0xd97706));
  flange.position.set(-0.75, 0.35, 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 1.05), makeGlassMaterial(0x38bdf8, 0.34));
  frame.position.set(0, 0.5, 0);
  const lever = buildToggleLever(-1.35, 0, 0x38bdf8);
  const outLamp = buildLampTower(1.3, 0, 0.82, 0x22c55e);
  const stream = buildParticleStream([
    [-1.1, 0.52, 0],
    [0, 0.52, 0],
    [1.2, 0.52, 0],
  ], 8, 0x38bdf8);

  root.add(flange, frame, lever.group, outLamp.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const on = (params.state ?? 1) > 0.5;
      lever.setActive(on);
      outLamp.setLit(on, 0x22c55e, 1.1);
      stream.update(elapsed, on ? 1.2 : 0, on, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const on = (params.state ?? 1) > 0.5;
      return [
        { label: '封装接口方向', value: '外部引脚 → 子电路内部', accent: 'sky' },
        { label: '当前穿透电平', value: on ? '1 (+5.0V)' : '0 (0.0V)', accent: on ? 'emerald' : 'amber' },
      ];
    },
  };
};

export const buildIcPortOutDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 1.05), makeGlassMaterial(0x22c55e, 0.34));
  frame.position.set(0, 0.5, 0);
  const goldPin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.55), makeBrassMaterial(0xfbbf24));
  goldPin.position.set(0.75, 0.35, 0);
  const beacon = buildLampTower(0, 0, 0.95, 0x22c55e);
  const stream = buildParticleStream([
    [-1.25, 0.52, 0],
    [0, 0.52, 0],
    [1.25, 0.52, 0],
  ], 8, 0x22c55e);

  root.add(frame, goldPin, beacon.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const on = (params.drive ?? 1) > 0.5;
      beacon.setLit(on, 0x22c55e, 1.2);
      stream.update(elapsed, on ? 1.25 : 0, on, false, 0x22c55e);
    },
    getLiveReadout: (_e, _s, params) => {
      const on = (params.drive ?? 1) > 0.5;
      return [
        { label: '封装导出状态', value: on ? '已驱动外部金手指 (+5V)' : '低电平输出 (0V)', accent: 'emerald' },
        { label: '角色定位', value: 'Custom IC 右侧边界输出端口', accent: 'sky' },
      ];
    },
  };
};

export const buildCustomIcDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.45), makeDarkMetalMaterial(0x1e293b));
  basePlinth.position.set(0, 0.09, 0);
  const shellMat = makeGlassMaterial(0x38bdf8, 0.32);
  const outerShell = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 1.3), shellMat);
  outerShell.position.set(0, 0.54, 0);

  // Micro subcircuit nodes floating inside
  const gate1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.36), makeEmissiveMaterial(0xf59e0b, 0.8));
  gate1.position.set(-0.42, 0.42, -0.22);
  const gate2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.36), makeEmissiveMaterial(0xa855f7, 0.8));
  gate2.position.set(-0.42, 0.42, 0.25);
  const gate3 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.44), makeEmissiveMaterial(0x22c55e, 0.85));
  gate3.position.set(0.38, 0.44, 0);

  const subStream = buildParticleStream([
    [-0.9, 0.42, -0.22],
    [0.38, 0.44, 0],
    [1.1, 0.44, 0],
  ], 10, 0x38bdf8);

  root.add(basePlinth, outerShell, gate1, gate2, gate3, subStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const xRay = (params.inspectLayer ?? 1) > 0.5;
      const rate = params.clockPulse ?? 1.2;
      shellMat.opacity = xRay ? 0.25 : 0.88;
      shellMat.color.setHex(xRay ? 0x38bdf8 : 0x0f172a);
      gate1.position.y = 0.42 + Math.sin(elapsed * 2.2) * 0.03;
      gate2.position.y = 0.42 + Math.cos(elapsed * 2.2) * 0.03;
      subStream.update(elapsed, rate, true, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const xRay = (params.inspectLayer ?? 1) > 0.5;
      return [
        { label: '封装透视', value: xRay ? '层次子网表可见 (真实展开)' : '标准黑色树脂外壳', accent: 'sky' },
        { label: '支持嵌套深度', value: '最多 4 层云端 IC 互联', accent: 'amber' },
      ];
    },
  };
};

export const buildTimer555Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const ladderBody = buildGateChipHousing(0.75, 0.55, 0.9, 0xf59e0b);
  ladderBody.position.set(-1.1, 0, 0);
  const rsMat = makeEmissiveMaterial(0x22c55e, 0.9);
  const rsCore = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.52, 0.68), rsMat);
  rsCore.position.set(0, 0.46, 0);

  const disMat = makeEmissiveMaterial(0xfb7185, 0.15);
  const disNode = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.34, 16), disMat);
  disNode.position.set(0.32, 0.25, -0.68);

  const capTower = buildLevelBar(-0.35, -0.78, 1.35, 0x38bdf8);
  const loMark = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 20), makeBrassMaterial(0xf59e0b));
  loMark.rotation.x = Math.PI / 2;
  loMark.position.set(-0.35, 0.45, -0.78);
  const hiMark = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 20), makeBrassMaterial(0xfbbf24));
  hiMark.rotation.x = Math.PI / 2;
  hiMark.position.set(-0.35, 0.9, -0.78);

  const outTower = buildLampTower(1.35, 0, 0.9, 0x22c55e);
  const track = buildCopperTrack([
    [-1.1, 0.45, 0],
    [0, 0.45, 0],
    [1.35, 0.45, 0],
  ]);
  const outStream = buildParticleStream(
    [
      [0.15, 0.56, 0],
      [0.75, 0.56, 0],
      [1.28, 0.56, 0],
    ],
    8,
    0x22c55e
  );

  root.add(ladderBody, rsCore, disNode, capTower.group, loMark, hiMark, outTower.group, track, outStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const vcc = params.vcc ?? 5;
      const r = (params.rKohm ?? 10) * 1e3;
      const c = (params.cUf ?? 10) * 1e-6;
      const tPeriod = Math.max(0.08, 0.693 * 3 * r * c);
      const tHigh = 0.693 * 2 * r * c;
      const visualPeriod = Math.min(4.0, Math.max(0.7, tPeriod * 4));
      const phaseTime = (elapsed % visualPeriod) / visualPeriod;
      const duty = tHigh / tPeriod;
      const high = phaseTime < duty;
      const vcFrac = high
        ? 1 / 3 + (phaseTime / duty) * (1 / 3)
        : 2 / 3 - ((phaseTime - duty) / Math.max(0.05, 1 - duty)) * (1 / 3);

      capTower.setRatio(vcFrac, high ? 0x38bdf8 : 0xfb7185);
      rsMat.color.setHex(high ? 0x22c55e : 0xef4444);
      rsMat.emissive.setHex(high ? 0x22c55e : 0xef4444);
      rsMat.emissiveIntensity = high ? 0.9 : 0.45;
      disMat.emissiveIntensity = high ? 0.08 : 1.15;
      outTower.setLit(high, high ? 0x22c55e : 0xef4444, high ? (vcc / 5) * 1.1 : 0.15);
      outStream.update(elapsed, high ? 1.8 : 0.6, high, false, high ? 0x22c55e : 0xef4444);
    },
    getLiveReadout: (elapsed, _s, params) => {
      const vcc = params.vcc ?? 5;
      const r = (params.rKohm ?? 10) * 1e3;
      const c = (params.cUf ?? 10) * 1e-6;
      const tPeriod = Math.max(0.001, 0.693 * 3 * r * c);
      const tHigh = 0.693 * 2 * r * c;
      const visualPeriod = Math.min(4.0, Math.max(0.7, tPeriod * 4));
      const phaseTime = (elapsed % visualPeriod) / visualPeriod;
      const high = phaseTime < tHigh / tPeriod;
      return [
        { label: '窗口门限 [1/3, 2/3]', value: `[${(vcc / 3).toFixed(2)}V, ${((2 * vcc) / 3).toFixed(2)}V]`, accent: 'amber' },
        { label: '多谐频率 / 周期', value: `${(1 / tPeriod).toFixed(2)} Hz / ${(tPeriod * 1000).toFixed(1)}ms`, accent: 'sky' },
        { label: '当前相位输出', value: high ? `HIGH (${vcc.toFixed(1)}V · 充电)` : 'LOW (0V · DIS放电)', accent: high ? 'emerald' : 'rose' },
      ];
    },
  };
};

export const buildNixieTubeDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.92, 0.28, 24),
    makeDarkMetalMaterial(0x1c1917)
  );
  base.position.set(0, 0.14, 0);
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.88, 0.08, 24),
    makeBrassMaterial(0xd97706)
  );
  collar.position.set(0, 0.29, 0);

  const glassEnv = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 1.55, 24, 1, false),
    makeGlassMaterial(0xffedd5, 0.22)
  );
  glassEnv.position.set(0, 1.1, 0);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.76, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    makeGlassMaterial(0xffedd5, 0.22)
  );
  dome.position.set(0, 1.87, 0);

  const anodeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.64, 1.38, 12, 3, true),
    new THREE.MeshStandardMaterial({ color: 0xb45309, wireframe: true, transparent: true, opacity: 0.42 })
  );
  anodeMesh.position.set(0, 1.1, 0);

  // Depth-stacked 10 cathode slices inside the glass envelope
  const cathodeSlices: Array<{ mat: THREE.MeshStandardMaterial; mesh: THREE.Mesh }> = [];
  for (let idx = 0; idx < 10; idx++) {
    const mat = makeEmissiveMaterial(0x64748b, 0.08);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.88, 0.03), mat);
    frame.position.set(0, 1.1, -0.34 + idx * 0.075);
    cathodeSlices.push({ mat, mesh: frame });
    root.add(frame);
  }

  const plasmaMat = new THREE.MeshBasicMaterial({ color: 0xff7b24, transparent: true, opacity: 0.25 });
  const plasmaGlow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), plasmaMat);
  plasmaGlow.position.set(0, 1.1, 0);

  const inBits: Array<ReturnType<typeof buildLampTower>> = [];
  for (let i = 0; i < 4; i++) {
    const t = buildLampTower(-1.45, -0.66 + i * 0.44, 0.62, 0x38bdf8);
    inBits.push(t);
    root.add(t.group);
  }

  root.add(base, collar, anodeMesh, plasmaGlow, glassEnv, dome);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const val = Math.round(params.digit ?? 8) & 15;
      const blank = (params.bcdBlank ?? 0) >= 0.5 && val > 9;
      const activeIdx = val % 10;
      const flicker = 0.92 + 0.08 * Math.sin(elapsed * 18);
      for (let i = 0; i < 4; i++) {
        const bit = (val >> (3 - i)) & 1;
        inBits[i].setLit(bit === 1, 0x38bdf8, 0.85);
      }
      cathodeSlices.forEach((s, idx) => {
        const isLit = !blank && idx === activeIdx;
        s.mat.color.setHex(isLit ? 0xff9d3b : 0x475569);
        s.mat.emissive.setHex(isLit ? 0xff5e1a : 0x0f172a);
        s.mat.emissiveIntensity = isLit ? 1.75 * flicker : 0.05;
        s.mesh.scale.setScalar(isLit ? 1.08 : 0.96);
      });
      plasmaMat.opacity = blank ? 0.02 : 0.26 * flicker;
      plasmaGlow.position.z = -0.34 + activeIdx * 0.075;
    },
    getLiveReadout: (_e, _s, params) => {
      const val = Math.round(params.digit ?? 8) & 15;
      const blank = (params.bcdBlank ?? 0) >= 0.5 && val > 9;
      return [
        { label: '辉光管当前显数', value: blank ? '熄灭 (BCD >9)' : `${val.toString(16).toUpperCase()} (${val})`, accent: blank ? 'rose' : 'amber' },
        { label: '输入二进制码', value: `0b${val.toString(2).padStart(4, '0')}`, accent: 'sky' },
      ];
    },
  };
};

export const buildEncoder42Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.2, 0.65, 1.35, 0xec4899);
  housing.position.set(0, 0, 0);

  const inLevers: Array<ReturnType<typeof buildToggleLever>> = [];
  const zPos = [-0.66, -0.22, 0.22, 0.66];
  for (let i = 0; i < 4; i++) {
    const lv = buildToggleLever(-1.35, zPos[i], 0xec4899);
    inLevers.push(lv);
    root.add(lv.group);
    root.add(buildCopperTrack([[-1.25, 0.4, zPos[i]], [-0.55, 0.4, zPos[i]]]));
  }

  const gateBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.28, 1.55),
    makeBrassMaterial(0xfbbf24)
  );
  gateBar.position.set(-0.32, 0.95, 0);

  const y1Tower = buildLampTower(1.35, -0.45, 0.85, 0x22c55e);
  const y0Tower = buildLampTower(1.35, 0, 0.85, 0x22c55e);
  const gsTower = buildLampTower(1.35, 0.45, 0.85, 0xfbbf24);
  const stream = buildParticleStream([[0.3, 0.55, 0], [1.25, 0.55, 0]], 8, 0x22c55e);

  root.add(housing, gateBar, y1Tower.group, y0Tower.group, gsTower.group, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const i3 = (params.i3 ?? 0) >= 0.5 ? 1 : 0;
      const i2 = (params.i2 ?? 1) >= 0.5 ? 1 : 0;
      const i1 = (params.i1 ?? 0) >= 0.5 ? 1 : 0;
      const i0 = (params.i0 ?? 1) >= 0.5 ? 1 : 0;
      const bits = [i3, i2, i1, i0];
      bits.forEach((b, idx) => inLevers[idx].setActive(b === 1));

      const gs = i3 || i2 || i1 || i0 ? 1 : 0;
      const y1 = i3 || i2 ? 1 : 0;
      const y0 = i3 || (!i2 && i1) ? 1 : 0;
      const winIdx = i3 ? 0 : i2 ? 1 : i1 ? 2 : i0 ? 3 : -1;
      gateBar.position.z = winIdx >= 0 ? zPos[winIdx] * 0.45 : 0;

      y1Tower.setLit(y1 === 1, 0x22c55e, 1.0);
      y0Tower.setLit(y0 === 1, 0x22c55e, 1.0);
      gsTower.setLit(gs === 1, 0xfbbf24, 1.0);
      stream.update(elapsed, gs ? 2.0 : 0.4, gs === 1, false, 0x22c55e);
    },
    getLiveReadout: (_e, _s, params) => {
      const i3 = (params.i3 ?? 0) >= 0.5 ? 1 : 0;
      const i2 = (params.i2 ?? 1) >= 0.5 ? 1 : 0;
      const i1 = (params.i1 ?? 0) >= 0.5 ? 1 : 0;
      const i0 = (params.i0 ?? 1) >= 0.5 ? 1 : 0;
      const gs = i3 || i2 || i1 || i0 ? 1 : 0;
      const y1 = i3 || i2 ? 1 : 0;
      const y0 = i3 || (!i2 && i1) ? 1 : 0;
      return [
        { label: '输出编码 Y₁Y₀', value: `${y1}${y0} (${(y1 << 1) | y0})`, accent: gs ? 'emerald' : 'amber' },
        { label: '有效标志 GS', value: gs ? '1 (存在请求)' : '0 (全空闲)', accent: gs ? 'amber' : 'rose' },
      ];
    },
  };
};

export const buildDecoder24Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.15, 0.62, 1.25, 0x14b8a6);
  const lA1 = buildToggleLever(-1.35, -0.45, 0x14b8a6);
  const lA0 = buildToggleLever(-1.35, 0, 0x14b8a6);
  const lInh = buildToggleLever(-1.35, 0.48, 0xf43f5e);

  const rotorArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.12, 0.14),
    makeBrassMaterial(0xfbbf24)
  );
  rotorArm.position.set(0.35, 0.92, 0);

  const outTowers: Array<ReturnType<typeof buildLampTower>> = [];
  const zOuts = [-0.66, -0.22, 0.22, 0.66];
  for (let i = 0; i < 4; i++) {
    const t = buildLampTower(1.4, zOuts[i], 0.85, 0x22c55e);
    outTowers.push(t);
    root.add(t.group);
    root.add(buildCopperTrack([[0.5, 0.4, zOuts[i]], [1.35, 0.4, zOuts[i]]]));
  }

  root.add(housing, lA1.group, lA0.group, lInh.group, rotorArm);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a1 = (params.a1 ?? 1) >= 0.5 ? 1 : 0;
      const a0 = (params.a0 ?? 0) >= 0.5 ? 1 : 0;
      const inh = (params.inh ?? 0) >= 0.5 ? 1 : 0;
      lA1.setActive(a1 === 1);
      lA0.setActive(a0 === 1);
      lInh.setActive(inh === 1);

      const sel = (a1 << 1) | a0; // 0..3 -> y0..y3 at zOuts[3..0]
      const targetAngle = ((1.5 - sel) * 0.26);
      rotorArm.rotation.y += (targetAngle - rotorArm.rotation.y) * 0.25;
      rotorArm.position.y = inh ? 1.15 : 0.92 + 0.03 * Math.sin(elapsed * 4);

      for (let yIdx = 0; yIdx < 4; yIdx++) {
        const active = !inh && yIdx === sel;
        outTowers[3 - yIdx].setLit(active, 0x22c55e, 1.1);
      }
    },
    getLiveReadout: (_e, _s, params) => {
      const a1 = (params.a1 ?? 1) >= 0.5 ? 1 : 0;
      const a0 = (params.a0 ?? 0) >= 0.5 ? 1 : 0;
      const inh = (params.inh ?? 0) >= 0.5 ? 1 : 0;
      const sel = (a1 << 1) | a0;
      return [
        { label: '地址输入 A₁A₀', value: `${a1}${a0} → Y${sel}`, accent: 'sky' },
        { label: '独热输出 Y₃..Y₀', value: inh ? '0000 (INH=1禁止)' : `0b${(1 << sel).toString(2).padStart(4, '0')}`, accent: inh ? 'rose' : 'emerald' },
      ];
    },
  };
};

export const buildMux4BitDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.25, 0.65, 1.45, 0x6366f1);
  const selLever = buildToggleLever(-0.1, 0.92, 0xfbbf24);
  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.16, 1.35),
    makeBrassMaterial(0xfbbf24)
  );
  crossbar.position.set(0, 0.95, 0);

  const busATowers: Array<ReturnType<typeof buildLampTower>> = [];
  const busBTowers: Array<ReturnType<typeof buildLampTower>> = [];
  const busYTowers: Array<ReturnType<typeof buildLampTower>> = [];
  for (let i = 0; i < 4; i++) {
    const z = -0.54 + i * 0.36;
    const tA = buildLampTower(-1.45, z - 0.12, 0.62, 0x38bdf8);
    const tB = buildLampTower(-1.12, z + 0.12, 0.62, 0xa855f7);
    const tY = buildLampTower(1.4, z, 0.85, 0x22c55e);
    busATowers.push(tA);
    busBTowers.push(tB);
    busYTowers.push(tY);
    root.add(tA.group, tB.group, tY.group);
  }
  const stream = buildParticleStream([[0.35, 0.55, 0], [1.3, 0.55, 0]], 10, 0x6366f1);
  root.add(housing, selLever.group, crossbar, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = Math.round(params.valA ?? 5) & 15;
      const b = Math.round(params.valB ?? 12) & 15;
      const sel = (params.sel ?? 0) >= 0.5 ? 1 : 0;
      const y = sel ? b : a;
      selLever.setActive(sel === 1);
      crossbar.position.x = sel ? -0.25 : 0.25;

      for (let i = 0; i < 4; i++) {
        const bitShift = 3 - i;
        busATowers[i].setLit(((a >> bitShift) & 1) === 1, 0x38bdf8, 0.85);
        busBTowers[i].setLit(((b >> bitShift) & 1) === 1, 0xa855f7, 0.85);
        busYTowers[i].setLit(((y >> bitShift) & 1) === 1, sel ? 0xa855f7 : 0x38bdf8, 1.05);
      }
      stream.update(elapsed, 1.8, true, false, sel ? 0xa855f7 : 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = Math.round(params.valA ?? 5) & 15;
      const b = Math.round(params.valB ?? 12) & 15;
      const sel = (params.sel ?? 0) >= 0.5 ? 1 : 0;
      const y = sel ? b : a;
      return [
        { label: '当前选通通道', value: sel ? 'SEL=1 → B[3:0]' : 'SEL=0 → A[3:0]', accent: sel ? 'violet' : 'sky' },
        { label: '输出总线 Y[3:0]', value: `0x${y.toString(16).toUpperCase()} (${y})`, accent: 'emerald' },
      ];
    },
  };
};

export const buildRegister4BitDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const housing = buildGateChipHousing(1.25, 0.65, 1.38, 0x0ea5e9);
  const clkHammer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.42, 16),
    makeBrassMaterial(0xfbbf24)
  );
  clkHammer.position.set(0, 1.15, 0.48);

  const weGate = buildToggleLever(-1.35, 0.58, 0x22c55e);
  const rstBtn = buildToggleLever(-1.35, -0.58, 0xf43f5e);
  const outBars: Array<ReturnType<typeof buildLevelBar>> = [];
  for (let i = 0; i < 4; i++) {
    const bar = buildLevelBar(1.35, -0.54 + i * 0.36, 1.1, 0x38bdf8);
    outBars.push(bar);
    root.add(bar.group);
  }

  let latched = 0;
  let prevPulse = false;
  root.add(housing, clkHammer, weGate.group, rstBtn.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const d = Math.round(params.dVal ?? 9) & 15;
      const we = (params.we ?? 1) >= 0.5;
      const rst = (params.rst ?? 0) >= 0.5;
      const pulse = Math.sin(elapsed * 2.4) > 0;
      weGate.setActive(we);
      rstBtn.setActive(rst);
      clkHammer.position.y = pulse ? 0.92 : 1.24;

      if (rst) {
        latched = 0;
      } else if (pulse && !prevPulse && we) {
        latched = d;
      }
      prevPulse = pulse;

      for (let i = 0; i < 4; i++) {
        const bit = (latched >> (3 - i)) & 1;
        outBars[i].setRatio(bit ? 0.95 : 0.12, bit ? 0x22c55e : 0x334155);
      }
    },
    getLiveReadout: (_e, _s, params) => {
      const d = Math.round(params.dVal ?? 9) & 15;
      const we = (params.we ?? 1) >= 0.5;
      const rst = (params.rst ?? 0) >= 0.5;
      return [
        { label: '输入准备值 D[3:0]', value: `0x${d.toString(16).toUpperCase()} (${d})`, accent: 'sky' },
        { label: '锁存使能状态', value: rst ? 'RST=1 强制清零' : we ? 'WE=1 时钟上升沿更新' : 'WE=0 保持原值', accent: rst ? 'rose' : we ? 'emerald' : 'amber' },
      ];
    },
  };
};

export const buildAlu4BitDiorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const core = buildGateChipHousing(1.25, 0.72, 1.38, 0xf59e0b);
  const opDial = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28),
    makeEmissiveMaterial(0xf59e0b, 1.1)
  );
  opDial.position.set(0, 1.18, 0);

  const barA = buildLevelBar(-1.45, -0.45, 1.35, 0x38bdf8);
  const barB = buildLevelBar(-1.45, 0.45, 1.35, 0xa855f7);
  const barF = buildLevelBar(1.35, -0.25, 1.35, 0x22c55e);
  const coutBeacon = buildLampTower(1.35, 0.35, 0.85, 0xfbbf24);
  const zeroBeacon = buildLampTower(1.35, 0.72, 0.85, 0xf43f5e);
  const track = buildCopperTrack([[-1.3, 0.45, 0], [0, 0.45, 0], [1.25, 0.45, 0]]);
  const stream = buildParticleStream([[-1.2, 0.55, 0], [0, 0.55, 0], [1.2, 0.55, 0]], 10, 0xf59e0b);

  root.add(core, opDial, barA.group, barB.group, barF.group, coutBeacon.group, zeroBeacon.group, track, stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = Math.round(params.valA ?? 6) & 15;
      const b = Math.round(params.valB ?? 6) & 15;
      const op = Math.round(params.op ?? 1) & 3;
      const { result, cout, zero } = evaluateAlu4Bit(a, b, op);

      barA.setRatio(Math.max(0.08, a / 15), 0x38bdf8);
      barB.setRatio(Math.max(0.08, b / 15), 0xa855f7);
      barF.setRatio(Math.max(0.08, result / 15), zero ? 0xfbbf24 : 0x22c55e);
      coutBeacon.setLit(cout === 1, 0xfbbf24, 1.2);
      zeroBeacon.setLit(zero === 1, 0xf43f5e, 1.35);

      opDial.rotation.y = elapsed * 1.2 + op * (Math.PI / 2);
      stream.update(elapsed, 1.9, true, false, zero ? 0xfbbf24 : 0xf59e0b);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = Math.round(params.valA ?? 6) & 15;
      const b = Math.round(params.valB ?? 6) & 15;
      const op = Math.round(params.op ?? 1) & 3;
      const { result, cout, zero, opName } = evaluateAlu4Bit(a, b, op);
      return [
        { label: `指令 ${opName}`, value: `A=${a}, B=${b} → F=${result} (0x${result.toString(16).toUpperCase()})`, accent: 'amber' },
        { label: '标志位 COUT / ZERO', value: `C=${cout} · Z=${zero}`, accent: zero ? 'rose' : 'emerald' },
      ];
    },
  };
};

export const buildRam16x4Diorama: PonderDioramaBuilder = () => {
  const root = buildCreatePedestal();
  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.16, 2.2),
    makeDarkMetalMaterial(0x0f172a)
  );
  basePlate.position.set(0, 0.12, 0);
  root.add(basePlate);

  // 4x4 grid of 16 addressable 4-bit memory towers
  const cells: Array<{ bar: ReturnType<typeof buildLevelBar> }> = [];
  const memState = Array.from({ length: 16 }, (_, idx) => (idx * 3 + 1) & 15);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -0.82 + col * 0.55;
      const z = -0.72 + row * 0.48;
      const bar = buildLevelBar(x, z, 1.05, 0x10b981);
      cells.push({ bar });
      root.add(bar.group);
    }
  }

  const cursorRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 10, 24),
    makeBrassMaterial(0xfbbf24)
  );
  cursorRing.rotation.x = Math.PI / 2;
  cursorRing.position.set(-0.82, 0.35, -0.72);
  root.add(cursorRing);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const addr = Math.round(params.addr ?? 5) & 15;
      const din = Math.round(params.dataIn ?? 11) & 15;
      const we = (params.we ?? 0) >= 0.5;
      if (we) memState[addr] = din;

      const row = Math.floor(addr / 4);
      const col = addr % 4;
      cursorRing.position.set(-0.82 + col * 0.55, 0.36 + 0.05 * Math.sin(elapsed * 5), -0.72 + row * 0.48);

      cells.forEach((cell, idx) => {
        const val = memState[idx] & 15;
        const isTarget = idx === addr;
        cell.bar.setRatio(Math.max(0.08, val / 15), isTarget ? (we ? 0x38bdf8 : 0xfbbf24) : 0x10b981);
      });
    },
    getLiveReadout: (_e, _s, params) => {
      const addr = Math.round(params.addr ?? 5) & 15;
      const din = Math.round(params.dataIn ?? 11) & 15;
      const we = (params.we ?? 0) >= 0.5;
      const q = we ? din : memState[addr];
      return [
        { label: `寻址单元 MEM[0x${addr.toString(16).toUpperCase()}]`, value: `0x${q.toString(16).toUpperCase()} (0b${q.toString(2).padStart(4, '0')})`, accent: 'emerald' },
        { label: '存取模式', value: we ? 'WE=1 同步写入锁定' : 'WE=0 异步高速读出', accent: we ? 'sky' : 'amber' },
      ];
    },
  };
};
