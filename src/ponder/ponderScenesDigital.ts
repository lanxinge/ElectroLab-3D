import * as THREE from 'three';
import {
  buildCopperTrack,
  buildGateChipHousing,
  buildLampTower,
  buildLevelBar,
  buildParticleStream,
  buildSeg7Display3D,
  buildToggleLever,
  buildWaterWheel,
  makeBrassMaterial,
  makeDarkMetalMaterial,
  makeEmissiveMaterial,
  makeGlassMaterial,
} from './ponderPrimitives';
import type { PonderDioramaBuilder } from './ponderTypes';

export const buildLogicInDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // 5V VCC rail pedestal & 0V GND rail pedestal
  const vccPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.95, 0.45),
    makeEmissiveMaterial(0x22c55e, 0.45)
  );
  vccPillar.position.set(-1.1, 0.475, -0.55);
  const gndPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.25, 0.45),
    makeDarkMetalMaterial(0x334155)
  );
  gndPillar.position.set(-1.1, 0.125, 0.55);
  root.add(vccPillar, gndPillar);

  const lever = buildToggleLever(-0.65, 0, 0xfbbf24);
  root.add(lever.group);

  root.add(
    buildCopperTrack(
      [
        [-0.65, 0.25, 0],
        [1.1, 0.25, 0],
      ],
      0.045,
      0xd97706
    )
  );

  const outBeacon = buildLampTower(1.15, 0, 0.9, 0x22c55e);
  root.add(outBeacon.group);

  const vLevel = buildLevelBar(0.25, -0.65, 1.15, 0x22c55e);
  root.add(vLevel.group);

  const stream = buildParticleStream(
    [
      [-0.65, 0.28, 0],
      [1.15, 0.28, 0],
    ],
    8,
    0x34d399,
    0.065
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const state = (params.state ?? 1) >= 0.5;
      lever.setActive(state);
      outBeacon.setLit(state, 0x22c55e, 1.3);
      vLevel.setRatio(state ? 1.0 : 0.04, state ? 0x22c55e : 0x64748b);
      stream.update(elapsed, 1.6, state, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const s = (params.state ?? 1) >= 0.5;
      return [
        { label: '输出布尔逻辑', value: s ? '1 (HIGH +5.0V)' : '0 (LOW 0.0V)', accent: s ? 'emerald' : 'amber' },
      ];
    },
  };
};

export const buildClockDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Left quartz oscillator cavity
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.92, 18),
    makeGlassMaterial(0xc4b5fd, 0.28)
  );
  chamber.position.set(-1.35, 0.55, 0);
  const quartzMat = makeEmissiveMaterial(0xa78bfa, 0.9);
  const quartz = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), quartzMat);
  quartz.position.set(-1.35, 0.58, 0);
  root.add(chamber, quartz);

  // Scrolling 3D square wave pulse train bars
  const blockCount = 16;
  const bars: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  const bGeo = new THREE.BoxGeometry(0.11, 1, 0.22);
  for (let i = 0; i < blockCount; i++) {
    const mat = makeEmissiveMaterial(0x38bdf8, 0.75);
    const mesh = new THREE.Mesh(bGeo, mat);
    mesh.position.set(-0.65 + i * 0.13, 0.5, 0);
    root.add(mesh);
    bars.push({ mesh, mat });
  }

  // Rising-edge detector strobe beacon on right
  const edgeLamp = buildLampTower(1.55, 0, 0.95, 0xfbbf24);
  root.add(edgeLamp.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const f = params.freq ?? 1.0;
      quartz.rotation.y = elapsed * (2 + f * 3);
      const cyclePos = (elapsed * f) % 1;
      const headHigh = cyclePos < 0.5;
      const risingEdgeFlash = cyclePos < 0.12;

      for (let i = 0; i < blockCount; i++) {
        const localPhase = ((elapsed * f - i * 0.085) % 1 + 1) % 1;
        const high = localPhase < 0.5;
        const h = high ? 0.85 : 0.16;
        bars[i].mesh.scale.y = h;
        bars[i].mesh.position.y = 0.14 + h * 0.5;
        bars[i].mat.color.setHex(high ? 0x38bdf8 : 0x334155);
        bars[i].mat.emissive.setHex(high ? 0x38bdf8 : 0x1e293b);
        bars[i].mat.emissiveIntensity = high ? 0.95 : 0.1;
      }

      quartzMat.emissiveIntensity = headHigh ? 1.1 : 0.35;
      edgeLamp.setLit(risingEdgeFlash, 0xfbbf24, 1.7);
    },
    getLiveReadout: (elapsed, _s, params) => {
      const f = params.freq ?? 1.0;
      const high = ((elapsed * f) % 1) < 0.5;
      return [
        { label: '时钟频率 f', value: `${f.toFixed(1)} Hz`, accent: 'violet' },
        { label: '当前电平 CLK', value: high ? '1 (HIGH)' : '0 (LOW)', accent: high ? 'sky' : 'amber' },
      ];
    },
  };
};

