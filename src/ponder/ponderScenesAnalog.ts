import * as THREE from 'three';
import { computeResistorBandColors } from '../sim3d/meshes';
import {
  buildCopperTrack,
  buildLampTower,
  buildLevelBar,
  buildParticleStream,
  buildPipeSegment,
  buildTerminalPost,
  buildWaterWheel,
  makeBrassMaterial,
  makeDarkMetalMaterial,
  makeEmissiveMaterial,
  makeGlassMaterial,
} from './ponderPrimitives';
import type { PonderDioramaBuilder } from './ponderTypes';

export const buildDcSourceDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Voltage lift shaft on the left
  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.14, 1.3),
    makeDarkMetalMaterial(0x0f172a)
  );
  basePlate.position.set(-1.1, 0.07, 0);
  root.add(basePlate);

  const highPlatformMat = makeEmissiveMaterial(0xef4444, 0.35);
  const highPlatform = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.05), highPlatformMat);
  highPlatform.position.set(-1.1, 1.0, 0);
  root.add(highPlatform);

  const shaftGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 1.45, 18),
    makeGlassMaterial(0x7dd3fc, 0.22)
  );
  shaftGlass.position.set(-1.1, 0.8, 0);
  root.add(shaftGlass);

  // Charge pump wheel inside base
  const pumpWheel = buildWaterWheel(0.34, 0.2, 0x38bdf8);
  pumpWheel.position.set(-1.1, 0.45, 0);
  root.add(pumpWheel);

  // External copper loop + resistor load on the right
  root.add(
    buildCopperTrack(
      [
        [-1.1, 1.15, 0],
        [1.15, 1.15, 0],
        [1.15, 0.24, 0],
        [-1.1, 0.24, 0],
      ],
      0.045,
      0xd97706
    )
  );

  // Right load resistor block
  const loadBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.72, 0.55),
    makeBrassMaterial(0xf59e0b)
  );
  loadBlock.position.set(1.15, 0.7, 0);
  root.add(loadBlock);

  const levelBar = buildLevelBar(-1.75, 0.55, 1.35, 0xf87171);
  root.add(levelBar.group);

  const stream = buildParticleStream(
    [
      [-1.1, 0.24, 0],
      [-1.1, 1.15, 0],
      [1.15, 1.15, 0],
      [1.15, 0.24, 0],
      [-1.1, 0.24, 0],
    ],
    16,
    0x38bdf8,
    0.075
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _step, _p, params) => {
      const v = params.voltage ?? 5;
      const ratio = Math.min(1, Math.max(0.12, v / 12));
      highPlatform.position.y = 0.35 + ratio * 0.95;
      pumpWheel.rotation.z -= 0.04 * (0.5 + ratio * 1.6);
      levelBar.setRatio(ratio, 0x38bdf8);
      stream.update(elapsed, 0.6 + ratio * 1.9, true, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const v = params.voltage ?? 5;
      const iMa = (v / 220) * 1000;
      return [
        { label: '输出电压 Vdc', value: `${v.toFixed(1)} V`, accent: 'sky' },
        { label: '负载电流 I', value: `${iMa.toFixed(1)} mA`, accent: 'emerald' },
      ];
    },
  };
};

export const buildAcSourceDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Left rotating phasor disc + arm
  const stator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.72, 0.14, 24),
    makeDarkMetalMaterial(0x1e293b)
  );
  stator.rotation.x = Math.PI / 2;
  stator.position.set(-1.15, 0.85, -0.2);
  root.add(stator);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.035, 10, 28),
    makeBrassMaterial(0xf59e0b)
  );
  ring.position.set(-1.15, 0.85, -0.1);
  root.add(ring);

  const rotorArm = new THREE.Group();
  rotorArm.position.set(-1.15, 0.85, -0.05);
  const armBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.06, 0.06),
    makeEmissiveMaterial(0x38bdf8, 0.8)
  );
  armBar.position.x = 0.26;
  const tipBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 12),
    makeEmissiveMaterial(0xfbbf24, 1.0)
  );
  tipBall.position.x = 0.54;
  rotorArm.add(armBar, tipBall);
  root.add(rotorArm);

  const pedestalStanchion = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.85, 0.24),
    makeDarkMetalMaterial(0x0f172a)
  );
  pedestalStanchion.position.set(-1.15, 0.425, -0.2);
  root.add(pedestalStanchion);

  // Right 3D live sine waveform bars
  const zeroAxis = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.035, 0.18),
    makeDarkMetalMaterial(0x475569)
  );
  zeroAxis.position.set(0.65, 0.85, 0);
  root.add(zeroAxis);

  const barCount = 18;
  const waveBars: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  const barGeo = new THREE.BoxGeometry(0.085, 1, 0.16);
  for (let i = 0; i < barCount; i++) {
    const mat = makeEmissiveMaterial(0x38bdf8, 0.7);
    const mesh = new THREE.Mesh(barGeo, mat);
    mesh.position.set(-0.35 + i * 0.125, 0.85, 0);
    root.add(mesh);
    waveBars.push({ mesh, mat });
  }

  // Alternating charge track at bottom
  root.add(buildTerminalPost(-1.5, 0.8, 0xf59e0b, 0.35));
  root.add(buildTerminalPost(1.5, 0.8, 0x38bdf8, 0.35));
  const stream = buildParticleStream(
    [
      [-1.5, 0.44, 0.8],
      [1.5, 0.44, 0.8],
    ],
    10,
    0xa78bfa,
    0.075
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const f = params.freq ?? 1.0;
      const omega = f * 2.6;
      const angle = elapsed * omega;
      rotorArm.rotation.z = angle;

      for (let i = 0; i < barCount; i++) {
        const phase = angle - i * 0.32;
        const val = Math.sin(phase);
        const h = Math.max(0.06, Math.abs(val) * 0.62);
        const b = waveBars[i];
        b.mesh.scale.y = h;
        b.mesh.position.y = 0.85 + (val >= 0 ? h * 0.5 : -h * 0.5);
        const col = val >= 0 ? 0xf87171 : 0x38bdf8;
        b.mat.color.setHex(col);
        b.mat.emissive.setHex(col);
      }

      const instSin = Math.sin(angle);
      const rev = instSin < 0;
      stream.update(elapsed, Math.max(0.15, Math.abs(instSin) * 1.9), true, rev, rev ? 0x38bdf8 : 0xf87171);
    },
    getLiveReadout: (elapsed, _s, params) => {
      const f = params.freq ?? 1.0;
      const inst = 5 * Math.sin(elapsed * f * 2.6);
      return [
        { label: '瞬时电压 v(t)', value: `${inst >= 0 ? '+' : ''}${inst.toFixed(2)} V`, accent: inst >= 0 ? 'rose' : 'sky' },
        { label: '有效值 Vrms', value: `${(5 / Math.SQRT2).toFixed(2)} V`, accent: 'violet' },
      ];
    },
  };
};

