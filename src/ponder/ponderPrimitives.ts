import * as THREE from 'three';

export interface ParticleStream {
  group: THREE.Group;
  particles: THREE.Mesh[];
  points: THREE.Vector3[];
  update: (elapsed: number, speed: number, active: boolean, reverse?: boolean, color?: number) => void;
}

export interface LampTower {
  group: THREE.Group;
  bulbMat: THREE.MeshStandardMaterial;
  haloMesh: THREE.Mesh;
  setLit: (lit: boolean, onColor?: number, intensity?: number) => void;
}

export interface LevelBar {
  group: THREE.Group;
  fillMesh: THREE.Mesh;
  fillMat: THREE.MeshStandardMaterial;
  maxHeight: number;
  setRatio: (ratio: number, color?: number) => void;
}

export interface Seg7Display3D {
  group: THREE.Group;
  segMats: THREE.MeshStandardMaterial[];
  setDigit: (val: number, color?: number) => void;
}

// 7-segment bitmasks: bit0=a(top),1=b(tr),2=c(br),3=d(bot),4=e(bl),5=f(tl),6=g(mid)
const HEX_7SEG_MASKS = [
  0b0111111, // 0
  0b0000110, // 1
  0b1011011, // 2
  0b1001111, // 3
  0b1100110, // 4
  0b1101101, // 5
  0b1111101, // 6
  0b0000111, // 7
  0b1111111, // 8
  0b1101111, // 9
  0b1110111, // A
  0b1111100, // b
  0b0111001, // C
  0b1011110, // d
  0b1111001, // E
  0b1110001, // F
];

/**
 * Create-Mod iconic 5x5 floating checkered pedestal (top surface exactly y = 0).
 */
export function buildCreatePedestal(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ponder-pedestal';

  const lightTileMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.58,
    metalness: 0.25,
  });
  const darkTileMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.22,
  });

  const tileGeo = new THREE.BoxGeometry(0.98, 0.14, 0.98);
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      const even = (ix + iz) % 2 === 0;
      const tile = new THREE.Mesh(tileGeo, even ? lightTileMat : darkTileMat);
      tile.position.set(ix, -0.07, iz);
      tile.receiveShadow = true;
      g.add(tile);
    }
  }

  // Brass beveled frame belt
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.78,
    roughness: 0.28,
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.16, 0.14, 5.16), brassMat);
  frame.position.set(0, -0.19, 0);
  g.add(frame);

  // Dark forged iron under-chassis
  const underMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.65,
    roughness: 0.45,
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.86, 0.12, 4.86), underMat);
  chassis.position.set(0, -0.31, 0);
  g.add(chassis);

  // 4 corner brass rivets
  const rivetGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
  for (const sx of [-2.46, 2.46]) {
    for (const sz of [-2.46, 2.46]) {
      const r = new THREE.Mesh(rivetGeo, brassMat);
      r.position.set(sx, 0.01, sz);
      g.add(r);
    }
  }

  return g;
}

export function makeBrassMaterial(color = 0xd97706): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.78,
    roughness: 0.26,
  });
}

export function makeDarkMetalMaterial(color = 0x1e293b): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.62,
    roughness: 0.42,
  });
}

export function makeGlassMaterial(color = 0xbae6fd, opacity = 0.24): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.12,
    metalness: 0.1,
    depthWrite: false,
  });
}

export function makeEmissiveMaterial(color: number, intensity = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.2,
  });
}

export function buildTerminalPost(
  x: number,
  z: number,
  color = 0xf59e0b,
  height = 0.45
): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.12, 16),
    makeDarkMetalMaterial(0x0f172a)
  );
  base.position.y = 0.06;
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, height, 14),
    makeBrassMaterial(color)
  );
  rod.position.y = height * 0.5 + 0.06;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 12),
    makeBrassMaterial(color)
  );
  cap.position.y = height + 0.06;
  g.add(base, rod, cap);
  g.position.set(x, 0, z);
  return g;
}

export function buildPipeSegment(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius = 0.045,
  color = 0xb45309
): THREE.Mesh {
  const delta = new THREE.Vector3().subVectors(to, from);
  const len = Math.max(0.001, delta.length());
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 12),
    makeBrassMaterial(color)
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

export function buildCopperTrack(waypoints: [number, number, number][], radius = 0.04, color = 0xc2410c): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = new THREE.Vector3(...waypoints[i]);
    const p2 = new THREE.Vector3(...waypoints[i + 1]);
    g.add(buildPipeSegment(p1, p2, radius, color));
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.28, 10, 10),
      makeBrassMaterial(0xd97706)
    );
    joint.position.copy(p1);
    g.add(joint);
  }
  return g;
}

/**
 * Animated charge particle conveyor along polyline waypoints.
 */