export const buildLogicOutDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const vinBar = buildLevelBar(-0.95, 0, 1.35, 0x38bdf8);
  root.add(vinBar.group);

  // 2.5V golden comparator threshold ring around bar
  const threshRing = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.05, 0.46),
    makeEmissiveMaterial(0xfbbf24, 0.9)
  );
  threshRing.position.set(-0.95, 0.08 + 1.35 * 0.5, 0);
  root.add(threshRing);

  root.add(
    buildCopperTrack(
      [
        [-0.75, 0.5, 0],
        [0.85, 0.5, 0],
      ],
      0.045,
      0x94a3b8
    )
  );

  const beacon = buildLampTower(0.95, 0, 1.1, 0x22c55e);
  root.add(beacon.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const v = params.vin ?? 4.5;
      const on = v >= 2.5;
      vinBar.setRatio(v / 5, on ? 0x22c55e : 0xf43f5e);
      beacon.setLit(on, 0x22c55e, 1.45);
    },
    getLiveReadout: (_e, _s, params) => {
      const v = params.vin ?? 4.5;
      const on = v >= 2.5;
      return [
        { label: '采样电压 Vin', value: `${v.toFixed(1)} V`, accent: 'sky' },
        { label: '门限判决结果', value: on ? '逻辑 1 (点亮)' : '逻辑 0 (熄灭)', accent: on ? 'emerald' : 'rose' },
      ];
    },
  };
};

export const buildHexDisplayDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // 4 binary bit LED pillars D3(8), D2(4), D1(2), D0(1)
  const bitLamps = [
    buildLampTower(-1.35, -0.65, 0.72, 0x38bdf8),
    buildLampTower(-1.35, -0.22, 0.62, 0x38bdf8),
    buildLampTower(-1.35, 0.22, 0.52, 0x38bdf8),
    buildLampTower(-1.35, 0.65, 0.42, 0x38bdf8),
  ];
  bitLamps.forEach((l) => root.add(l.group));

  // Bus tracks into central decoder & 3D 7-segment unit
  for (const bz of [-0.65, -0.22, 0.22, 0.65]) {
    root.add(buildCopperTrack([[-1.35, 0.16, bz], [-0.15, 0.16, bz * 0.4]], 0.03, 0x475569));
  }

  const seg7 = buildSeg7Display3D();
  seg7.group.position.set(0.55, 0.05, 0);
  root.add(seg7.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const val = Math.round(params.hexVal ?? 10) & 0xf;
      for (let i = 0; i < 4; i++) {
        const bit = (val >> (3 - i)) & 1;
        bitLamps[i].setLit(bit === 1, 0x38bdf8, 1.2);
      }
      seg7.setDigit(val, 0xf43f5e);
    },
    getLiveReadout: (_e, _s, params) => {
      const val = Math.round(params.hexVal ?? 10) & 0xf;
      return [
        { label: '4-bit 二进制', value: val.toString(2).padStart(4, '0'), accent: 'sky' },
        { label: '译码显示字符', value: `0x${val.toString(16).toUpperCase()} (${val})`, accent: 'rose' },
      ];
    },
  };
};