export const buildCurrentSourceDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Left constant-rate metered waterwheel
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.9, 0.72),
    makeDarkMetalMaterial(0x1e293b)
  );
  housing.position.set(-1.15, 0.45, 0);
  root.add(housing);

  const wheel = buildWaterWheel(0.42, 0.3, 0x10b981);
  wheel.position.set(-1.15, 0.85, 0.12);
  root.add(wheel);

  // Pipe loop
  root.add(
    buildCopperTrack(
      [
        [-1.15, 1.05, 0],
        [1.15, 1.05, 0],
        [1.15, 0.24, 0],
        [-1.15, 0.24, 0],
      ],
      0.045,
      0x059669
    )
  );

  // Adaptive pressure level bar in middle
  const voltageColumn = buildLevelBar(0, -0.45, 1.4, 0xf59e0b);
  root.add(voltageColumn.group);

  // Adjustable throttle gate on right
  const gateLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.45), makeBrassMaterial(0xb45309));
  const gateRight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.45), makeBrassMaterial(0xb45309));
  gateLeft.position.set(1.0, 0.65, 0);
  gateRight.position.set(1.3, 0.65, 0);
  root.add(gateLeft, gateRight);

  const stream = buildParticleStream(
    [
      [-1.15, 0.24, 0],
      [-1.15, 1.05, 0],
      [1.15, 1.05, 0],
      [1.15, 0.24, 0],
      [-1.15, 0.24, 0],
    ],
    14,
    0x34d399,
    0.075
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ratio = params.loadRatio ?? 1.0;
      wheel.rotation.z = -elapsed * 2.0; // strictly constant!
      voltageColumn.setRatio(Math.min(1, ratio / 2.0), ratio > 1.6 ? 0xef4444 : 0xf59e0b);
      const pinch = 0.08 + (ratio - 0.3) * 0.06;
      gateLeft.position.x = 1.15 - pinch;
      gateRight.position.x = 1.15 + pinch;
      stream.update(elapsed, 1.4, true, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const r = params.loadRatio ?? 1.0;
      const vOut = 2.5 * r;
      return [
        { label: '恒定电流 Is', value: '10.0 mA', accent: 'emerald' },
        { label: '自适应端压 V', value: `${vOut.toFixed(2)} V`, accent: r > 1.6 ? 'rose' : 'amber' },
      ];
    },
  };
};

export const buildGroundDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  const seaGroup = new THREE.Group();
  root.add(seaGroup);

  const busbarMat = makeEmissiveMaterial(0x10b981, 0.45);
  const busbar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.6), busbarMat);
  busbar.position.y = 0.07;
  seaGroup.add(busbar);

  // Classic 3-tier ground copper forks under busbar side
  for (let i = 0; i < 3; i++) {
    const w = 1.1 - i * 0.32;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, 0.18),
      makeBrassMaterial(0x34d399)
    );
    plate.position.set(0, 0.25 + (2 - i) * 0.14, 0.9);
    seaGroup.add(plate);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12), makeBrassMaterial(0x34d399));
  stem.position.set(0, 0.58, 0.9);
  seaGroup.add(stem);

  // Node reference potential towers rising from sea level
  const towers = [
    { x: -1.1, h: 1.25, color: 0xf87171 },
    { x: 0.0, h: 0.85, color: 0x38bdf8 },
    { x: 1.1, h: 0.55, color: 0xfbbf24 },
  ];
  const towerBars = towers.map((t) => {
    const bar = buildLevelBar(t.x, -0.25, 1.35, t.color);
    seaGroup.add(bar.group);
    return { bar, targetRatio: t.h / 1.35, color: t.color };
  });

  // Drain loop particles
  const stream = buildParticleStream(
    [
      [-1.1, 0.95, 0.3],
      [0, 0.16, 0.3],
      [1.1, 0.55, 0.3],
      [0, 0.16, 0.3],
    ],
    10,
    0x34d399,
    0.065
  );
  seaGroup.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ok = (params.connected ?? 1) >= 0.5;
      if (ok) {
        seaGroup.position.y = 0;
        seaGroup.rotation.z = 0;
        busbarMat.color.setHex(0x10b981);
        busbarMat.emissive.setHex(0x10b981);
        towerBars.forEach((t) => t.bar.setRatio(t.targetRatio, t.color));
      } else {
        // Floating unstable drift animation
        seaGroup.position.y = 0.28 + Math.sin(elapsed * 2.5) * 0.12;
        seaGroup.rotation.z = Math.sin(elapsed * 1.9) * 0.08;
        busbarMat.color.setHex(0xf59e0b);
        busbarMat.emissive.setHex(0xf59e0b);
        towerBars.forEach((t, idx) =>
          t.bar.setRatio(0.4 + 0.35 * Math.sin(elapsed * 2 + idx), 0xf59e0b)
        );
      }
      stream.update(elapsed, ok ? 1.1 : 0.2, ok, false, ok ? 0x34d399 : 0xf59e0b);
    },
    getLiveReadout: (_e, _s, params) => {
      const ok = (params.connected ?? 1) >= 0.5;
      return [
        { label: 'GND 参考基准', value: ok ? '0.000 V (锁定)' : '浮空飘移!', accent: ok ? 'emerald' : 'amber' },
      ];
    },
  };
};

