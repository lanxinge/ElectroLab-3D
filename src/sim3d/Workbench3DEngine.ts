import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  CircuitComponent,
  ComponentTelemetry,
  PinRef,
  Wire,
  WireTelemetry,
} from '../../shared/types';
import { COMPONENT_CATALOG, getComponentMeshSignature, getPinWorld3D } from '../engine/componentCatalog';
import { buildComponentMesh, disposeObject3D, type ComponentMeshHandle } from './meshes';
import type { ActiveTool, SelectedEntity } from '../store/useCircuitStore';

export interface ProjectedLabel {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface EngineCallbacks {
  getState: () => {
    components: CircuitComponent[];
    wires: Wire[];
    selected: SelectedEntity | null;
    activeTool: ActiveTool;
    telemetryById: Record<string, ComponentTelemetry>;
    wireTelemetryById: Record<string, WireTelemetry>;
    isRunning: boolean;
    simTime: number;
    timeScale?: number;
    wiringDraftFrom: PinRef | null;
    show3DLabels: boolean;
    highlightedIds?: string[];
  };
  onSelect: (sel: SelectedEntity | null) => void;
  onDeleteEntity: (kind: 'component' | 'wire', id: string) => void;
  onStartDragHistory: () => void;
  onMoveComponent3D: (id: string, pos: [number, number, number]) => void;
  onToggleInteractive: (id: string) => void;
  onSetWiringDraft: (pin: PinRef | null) => void;
  onCompleteWire: (from: PinRef, to: PinRef) => void;
  onLabelsUpdated: (labels: ProjectedLabel[]) => void;
  onHoverPinChange: (pin: PinRef | null) => void;
  onHoverComponentChange?: (
    hit: { componentId: string; clientX: number; clientY: number } | null
  ) => void;
}

interface WireMeshRecord {
  wire: Wire;
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  particles: THREE.Mesh[];
  particleMat: THREE.MeshBasicMaterial;
  phases: number[];
}

export class Workbench3DEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private resizeObserver: ResizeObserver;
  private animFrameId = 0;
  private lastTimestamp = 0;
  private acVisualClock = 0;
  private disposed = false;

  private compHandles = new Map<string, ComponentMeshHandle>();
  private wireRecords = new Map<string, WireMeshRecord>();
  private wireGroup = new THREE.Group();
  private compGroup = new THREE.Group();
  private previewWireMesh: THREE.Mesh | null = null;
  private snapIndicator: THREE.Mesh;

  // Drag state
  private dragCompId: string | null = null;
  private dragOffset = new THREE.Vector3();
  private dragStartClient = { x: 0, y: 0 };
  private dragCommittedHistory = false;

