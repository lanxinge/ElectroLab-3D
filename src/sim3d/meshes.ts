import * as THREE from 'three';
import type { CircuitComponent, ComponentTelemetry } from '../../shared/types';
import {
  COMPONENT_CATALOG,
  getComponentMeshSignature,
  getComponentPins,
} from '../engine/componentCatalog';
import { parseCustomIcPayload, parseTruthChipConfig } from '../engine/customIcEngine';

const IEC_DIGIT_COLORS = [
  0x111111, // 0 black
  0x7c2d12, // 1 brown
  0xdc2626, // 2 red
  0xea580c, // 3 orange
  0xeab308, // 4 yellow
  0x16a34a, // 5 green
  0x2563eb, // 6 blue
  0x9333ea, // 7 violet
  0x64748b, // 8 grey
  0xf8fafc, // 9 white
];

export function computeResistorBandColors(ohmsRaw: number): [number, number, number, number] {
  const ohms = Math.max(1, ohmsRaw);
  const exp = Math.floor(Math.log10(ohms));
  const scaled = ohms / Math.pow(10, exp - 1);
  const twoDigits = Math.min(99, Math.max(10, Math.round(scaled)));
  const d1 = Math.floor(twoDigits / 10);
  const d2 = twoDigits % 10;
  const mulExp = Math.max(0, Math.min(7, exp - 1));
  return [
    IEC_DIGIT_COLORS[d1] ?? 0x7c2d12,
    IEC_DIGIT_COLORS[d2] ?? 0x111111,
    IEC_DIGIT_COLORS[mulExp] ?? 0xdc2626,
    0xd4af37, // gold tolerance band
  ];
}

function getLedHexColor(colorProp: unknown): number {
  switch (String(colorProp ?? 'red')) {
    case 'green':
      return 0x22c55e;
    case 'blue':
      return 0x38bdf8;
    case 'yellow':
    case 'amber':
      return 0xfacc15;
    case 'white':
      return 0xf8fafc;
    case 'red':
    default:
      return 0xef4444;
  }
}

function createTextTexture(
  bg: string,
  fg: string,
  title: string,
  subtitle?: string,
  w = 256,
  h = 128
): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  drawTextCanvas(ctx, canvas, texture, bg, fg, title, subtitle);
  return { texture, canvas, ctx };
}

function drawTextCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  bg: string,
  fg: string,
  title: string,
  subtitle?: string
) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (subtitle) {
    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.fillText(title, canvas.width / 2, canvas.height * 0.42);
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height * 0.75);
  } else {
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);
  }
  texture.needsUpdate = true;
}

const SEVEN_SEG_MAP: Record<number, number[]> = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
  10: [1, 1, 1, 0, 1, 1, 1], // A
  11: [0, 0, 1, 1, 1, 1, 1], // b
  12: [1, 0, 0, 1, 1, 1, 0], // C
  13: [0, 1, 1, 1, 1, 0, 1], // d
  14: [1, 0, 0, 1, 1, 1, 1], // E
  15: [1, 0, 0, 0, 1, 1, 1], // F
};

export interface ComponentMeshHandle {
  group: THREE.Group;
  meshSignature: string;
  pinMeshes: Map<string, THREE.Mesh>;
  pinRings: Map<string, THREE.Mesh>;
  selectionRing: THREE.Mesh;
  overloadRing: THREE.Mesh;
  updateVisuals: (comp: CircuitComponent, telemetry: ComponentTelemetry | undefined, time: number) => void;
}