export const buildResistorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  root.add(buildTerminalPost(-1.55, 0, 0xd97706, 0.52));
  root.add(buildTerminalPost(1.55, 0, 0xd97706, 0.52));
  root.add(buildPipeSegment(new THREE.Vector3(-1.55, 0.58, 0), new THREE.Vector3(1.55, 0.58, 0), 0.055, 0xcbd5e1));

  // Semi-transparent ceramic cylinder housing
  const bodyGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.85, 24),
    makeGlassMaterial(0xfef3c7, 0.28)
  );
  bodyGlass.rotation.z = Math.PI / 2;
  bodyGlass.position.set(0, 0.58, 0);
  root.add(bodyGlass);

  // End ceramic caps
  const capMat = makeDarkMetalMaterial(0x78350f);
  for (const sx of [-0.92, 0.92]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 22), capMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx, 0.58, 0);
    root.add(cap);
  }

  // 4 IEC color rings
  const bandMats: THREE.MeshStandardMaterial[] = [];
  const bandXs = [-0.55, -0.22, 0.12, 0.52];
  for (let i = 0; i < 4; i++) {
    const bMat = makeEmissiveMaterial(0x7c2d12, 0.22);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.11, 24, 1, true), bMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(bandXs[i], 0.58, 0);
    root.add(band);
    bandMats.push(bMat);
  }

  // Internal atomic lattice posts + glowing thermal core
  const heatCoreMat = makeEmissiveMaterial(0xf97316, 0.1);
  const heatCore = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.65, 16), heatCoreMat);
  heatCore.rotation.z = Math.PI / 2;
  heatCore.position.set(0, 0.58, 0);
  root.add(heatCore);

  const latticeNodes: THREE.Mesh[] = [];
  const lGeo = new THREE.SphereGeometry(0.065, 10, 8);
  const lMat = makeBrassMaterial(0xfbbf24);
  for (let x = -0.6; x <= 0.61; x += 0.3) {
    for (const zOff of [-0.18, 0.18]) {
      const m = new THREE.Mesh(lGeo, lMat);
      m.position.set(x, 0.58, zOff);
      root.add(m);
      latticeNodes.push(m);
    }
  }

  const stream = buildParticleStream(
    [
      [-1.55, 0.58, 0],
      [-0.7, 0.58, 0.08],
      [-0.2, 0.58, -0.1],
      [0.25, 0.58, 0.1],
      [0.7, 0.58, -0.08],
      [1.55, 0.58, 0],
    ],
    14,
    0x38bdf8,
    0.065
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ohms = params.ohms ?? 220;
      const colors = computeResistorBandColors(ohms);
      for (let i = 0; i < 4; i++) {
        bandMats[i].color.setHex(colors[i]);
        bandMats[i].emissive.setHex(colors[i]);
      }
      // At 5V: P = 25 / ohms, I = 5 / ohms
      const heatRatio = Math.min(1, 150 / Math.max(30, ohms));
      heatCoreMat.emissiveIntensity = 0.08 + heatRatio * (0.9 + 0.25 * Math.sin(elapsed * 8));
      heatCoreMat.color.setHex(heatRatio > 0.65 ? 0xef4444 : 0xf97316);
      heatCoreMat.emissive.setHex(heatRatio > 0.65 ? 0xef4444 : 0xf97316);

      latticeNodes.forEach((n, idx) => {
        n.position.y = 0.58 + Math.sin(elapsed * (6 + heatRatio * 14) + idx) * (0.015 + heatRatio * 0.035);
      });

      const flowSpeed = 0.4 + (220 / Math.max(50, ohms)) * 1.1;
      stream.update(elapsed, flowSpeed, true, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const r = params.ohms ?? 220;
      const iMa = (5 / r) * 1000;
      const powerMw = (25 / r) * 1000;
      return [
        { label: '电流 I (@5V)', value: `${iMa.toFixed(1)} mA`, accent: 'sky' },
        { label: '热功耗 P = V²/R', value: `${powerMw.toFixed(0)} mW`, accent: powerMw > 250 ? 'rose' : 'amber' },
      ];
    },
  };
};

export const buildPotentiometerDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Circular pedestal housing
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.02, 0.16, 28),
    makeDarkMetalMaterial(0x1e293b)
  );
  disc.position.set(-0.2, 0.08, 0);
  root.add(disc);

  // Carbon resistive arc (approx 240 deg)
  const arcTrack = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.1, 12, 32, Math.PI * 1.45),
    makeDarkMetalMaterial(0x475569)
  );
  arcTrack.rotation.x = Math.PI / 2;
  arcTrack.rotation.z = Math.PI * 0.78;
  arcTrack.position.set(-0.2, 0.22, 0);
  root.add(arcTrack);

  // Rotating brass wiper shaft & blade
  const wiperGroup = new THREE.Group();
  wiperGroup.position.set(-0.2, 0.25, 0);
  const centerHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, 0.34, 18),
    makeBrassMaterial(0xd97706)
  );
  centerHub.position.y = 0.17;
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.07, 0.12),
    makeEmissiveMaterial(0xfbbf24, 0.45)
  );
  blade.position.set(0.36, 0.16, 0);
  const contactShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.16),
    makeEmissiveMaterial(0x38bdf8, 0.8)
  );
  contactShoe.position.set(0.68, 0.08, 0);
  wiperGroup.add(centerHub, blade, contactShoe);
  root.add(wiperGroup);

  // Comparison level bars on the right
  const rTopBar = buildLevelBar(1.15, -0.5, 1.25, 0xf59e0b);
  const vOutBar = buildLevelBar(1.55, 0.35, 1.25, 0x38bdf8);
  root.add(rTopBar.group, vOutBar.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const alpha = params.wiper ?? 0.5;
      // Rotate across 240 deg arc
      wiperGroup.rotation.y = -Math.PI * 0.65 + alpha * Math.PI * 1.3;
      rTopBar.setRatio(alpha, 0xf59e0b);
      vOutBar.setRatio(1 - alpha, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const a = params.wiper ?? 0.5;
      const vOut = 5 * (1 - a);
      return [
        { label: '抽头分压比', value: `${Math.round((1 - a) * 100)}%`, accent: 'amber' },
        { label: '空载输出 V_W', value: `${vOut.toFixed(2)} V`, accent: 'sky' },
      ];
    },
  };
};