export const buildAndDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.25, -0.55, 0xfbbf24);
  const swB = buildToggleLever(-1.25, 0.55, 0x38bdf8);
  root.add(swA.group, swB.group);

  root.add(buildGateChipHousing(1.25, 0.42, 0.95, 0x22c55e));

  // Two series drawbridge bars above chip
  const bridgeA = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.22), makeBrassMaterial(0xfbbf24));
  bridgeA.position.set(-0.32, 0.72, 0);
  const bridgeB = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.22), makeBrassMaterial(0x38bdf8));
  bridgeB.position.set(0.32, 0.72, 0);
  root.add(bridgeA, bridgeB);

  const outLamp = buildLampTower(1.35, 0, 0.9, 0x22c55e);
  root.add(outLamp.group);

  const stream = buildParticleStream(
    [
      [-1.4, 0.72, 0],
      [1.35, 0.72, 0],
    ],
    12,
    0x34d399,
    0.065
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 1) >= 0.5;
      const y = a && b;
      swA.setActive(a);
      swB.setActive(b);
      bridgeA.rotation.z += ((a ? 0 : 0.75) - bridgeA.rotation.z) * 0.2;
      bridgeB.rotation.z += ((b ? 0 : 0.75) - bridgeB.rotation.z) * 0.2;
      outLamp.setLit(y, 0x22c55e, 1.35);
      stream.update(elapsed, 1.6, y, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const y = a & b;
      return [{ label: '布尔表达式 A · B', value: `${a} · ${b} = ${y}`, accent: y ? 'emerald' : 'amber' }];
    },
  };
};

export const buildOrDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, -0.75, 0xfbbf24);
  const swB = buildToggleLever(-1.35, 0.75, 0x38bdf8);
  root.add(swA.group, swB.group);

  root.add(
    buildCopperTrack(
      [
        [-1.35, 0.45, -0.75],
        [0.45, 0.45, -0.75],
        [1.25, 0.45, 0],
      ],
      0.04,
      0xd97706
    )
  );
  root.add(
    buildCopperTrack(
      [
        [-1.35, 0.45, 0.75],
        [0.45, 0.45, 0.75],
        [1.25, 0.45, 0],
      ],
      0.04,
      0x3b82f6
    )
  );

  // Parallel bridge gates
  const gateA = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.22), makeBrassMaterial(0xfbbf24));
  gateA.position.set(-0.25, 0.52, -0.75);
  const gateB = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.22), makeBrassMaterial(0x38bdf8));
  gateB.position.set(-0.25, 0.52, 0.75);
  root.add(gateA, gateB);

  const outLamp = buildLampTower(1.35, 0, 0.92, 0x22c55e);
  root.add(outLamp.group);

  const streamA = buildParticleStream(
    [
      [-1.35, 0.48, -0.75],
      [0.45, 0.48, -0.75],
      [1.35, 0.48, 0],
    ],
    8,
    0xfbbf24,
    0.06
  );
  const streamB = buildParticleStream(
    [
      [-1.35, 0.48, 0.75],
      [0.45, 0.48, 0.75],
      [1.35, 0.48, 0],
    ],
    8,
    0x38bdf8,
    0.06
  );
  root.add(streamA.group, streamB.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 0) >= 0.5;
      const y = a || b;
      swA.setActive(a);
      swB.setActive(b);
      gateA.rotation.z += ((a ? 0 : 0.7) - gateA.rotation.z) * 0.2;
      gateB.rotation.z += ((b ? 0 : 0.7) - gateB.rotation.z) * 0.2;
      outLamp.setLit(y, 0x22c55e, 1.35);
      streamA.update(elapsed, 1.5, a, false, 0xfbbf24);
      streamB.update(elapsed, 1.5, b, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 0) >= 0.5 ? 1 : 0;
      const y = a | b;
      return [{ label: '布尔表达式 A + B', value: `${a} + ${b} = ${y}`, accent: y ? 'emerald' : 'rose' }];
    },
  };
};

