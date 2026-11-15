import * as THREE from 'three';
import type { CircuitComponent, ComponentTelemetry } from '../../shared/types';
import { COMPONENT_CATALOG } from '../engine/componentCatalog';

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
  const pinMeshes = new Map<string, THREE.Mesh>();
  const pinRings = new Map<string, THREE.Mesh>();

  // Helper to tag component hitboxes
  const tagHit = (obj: THREE.Object3D) => {
    obj.userData = { hitType: 'component', componentId: comp.id };
  };

  // Base PCB carrier pad
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.25,
  });
  const basePad = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.25), baseMat);
  basePad.position.y = 0.04;
  basePad.receiveShadow = true;
  basePad.castShadow = true;
  tagHit(basePad);
  group.add(basePad);

  // Invisible generous drag hitbox
  const dragBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.75, 1.3),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dragBox.position.y = 0.38;
  tagHit(dragBox);
  group.add(dragBox);

  // Selection ring
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(1.08, 1.18, 40),
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
    new THREE.RingGeometry(1.18, 1.34, 40),
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

  // Add Pins
  for (const pin of spec.pins) {
    const postColor =
      pin.role === 'pos'
        ? 0xef4444
        : pin.role === 'neg'
        ? 0x334155
        : pin.role === 'logic_out'
        ? 0x22c55e
        : 0xeab308;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.075, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 })
    );
    post.position.set(pin.offset3d[0], pin.offset3d[1], pin.offset3d[2]);
    post.castShadow = true;
    group.add(post);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 14),
      new THREE.MeshStandardMaterial({ color: postColor, roughness: 0.5 })
    );
    collar.position.set(pin.offset3d[0], pin.offset3d[1] - 0.07, pin.offset3d[2]);
    group.add(collar);

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

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.72, 20),
        new THREE.MeshStandardMaterial({ color: 0xe7c89b, roughness: 0.5 })
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.24;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const bandMats: THREE.MeshStandardMaterial[] = [];
      const bandPositions = [-0.22, -0.07, 0.08, 0.23];
      for (const bx of bandPositions) {
        const bm = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        bandMats.push(bm);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.166, 0.166, 0.055, 20), bm);
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
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 })
      );
      box.position.y = 0.24;
      box.castShadow = true;
      tagHit(box);
      group.add(box);

      const knobPivot = new THREE.Group();
      knobPivot.position.set(0, 0.44, 0);
      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.35 })
      );
      tagHit(knob);
      knobPivot.add(knob);
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      marker.position.set(0, 0.12, -0.08);
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
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.24;
      body.castShadow = true;
      tagHit(body);
      group.add(body);

      const cathodeBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.1, 20),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.3 })
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
      const pkg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.42, 16, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      pkg.position.y = 0.42;
      pkg.rotation.y = Math.PI / 2;
      pkg.castShadow = true;
      tagHit(pkg);
      group.add(pkg);

      const flatFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.42, 0.44),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      flatFace.position.y = 0.42;
      tagHit(flatFace);
      group.add(flatFace);
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

    default: {
      // OPAMP & Logic Gate DIP IC Packages
      const chip = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.28, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.15 })
      );
      chip.position.y = 0.22;
      chip.castShadow = true;
      tagHit(chip);
      group.add(chip);

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