export const buildCapacitorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Twin parallel copper plates (horizontal)
  const plateGeo = new THREE.BoxGeometry(1.45, 0.1, 1.15);
  const topPlate = new THREE.Mesh(plateGeo, makeBrassMaterial(0xea580c));
  topPlate.position.set(0, 1.02, 0);
  const botPlate = new THREE.Mesh(plateGeo, makeBrassMaterial(0x2563eb));
  botPlate.position.set(0, 0.42, 0);
  root.add(topPlate, botPlate);

  // Dielectric translucent core
  const dielectric = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.48, 1.06),
    makeGlassMaterial(0xfef08a, 0.25)
  );
  dielectric.position.set(0, 0.72, 0);
  root.add(dielectric);

  // Electric field vector arrows between plates
  const fieldArrows: { group: THREE.Group; mat: THREE.MeshStandardMaterial }[] = [];
  for (const fx of [-0.42, 0, 0.42]) {
    const fg = new THREE.Group();
    const fMat = makeEmissiveMaterial(0xfbbf24, 0.7);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10), fMat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 10), fMat);
    head.position.y = -0.18;
    head.rotation.x = Math.PI;
    fg.add(shaft, head);
    fg.position.set(fx, 0.72, 0.25);
    root.add(fg);
    fieldArrows.push({ group: fg, mat: fMat });
  }

  // External leads & particle streams
  root.add(
    buildCopperTrack(
      [
        [-1.65, 0.25, 0],
        [-1.65, 1.02, 0],
        [-0.72, 1.02, 0],
      ],
      0.04,
      0xd97706
    )
  );
  root.add(
    buildCopperTrack(
      [
        [0.72, 0.42, 0],
        [1.65, 0.42, 0],
        [1.65, 0.25, 0],
      ],
      0.04,
      0x3b82f6
    )
  );

  const chargeBar = buildLevelBar(1.65, -0.75, 1.2, 0x38bdf8);
  root.add(chargeBar.group);

  const streamLeft = buildParticleStream(
    [
      [-1.65, 0.25, 0],
      [-1.65, 1.02, 0],
      [-0.72, 1.02, 0],
    ],
    7,
    0xf87171,
    0.065
  );
  const streamRight = buildParticleStream(
    [
      [0.72, 0.42, 0],
      [1.65, 0.42, 0],
      [1.65, 0.25, 0],
    ],
    7,
    0x38bdf8,
    0.065
  );
  root.add(streamLeft.group, streamRight.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const acMode = (params.acMode ?? 0) >= 0.5;
      if (acMode) {
        const wave = Math.sin(elapsed * 2.8);
        const mag = Math.max(0.15, Math.abs(wave));
        chargeBar.setRatio((wave + 1) * 0.5, wave >= 0 ? 0xf87171 : 0x38bdf8);
        fieldArrows.forEach((fa) => {
          fa.group.scale.y = (wave >= 0 ? 1 : -1) * (0.4 + 0.6 * mag);
          const col = wave >= 0 ? 0xfbbf24 : 0x38bdf8;
          fa.mat.color.setHex(col);
          fa.mat.emissive.setHex(col);
        });
        const cosFlow = Math.cos(elapsed * 2.8);
        streamLeft.update(elapsed, 1.6 * Math.abs(cosFlow), true, cosFlow < 0, 0xf87171);
        streamRight.update(elapsed, 1.6 * Math.abs(cosFlow), true, cosFlow < 0, 0x38bdf8);
      } else {
        // Cyclic 4s DC charge -> saturated -> reset showcase
        const cycle = (elapsed % 4.0) / 4.0;
        const vc = 1 - Math.exp(-cycle * 5.2);
        const iFlow = Math.exp(-cycle * 5.2);
        chargeBar.setRatio(vc, 0x38bdf8);
        fieldArrows.forEach((fa) => {
          fa.group.scale.y = 0.2 + vc * 0.85;
          fa.mat.color.setHex(0xfbbf24);
          fa.mat.emissive.setHex(0xfbbf24);
        });
        const moving = iFlow > 0.08;
        streamLeft.update(elapsed, moving ? 2.2 * iFlow : 0, moving, false, 0xf87171);
        streamRight.update(elapsed, moving ? 2.2 * iFlow : 0, moving, false, 0x38bdf8);
      }
    },
    getLiveReadout: (elapsed, _s, params) => {
      const ac = (params.acMode ?? 0) >= 0.5;
      if (ac) {
        return [
          { label: '交流模式', value: '位移电流持续畅通', accent: 'emerald' },
          { label: '容抗 Xc', value: '随 f 升高而降低', accent: 'sky' },
        ];
      }
      const cycle = (elapsed % 4.0) / 4.0;
      const vc = 5 * (1 - Math.exp(-cycle * 5.2));
      return [
        { label: '极板压差 Vc', value: `${vc.toFixed(2)} V`, accent: 'amber' },
        { label: '稳态电流', value: vc > 4.7 ? '0.0 mA (隔直)' : '正在充电...', accent: vc > 4.7 ? 'rose' : 'emerald' },
      ];
    },
  };
};