export const buildNotDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, 0, 0xfbbf24);
  root.add(swA.group);

  // Fulcrum seesaw inverting rocker arm
  const fulcrum = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 4), makeDarkMetalMaterial(0x475569));
  fulcrum.rotation.y = Math.PI / 4;
  fulcrum.position.set(0, 0.275, 0);
  root.add(fulcrum);

  const seesaw = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.12, 0.34),
    makeBrassMaterial(0xa78bfa)
  );
  seesaw.position.set(0, 0.58, 0);
  root.add(seesaw);

  // Inverter bubble ring at output edge
  const bubble = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.05, 12, 24),
    makeEmissiveMaterial(0xf43f5e, 0.8)
  );
  bubble.rotation.y = Math.PI / 2;
  bubble.position.set(0.95, 0.65, 0);
  root.add(bubble);

  const inLamp = buildLampTower(-1.05, -0.75, 0.68, 0xfbbf24);
  const outLamp = buildLampTower(1.35, 0, 0.92, 0x22c55e);
  root.add(inLamp.group, outLamp.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const a = (params.a ?? 0) >= 0.5;
      const y = !a;
      swA.setActive(a);
      inLamp.setLit(a, 0xfbbf24, 1.2);
      outLamp.setLit(y, 0x22c55e, 1.4);
      // When A=1, left pushes down (+0.28 rad tilts left down/right down? let's tilt clearly: +0.28 means left down, right up? In right-handed Z: +rotation.z lifts +x! So -0.28 lifts +x down -> Wait: a=1 => left down, right DOWN! Wait: if left goes UP when A=0, right is UP... let's use two bars: height of right = Y = NOT(A)!)
      seesaw.rotation.z += ((a ? 0.25 : -0.25) - seesaw.rotation.z) * 0.2;
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 0) >= 0.5 ? 1 : 0;
      const y = a ^ 1;
      return [{ label: '逻辑取反 Ā', value: `NOT(${a}) = ${y}`, accent: y ? 'emerald' : 'amber' }];
    },
  };
};

export const buildNandDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, -0.55, 0xfbbf24);
  const swB = buildToggleLever(-1.35, 0.55, 0x38bdf8);
  root.add(swA.group, swB.group);

  root.add(buildGateChipHousing(1.1, 0.42, 0.95, 0x38bdf8));

  // Inner AND intermediate glowing crystal
  const coreMat = makeEmissiveMaterial(0x38bdf8, 0.5);
  const andCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), coreMat);
  andCore.position.set(-0.15, 0.85, 0);
  root.add(andCore);

  // Red output inversion bubble ring
  const bubbleMat = makeEmissiveMaterial(0xf43f5e, 0.9);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), bubbleMat);
  bubble.position.set(0.58, 0.72, 0);
  root.add(bubble);

  const outLamp = buildLampTower(1.35, 0, 0.92, 0x22c55e);
  root.add(outLamp.group);

  const stream = buildParticleStream(
    [
      [0.6, 0.65, 0],
      [1.35, 0.65, 0],
    ],
    7,
    0x34d399,
    0.065
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 1) >= 0.5;
      const mid = a && b;
      const y = !mid;
      swA.setActive(a);
      swB.setActive(b);
      andCore.rotation.y = elapsed * (mid ? 3 : 0.6);
      coreMat.emissiveIntensity = mid ? 1.2 : 0.12;
      bubbleMat.emissiveIntensity = mid ? 1.3 : 0.35;
      outLamp.setLit(y, 0x22c55e, 1.35);
      stream.update(elapsed, 1.5, y, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const y = (a & b) ^ 1;
      return [{ label: '与非运算 (A·B)′', value: `(${a}·${b})′ = ${y}`, accent: y ? 'emerald' : 'rose' }];
    },
  };
};