export function buildComponentMesh(comp: CircuitComponent): ComponentMeshHandle {
  const group = new THREE.Group();
  group.position.set(comp.pos3d[0], comp.pos3d[1], comp.pos3d[2]);
  group.rotation.y = comp.rotationY;
  group.userData = { componentId: comp.id };

  const spec = COMPONENT_CATALOG[comp.type];
  const pins = getComponentPins(comp);
  const meshSignature = getComponentMeshSignature(comp);
  const pinMeshes = new Map<string, THREE.Mesh>();
  const pinRings = new Map<string, THREE.Mesh>();

  // Helper to tag component hitboxes
  const tagHit = (obj: THREE.Object3D) => {
    obj.userData = { hitType: 'component', componentId: comp.id };
  };

  // Compute adaptive PCB footprint for standard 2-pin parts vs multi-pin DIP ICs
  const maxAbsX = Math.max(0.75, ...pins.map((p) => Math.abs(p.offset3d[0])));
  const maxAbsZ = Math.max(0.45, ...pins.map((p) => Math.abs(p.offset3d[2])));
  const padW = Math.max(1.9, maxAbsX * 2 + 0.34);
  const padD = Math.max(1.25, maxAbsZ * 2 + 0.42);
  const ringRadius = Math.max(1.08, Math.hypot(padW, padD) * 0.54);

  // Base PCB carrier pad with chamfered bezel and 4 corner mounting rings
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0f1f33,
    roughness: 0.55,
    metalness: 0.3,
  });
  const basePad = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.08, padD), baseMat);
  basePad.position.y = 0.04;
  basePad.receiveShadow = true;
  basePad.castShadow = true;
  tagHit(basePad);
  group.add(basePad);

  const traceMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.25,
  });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mount = new THREE.Mesh(new THREE.RingGeometry(0.032, 0.068, 14), traceMat);
      mount.rotation.x = -Math.PI / 2;
      mount.position.set(sx * (padW / 2 - 0.11), 0.082, sz * (padD / 2 - 0.11));
      group.add(mount);
    }
  }

  // Subtle gold PCB silkscreen border line
  const borderBarX = new THREE.BoxGeometry(padW - 0.24, 0.008, 0.02);
  for (const sz of [-1, 1]) {
    const edge = new THREE.Mesh(borderBarX, traceMat);
    edge.position.set(0, 0.083, sz * (padD / 2 - 0.06));
    group.add(edge);
  }

  // Invisible generous drag hitbox
  const dragBox = new THREE.Mesh(
    new THREE.BoxGeometry(padW, 0.8, padD),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dragBox.position.y = 0.38;
  tagHit(dragBox);
  group.add(dragBox);

  // Selection ring
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius, ringRadius + 0.1, 44),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.015;
  selectionRing.visible = false;
  group.add(selectionRing);

  // Overload alert ring
  const overloadRing = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius + 0.1, ringRadius + 0.26, 44),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  overloadRing.rotation.x = -Math.PI / 2;
  overloadRing.position.y = 0.02;
  overloadRing.visible = false;
  group.add(overloadRing);

  // Add Pins (with miniature PCB copper traces to center)
  for (const pin of pins) {
    const postColor =
      pin.role === 'pos'
        ? 0xef4444
        : pin.role === 'neg'
        ? 0x334155
        : pin.role === 'logic_out'
        ? 0x22c55e
        : 0xeab308;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.22 })
    );
    post.position.set(pin.offset3d[0], pin.offset3d[1], pin.offset3d[2]);
    post.castShadow = true;
    group.add(post);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.082, 0.06, 14),
      new THREE.MeshStandardMaterial({ color: postColor, roughness: 0.45 })
    );
    collar.position.set(pin.offset3d[0], pin.offset3d[1] - 0.07, pin.offset3d[2]);
    group.add(collar);

    // Copper pad trace linking pin toward IC core
    const traceLen = Math.max(0.08, Math.abs(pin.offset3d[0]) * 0.45);
    const trace = new THREE.Mesh(new THREE.BoxGeometry(traceLen, 0.008, 0.045), traceMat);
    trace.position.set(
      pin.offset3d[0] - Math.sign(pin.offset3d[0]) * (traceLen / 2),
      0.082,
      pin.offset3d[2]
    );
    group.add(trace);

    // Larger invisible pin raycast target for effortless snapping
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitSphere.position.set(pin.offset3d[0], pin.offset3d[1] + 0.05, pin.offset3d[2]);
    hitSphere.userData = {
      hitType: 'pin',
      componentId: comp.id,
      pinId: pin.id,
    };
    group.add(hitSphere);
    pinMeshes.set(pin.id, hitSphere);

    const pinRing = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.16, 20),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    pinRing.rotation.x = -Math.PI / 2;
    pinRing.position.set(pin.offset3d[0], pin.offset3d[1] + 0.09, pin.offset3d[2]);
    pinRing.visible = false;
    group.add(pinRing);
    pinRings.set(pin.id, pinRing);
  }

  // Component-specific procedural geometry & updater
  let updateVisuals: ComponentMeshHandle['updateVisuals'] = () => {};
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });

  switch (comp.type) {
    case 'RESISTOR': {
      const wireBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.75, 10), leadMat);
      wireBar.rotation.z = Math.PI / 2;
      wireBar.position.y = 0.24;
      tagHit(wireBar);
      group.add(wireBar);

      const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xe7c89b, roughness: 0.42 });
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.62, 20),
        ceramicMat
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.24;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      // Ceramic flared end caps (hourglass profile)
      for (const sx of [-0.34, 0.34]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.14, 20), ceramicMat);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(sx, 0.24, 0);
        cap.castShadow = true;
        tagHit(cap);
        group.add(cap);
      }

      const bandMats: THREE.MeshStandardMaterial[] = [];
      const bandPositions = [-0.22, -0.07, 0.08, 0.23];
      for (const bx of bandPositions) {
        const bm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
        bandMats.push(bm);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 20), bm);
        band.rotation.z = Math.PI / 2;
        band.position.set(bx, 0.24, 0);
        tagHit(band);
        group.add(band);
      }

      let lastOhms = -1;
      updateVisuals = (c) => {
        const ohms = Number(c.props.resistance ?? 220);
        if (ohms !== lastOhms) {
          lastOhms = ohms;
          const colors = computeResistorBandColors(ohms);
          bandMats.forEach((m, i) => m.color.setHex(colors[i]));
        }
      };
      break;
    }

    case 'POTENTIOMETER': {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.36, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })
      );
      box.position.y = 0.24;
      box.castShadow = true;
      tagHit(box);
      group.add(box);

      const nut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })
      );
      nut.position.set(0, 0.43, 0);
      group.add(nut);

      const knobPivot = new THREE.Group();
      knobPivot.position.set(0, 0.47, 0);
      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.23, 0.24, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.35 })
      );
      tagHit(knob);
      knobPivot.add(knob);
      // Knurled side ridges
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.22, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 })
        );
        rib.position.set(Math.cos(angle) * 0.215, 0, Math.sin(angle) * 0.215);
        rib.rotation.y = -angle;
        knobPivot.add(rib);
      }
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.035, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      marker.position.set(0, 0.13, -0.08);
      knobPivot.add(marker);
      group.add(knobPivot);

      updateVisuals = (c) => {
        const ratio = Number(c.props.ratio ?? 0.5);
        knobPivot.rotation.y = (0.5 - ratio) * Math.PI * 1.5;
      };
      break;
    }

    case 'CAPACITOR': {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.62, 24),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2 })
      );
      cyl.position.y = 0.42;
      cyl.castShadow = true;
      tagHit(cyl);
      group.add(cyl);

      const topCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.04, 24),
        leadMat
      );
      topCap.position.y = 0.74;
      tagHit(topCap);
      group.add(topCap);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.56, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
      );
      stripe.position.set(0.22, 0.42, 0);
      group.add(stripe);
      break;
    }

    case 'INDUCTOR': {
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
      );
      core.rotation.z = Math.PI / 2;
      core.position.y = 0.28;
      tagHit(core);
      group.add(core);

      const copperMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.25,
      });
      for (let i = -2; i <= 2; i++) {
        const turn = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 10, 20), copperMat);
        turn.rotation.y = Math.PI / 2;
        turn.position.set(i * 0.16, 0.28, 0);
        turn.castShadow = true;
        tagHit(turn);
        group.add(turn);
      }
      break;
    }

    case 'DIODE': {
      const wireBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 10), leadMat);
      wireBar.rotation.z = Math.PI / 2;
      wireBar.position.y = 0.24;
      group.add(wireBar);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.65, 20),
        new THREE.MeshStandardMaterial({
          color: 0xb45309,
          roughness: 0.2,
          transparent: true,
          opacity: 0.85,
        })
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.24;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const innerDie = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
      );
      innerDie.rotation.z = Math.PI / 2;
      innerDie.position.y = 0.24;
      group.add(innerDie);

      const cathodeBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.11, 20),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
      );
      cathodeBand.rotation.z = Math.PI / 2;
      cathodeBand.position.set(0.22, 0.24, 0);
      group.add(cathodeBand);
      break;
    }

    case 'LED': {
      const hexCol = getLedHexColor(comp.props.color);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: hexCol,
        emissive: hexCol,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), bulbMat);
      dome.position.y = 0.52;
      dome.castShadow = true;
      tagHit(dome);
      group.add(dome);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 24), bulbMat);
      barrel.position.y = 0.36;
      tagHit(barrel);
      group.add(barrel);

      const haloMat = new THREE.MeshBasicMaterial({
        color: hexCol,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.62, 32), haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.12;
      group.add(halo);

      let lastColorStr = String(comp.props.color ?? 'red');
      updateVisuals = (c, tel) => {
        const cStr = String(c.props.color ?? 'red');
        if (cStr !== lastColorStr) {
          lastColorStr = cStr;
          const nc = getLedHexColor(cStr);
          bulbMat.color.setHex(nc);
          bulbMat.emissive.setHex(nc);
          haloMat.color.setHex(nc);
        }
        const ma = (tel?.current ?? 0) * 1000;
        const glow = Math.min(2.6, Math.max(0.08, (ma / 15) * 1.8));
        bulbMat.emissiveIntensity = ma > 0.2 ? glow : 0.06;
        haloMat.opacity = ma > 0.4 ? Math.min(0.55, (ma / 20) * 0.45) : 0;
      };
      break;
    }

    case 'BJT_NPN': {
      const heatsink = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.66, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
      );
      heatsink.position.set(-0.08, 0.44, 0);
      heatsink.castShadow = true;
      tagHit(heatsink);
      group.add(heatsink);

      const pkg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.42, 16, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 })
      );
      pkg.position.y = 0.42;
      pkg.rotation.y = Math.PI / 2;
      pkg.castShadow = true;
      tagHit(pkg);
      group.add(pkg);

      const flatFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.42, 0.44),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
      );
      flatFace.position.y = 0.42;
      tagHit(flatFace);
      group.add(flatFace);
      break;
    }

    case 'INF_SOURCE': {
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.48, 0.98),
        new THREE.MeshStandardMaterial({ color: 0x3b0764, metalness: 0.4, roughness: 0.35 })
      );
      shell.position.y = 0.28;
      shell.castShadow = true;
      tagHit(shell);
      group.add(shell);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
        metalness: 0.7,
        roughness: 0.2,
      });
      const arcRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 12, 28), ringMat);
      arcRing.rotation.x = Math.PI / 2;
      arcRing.position.set(-0.28, 0.55, 0);
      tagHit(arcRing);
      group.add(arcRing);

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.8,
      });
      const coreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), coreMat);
      coreOrb.position.set(-0.28, 0.56, 0);
      group.add(coreOrb);

      const { texture, canvas, ctx } = createTextTexture('#020617', '#fbbf24', '∞ 12 V', '∞ SOURCE');
      const lcd = new THREE.Mesh(
        new THREE.PlaneGeometry(0.76, 0.58),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      lcd.rotation.x = -Math.PI / 2;
      lcd.position.set(0.26, 0.53, 0);
      tagHit(lcd);
      group.add(lcd);

      let lastInf = '';
      updateVisuals = (c, tel, t) => {
        coreMat.emissiveIntensity = 1.3 + 0.5 * Math.sin(t * 5);
        const vSet = Number(c.props.voltage ?? 12);
        const title = `∞ ${Math.abs(vSet) >= 1000 ? `${(vSet / 1000).toFixed(1)}kV` : `${vSet.toFixed(1)}V`}`;
        const cur = tel ? `${tel.current.toFixed(2)} A` : '无上限';
        const key = `${title}|${cur}`;
        if (key !== lastInf) {
          lastInf = key;
          drawTextCanvas(ctx, canvas, texture, '#020617', '#fbbf24', title, cur);
        }
      };
      break;
    }

    case 'INF_RESISTOR': {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.35, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 })
      );
      shaft.rotation.z = Math.PI / 2;
      shaft.position.y = 0.28;
      tagHit(shaft);
      group.add(shaft);

      const porcelainMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.25,
        metalness: 0.15,
      });
      for (const sx of [-0.36, -0.18, 0, 0.18, 0.36]) {
        const shed = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 20), porcelainMat);
        shed.rotation.z = Math.PI / 2;
        shed.position.set(sx, 0.28, 0);
        shed.castShadow = true;
        tagHit(shed);
        group.add(shed);
      }

      const { texture, canvas, ctx } = createTextTexture('#090d16', '#38bdf8', 'R = ∞ Ω', 'IDEAL OPEN');
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 0.36),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      plaque.rotation.x = -Math.PI / 2;
      plaque.position.set(0, 0.1, 0.38);
      group.add(plaque);

      let lastInfR = '';
      updateVisuals = (c) => {
        const ideal = c.props.idealInfinite !== false;
        const key = ideal ? 'INF' : String(c.props.resistance ?? 1e12);
        if (key !== lastInfR) {
          lastInfR = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#090d16',
            ideal ? '#38bdf8' : '#fbbf24',
            ideal ? 'R = ∞ Ω' : `${Number(c.props.resistance ?? 1e12).toExponential(1)}Ω`,
            ideal ? 'IDEAL OPEN' : 'ULTRA-HIGH R'
          );
        }
      };
      break;
    }

    case 'ZENER_DIODE': {
      const wireBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.65, 10), leadMat);
      wireBar.rotation.z = Math.PI / 2;
      wireBar.position.y = 0.24;
      group.add(wireBar);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.65, 20), glassMat);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.24;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const cathodeBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.166, 0.166, 0.11, 20),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.2 })
      );
      cathodeBand.rotation.z = Math.PI / 2;
      cathodeBand.position.set(0.22, 0.24, 0);
      group.add(cathodeBand);

      updateVisuals = (_c, tel) => {
        const clamping = (tel?.current ?? 0) < -1e-4;
        glassMat.emissive.setHex(clamping ? 0x38bdf8 : 0x0284c7);
        glassMat.emissiveIntensity = clamping ? 1.5 : 0.15;
      };
      break;
    }

    case 'NMOS': {
      const finBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.68, 0.56),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 })
      );
      finBase.position.set(-0.08, 0.44, 0);
      finBase.castShadow = true;
      tagHit(finBase);
      group.add(finBase);

      const mosPkg = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.46, 0.52),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
      );
      mosPkg.position.set(0.08, 0.36, 0);
      mosPkg.castShadow = true;
      tagHit(mosPkg);
      group.add(mosPkg);

      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x22c55e,
        emissiveIntensity: 0,
      });
      const ind = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), ledMat);
      ind.position.set(0.08, 0.62, 0);
      group.add(ind);

      updateVisuals = (c, tel) => {
        const vth = Number(c.props.vth ?? 2.0);
        const vgs = (tel?.pinVoltages.g ?? 0) - (tel?.pinVoltages.s ?? 0);
        const on = vgs > vth;
        ledMat.color.setHex(on ? 0x22c55e : 0x334155);
        ledMat.emissiveIntensity = on ? 1.8 : 0;
      };
      break;
    }

    case 'TRANSFORMER': {
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
      for (const zFrame of [-0.36, 0.36]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.42, 0.14), coreMat);
        bar.position.set(0, 0.32, zFrame);
        bar.castShadow = true;
        tagHit(bar);
        group.add(bar);
      }
      for (const xLeg of [-0.46, 0.46]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.86), coreMat);
        leg.position.set(xLeg, 0.32, 0);
        leg.castShadow = true;
        tagHit(leg);
        group.add(leg);
      }
      const priMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 });
      const secMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.7, roughness: 0.3 });
      for (let i = -2; i <= 2; i++) {
        const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 8, 18), priMat);
        t1.position.set(-0.24, 0.32, i * 0.1);
        group.add(t1);
        const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 8, 18), secMat);
        t2.position.set(0.24, 0.32, i * 0.1);
        group.add(t2);
      }
      break;
    }

    case 'LAMP': {
      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 0.22, 20),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 })
      );
      socket.position.y = 0.2;
      tagHit(socket);
      group.add(socket);

      const filamentMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.1,
      });
      const filament = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 16), filamentMat);
      filament.position.y = 0.54;
      group.add(filament);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 0.52,
        roughness: 0.12,
      });
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), glassMat);
      globe.position.y = 0.56;
      tagHit(globe);
      group.add(globe);

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.78, 32), haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.11;
      group.add(halo);

      updateVisuals = (c, tel) => {
        const pRated = Math.max(0.05, Number(c.props.ratedPower ?? 1.5));
        const ratio = Math.min(1.6, Math.max(0, (tel?.power ?? 0) / pRated));
        filamentMat.emissiveIntensity = 0.1 + ratio * 2.8;
        glassMat.emissiveIntensity = 0.04 + ratio * 1.4;
        haloMat.opacity = ratio > 0.03 ? Math.min(0.65, ratio * 0.45) : 0;
      };
      break;
    }

    case 'FUSE': {
      for (const sx of [-0.52, 0.52]) {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.22, 16),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 })
        );
        cap.rotation.z = Math.PI / 2;
        cap.position.set(sx, 0.28, 0);
        tagHit(cap);
        group.add(cap);
      }
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.84, 18),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          transparent: true,
          opacity: 0.42,
          roughness: 0.1,
        })
      );
      glass.rotation.z = Math.PI / 2;
      glass.position.y = 0.28;
      tagHit(glass);
      group.add(glass);

      const intactWire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.84, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8, roughness: 0.2 })
      );
      intactWire.rotation.z = Math.PI / 2;
      intactWire.position.y = 0.28;
      group.add(intactWire);

      const blownHalfL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.6 })
      );
      blownHalfL.rotation.z = Math.PI / 2 - 0.22;
      blownHalfL.position.set(-0.28, 0.3, 0);
      blownHalfL.visible = false;
      group.add(blownHalfL);

      const blownHalfR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.28, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.6 })
      );
      blownHalfR.rotation.z = Math.PI / 2 + 0.22;
      blownHalfR.position.set(0.28, 0.3, 0);
      blownHalfR.visible = false;
      group.add(blownHalfR);

      updateVisuals = (c, tel) => {
        const isBlown = Boolean(c.props.blown) || Boolean(tel?.extraInfo?.includes('已熔断'));
        intactWire.visible = !isBlown;
        blownHalfL.visible = isBlown;
        blownHalfR.visible = isBlown;
      };
      break;
    }

    case 'SWITCH_SPST':
    case 'SWITCH_SPDT': {
      const pivot = new THREE.Group();
      pivot.position.set(-0.55, 0.22, 0);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.07, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 })
      );
      arm.position.set(0.55, 0, 0);
      tagHit(arm);
      pivot.add(arm);

      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
      );
      handle.position.set(1.1, 0.06, 0);
      tagHit(handle);
      pivot.add(handle);
      group.add(pivot);

      updateVisuals = (c) => {
        if (c.type === 'SWITCH_SPST') {
          const closed = Boolean(c.props.closed ?? true);
          pivot.rotation.z = closed ? 0 : 0.48;
        } else {
          const pos = Number(c.props.position ?? 0);
          pivot.rotation.y = pos === 0 ? 0.35 : -0.35;
        }
      };
      break;
    }

    case 'DC_SOURCE':
    case 'AC_SOURCE':
    case 'CURRENT_SOURCE': {
      const bodyColor =
        comp.type === 'DC_SOURCE'
          ? 0x1e3a8a
          : comp.type === 'AC_SOURCE'
          ? 0x312e81
          : 0x064e3b;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.48, 0.95),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45, metalness: 0.2 })
      );
      body.position.y = 0.28;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const screenTitle =
        comp.type === 'DC_SOURCE'
          ? `${Number(comp.props.voltage ?? 5).toFixed(1)} V`
          : comp.type === 'AC_SOURCE'
          ? `${Number(comp.props.amplitude ?? 5).toFixed(1)}V ${Number(comp.props.frequency ?? 2)}Hz`
          : `${(Number(comp.props.current ?? 0.02) * 1000).toFixed(0)} mA`;

      const { texture, canvas, ctx } = createTextTexture('#020617', '#38bdf8', screenTitle, comp.label);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 0.56),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.53;
      tagHit(screen);
      group.add(screen);

      let lastStr = screenTitle;
      updateVisuals = (c, tel) => {
        let nextTitle = '';
        if (c.type === 'DC_SOURCE') {
          nextTitle = `${Number(c.props.voltage ?? 5).toFixed(1)} V`;
        } else if (c.type === 'AC_SOURCE') {
          nextTitle = `${Number(c.props.amplitude ?? 5).toFixed(1)}V ${Number(c.props.frequency ?? 2)}Hz`;
        } else {
          nextTitle = `${(Number(c.props.current ?? 0.02) * 1000).toFixed(1)} mA`;
        }
        const sub = tel ? `${(tel.current * 1000).toFixed(1)} mA` : c.label;
        const key = `${nextTitle}|${sub}`;
        if (key !== lastStr) {
          lastStr = key;
          drawTextCanvas(ctx, canvas, texture, '#020617', '#38bdf8', nextTitle, sub);
        }
      };
      break;
    }

    case 'GROUND': {
      const brass = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 12), brass);
      stem.position.y = 0.2;
      tagHit(stem);
      group.add(stem);

      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.12), brass);
      bar1.position.set(0, 0.1, 0.16);
      group.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.12), brass);
      bar2.position.set(0, 0.1, 0.32);
      group.add(bar2);
      const bar3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.12), brass);
      bar3.position.set(0, 0.1, 0.46);
      group.add(bar3);
      break;
    }

    case 'VOLTMETER':
    case 'AMMETER': {
      const isVolt = comp.type === 'VOLTMETER';
      const caseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.44, 0.95),
        new THREE.MeshStandardMaterial({
          color: isVolt ? 0x0f766e : 0xb45309,
          roughness: 0.4,
          metalness: 0.2,
        })
      );
      caseMesh.position.y = 0.28;
      caseMesh.castShadow = true;
      tagHit(caseMesh);
      group.add(caseMesh);

      const { texture, canvas, ctx } = createTextTexture(
        '#052e16',
        '#4ade80',
        isVolt ? '0.00 V' : '0.0 mA',
        comp.label
      );
      const lcd = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 0.62),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      lcd.rotation.x = -Math.PI / 2;
      lcd.position.y = 0.51;
      tagHit(lcd);
      group.add(lcd);

      let lastTxt = '';
      updateVisuals = (c, tel) => {
        const valText = isVolt
          ? `${(tel?.voltageDrop ?? 0).toFixed(2)} V`
          : Math.abs(tel?.current ?? 0) >= 1
          ? `${(tel?.current ?? 0).toFixed(2)} A`
          : `${((tel?.current ?? 0) * 1000).toFixed(1)} mA`;
        const key = `${valText}|${c.label}`;
        if (key !== lastTxt) {
          lastTxt = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#022c22',
            isVolt ? '#34d399' : '#fbbf24',
            valText,
            c.label
          );
        }
      };
      break;
    }

    case 'LOGIC_IN':
    case 'CLOCK': {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.3, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
      );
      box.position.y = 0.2;
      box.castShadow = true;
      tagHit(box);
      group.add(box);

      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x22c55e,
        emissiveIntensity: 0,
      });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), ledMat);
      lamp.position.set(0.15, 0.39, 0);
      tagHit(lamp);
      group.add(lamp);

      const labelText =
        comp.type === 'LOGIC_IN'
          ? String(comp.props.varName || comp.label)
          : 'CLK';
      const { texture, canvas, ctx } = createTextTexture('#0f172a', '#e2e8f0', labelText, '0');
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.5),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      badge.rotation.x = -Math.PI / 2;
      badge.position.set(-0.22, 0.36, 0);
      tagHit(badge);
      group.add(badge);

      let lastStateStr = '';
      updateVisuals = (c, tel) => {
        const high = (tel?.logicState ?? 0) === 1;
        ledMat.color.setHex(high ? 0x22c55e : 0x334155);
        ledMat.emissiveIntensity = high ? 1.5 : 0;
        const name =
          c.type === 'LOGIC_IN' ? String(c.props.varName || c.label) : 'CLK';
        const key = `${name}|${high ? '1' : '0'}`;
        if (key !== lastStateStr) {
          lastStateStr = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            high ? '#064e3b' : '#0f172a',
            high ? '#4ade80' : '#94a3b8',
            name,
            high ? '1 (5V)' : '0 (0V)'
          );
        }
      };
      break;
    }

    case 'LOGIC_OUT': {
      const bezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.38, 0.24, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 })
      );
      bezel.position.y = 0.18;
      tagHit(bezel);
      group.add(bezel);

      const jewelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x10b981,
        emissiveIntensity: 0,
        roughness: 0.2,
      });
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), jewelMat);
      jewel.position.y = 0.32;
      tagHit(jewel);
      group.add(jewel);

      updateVisuals = (_c, tel) => {
        const high = (tel?.logicState ?? 0) === 1;
        jewelMat.color.setHex(high ? 0x22c55e : 0x1e293b);
        jewelMat.emissiveIntensity = high ? 2.0 : 0;
      };
      break;
    }

    case 'HEX_DISPLAY': {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.32, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.45 })
      );
      housing.position.y = 0.22;
      housing.castShadow = true;
      tagHit(housing);
      group.add(housing);

      // 7 segment bars (a, b, c, d, e, f, g) on top face
      const segConfigs: Array<[number, number, number, number]> = [
        [0, -0.34, 0.36, 0.08], // a top
        [0.2, -0.17, 0.08, 0.3], // b top-right
        [0.2, 0.17, 0.08, 0.3], // c bottom-right
        [0, 0.34, 0.36, 0.08], // d bottom
        [-0.2, 0.17, 0.08, 0.3], // e bottom-left
        [-0.2, -0.17, 0.08, 0.3], // f top-left
        [0, 0, 0.36, 0.08], // g middle
      ];
      const segMats: THREE.MeshStandardMaterial[] = [];
      for (const [sx, sz, w, d] of segConfigs) {
        const sm = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: 0xef4444,
          emissiveIntensity: 0,
        });
        segMats.push(sm);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), sm);
        bar.position.set(sx + 0.1, 0.39, sz);
        tagHit(bar);
        group.add(bar);
      }

      updateVisuals = (_c, tel) => {
        const val = Math.max(0, Math.min(15, tel?.logicState ?? 0));
        const pattern = SEVEN_SEG_MAP[val] ?? SEVEN_SEG_MAP[0];
        segMats.forEach((sm, idx) => {
          const on = pattern[idx] === 1;
          sm.color.setHex(on ? 0xef4444 : 0x1e293b);
          sm.emissiveIntensity = on ? 1.8 : 0;
        });
      };
      break;
    }

    case 'IC_PORT_IN':
    case 'IC_PORT_OUT': {
      const isIn = comp.type === 'IC_PORT_IN';
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.28, 0.72),
        new THREE.MeshStandardMaterial({
          color: isIn ? 0x0f172a : 0x052e16,
          roughness: 0.4,
          metalness: 0.25,
        })
      );
      body.position.y = 0.22;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: isIn ? 0x38bdf8 : 0x22c55e,
        emissiveIntensity: 0.2,
      });
      const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), ledMat);
      jewel.position.set(isIn ? 0.22 : -0.22, 0.38, 0);
      tagHit(jewel);
      group.add(jewel);

      const { texture, canvas, ctx } = createTextTexture(
        '#020617',
        isIn ? '#38bdf8' : '#4ade80',
        comp.label,
        isIn ? 'PORT IN' : 'PORT OUT'
      );
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.48, 0.48),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      badge.rotation.x = -Math.PI / 2;
      badge.position.set(isIn ? -0.18 : 0.18, 0.365, 0);
      tagHit(badge);
      group.add(badge);

      let lastPortKey = '';
      updateVisuals = (c, tel) => {
        const high = (tel?.logicState ?? 0) === 1;
        ledMat.color.setHex(high ? (isIn ? 0x38bdf8 : 0x22c55e) : 0x334155);
        ledMat.emissiveIntensity = high ? 1.8 : 0.15;
        const key = `${c.label}|${high ? '1' : '0'}`;
        if (key !== lastPortKey) {
          lastPortKey = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#020617',
            high ? '#4ade80' : isIn ? '#38bdf8' : '#94a3b8',
            c.label,
            high ? 'HIGH (1)' : isIn ? 'PORT IN' : 'PORT OUT'
          );
        }
      };
      break;
    }

    case 'COUNTER_4BIT': {
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.28, 1.32),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.2 })
      );
      chip.position.y = 0.22;
      chip.castShadow = true;
      tagHit(chip);
      group.add(chip);

      for (const p of pins) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.07), leadMat);
        leg.position.set(p.offset3d[0] * 0.72, 0.14, p.offset3d[2]);
        group.add(leg);
      }

      const bitMats: THREE.MeshStandardMaterial[] = [];
      for (let i = 0; i < 4; i++) {
        const bm = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          emissive: 0x22c55e,
          emissiveIntensity: 0,
        });
        bitMats.push(bm);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), bm);
        led.position.set(0.46, 0.37, (i - 1.5) * 0.32);
        group.add(led);
      }

      const { texture, canvas, ctx } = createTextTexture('#020617', '#38bdf8', '4位计数器', 'CNT=0');
      const topLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.96),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      topLabel.rotation.x = -Math.PI / 2;
      topLabel.position.set(-0.14, 0.37, 0);
      tagHit(topLabel);
      group.add(topLabel);

      let lastCnt = -1;
      updateVisuals = (_c, tel) => {
        const val = (tel?.logicState ?? 0) & 0x0f;
        for (let i = 0; i < 4; i++) {
          const on = ((val >> (3 - i)) & 1) === 1;
          bitMats[i].color.setHex(on ? 0x22c55e : 0x1e293b);
          bitMats[i].emissiveIntensity = on ? 1.8 : 0;
        }
        if (val !== lastCnt) {
          lastCnt = val;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#020617',
            '#4ade80',
            `CNT=${val}`,
            `0b${val.toString(2).padStart(4, '0')}`
          );
        }
      };
      break;
    }

    case 'CUSTOM_TRUTH_8':
    case 'CUSTOM_TRUTH_16':
    case 'CUSTOM_IC': {
      const isIc = comp.type === 'CUSTOM_IC';
      const icPayload = isIc ? parseCustomIcPayload(comp) : null;
      const truthCfg = !isIc ? parseTruthChipConfig(comp) : null;

      const chipW = padW - 0.56;
      const chipD = Math.max(0.86, padD - 0.36);
      const capColor = isIc
        ? new THREE.Color(icPayload!.color || '#0284c7').getHex()
        : comp.type === 'CUSTOM_TRUTH_16'
        ? 0x7c3aed
        : 0x0891b2;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(chipW, 0.28, chipD),
        new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.42, metalness: 0.22 })
      );
      body.position.y = 0.22;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      // Colored anodized top bezel trim
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(chipW - 0.08, 0.03, chipD - 0.08),
        new THREE.MeshStandardMaterial({ color: capColor, metalness: 0.65, roughness: 0.25 })
      );
      rim.position.y = 0.365;
      tagHit(rim);
      group.add(rim);

      // Pin-1 dimple notch on top edge
      const notch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 })
      );
      notch.position.set(0, 0.37, -chipD / 2 + 0.12);
      group.add(notch);

      // UV EPROM quartz silicon window for Truth Chips
      if (!isIc) {
        const dieWindow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.04, 18),
          new THREE.MeshStandardMaterial({
            color: 0x312e81,
            emissive: 0x6366f1,
            emissiveIntensity: 0.45,
            roughness: 0.15,
            metalness: 0.5,
          })
        );
        dieWindow.position.set(0, 0.38, -chipD * 0.24);
        group.add(dieWindow);
      }

      // Metallic DIP leads extending from body to pins
      for (const p of pins) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), leadMat);
        leg.position.set(p.offset3d[0] * 0.72, 0.14, p.offset3d[2]);
        group.add(leg);
      }

      const titleText = isIc
        ? icPayload!.codeName || icPayload!.name
        : truthCfg!.chipName.slice(0, 10);
      const subText = isIc ? icPayload!.name.slice(0, 14) : `${pins.length} PIN LUT`;
      const { texture, canvas, ctx } = createTextTexture('#020617', '#f8fafc', titleText, subText, 256, 192);
      const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(chipW - 0.22, chipD - 0.34),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.set(0, 0.385, isIc ? 0.04 : 0.12);
      tagHit(labelMesh);
      group.add(labelMesh);

      let lastDisp = '';
      updateVisuals = (_c, tel) => {
        const statusSub = isIc
          ? `${pins.length}脚 · ${(tel?.power ?? 0).toFixed(2)}W`
          : `${tel?.extraInfo?.split('·')[1]?.trim() || subText}`;
        const key = `${titleText}|${statusSub}`;
        if (key !== lastDisp) {
          lastDisp = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#020617',
            tel?.logicState ? '#4ade80' : '#38bdf8',
            titleText,
            statusSub
          );
        }
      };
      break;
    }

    default: {
      // OPAMP & Logic Gate DIP IC Packages with Pin-1 notch & side gull-wing pins
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.28, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.18 })
      );
      chip.position.y = 0.22;
      chip.castShadow = true;
      tagHit(chip);
      group.add(chip);

      const notch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.04, 14),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
      );
      notch.position.set(-0.46, 0.355, 0);
      group.add(notch);

      // DIP side metallic pins
      for (let i = -2; i <= 2; i++) {
        for (const zSide of [-0.46, 0.46]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), leadMat);
          leg.position.set(i * 0.2, 0.16, zSide);
          group.add(leg);
        }
      }

      const { texture, canvas, ctx } = createTextTexture('#020617', '#e2e8f0', spec.shortName, comp.label);
      const topLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.65),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      topLabel.rotation.x = -Math.PI / 2;
      topLabel.position.y = 0.37;
      tagHit(topLabel);
      group.add(topLabel);

      let lastChipStr = '';
      updateVisuals = (c, tel) => {
        const sub =
          c.type === 'OPAMP'
            ? `${(tel?.voltageDrop ?? 0).toFixed(2)}V`
            : `OUT=${tel?.logicState ?? 0}`;
        const key = `${spec.shortName}|${sub}`;
        if (key !== lastChipStr) {
          lastChipStr = key;
          drawTextCanvas(
            ctx,
            canvas,
            texture,
            '#020617',
            tel?.logicState ? '#4ade80' : '#38bdf8',
            spec.shortName,
            sub
          );
        }
      };
      break;
    }
  }

  return {
    group,
    meshSignature,
    pinMeshes,
    pinRings,
    selectionRing,
    overloadRing,
    updateVisuals,
  };
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) {
      (obj as THREE.Mesh).geometry.dispose();
    }
    const mat = (obj as THREE.Mesh).material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const basic = m as THREE.MeshBasicMaterial;
        if (basic.map) basic.map.dispose();
        m.dispose();
      }
    }
  });
}