export const buildInductorDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Iron core cylinder + brass cradle
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 2.1, 18),
    makeDarkMetalMaterial(0x334155)
  );
  core.rotation.z = Math.PI / 2;
  core.position.set(0, 0.58, 0);
  root.add(core);

  // 7 helical copper turns
  for (let i = -3; i <= 3; i++) {
    const turn = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.065, 12, 24),
      makeBrassMaterial(0xd97706)
    );
    turn.rotation.y = Math.PI / 2;
    turn.position.set(i * 0.24, 0.58, 0);
    root.add(turn);
  }

  // Concentric magnetic flux rings around coil
  const fluxRings: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  for (let i = 0; i < 3; i++) {
    const fMat = makeEmissiveMaterial(0x38bdf8, 0.65);
    const fRing = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.18, 0.025, 10, 28), fMat);
    fRing.rotation.y = Math.PI / 2;
    fRing.position.set((i - 1) * 0.36, 0.58, 0);
    root.add(fRing);
    fluxRings.push({ mesh: fRing, mat: fMat });
  }

  // Mechanical flywheel symbolizing current inertia (I cannot jump abruptly)
  const flywheel = buildWaterWheel(0.42, 0.18, 0x38bdf8);
  flywheel.position.set(0, 1.32, -0.55);
  root.add(flywheel);

  // Back-EMF opposing flash barrier
  const lenzWallMat = makeEmissiveMaterial(0xf43f5e, 0.0);
  const lenzWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.85), lenzWallMat);
  lenzWall.position.set(1.15, 0.58, 0);
  root.add(lenzWall);

  root.add(buildTerminalPost(-1.55, 0, 0xd97706, 0.52));
  root.add(buildTerminalPost(1.55, 0, 0xd97706, 0.52));
  const stream = buildParticleStream(
    [
      [-1.55, 0.58, 0],
      [1.55, 0.58, 0],
    ],
    12,
    0x38bdf8,
    0.068
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const highFreq = (params.highFreq ?? 0) >= 0.5;
      if (highFreq) {
        // Rapid alternating excitation blocked by strong Lenz back-EMF
        const pulse = Math.abs(Math.sin(elapsed * 8.0));
        flywheel.rotation.z = Math.sin(elapsed * 8.0) * 0.2;
        lenzWall.visible = true;
        lenzWallMat.emissiveIntensity = 0.4 + pulse * 0.9;
        fluxRings.forEach((r, idx) => {
          r.mesh.scale.setScalar(0.85 + 0.15 * Math.sin(elapsed * 8 + idx));
          r.mat.color.setHex(0xf43f5e);
          r.mat.emissive.setHex(0xf43f5e);
        });
        stream.update(elapsed, 0.35, true, Math.sin(elapsed * 8) < 0, 0xf43f5e);
      } else {
        // Steady DC current: magnetic flywheel spins steadily, zero resistance!
        flywheel.rotation.z = -elapsed * 2.6;
        lenzWall.visible = false;
        fluxRings.forEach((r, idx) => {
          r.mesh.scale.setScalar(1.0 + 0.08 * Math.sin(elapsed * 3 + idx));
          r.mat.color.setHex(0x38bdf8);
          r.mat.emissive.setHex(0x38bdf8);
        });
        stream.update(elapsed, 1.8, true, false, 0x38bdf8);
      }
    },
    getLiveReadout: (_e, _s, params) => {
      const hf = (params.highFreq ?? 0) >= 0.5;
      return [
        { label: '感抗 X_L = 2πfL', value: hf ? '极高阻 (抑制高频)' : '≈ 0 Ω (直流短路)', accent: hf ? 'rose' : 'emerald' },
      ];
    },
  };
};

export const buildSwitchSpstDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  root.add(buildTerminalPost(-1.35, 0, 0xd97706, 0.45));
  root.add(buildTerminalPost(-0.55, 0, 0xf59e0b, 0.45));
  root.add(buildTerminalPost(0.55, 0, 0xf59e0b, 0.45));

  // Pivoting brass knife blade
  const knifePivot = new THREE.Group();
  knifePivot.position.set(-0.55, 0.5, 0);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.08, 0.14),
    makeBrassMaterial(0xfbbf24)
  );
  blade.position.x = 0.58;
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12),
    makeDarkMetalMaterial(0x991b1b)
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(1.22, 0.04, 0);
  knifePivot.add(blade, handle);
  root.add(knifePivot);

  // Gap voltage indicator crystal
  const gapCrystalMat = makeEmissiveMaterial(0x38bdf8, 0.1);
  const gapCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), gapCrystalMat);
  gapCrystal.position.set(0.45, 0.52, -0.55);
  root.add(gapCrystal);

  // Output lamp
  const lamp = buildLampTower(1.45, 0, 0.82, 0xfde047);
  root.add(lamp.group);

  root.add(
    buildCopperTrack(
      [
        [-1.35, 0.45, 0],
        [-0.55, 0.45, 0],
      ],
      0.045,
      0xd97706
    )
  );
  root.add(
    buildCopperTrack(
      [
        [0.55, 0.45, 0],
        [1.45, 0.45, 0],
      ],
      0.045,
      0xd97706
    )
  );

  const stream = buildParticleStream(
    [
      [-1.35, 0.48, 0],
      [-0.55, 0.48, 0],
      [0.55, 0.48, 0],
      [1.45, 0.48, 0],
    ],
    12,
    0x38bdf8,
    0.068
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const closed = (params.closed ?? 1) >= 0.5;
      const targetRot = closed ? 0 : 0.72;
      knifePivot.rotation.z += (targetRot - knifePivot.rotation.z) * 0.18;
      lamp.setLit(closed, 0xfde047, 1.3);
      gapCrystal.visible = !closed;
      gapCrystal.rotation.y = elapsed * 2;
      gapCrystalMat.emissiveIntensity = !closed ? 0.8 + 0.4 * Math.sin(elapsed * 4) : 0;
      stream.update(elapsed, 1.6, closed, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const closed = (params.closed ?? 1) >= 0.5;
      return [
        { label: '开关压降 V_sw', value: closed ? '0.00 V (导通)' : '5.00 V (断开耐压)', accent: closed ? 'emerald' : 'amber' },
      ];
    },
  };
};

export const buildSwitchSpdtDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  root.add(buildTerminalPost(-1.25, 0, 0xfbbf24, 0.45));
  root.add(buildTerminalPost(0.35, -0.75, 0xf59e0b, 0.45));
  root.add(buildTerminalPost(0.35, 0.75, 0x38bdf8, 0.45));

  // Slewing railway blade pivoting horizontally around COM (-1.05, 0.48, 0)
  const slewPivot = new THREE.Group();
  slewPivot.position.set(-1.25, 0.48, 0);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.08, 0.14),
    makeBrassMaterial(0xfbbf24)
  );
  arm.position.x = 0.86;
  slewPivot.add(arm);
  root.add(slewPivot);

  const lampA = buildLampTower(1.35, -0.75, 0.78, 0xf59e0b);
  const lampB = buildLampTower(1.35, 0.75, 0.78, 0x38bdf8);
  root.add(lampA.group, lampB.group);

  root.add(
    buildCopperTrack(
      [
        [0.35, 0.42, -0.75],
        [1.35, 0.42, -0.75],
      ],
      0.04,
      0xf59e0b
    )
  );
  root.add(
    buildCopperTrack(
      [
        [0.35, 0.42, 0.75],
        [1.35, 0.42, 0.75],
      ],
      0.04,
      0x38bdf8
    )
  );

  const streamA = buildParticleStream(
    [
      [-1.25, 0.46, 0],
      [0.35, 0.46, -0.75],
      [1.35, 0.46, -0.75],
    ],
    9,
    0xf59e0b,
    0.065
  );
  const streamB = buildParticleStream(
    [
      [-1.25, 0.46, 0],
      [0.35, 0.46, 0.75],
      [1.35, 0.46, 0.75],
    ],
    9,
    0x38bdf8,
    0.065
  );
  root.add(streamA.group, streamB.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const throwB = (params.throwB ?? 0) >= 0.5;
      const targetYaw = throwB ? -0.44 : 0.44;
      slewPivot.rotation.y += (targetYaw - slewPivot.rotation.y) * 0.2;
      lampA.setLit(!throwB, 0xf59e0b, 1.3);
      lampB.setLit(throwB, 0x38bdf8, 1.3);
      streamA.update(elapsed, 1.5, !throwB, false, 0xf59e0b);
      streamB.update(elapsed, 1.5, throwB, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const b = (params.throwB ?? 0) >= 0.5;
      return [
        { label: '当前导通路径', value: b ? 'COM → B 通道' : 'COM → A 通道', accent: b ? 'sky' : 'amber' },
      ];
    },
  };
};