  private wiringDragStartedFrom: PinRef | null = null;
  private hoveredPin: PinRef | null = null;
  private hoveredCompId: string | null = null;
  private particleGeom = new THREE.SphereGeometry(0.068, 10, 10);

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090f1c);
    this.scene.fog = new THREE.FogExp2(0x090f1c, 0.016);

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 150);
    this.camera.position.set(0, 11.5, 11.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 32;
    this.controls.target.set(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xcbd5e1, 0.75);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.65);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(8, 16, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 45;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 14;
    dirLight.shadow.camera.bottom = -14;
    this.scene.add(dirLight);

    // Lab Table / Workbench Board
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15,
    });
    const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 24), tableMat);
    tableMesh.position.y = -0.21;
    tableMesh.receiveShadow = true;
    this.scene.add(tableMesh);

    const grid = new THREE.GridHelper(32, 32, 0x1d4ed8, 0x1e293b);
    grid.position.y = 0.002;
    this.scene.add(grid);

    const border = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-16, 0.01, -11),
        new THREE.Vector3(16, 0.01, -11),
        new THREE.Vector3(16, 0.01, 11),
        new THREE.Vector3(-16, 0.01, 11),
      ]),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    this.scene.add(border);

    this.snapIndicator = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      })
    );
    this.snapIndicator.rotation.x = -Math.PI / 2;
    this.snapIndicator.visible = false;
    this.scene.add(this.snapIndicator);

    this.scene.add(this.compGroup);
    this.scene.add(this.wireGroup);

    // Event bindings
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerleave', this.handlePointerLeave);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    dom.addEventListener('contextmenu', this.handleContextMenu);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.syncSceneFromStore();
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  public setCameraPreset(preset: 'iso' | 'top' | 'front'): void {
    this.controls.target.set(0, 0, 0);
    if (preset === 'top') {
      this.camera.position.set(0, 16, 0.01);
    } else if (preset === 'front') {
      this.camera.position.set(0, 6.5, 14);
    } else {
      this.camera.position.set(0, 11.5, 11.5);
    }
    this.controls.update();
  }

  public fitCameraToCircuit(): void {
    const { components } = this.callbacks.getState();
    if (components.length === 0) {
      this.setCameraPreset('iso');
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const c of components) {
      const [x, , z] = c.pos3d;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const span = Math.max(4, maxX - minX + 3, maxZ - minZ + 3);
    const dist = Math.min(25, Math.max(9.5, span * 1.15));
    this.controls.target.set(cx, 0, cz);
    this.camera.position.set(cx, dist * 0.82, cz + dist * 0.86);
    this.controls.update();
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateNdc(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastPins(): PinRef | null {
    const pinTargets: THREE.Object3D[] = [];
    for (const handle of this.compHandles.values()) {
      for (const m of handle.pinMeshes.values()) pinTargets.push(m);
    }
    const hits = this.raycaster.intersectObjects(pinTargets, false);
    if (hits.length === 0) return null;
    const ud = hits[0].object.userData;
    return { componentId: ud.componentId, pinId: ud.pinId };
  }

  private raycastComponent(): string | null {
    const hits = this.raycaster.intersectObjects(this.compGroup.children, true);
    for (const hit of hits) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur) {
        if (cur.userData?.hitType === 'component' && cur.userData?.componentId) {
          return String(cur.userData.componentId);
        }
        cur = cur.parent;
      }
    }
    return null;
  }

  private raycastWire(): string | null {
    const wireMeshes = [...this.wireRecords.values()].map((r) => r.mesh);
    const hits = this.raycaster.intersectObjects(wireMeshes, false);
    if (hits.length === 0) return null;
    return String(hits[0].object.userData.wireId || '');
  }

  private handleContextMenu = (e: MouseEvent) => {
    const state = this.callbacks.getState();
    if (state.wiringDraftFrom || this.wiringDragStartedFrom) {
      e.preventDefault();
      this.callbacks.onSetWiringDraft(null);
      this.wiringDragStartedFrom = null;
      this.clearPreviewWire();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.callbacks.onSetWiringDraft(null);
      this.wiringDragStartedFrom = null;
      this.clearPreviewWire();
    }
  };

  private handlePointerLeave = () => {
    if (this.hoveredCompId !== null) {
      this.hoveredCompId = null;
      this.callbacks.onHoverComponentChange?.(null);
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.hoveredCompId !== null) {
      this.hoveredCompId = null;
      this.callbacks.onHoverComponentChange?.(null);
    }
    if (e.button !== 0) return;
    this.updateNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const state = this.callbacks.getState();

    // 1. Check Pins first
    const hitPin = this.raycastPins();
    if (hitPin && state.activeTool !== 'delete') {
      if (state.wiringDraftFrom) {
        if (
          state.wiringDraftFrom.componentId !== hitPin.componentId ||
          state.wiringDraftFrom.pinId !== hitPin.pinId
        ) {
          this.callbacks.onCompleteWire(state.wiringDraftFrom, hitPin);
          this.clearPreviewWire();
          this.wiringDragStartedFrom = null;
          return;
        }
      }
      this.controls.enabled = false;
      this.wiringDragStartedFrom = hitPin;
      this.dragStartClient = { x: e.clientX, y: e.clientY };
      this.callbacks.onSetWiringDraft(hitPin);
      return;
    }

    // 2. Check Components
    const hitCompId = this.raycastComponent();
    if (hitCompId) {
      if (state.activeTool === 'delete') {
        this.callbacks.onDeleteEntity('component', hitCompId);
        return;
      }
      this.callbacks.onSelect({ kind: 'component', id: hitCompId });
      if (state.activeTool === 'select') {
        const comp = state.components.find((c) => c.id === hitCompId);
        if (comp) {
          this.controls.enabled = false;
          this.dragCompId = hitCompId;
          this.dragStartClient = { x: e.clientX, y: e.clientY };
          this.dragCommittedHistory = false;
          const intersect = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
            this.dragOffset.set(comp.pos3d[0] - intersect.x, 0, comp.pos3d[2] - intersect.z);
          }
        }
      }
      return;
    }

    // 3. Check Wires
    const hitWireId = this.raycastWire();
    if (hitWireId) {
      if (state.activeTool === 'delete') {
        this.callbacks.onDeleteEntity('wire', hitWireId);
        return;
      }
      this.callbacks.onSelect({ kind: 'wire', id: hitWireId });
      return;
    }

    // Empty board click
    if (!state.wiringDraftFrom) {
      this.callbacks.onSelect(null);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.updateNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const state = this.callbacks.getState();

    // Dragging a component on ground plane
    if (this.dragCompId) {
      if (this.hoveredCompId !== null) {
        this.hoveredCompId = null;
        this.callbacks.onHoverComponentChange?.(null);
      }
      const dist = Math.hypot(e.clientX - this.dragStartClient.x, e.clientY - this.dragStartClient.y);
      if (dist > 4) {
        if (!this.dragCommittedHistory) {
          this.callbacks.onStartDragHistory();
          this.dragCommittedHistory = true;
        }
        const intersect = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
          const nx = Math.max(-14.5, Math.min(14.5, Number((intersect.x + this.dragOffset.x).toFixed(2))));
          const nz = Math.max(-9.5, Math.min(9.5, Number((intersect.z + this.dragOffset.z).toFixed(2))));
          this.callbacks.onMoveComponent3D(this.dragCompId, [nx, 0, nz]);
          const handle = this.compHandles.get(this.dragCompId);
          if (handle) handle.group.position.set(nx, 0, nz);
          this.rebuildWiresConnectedTo(this.dragCompId);
        }
      }
      return;
    }

    // Hover pin detection
    const hitPin = this.raycastPins();
    if (
      hitPin?.componentId !== this.hoveredPin?.componentId ||
      hitPin?.pinId !== this.hoveredPin?.pinId
    ) {
      this.hoveredPin = hitPin;
      this.callbacks.onHoverPinChange(hitPin);
    }

    if (e.target !== this.renderer.domElement || this.wiringDragStartedFrom) {
      if (this.hoveredCompId !== null) {
        this.hoveredCompId = null;
        this.callbacks.onHoverComponentChange?.(null);
      }
      if (e.target !== this.renderer.domElement) {
        return;
      }
    }

    if (hitPin) {
      const comp = state.components.find((c) => c.id === hitPin.componentId);
      if (comp) {
        const wp = getPinWorld3D(comp, hitPin.pinId);
        this.snapIndicator.position.set(wp[0], wp[1] + 0.14, wp[2]);
        this.snapIndicator.visible = true;
      }
      this.renderer.domElement.style.cursor = 'crosshair';
      if (this.hoveredCompId !== null) {
        this.hoveredCompId = null;
        this.callbacks.onHoverComponentChange?.(null);
      }
    } else {
      this.snapIndicator.visible = false;
      const hitComp = this.raycastComponent();
      this.renderer.domElement.style.cursor = hitComp ? 'grab' : 'default';
      if (hitComp !== this.hoveredCompId) {
        this.hoveredCompId = hitComp;
        this.callbacks.onHoverComponentChange?.(
          hitComp ? { componentId: hitComp, clientX: e.clientX, clientY: e.clientY } : null
        );
      }
    }

    // Update wire preview curve if wiring is active
    const draftFrom = this.wiringDragStartedFrom || state.wiringDraftFrom;
    if (draftFrom) {
      const fromComp = state.components.find((c) => c.id === draftFrom.componentId);
      if (fromComp) {
        const startPos = new THREE.Vector3(...getPinWorld3D(fromComp, draftFrom.pinId));
        let endPos: THREE.Vector3 | null = null;
        if (hitPin) {
          const toComp = state.components.find((c) => c.id === hitPin.componentId);
          if (toComp) endPos = new THREE.Vector3(...getPinWorld3D(toComp, hitPin.pinId));
        }
        if (!endPos) {
          const pt = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(this.groundPlane, pt)) {
            endPos = new THREE.Vector3(pt.x, 0.25, pt.z);
          }
        }
        if (endPos) {
          this.updatePreviewWire(startPos, endPos);
        }
      }
    } else {
      this.clearPreviewWire();
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.controls.enabled = true;

    if (this.wiringDragStartedFrom) {
      const moved = Math.hypot(e.clientX - this.dragStartClient.x, e.clientY - this.dragStartClient.y);
      this.updateNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hitPin = this.raycastPins();
      if (
        moved > 8 &&
        hitPin &&
        (hitPin.componentId !== this.wiringDragStartedFrom.componentId ||
          hitPin.pinId !== this.wiringDragStartedFrom.pinId)
      ) {
        this.callbacks.onCompleteWire(this.wiringDragStartedFrom, hitPin);
        this.clearPreviewWire();
      }
      this.wiringDragStartedFrom = null;
      return;
    }

    if (this.dragCompId) {
      const moved = Math.hypot(e.clientX - this.dragStartClient.x, e.clientY - this.dragStartClient.y);
      const compId = this.dragCompId;
      this.dragCompId = null;
      if (moved < 5) {
        this.callbacks.onToggleInteractive(compId);
      }
    }
  };

  private makeArchedCurve(p1: THREE.Vector3, p2: THREE.Vector3): THREE.CatmullRomCurve3 {
    const dist = p1.distanceTo(p2);
    const archH = Math.min(1.85, 0.28 + dist * 0.22);
    const mid1 = new THREE.Vector3().lerpVectors(p1, p2, 0.25);
    mid1.y += archH * 0.72;
    const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
    mid.y += archH;
    const mid2 = new THREE.Vector3().lerpVectors(p1, p2, 0.75);
    mid2.y += archH * 0.72;
    return new THREE.CatmullRomCurve3([p1, mid1, mid, mid2, p2]);
  }

  private updatePreviewWire(start: THREE.Vector3, end: THREE.Vector3): void {
    this.clearPreviewWire();
    const curve = this.makeArchedCurve(start, end);
    const geom = new THREE.TubeGeometry(curve, 20, 0.036, 8, false);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    this.previewWireMesh = new THREE.Mesh(geom, mat);
    this.scene.add(this.previewWireMesh);
  }

  private clearPreviewWire(): void {
    if (this.previewWireMesh) {
      this.previewWireMesh.geometry.dispose();
      (this.previewWireMesh.material as THREE.Material).dispose();
      this.scene.remove(this.previewWireMesh);
      this.previewWireMesh = null;
    }
  }

  private createWireRecord(wire: Wire, components: CircuitComponent[]): WireMeshRecord | null {
    const fromComp = components.find((c) => c.id === wire.from.componentId);
    const toComp = components.find((c) => c.id === wire.to.componentId);
    if (!fromComp || !toComp) return null;

    const p1 = new THREE.Vector3(...getPinWorld3D(fromComp, wire.from.pinId));
    const p2 = new THREE.Vector3(...getPinWorld3D(toComp, wire.to.pinId));
    const curve = this.makeArchedCurve(p1, p2);
    const geom = new THREE.TubeGeometry(curve, 24, 0.038, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wire.color || '#38bdf8'),
      roughness: 0.35,
      metalness: 0.25,
      emissive: new THREE.Color(0x000000),
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.userData = { hitType: 'wire', wireId: wire.id };
    this.wireGroup.add(mesh);

    const particles: THREE.Mesh[] = [];
    const phases: number[] = [];
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let i = 0; i < 3; i++) {
      const pm = new THREE.Mesh(this.particleGeom, particleMat);
      pm.visible = false;
      this.wireGroup.add(pm);
      particles.push(pm);
      phases.push((i + 0.5) / 3);
    }

    return { wire, mesh, curve, particles, particleMat, phases };
  }

  private disposeWireRecord(rec: WireMeshRecord): void {
    rec.mesh.geometry.dispose();
    (rec.mesh.material as THREE.Material).dispose();
    this.wireGroup.remove(rec.mesh);
    for (const p of rec.particles) {
      this.wireGroup.remove(p);
    }
    rec.particleMat.dispose();
  }

  private rebuildWiresConnectedTo(componentId: string): void {
    const { components } = this.callbacks.getState();
    for (const [wid, rec] of this.wireRecords.entries()) {
      if (rec.wire.from.componentId === componentId || rec.wire.to.componentId === componentId) {
        const wireCopy = rec.wire;
        this.disposeWireRecord(rec);
        const rebuilt = this.createWireRecord(wireCopy, components);
        if (rebuilt) this.wireRecords.set(wid, rebuilt);
        else this.wireRecords.delete(wid);
      }
    }
  }

  public syncSceneFromStore(): void {
    const { components, wires } = this.callbacks.getState();

    // 1. Sync Components
    const compIds = new Set(components.map((c) => c.id));
    for (const [id, handle] of this.compHandles.entries()) {
      if (!compIds.has(id)) {
        this.compGroup.remove(handle.group);
        disposeObject3D(handle.group);
        this.compHandles.delete(id);
      }
    }

    let geometryChanged = false;
    for (const comp of components) {
      let handle = this.compHandles.get(comp.id);
      const nextSig = getComponentMeshSignature(comp);
      if (!handle) {
        handle = buildComponentMesh(comp);
        this.compHandles.set(comp.id, handle);
        this.compGroup.add(handle.group);
        geometryChanged = true;
      } else if (handle.meshSignature !== nextSig) {
        this.compGroup.remove(handle.group);
        disposeObject3D(handle.group);
        handle = buildComponentMesh(comp);
        this.compHandles.set(comp.id, handle);
        this.compGroup.add(handle.group);
        geometryChanged = true;
      } else {
        const dx = Math.abs(handle.group.position.x - comp.pos3d[0]);
        const dz = Math.abs(handle.group.position.z - comp.pos3d[2]);
        const dr = Math.abs(handle.group.rotation.y - comp.rotationY);
        if (dx > 0.001 || dz > 0.001 || dr > 0.001) {
          handle.group.position.set(comp.pos3d[0], comp.pos3d[1], comp.pos3d[2]);
          handle.group.rotation.y = comp.rotationY;
          geometryChanged = true;
        }
      }
    }

    // 2. Sync Wires
    const wireIds = new Set(wires.map((w) => w.id));
    for (const [wid, rec] of this.wireRecords.entries()) {
      if (!wireIds.has(wid)) {
        this.disposeWireRecord(rec);
        this.wireRecords.delete(wid);
      }
    }
    for (const w of wires) {
      const existing = this.wireRecords.get(w.id);
      if (!existing || geometryChanged || existing.wire.color !== w.color) {
        if (existing) this.disposeWireRecord(existing);
        const rec = this.createWireRecord(w, components);
        if (rec) this.wireRecords.set(w.id, rec);
      }
    }
  }

  private animate = (timestamp: number) => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(0.035, Math.max(0.001, rawDt));

    const state = this.callbacks.getState();

    // Update component visuals, selection & overload rings, pin rings
    for (const comp of state.components) {
      const handle = this.compHandles.get(comp.id);
      if (!handle) continue;
      const tel = state.telemetryById[comp.id];
      handle.updateVisuals(comp, tel, state.simTime);

      handle.selectionRing.visible =
        state.selected?.kind === 'component' && state.selected.id === comp.id;

      if (tel?.overloaded) {
        handle.overloadRing.visible = true;
        const pulse = 0.45 + 0.45 * Math.sin(timestamp * 0.012);
        (handle.overloadRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      } else {
        handle.overloadRing.visible = false;
      }

      const isSpotlighted = Boolean(state.highlightedIds?.includes(comp.id));
      if (isSpotlighted) {
        handle.highlightRing.visible = true;
        const pulse = 0.52 + 0.38 * Math.sin(timestamp * 0.006);
        (handle.highlightRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      } else {
        handle.highlightRing.visible = false;
      }

      for (const [pinId, ring] of handle.pinRings.entries()) {
        const isDraft =
          state.wiringDraftFrom?.componentId === comp.id && state.wiringDraftFrom?.pinId === pinId;
        const isHover =
          this.hoveredPin?.componentId === comp.id && this.hoveredPin?.pinId === pinId;
        ring.visible = isDraft || isHover;
        (ring.material as THREE.MeshBasicMaterial).color.setHex(
          isDraft ? 0x22c55e : 0x38bdf8
        );
      }
    }

    // Update wire highlights & animated current flow particles
    if (state.isRunning) {
      this.acVisualClock += dt;
    }
    const timeScale = Math.max(0.05, state.timeScale ?? 1);
    for (const [wid, rec] of this.wireRecords.entries()) {
      const isSelected = state.selected?.kind === 'wire' && state.selected.id === wid;
      const mat = rec.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(isSelected ? 0x38bdf8 : 0x000000);
      mat.emissiveIntensity = isSelected ? 0.65 : 0;

      const wt = state.wireTelemetryById[wid];
      const isAcWire = Boolean(wt?.isAc && (wt.iRms ?? 0) > 1e-4);

      if (state.isRunning && isAcWire && wt) {
        const effI = wt.iRms ?? Math.abs(wt.current);
        const acFreq = wt.acFrequency ?? 50;
        const theta =
          acFreq <= 2.5
            ? 2 * Math.PI * acFreq * state.simTime
            : 2 * Math.PI * Math.min(2.2, 1.35 * Math.cbrt(timeScale)) * this.acVisualClock;
        const waveSin = Math.sin(theta);
        const waveCos = Math.cos(theta);
        const amp = Math.min(0.145, 0.065 + Math.log10(1 + effI * 1000) * 0.032);
        rec.particleMat.color.setHex(waveCos >= 0 ? 0x38bdf8 : 0xfbbf24);
        const pulseScale = 0.85 + 0.35 * Math.abs(waveCos);
        const n = rec.particles.length;
        for (let i = 0; i < n; i++) {
          const basePhase = (i + 0.5) / n;
          const u = Math.max(0.02, Math.min(0.98, basePhase + amp * waveSin));
          const pt = rec.curve.getPointAt(u);
          rec.particles[i].position.copy(pt);
          rec.particles[i].scale.setScalar(pulseScale);
          rec.particles[i].visible = true;
        }
      } else {
        const dcCurrent =
          wt?.dcMean !== undefined && Math.abs(wt.dcMean) > 1e-4
            ? wt.dcMean
            : (wt?.current ?? 0);
        const absI = Math.abs(dcCurrent);
        if (absI > 1e-4 && state.isRunning) {
          rec.particleMat.color.setHex(0xfef08a);
          const speed =
            Math.sign(dcCurrent) * Math.min(1.6, 0.25 + Math.log10(1 + absI * 1000) * 0.42);
          for (let i = 0; i < rec.particles.length; i++) {
            let ph = (rec.phases[i] + speed * dt) % 1;
            if (ph < 0) ph += 1;
            rec.phases[i] = ph;
            const pt = rec.curve.getPointAt(ph);
            rec.particles[i].position.copy(pt);
            rec.particles[i].scale.setScalar(1);
            rec.particles[i].visible = true;
          }
        } else {
          for (const p of rec.particles) p.visible = false;
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // Project 3D floating labels
    if (state.show3DLabels) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const labels: ProjectedLabel[] = [];
      const vec = new THREE.Vector3();
      for (const comp of state.components) {
        const spec = COMPONENT_CATALOG[comp.type];
        if (!spec) continue;
        vec.set(comp.pos3d[0], comp.pos3d[1] + 0.95, comp.pos3d[2]);
        vec.project(this.camera);
        const visible = vec.z > -1 && vec.z < 1;
        labels.push({
          id: comp.id,
          x: (vec.x * 0.5 + 0.5) * w,
          y: (-vec.y * 0.5 + 0.5) * h,
          visible,
        });
      }
      this.callbacks.onLabelsUpdated(labels);
    } else {
      this.callbacks.onLabelsUpdated([]);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerleave', this.handlePointerLeave);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    dom.removeEventListener('contextmenu', this.handleContextMenu);

    for (const h of this.compHandles.values()) disposeObject3D(h.group);
    for (const w of this.wireRecords.values()) this.disposeWireRecord(w);
    this.clearPreviewWire();
    this.particleGeom.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