export const buildNorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, -0.65, 0xfbbf24);
  const swB = buildToggleLever(-1.35, 0.65, 0x38bdf8);
  root.add(swA.group, swB.group);

  root.add(buildGateChipHousing(1.1, 0.42, 0.95, 0xfbbf24));

  // Suppression clamp bar that slams down when A OR B = 1
  const clampBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.28, 0.72),
    makeEmissiveMaterial(0xf43f5e, 0.75)
  );
  clampBar.position.set(0.45, 0.85, 0);
  root.add(clampBar);

  const outLamp = buildLampTower(1.35, 0, 0.92, 0x22c55e);
  root.add(outLamp.group);

  const stream = buildParticleStream(
    [
      [0.65, 0.62, 0],
      [1.35, 0.62, 0],
    ],
    7,
    0x34d399,
    0.065
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 0) >= 0.5;
      const b = (params.b ?? 0) >= 0.5;
      const any = a || b;
      const y = !any;
      swA.setActive(a);
      swB.setActive(b);
      const targetClampY = any ? 0.55 : 1.05;
      clampBar.position.y += (targetClampY - clampBar.position.y) * 0.2;
      outLamp.setLit(y, 0x22c55e, 1.35);
      stream.update(elapsed, 1.5, y, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 0) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 0) >= 0.5 ? 1 : 0;
      const y = (a | b) ^ 1;
      return [{ label: '或非运算 (A+B)′', value: `(${a}+${b})′ = ${y}`, accent: y ? 'emerald' : 'rose' }];
    },
  };
};

export const buildXorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, -0.65, 0xfbbf24);
  const swB = buildToggleLever(-1.35, 0.65, 0x38bdf8);
  root.add(swA.group, swB.group);

  // Counter-rotating differential gears
  const gearA = buildWaterWheel(0.36, 0.16, 0xfbbf24);
  gearA.position.set(-0.35, 0.72, -0.45);
  const gearB = buildWaterWheel(0.36, 0.16, 0x38bdf8);
  gearB.position.set(-0.35, 0.72, 0.45);
  root.add(gearA, gearB);

  // Differential yoke block shifting symmetrically when A !== B
  const yokeMat = makeEmissiveMaterial(0xa78bfa, 0.7);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.62), yokeMat);
  yoke.position.set(0.42, 0.65, 0);
  root.add(yoke);

  const outLamp = buildLampTower(1.35, 0, 0.92, 0xa78bfa);
  root.add(outLamp.group);

  const stream = buildParticleStream(
    [
      [0.42, 0.65, 0],
      [1.35, 0.65, 0],
    ],
    8,
    0xa78bfa,
    0.068
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 0) >= 0.5;
      const y = a !== b;
      swA.setActive(a);
      swB.setActive(b);
      if (a) gearA.rotation.z -= 0.06;
      if (b) gearB.rotation.z += 0.06;
      yoke.position.z += ((a === b ? 0 : a ? -0.35 : 0.35) - yoke.position.z) * 0.18;
      yokeMat.emissiveIntensity = y ? 1.0 : 0.18;
      outLamp.setLit(y, 0xa78bfa, 1.35);
      stream.update(elapsed, 1.5, y, false, 0xa78bfa);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 0) >= 0.5 ? 1 : 0;
      const y = a ^ b;
      return [{ label: '异或运算 A ⊕ B', value: `${a} ⊕ ${b} = ${y}`, accent: y ? 'violet' : 'amber' }];
    },
  };
};

export const buildXnorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.35, -0.6, 0xfbbf24);
  const swB = buildToggleLever(-1.35, 0.6, 0x38bdf8);
  root.add(swA.group, swB.group);

  // Twin vertical alignment key-plates: bolt passes across ONLY when both at same Z-height!
  const plateA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.45), makeBrassMaterial(0xfbbf24));
  plateA.position.set(-0.35, 0.55, -0.32);
  const plateB = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.45), makeBrassMaterial(0x38bdf8));
  plateB.position.set(0.25, 0.55, 0.32);
  root.add(plateA, plateB);

  // Horizontal locking alignment bolt
  const boltMat = makeEmissiveMaterial(0x22c55e, 0.8);
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 14), boltMat);
  bolt.rotation.z = Math.PI / 2;
  bolt.position.set(0.1, 0.7, 0);
  root.add(bolt);

  const outLamp = buildLampTower(1.35, 0, 0.92, 0x22c55e);
  root.add(outLamp.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 1) >= 0.5;
      const match = a === b;
      swA.setActive(a);
      swB.setActive(b);
      plateA.position.y += ((a ? 0.92 : 0.45) - plateA.position.y) * 0.2;
      plateB.position.y += ((b ? 0.92 : 0.45) - plateB.position.y) * 0.2;
      bolt.position.y += ((a ? 0.92 : 0.45) - bolt.position.y) * 0.2;
      bolt.scale.y = match ? 1.0 : 0.35;
      boltMat.color.setHex(match ? 0x22c55e : 0xf43f5e);
      boltMat.emissive.setHex(match ? 0x22c55e : 0xf43f5e);
      outLamp.setLit(match, 0x22c55e, 1.4);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const y = a === b ? 1 : 0;
      return [{ label: '同或相等比较 A ⊙ B', value: `${a} == ${b} → ${y}`, accent: y ? 'emerald' : 'rose' }];
    },
  };
};