export const buildDiodeDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // P-type crimson semiconductor block (Anode left)
  const pBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.75, 0.85),
    makeEmissiveMaterial(0xef4444, 0.25)
  );
  pBlock.position.set(-0.62, 0.55, 0);
  root.add(pBlock);

  // N-type blue semiconductor block (Cathode right)
  const nBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.75, 0.85),
    makeEmissiveMaterial(0x2563eb, 0.25)
  );
  nBlock.position.set(0.62, 0.55, 0);
  root.add(nBlock);

  // Silver Cathode stripe band on N side
  const silverBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.78, 0.88),
    makeBrassMaterial(0xe2e8f0)
  );
  silverBand.position.set(0.95, 0.55, 0);
  root.add(silverBand);

  // Translucent outer diode tube
  const sleeve = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.88, 0.98),
    makeGlassMaterial(0xe2e8f0, 0.16)
  );
  sleeve.position.set(0, 0.55, 0);
  root.add(sleeve);

  // Central dynamic Depletion Barrier
  const barrierMat = makeEmissiveMaterial(0xfbbf24, 0.65);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, 0.88), barrierMat);
  barrier.position.set(0, 0.55, 0);
  root.add(barrier);

  root.add(buildTerminalPost(-1.55, 0, 0xf87171, 0.48));
  root.add(buildTerminalPost(1.55, 0, 0x38bdf8, 0.48));

  const stream = buildParticleStream(
    [
      [-1.55, 0.55, 0],
      [1.55, 0.55, 0],
    ],
    14,
    0x34d399,
    0.075
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const fwd = (params.forward ?? 1) >= 0.5;
      const targetScaleX = fwd ? 0.18 : 2.15;
      barrier.scale.x += (targetScaleX - barrier.scale.x) * 0.18;
      barrierMat.color.setHex(fwd ? 0x34d399 : 0xf43f5e);
      barrierMat.emissive.setHex(fwd ? 0x34d399 : 0xf43f5e);
      barrierMat.emissiveIntensity = fwd ? 0.35 : 0.9;
      stream.update(elapsed, fwd ? 1.8 : 0.0, fwd, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const fwd = (params.forward ?? 1) >= 0.5;
      return [
        { label: 'PN 结状态', value: fwd ? '正向导通 (Vf≈0.7V)' : '反向截止 (耗尽层封锁)', accent: fwd ? 'emerald' : 'rose' },
      ];
    },
  };
};

export const buildLedDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Series current limiting resistor on the left
  const resBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.65, 16),
    makeBrassMaterial(0xd97706)
  );
  resBody.rotation.z = Math.PI / 2;
  resBody.position.set(-1.1, 0.38, 0);
  root.add(resBody);

  root.add(
    buildCopperTrack(
      [
        [-1.65, 0.38, 0],
        [-0.25, 0.38, 0],
        [-0.25, 0.72, 0],
      ],
      0.04,
      0xf87171
    )
  );
  root.add(
    buildCopperTrack(
      [
        [0.25, 0.72, 0],
        [0.25, 0.38, 0],
        [1.45, 0.38, 0],
      ],
      0.04,
      0x64748b
    )
  );

  // LED epoxy dome & glowing die cup
  const baseSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.6, 0.16, 24),
    makeGlassMaterial(0xfca5a5, 0.35)
  );
  baseSkirt.position.set(0, 0.72, 0);
  const domeTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.58, 24),
    makeGlassMaterial(0xfca5a5, 0.3)
  );
  domeTube.position.set(0, 1.05, 0);
  const domeTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    makeGlassMaterial(0xfca5a5, 0.3)
  );
  domeTop.position.set(0, 1.34, 0);

  const dieMat = makeEmissiveMaterial(0xef4444, 0.8);
  const die = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), dieMat);
  die.position.set(0, 0.92, 0);

  // Outer glow halo
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 14), haloMat);
  halo.position.set(0, 1.15, 0);

  root.add(baseSkirt, domeTube, domeTop, die, halo);

  // Rising emitted photons inside/above dome
  const photons: THREE.Mesh[] = [];
  const pMat = makeEmissiveMaterial(0xfca5a5, 1.1);
  const pGeo = new THREE.SphereGeometry(0.065, 10, 8);
  for (let i = 0; i < 6; i++) {
    const ph = new THREE.Mesh(pGeo, pMat);
    root.add(ph);
    photons.push(ph);
  }

  const stream = buildParticleStream(
    [
      [-1.65, 0.38, 0],
      [-0.25, 0.38, 0],
      [-0.25, 0.72, 0],
      [0.25, 0.72, 0],
      [0.25, 0.38, 0],
      [1.45, 0.38, 0],
    ],
    12,
    0x38bdf8,
    0.055
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ma = params.currentMa ?? 15;
      const ratio = Math.min(1, ma / 30);
      const overload = ma > 27;
      const col = overload ? 0xf43f5e : 0xef4444;
      dieMat.color.setHex(col);
      dieMat.emissive.setHex(col);
      dieMat.emissiveIntensity = ma > 0.5 ? 0.3 + ratio * 1.4 : 0.05;
      haloMat.opacity = ma > 0.5 ? ratio * (overload ? 0.42 : 0.28) : 0;

      photons.forEach((ph, idx) => {
        ph.visible = ma > 1;
        const phase = (elapsed * (0.6 + ratio * 1.5) + idx / 6) % 1;
        const angle = idx * 1.05 + elapsed * 1.2;
        ph.position.set(Math.cos(angle) * (0.12 + phase * 0.25), 0.95 + phase * 1.0, Math.sin(angle) * (0.12 + phase * 0.25));
        ph.scale.setScalar(1.0 - phase * 0.65);
      });

      stream.update(elapsed, 0.3 + ratio * 1.8, ma > 0.5, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const ma = params.currentMa ?? 15;
      return [
        {
          label: '正向电流 If',
          value: ma <= 0.5 ? '0 mA (未点亮)' : ma > 27 ? `${ma.toFixed(1)} mA (过流高温!)` : `${ma.toFixed(1)} mA (健康发光)`,
          accent: ma > 27 ? 'rose' : ma > 0.5 ? 'emerald' : 'amber',
        },
      ];
    },
  };
};