export function buildParticleStream(
  waypoints: [number, number, number][],
  count = 14,
  defaultColor = 0x38bdf8,
  radius = 0.07
): ParticleStream {
  const group = new THREE.Group();
  const points = waypoints.map((w) => new THREE.Vector3(...w));
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = points[i].distanceTo(points[i + 1]);
    segLengths.push(l);
    totalLen += l;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: defaultColor,
    emissive: defaultColor,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.2,
  });
  const geo = new THREE.SphereGeometry(radius, 12, 10);
  const particles: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat);
    group.add(p);
    particles.push(p);
  }

  const sampleAt = (uRaw: number, target: THREE.Vector3) => {
    const u = ((uRaw % 1) + 1) % 1;
    let dist = u * totalLen;
    for (let i = 0; i < segLengths.length; i++) {
      if (dist <= segLengths[i] || i === segLengths.length - 1) {
        const localT = segLengths[i] > 0 ? Math.min(1, Math.max(0, dist / segLengths[i])) : 0;
        target.lerpVectors(points[i], points[i + 1], localT);
        return;
      }
      dist -= segLengths[i];
    }
  };

  return {
    group,
    particles,
    points,
    update: (elapsed, speed, active, reverse = false, color) => {
      if (color !== undefined) {
        mat.color.setHex(color);
        mat.emissive.setHex(color);
      }
      mat.emissiveIntensity = active ? 0.95 : 0.1;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.visible = totalLen > 0;
        if (!active) {
          // Stationary dim charge markers along path when circuit is cut/off
          sampleAt(i / count, p.position);
          p.scale.setScalar(0.55);
        } else {
          const dir = reverse ? -1 : 1;
          const phase = i / count + dir * elapsed * speed * 0.25;
          sampleAt(phase, p.position);
          p.scale.setScalar(1.0);
        }
      }
    },
  };
}

export function buildLampTower(x: number, z: number, height = 0.72, onColor = 0x22c55e): LampTower {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.22, 16),
    makeDarkMetalMaterial(0x1e293b)
  );
  base.position.y = 0.11;

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, height - 0.3, 14),
    makeBrassMaterial(0x94a3b8)
  );
  neck.position.y = 0.22 + (height - 0.3) * 0.5;

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: onColor,
    emissiveIntensity: 0.0,
    roughness: 0.22,
    metalness: 0.1,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), bulbMat);
  bulb.position.y = height;

  const haloMat = new THREE.MeshBasicMaterial({
    color: onColor,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), haloMat);
  haloMesh.position.y = height;

  group.add(base, neck, bulb, haloMesh);
  group.position.set(x, 0, z);

  return {
    group,
    bulbMat,
    haloMesh,
    setLit: (lit, colorOverride, intensity = 1.25) => {
      const hex = colorOverride ?? onColor;
      if (lit) {
        bulbMat.color.setHex(hex);
        bulbMat.emissive.setHex(hex);
        bulbMat.emissiveIntensity = intensity;
        haloMat.color.setHex(hex);
        haloMat.opacity = 0.24;
      } else {
        bulbMat.color.setHex(0x334155);
        bulbMat.emissiveIntensity = 0.04;
        haloMat.opacity = 0.0;
      }
    },
  };
}

export function buildLevelBar(x: number, z: number, maxHeight = 1.35, color = 0x38bdf8): LevelBar {
  const group = new THREE.Group();
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, maxHeight + 0.08, 0.32),
    makeGlassMaterial(0xe2e8f0, 0.18)
  );
  housing.position.y = (maxHeight + 0.08) * 0.5;

  const baseCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.08, 0.38),
    makeDarkMetalMaterial(0x0f172a)
  );
  baseCap.position.y = 0.04;

  const topCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.07, 0.38),
    makeBrassMaterial(0xb45309)
  );
  topCap.position.y = maxHeight + 0.1;

  const fillMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
  const fillMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1, 0.22), fillMat);
  fillMesh.position.y = 0.5;

  group.add(baseCap, housing, topCap, fillMesh);
  group.position.set(x, 0, z);

  return {
    group,
    fillMesh,
    fillMat,
    maxHeight,
    setRatio: (ratio, colorOverride) => {
      const clamped = Math.max(0.03, Math.min(1, ratio));
      const h = maxHeight * clamped;
      fillMesh.scale.y = h;
      fillMesh.position.y = 0.08 + h * 0.5;
      if (colorOverride !== undefined) {
        fillMat.color.setHex(colorOverride);
        fillMat.emissive.setHex(colorOverride);
      }
    },
  };
}

