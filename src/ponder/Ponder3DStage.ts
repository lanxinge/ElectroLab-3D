import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ComponentType } from '../../shared/types';
import { disposeObject3D } from '../sim3d/meshes';
import { PONDER_DATA } from './ponderData';
import { buildCreatePedestal } from './ponderPrimitives';
import { PONDER_SCENE_BUILDERS } from './ponderSceneRegistry';
import type {
  PonderDioramaHandle,
  PonderLiveMetric,
  PonderModuleSpec,
  PonderProjectedCallout,
} from './ponderTypes';

interface StageCallbacks {
  onCalloutsProjected: (callouts: PonderProjectedCallout[]) => void;
  onLiveMetrics: (metrics: PonderLiveMetric[]) => void;
  onWebglError?: (err: string) => void;
}

export class Ponder3DStage {
  private container: HTMLElement;
  private callbacks: StageCallbacks;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private pedestal: THREE.Group;
  private dioramaSlot = new THREE.Group();
  private dioramaHandle: PonderDioramaHandle | null = null;
  private currentSpec: PonderModuleSpec | null = null;

  private rafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;

  private stepIndex = 0;
  private stepProgress = 0;
  private params: Record<string, number> = {};

  private camGoalPos = new THREE.Vector3(4.1, 3.1, 4.3);
  private camGoalTarget = new THREE.Vector3(0, 0.55, 0);
  private camAnimating = false;

  private lastProjSignature = '';
  private lastMetricTick = 0;
  private startTime = performance.now();

  constructor(container: HTMLElement, callbacks: StageCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const w = Math.max(320, container.clientWidth);
    const h = Math.max(240, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    this.camera.position.copy(this.camGoalPos);

    this.scene.background = new THREE.Color(0x0b1120);

    // Create-Mod studio lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.05);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.45);
    key.position.set(5, 8, 6);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rim.position.set(-5, 4, -5);
    this.scene.add(hemi, key, rim);

    // Pedestal + diorama container
    this.pedestal = buildCreatePedestal();
    this.scene.add(this.pedestal);
    this.scene.add(this.dioramaSlot);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h);
      this.container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 2.6;
      this.controls.maxDistance = 10.5;
      this.controls.maxPolarAngle = Math.PI * 0.48;
      this.controls.target.copy(this.camGoalTarget);

      this.controls.addEventListener('start', () => {
        this.camAnimating = false;
      });
    } catch (e) {
      this.callbacks.onWebglError?.(e instanceof Error ? e.message : 'WebGL 初始化失败');
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }

    this.animate();
  }

  private handleResize() {
    if (!this.renderer || this.disposed) return;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.lastProjSignature = '';
  }

  public loadModule(type: ComponentType, initialParams: Record<string, number>) {
    if (this.dioramaHandle) {
      this.dioramaSlot.remove(this.dioramaHandle.root);
      disposeObject3D(this.dioramaHandle.root);
      this.dioramaHandle = null;
    }

    this.currentSpec = PONDER_DATA[type];
    this.params = { ...initialParams };
    this.stepIndex = 0;
    this.stepProgress = 0;

    const builder = PONDER_SCENE_BUILDERS[type];
    this.dioramaHandle = builder();
    this.dioramaSlot.add(this.dioramaHandle.root);

    const step0Cam = this.currentSpec.steps[0]?.camera;
    if (step0Cam) {
      this.camera.position.set(...step0Cam.position);
      this.camGoalPos.set(...step0Cam.position);
      this.camGoalTarget.set(...step0Cam.target);
      if (this.controls) {
        this.controls.target.copy(this.camGoalTarget);
        this.controls.update();
      }
      this.camAnimating = false;
    }
    this.lastProjSignature = '';
    this.lastMetricTick = 0;
  }

  public setStep(stepIndex: number, snapCamera = false) {
    if (!this.currentSpec) return;
    const clamped = Math.max(0, Math.min(this.currentSpec.steps.length - 1, stepIndex));
    this.stepIndex = clamped;
    const kf = this.currentSpec.steps[clamped]?.camera;
    if (kf) {
      this.camGoalPos.set(...kf.position);
      this.camGoalTarget.set(...kf.target);
      if (snapCamera) {
        this.camera.position.copy(this.camGoalPos);
        this.controls?.target.copy(this.camGoalTarget);
        this.camAnimating = false;
      } else {
        this.camAnimating = true;
      }
    }
    this.lastProjSignature = '';
  }

  public updatePlayback(stepIndex: number, stepProgress: number, params: Record<string, number>) {
    this.stepIndex = stepIndex;
    this.stepProgress = stepProgress;
    this.params = params;
  }

  private animate = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    if (this.camAnimating && this.controls) {
      this.camera.position.lerp(this.camGoalPos, 0.08);
      this.controls.target.lerp(this.camGoalTarget, 0.08);
      if (
        this.camera.position.distanceTo(this.camGoalPos) < 0.03 &&
        this.controls.target.distanceTo(this.camGoalTarget) < 0.03
      ) {
        this.camAnimating = false;
      }
    }
    this.controls?.update();

    // Subtle floating pedestal hover
    const floatY = Math.sin(elapsed * 1.4) * 0.025;
    this.pedestal.position.y = floatY;
    this.dioramaSlot.position.y = floatY;

    if (this.dioramaHandle) {
      this.dioramaHandle.update(elapsed, this.stepIndex, this.stepProgress, this.params);
      if (now - this.lastMetricTick > 110) {
        this.lastMetricTick = now;
        const metrics = this.dioramaHandle.getLiveReadout?.(elapsed, this.stepIndex, this.params) ?? [];
        this.callbacks.onLiveMetrics(metrics);
      }
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }

    this.projectCallouts();
  };

  private projectCallouts() {
    if (!this.currentSpec) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w < 10 || h < 10) return;

    const tmp = new THREE.Vector3();
    const projected: PonderProjectedCallout[] = [];
    let sig = `${this.stepIndex}|`;

    const maxBoxY = Math.max(58, h - 130);

    for (const c of this.currentSpec.callouts) {
      const visibleInStep = !c.stepIndices || c.stepIndices.includes(this.stepIndex);
      if (!visibleInStep) continue;

      tmp.set(c.worldPos[0], c.worldPos[1] + this.dioramaSlot.position.y, c.worldPos[2]);
      tmp.project(this.camera);

      if (tmp.z > 1) continue;
      const sx = (tmp.x * 0.5 + 0.5) * w;
      const sy = (-tmp.y * 0.5 + 0.5) * h;

      const side: 'left' | 'right' = sx < w * 0.5 ? 'left' : 'right';
      const boxX = Math.max(16, Math.min(w - 170, side === 'left' ? sx - 135 : sx + 42));
      const boxY = Math.max(54, Math.min(maxBoxY, sy - 38));

      projected.push({
        id: c.id,
        title: c.title,
        detail: c.detail,
        color: c.color ?? '#38bdf8',
        screenX: sx,
        screenY: sy,
        boxX,
        boxY,
        side,
        visible: true,
      });
    }

    // De-overlap vertically within each side ('left' and 'right') separately
    for (const side of ['left', 'right'] as const) {
      const sub = projected.filter((p) => p.side === side).sort((a, b) => a.boxY - b.boxY);
      if (sub.length > 1) {
        for (let i = 1; i < sub.length; i++) {
          sub[i].boxY = Math.max(sub[i].boxY, sub[i - 1].boxY + 54);
        }
        if (sub[sub.length - 1].boxY > maxBoxY) {
          sub[sub.length - 1].boxY = maxBoxY;
        }
        for (let i = sub.length - 2; i >= 0; i--) {
          sub[i].boxY = Math.max(50, Math.min(sub[i].boxY, sub[i + 1].boxY - 54));
        }
      }
    }

    for (const p of projected) {
      sig += `${p.id}:${Math.round(p.screenX)},${Math.round(p.screenY)},${Math.round(p.boxY)};`;
    }

    if (sig !== this.lastProjSignature) {
      this.lastProjSignature = sig;
      this.callbacks.onCalloutsProjected(projected);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    if (this.dioramaHandle) {
      disposeObject3D(this.dioramaHandle.root);
      this.dioramaHandle = null;
    }
    disposeObject3D(this.pedestal);
    this.controls?.dispose();
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