export const buildBjtNpnDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Central TO-92 / transparent transistor body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.92, 24),
    makeGlassMaterial(0x94a3b8, 0.26)
  );
  body.position.set(0.2, 0.62, 0);
  root.add(body);

  // Internal Base proportional valve shutter that lifts proportionally with Ib
  const shutterMat = makeEmissiveMaterial(0xfbbf24, 0.6);
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.56), shutterMat);
  shutter.position.set(0.2, 0.62, 0);
  root.add(shutter);

  // Base input pipe from left
  root.add(buildCopperTrack([[-1.45, 0.62, 0], [-0.25, 0.62, 0]], 0.04, 0xfbbf24));
  // Collector top pipe & Emitter bottom pipe
  root.add(buildCopperTrack([[0.2, 1.55, 0], [0.2, 0.98, 0]], 0.065, 0x22c55e));
  root.add(buildCopperTrack([[0.2, 0.25, 0], [0.2, 0.08, 0], [1.45, 0.08, 0]], 0.065, 0x38bdf8));

  const mainStream = buildParticleStream(
    [
      [0.2, 1.55, 0],
      [0.2, 0.12, 0],
      [1.45, 0.12, 0],
    ],
    14,
    0x34d399,
    0.075
  );
  const baseStream = buildParticleStream(
    [
      [-1.45, 0.62, 0],
      [-0.1, 0.62, 0],
    ],
    6,
    0xfbbf24,
    0.048
  );
  root.add(mainStream.group, baseStream.group);

  const icGauge = buildLevelBar(-1.35, -0.75, 1.35, 0x34d399);
  root.add(icGauge.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ib = params.ib ?? 40;
      const icMa = Math.min(10, (ib * 100) / 1000); // beta=100, saturated around 10mA (100uA Ib)
      const ratio = icMa / 10;
      // Lift valve out of flow channel when Ib rises
      shutter.position.z = -ratio * 0.45;
      icGauge.setRatio(ratio, ib >= 100 ? 0xf59e0b : 0x34d399);

      baseStream.update(elapsed, 0.4 + (ib / 120) * 1.3, ib > 1, false, 0xfbbf24);
      mainStream.update(elapsed, 0.4 + ratio * 2.2, ib > 1, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const ib = params.ib ?? 40;
      const rawIc = (ib * 100) / 1000;
      const ic = Math.min(10, rawIc);
      const region = ib <= 2 ? '截止区' : rawIc >= 10 ? '饱和区 (全开)' : '线性放大区';
      return [
        { label: '工作区域', value: region, accent: ib <= 2 ? 'rose' : rawIc >= 10 ? 'amber' : 'emerald' },
        { label: '集电极电流 Ic', value: `${ic.toFixed(1)} mA (β=100)`, accent: 'sky' },
      ];
    },
  };
};

export const buildOpampDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Triangular opamp wedge prism
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.75, 0.55);
  triShape.lineTo(0.85, 0);
  triShape.lineTo(-0.75, -0.55);
  triShape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
  const wedge = new THREE.Mesh(extrudeGeo, makeDarkMetalMaterial(0x1e293b));
  wedge.rotation.x = Math.PI / 2;
  wedge.position.set(0, 0.82, 0);
  root.add(wedge);

  // Overhead feedback resistor bridge Rf connecting output (0.85) back to '-' arm (-0.75)
  root.add(
    buildCopperTrack(
      [
        [-0.85, 0.72, -0.3],
        [-0.85, 1.48, -0.3],
        [0.9, 1.48, -0.3],
        [0.9, 0.72, 0],
      ],
      0.035,
      0x38bdf8
    )
  );
  const rfBlock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.58, 16),
    makeBrassMaterial(0xd97706)
  );
  rfBlock.rotation.z = Math.PI / 2;
  rfBlock.position.set(0.05, 1.48, -0.3);
  root.add(rfBlock);

  // Virtual short seesaw bar balancing V- towards V+ (0V)
  const balanceBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.08, 0.85),
    makeEmissiveMaterial(0xfbbf24, 0.75)
  );
  balanceBeam.position.set(-0.92, 0.92, 0);
  root.add(balanceBeam);

  // Input level bar & Inverted amplified output level bar
  const vinBar = buildLevelBar(-1.55, 0.35, 1.25, 0x38bdf8);
  const voutBar = buildLevelBar(1.45, 0, 1.45, 0xf87171);
  root.add(vinBar.group, voutBar.group);

  return {
    root,
    update: (_e, _s, _p, params) => {
      const vin = params.vin ?? 1.5;
      const gain = -2.0; // Rf/Rin = 2
      const vout = Math.max(-5, Math.min(5, vin * gain));
      vinBar.setRatio((vin + 3) / 6, vin >= 0 ? 0x38bdf8 : 0xf87171);
      voutBar.setRatio((vout + 5) / 10, vout >= 0 ? 0x22c55e : 0xf43f5e);
      // Slight subtle micro-error tilt showing feedback locking V- to V+
      balanceBeam.rotation.x = vin * 0.04;
    },
    getLiveReadout: (_e, _s, params) => {
      const vin = params.vin ?? 1.5;
      const rawOut = vin * -2.0;
      const clipped = Math.abs(rawOut) >= 5.0;
      const vout = Math.max(-5, Math.min(5, rawOut));
      return [
        { label: '虚短节点 V-', value: '≈ 0.00 V (虚地)', accent: 'amber' },
        { label: '反相输出 (-2×Vin)', value: `${vout.toFixed(1)} V${clipped ? ' [饱和]' : ''}`, accent: clipped ? 'rose' : 'emerald' },
      ];
    },
  };
};