export function buildWaterWheel(radius = 0.42, width = 0.24, color = 0xd97706): THREE.Group {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, width, 16),
    makeDarkMetalMaterial(0x1e293b)
  );
  hub.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.04, 10, 24),
    makeBrassMaterial(color)
  );
  g.add(hub, rim);

  const bladeGeo = new THREE.BoxGeometry(0.05, radius * 1.9, width * 0.85);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, makeBrassMaterial(0xf59e0b));
    blade.rotation.z = (i * Math.PI) / 4;
    g.add(blade);
  }
  return g;
}

export function buildGateChipHousing(width = 1.15, height = 0.45, depth = 0.95, accent = 0x38bdf8): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeDarkMetalMaterial(0x0f172a)
  );
  body.position.y = height * 0.5 + 0.14;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.16, 0.14, depth + 0.16),
    makeDarkMetalMaterial(0x334155)
  );
  plinth.position.y = 0.07;

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.03, 0.06, depth + 0.03),
    makeEmissiveMaterial(accent, 0.45)
  );
  rim.position.y = height + 0.14;

  // Metallic DIP pins along left/right
  const pinGeo = new THREE.BoxGeometry(0.14, 0.12, 0.08);
  const pinMat = makeBrassMaterial(0xcbd5e1);
  for (const sz of [-depth * 0.3, depth * 0.3]) {
    const lp = new THREE.Mesh(pinGeo, pinMat);
    lp.position.set(-width * 0.55, 0.18, sz);
    const rp = new THREE.Mesh(pinGeo, pinMat);
    rp.position.set(width * 0.55, 0.18, sz);
    g.add(lp, rp);
  }

  g.add(plinth, body, rim);
  return g;
}

export function buildToggleLever(x: number, z: number, accent = 0xfbbf24): {
  group: THREE.Group;
  arm: THREE.Group;
  setActive: (on: boolean) => void;
} {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.16, 0.32),
    makeDarkMetalMaterial(0x1e293b)
  );
  base.position.y = 0.08;

  const arm = new THREE.Group();
  arm.position.y = 0.16;
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10),
    makeBrassMaterial(0xe2e8f0)
  );
  rod.position.y = 0.21;
  const knobMat = makeEmissiveMaterial(accent, 0.4);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), knobMat);
  knob.position.y = 0.43;
  arm.add(rod, knob);

  group.add(base, arm);
  group.position.set(x, 0, z);

  return {
    group,
    arm,
    setActive: (on) => {
      arm.rotation.z = on ? -0.45 : 0.45;
      knobMat.color.setHex(on ? 0x22c55e : 0x64748b);
      knobMat.emissive.setHex(on ? 0x22c55e : 0x334155);
      knobMat.emissiveIntensity = on ? 0.9 : 0.2;
    },
  };
}

export function buildSeg7Display3D(): Seg7Display3D {
  const group = new THREE.Group();
  const caseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.35, 0.22),
    makeDarkMetalMaterial(0x0f172a)
  );
  caseMesh.position.y = 0.72;
  group.add(caseMesh);

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 1.24, 0.04),
    makeDarkMetalMaterial(0x020617)
  );
  bezel.position.set(0, 0.72, 0.1);
  group.add(bezel);

  // Create 7 physical LED bars (a,b,c,d,e,f,g)
  const segSpecs: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
    { pos: [0, 1.16, 0.13], size: [0.42, 0.08, 0.05] }, // a top
    { pos: [0.24, 0.94, 0.13], size: [0.08, 0.36, 0.05] }, // b top-right
    { pos: [0.24, 0.5, 0.13], size: [0.08, 0.36, 0.05] }, // c bot-right
    { pos: [0, 0.28, 0.13], size: [0.42, 0.08, 0.05] }, // d bottom
    { pos: [-0.24, 0.5, 0.13], size: [0.08, 0.36, 0.05] }, // e bot-left
    { pos: [-0.24, 0.94, 0.13], size: [0.08, 0.36, 0.05] }, // f top-left
    { pos: [0, 0.72, 0.13], size: [0.42, 0.08, 0.05] }, // g middle
  ];

  const segMats: THREE.MeshStandardMaterial[] = [];
  for (const s of segSpecs) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0xef4444,
      emissiveIntensity: 0.02,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s.size), mat);
    mesh.position.set(...s.pos);
    group.add(mesh);
    segMats.push(mat);
  }

  return {
    group,
    segMats,
    setDigit: (val, color = 0xf43f5e) => {
      const idx = ((Math.round(val) % 16) + 16) % 16;
      const mask = HEX_7SEG_MASKS[idx];
      for (let bit = 0; bit < 7; bit++) {
        const on = ((mask >> bit) & 1) === 1;
        segMats[bit].color.setHex(on ? color : 0x1e293b);
        segMats[bit].emissive.setHex(color);
        segMats[bit].emissiveIntensity = on ? 1.25 : 0.03;
      }
    },
  };
}