export const buildHalfAdderDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.45, -0.55, 0xfbbf24);
  const swB = buildToggleLever(-1.45, 0.55, 0x38bdf8);
  root.add(swA.group, swB.group);

  // Two stacked gate cores: upper XOR (Sum), lower AND (Carry)
  const xorCore = buildGateChipHousing(0.85, 0.32, 0.72, 0xa78bfa);
  xorCore.position.set(0, 0.75, -0.35);
  const andCore = buildGateChipHousing(0.85, 0.32, 0.72, 0xfbbf24);
  andCore.position.set(0, 0.05, 0.42);
  root.add(xorCore, andCore);

  // Two vertical output lamps: Sum (S) and Carry (C)
  const sumLamp = buildLampTower(1.35, -0.45, 0.95, 0xa78bfa);
  const carryLamp = buildLampTower(1.35, 0.55, 0.75, 0xfbbf24);
  root.add(sumLamp.group, carryLamp.group);

  const sumStream = buildParticleStream(
    [
      [0.45, 0.95, -0.35],
      [1.35, 0.95, -0.45],
    ],
    6,
    0xa78bfa,
    0.06
  );
  const carryStream = buildParticleStream(
    [
      [0.45, 0.32, 0.42],
      [1.35, 0.32, 0.55],
    ],
    6,
    0xfbbf24,
    0.06
  );
  root.add(sumStream.group, carryStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5;
      const b = (params.b ?? 1) >= 0.5;
      const s = a !== b;
      const c = a && b;
      swA.setActive(a);
      swB.setActive(b);
      sumLamp.setLit(s, 0xa78bfa, 1.35);
      carryLamp.setLit(c, 0xfbbf24, 1.35);
      sumStream.update(elapsed, 1.5, s, false, 0xa78bfa);
      carryStream.update(elapsed, 1.5, c, false, 0xfbbf24);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const s = a ^ b;
      const c = a & b;
      return [{ label: '半加结果 (C, S)', value: `${a} + ${b} = ${c}${s}₂ (${a + b})`, accent: 'violet' }];
    },
  };
};