export const buildVoltmeterDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Main horizontal resistor load loop at front
  root.add(
    buildCopperTrack(
      [
        [-1.45, 0.3, 0.65],
        [1.45, 0.3, 0.65],
        [1.45, 0.3, -0.65],
        [-1.45, 0.3, -0.65],
        [-1.45, 0.3, 0.65],
      ],
      0.04,
      0xd97706
    )
  );
  const mainLoad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.72, 16),
    makeBrassMaterial(0xb45309)
  );
  mainLoad.rotation.z = Math.PI / 2;
  mainLoad.position.set(0, 0.3, 0.65);
  root.add(mainLoad);

  const lamp = buildLampTower(1.45, 0, 0.72, 0xfde047);
  root.add(lamp.group);

  // Overhead digital voltmeter console
  const meterBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.72, 0.42),
    makeDarkMetalMaterial(0x0f172a)
  );
  meterBody.position.set(0, 1.15, -0.25);
  const screenMat = makeEmissiveMaterial(0x0ea5e9, 0.8);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.38, 0.06), screenMat);
  screen.position.set(0, 1.2, -0.02);
  root.add(meterBody, screen);

  // Red & black probe needles
  const probeGroup = new THREE.Group();
  probeGroup.add(buildPipeSegment(new THREE.Vector3(-0.35, 0.82, -0.15), new THREE.Vector3(-0.62, 0.32, 0.65), 0.035, 0xef4444));
  probeGroup.add(buildPipeSegment(new THREE.Vector3(0.35, 0.82, -0.15), new THREE.Vector3(0.62, 0.32, 0.65), 0.035, 0x334155));
  root.add(probeGroup);

  const blockerWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.5, 0.5),
    makeEmissiveMaterial(0xf43f5e, 0.85)
  );
  blockerWall.position.set(-0.75, 0.35, 0.65);
  root.add(blockerWall);

  const mainStream = buildParticleStream(
    [
      [-1.45, 0.3, 0.65],
      [1.45, 0.3, 0.65],
      [1.45, 0.3, -0.65],
      [-1.45, 0.3, -0.65],
      [-1.45, 0.3, 0.65],
    ],
    14,
    0x34d399,
    0.06
  );
  root.add(mainStream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ok = (params.parallelOk ?? 1) >= 0.5;
      blockerWall.visible = !ok;
      lamp.setLit(ok, 0xfde047, 1.25);
      screenMat.color.setHex(ok ? 0x0ea5e9 : 0xf43f5e);
      screenMat.emissive.setHex(ok ? 0x0ea5e9 : 0xf43f5e);
      mainStream.update(elapsed, 1.5, ok, false, 0x34d399);
    },
    getLiveReadout: (_e, _s, params) => {
      const ok = (params.parallelOk ?? 1) >= 0.5;
      return [
        {
          label: ok ? '正确并联读数' : '错误串联后果',
          value: ok ? '5.00 V (主路畅通)' : '主电流归零 (负载熄灭!)',
          accent: ok ? 'emerald' : 'rose',
        },
      ];
    },
  };
};

export const buildAmmeterDiorama: PonderDioramaBuilder = () => {
  const root = new THREE.Group();

  // Series flow loop
  root.add(
    buildCopperTrack(
      [
        [-1.45, 0.35, 0],
        [1.45, 0.35, 0],
        [1.45, 0.35, -0.95],
        [-1.45, 0.35, -0.95],
        [-1.45, 0.35, 0],
      ],
      0.045,
      0xd97706
    )
  );

  // Inline transparent turbine housing at center (0, 0.45, 0)
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.38, 22),
    makeGlassMaterial(0xbae6fd, 0.3)
  );
  housing.rotation.x = Math.PI / 2;
  housing.position.set(0, 0.45, 0);
  root.add(housing);

  const turbine = buildWaterWheel(0.32, 0.22, 0xfbbf24);
  turbine.position.set(0, 0.45, 0);
  root.add(turbine);

  // Overhead dial face + rotating analog needle
  const dialFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.14, 24),
    makeDarkMetalMaterial(0x0f172a)
  );
  dialFace.rotation.x = Math.PI / 2;
  dialFace.position.set(0, 1.35, -0.15);
  root.add(dialFace);

  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 1.35, -0.04);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.44, 0.04),
    makeEmissiveMaterial(0xef4444, 0.85)
  );
  needle.position.y = 0.2;
  needlePivot.add(needle);
  root.add(needlePivot);

  // Load tower on the right
  const loadTower = buildLevelBar(1.45, 0.55, 1.0, 0xf59e0b);
  root.add(loadTower.group);

  const stream = buildParticleStream(
    [
      [-1.45, 0.35, 0],
      [1.45, 0.35, 0],
      [1.45, 0.35, -0.95],
      [-1.45, 0.35, -0.95],
      [-1.45, 0.35, 0],
    ],
    14,
    0x38bdf8,
    0.068
  );
  root.add(stream.group);

  return {
    root,
    update: (elapsed, _s, _p, params) => {
      const ohms = params.loadOhms ?? 200;
      const ratio = 100 / Math.max(100, ohms); // 0.2 to 1.0
      turbine.rotation.z -= 0.03 + ratio * 0.14;
      const targetAngle = 0.9 - ratio * 1.8; // +0.9 rad (low) to -0.9 rad (full scale)
      needlePivot.rotation.z += (targetAngle - needlePivot.rotation.z) * 0.15;
      loadTower.setRatio(ohms / 500, 0xf59e0b);
      stream.update(elapsed, 0.5 + ratio * 1.9, true, false, 0x38bdf8);
    },
    getLiveReadout: (_e, _s, params) => {
      const r = params.loadOhms ?? 200;
      const iMa = (5 / r) * 1000;
      return [
        { label: '串联实测电流 (@5V)', value: `${iMa.toFixed(1)} mA`, accent: 'sky' },
        { label: '表头内阻压降', value: '≈ 0.00 mV', accent: 'emerald' },
      ];
    },
  };
};