export const buildFullAdderDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swA = buildToggleLever(-1.55, -0.75, 0xfbbf24);
  const swB = buildToggleLever(-1.55, 0.0, 0x38bdf8);
  const swCin = buildToggleLever(-1.55, 0.75, 0x34d399);
  root.add(swA.group, swB.group, swCin.group);

  // Two cascaded half-adders + OR consolidator
  const ha1 = buildGateChipHousing(0.72, 0.34, 0.75, 0x38bdf8);
  ha1.position.set(-0.55, 0.15, -0.35);
  const ha2 = buildGateChipHousing(0.72, 0.34, 0.75, 0xa78bfa);
  ha2.position.set(0.38, 0.15, -0.35);
  const orBlock = buildGateChipHousing(0.65, 0.28, 0.58, 0xfbbf24);
  orBlock.position.set(0.38, 0.02, 0.65);
  root.add(ha1, ha2, orBlock);

  const sumLamp = buildLampTower(1.45, -0.45, 0.98, 0xa78bfa);
  const coutLamp = buildLampTower(1.45, 0.55, 0.98, 0xfbbf24);
  root.add(sumLamp.group, coutLamp.group);

  const sStream = buildParticleStream(
    [
      [-0.2, 0.45, -0.35],
      [0.4, 0.45, -0.35],
      [1.45, 0.45, -0.45],
    ],
    9,
    0xa78bfa,
    0.058
  );
  const cStream = buildParticleStream(
    [
      [0.4, 0.25, 0.65],
      [1.45, 0.25, 0.55],
    ],
    7,
    0xfbbf24,
    0.058
  );
  root.add(sStream.group, cStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const cin = (params.cin ?? 1) >= 0.5 ? 1 : 0;
      const sum = a + b + cin;
      const sBit = (sum & 1) === 1;
      const cBit = sum >= 2;
      swA.setActive(a === 1);
      swB.setActive(b === 1);
      swCin.setActive(cin === 1);
      sumLamp.setLit(sBit, 0xa78bfa, 1.35);
      coutLamp.setLit(cBit, 0xfbbf24, 1.35);
      sStream.update(elapsed, 1.5, sBit, false, 0xa78bfa);
      cStream.update(elapsed, 1.5, cBit, false, 0xfbbf24);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = (params.a ?? 1) >= 0.5 ? 1 : 0;
      const b = (params.b ?? 1) >= 0.5 ? 1 : 0;
      const cin = (params.cin ?? 1) >= 0.5 ? 1 : 0;
      const tot = a + b + cin;
      const cout = tot >= 2 ? 1 : 0;
      const s = tot & 1;
      return [{ label: '三输入全加器输出', value: `${a}+${b}+${cin} = ${cout}${s}₂ (${tot})`, accent: 'emerald' }];
    },
  };
};

export const buildDFlipFlopDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const swD = buildToggleLever(-1.35, -0.55, 0x38bdf8);
  const swClk = buildToggleLever(-1.35, 0.55, 0xfbbf24);
  root.add(swD.group, swClk.group);

  // Preview input chamber showing live D regardless of CLK
  const dPreview = buildLampTower(-0.65, -0.55, 0.65, 0x38bdf8);
  root.add(dPreview.group);

  // Heavy mechanical rising-edge camera shutter gate at x = 0
  const shutterFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 1.2, 1.4),
    makeDarkMetalMaterial(0x1e293b)
  );
  shutterFrame.position.set(0, 0.6, 0);
  const shutterBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.95, 1.15),
    makeEmissiveMaterial(0xfbbf24, 0.6)
  );
  shutterBlade.position.set(0, 0.55, 0);
  root.add(shutterFrame, shutterBlade);

  // Latched memory lamps: Q and Q_bar
  const qLamp = buildLampTower(1.2, -0.45, 0.95, 0x22c55e);
  const qBarLamp = buildLampTower(1.2, 0.55, 0.72, 0xf43f5e);
  root.add(qLamp.group, qBarLamp.group);

  // Edge-triggered memory state preserved inside closure
  let prevClk = 0;
  let latchedQ = 1;
  let flashTimer = 0;

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const d = (params.d ?? 1) >= 0.5 ? 1 : 0;
      const clk = (params.clk ?? 0) >= 0.5 ? 1 : 0;

      // Capture D ONLY on 0 -> 1 rising clock edge!
      if (prevClk === 0 && clk === 1) {
        latchedQ = d;
        flashTimer = elapsed + 0.45;
      }
      prevClk = clk;

      swD.setActive(d === 1);
      swClk.setActive(clk === 1);
      dPreview.setLit(d === 1, 0x38bdf8, 1.2);

      const opening = elapsed < flashTimer;
      const targetY = opening ? 1.15 : 0.52;
      shutterBlade.position.y += (targetY - shutterBlade.position.y) * 0.3;

      qLamp.setLit(latchedQ === 1, 0x22c55e, 1.35);
      qBarLamp.setLit(latchedQ === 0, 0xf43f5e, 1.1);
    },
    getLiveReadout: () => {
      return [
        { label: '已锁存记忆输出 Q', value: `Q = ${latchedQ}  /  Q̄ = ${latchedQ ^ 1}`, accent: latchedQ ? 'emerald' : 'rose' },
      ];
    },
  };
};
