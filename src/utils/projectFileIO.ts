import type { CircuitComponent, CircuitData, LocalProjectFile, Wire } from '../../shared/types';
import { COMPONENT_CATALOG, getComponentPins, world2dTo3d, world3dTo2d } from '../engine/componentCatalog';

export const PROJECT_FILE_FORMAT = 'electrolab-3d-project' as const;
export const PROJECT_FILE_VERSION = '3.0.0';

const isRecord = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);

// 在替换工作台前检查结构，并补齐旧网表缺省的显示参数。
export function parseCircuitData(value: unknown): CircuitData {
  if (!isRecord(value) || !Array.isArray(value.components) || !Array.isArray(value.wires)) {
    throw new Error('工程文件缺少 components 或 wires 数组');
  }
  const ids = new Set<string>();
  const components = value.components.map((raw, index): CircuitComponent => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || ids.has(raw.id)) {
      throw new Error(`第 ${index + 1} 个元件的标识缺失或重复`);
    }
    ids.add(raw.id);
    if (typeof raw.type !== 'string' || !Object.hasOwn(COMPONENT_CATALOG, raw.type)) {
      throw new Error(`元件 ${raw.id} 的类型无法识别：${String(raw.type)}`);
    }
    const type = raw.type as CircuitComponent['type'];
    const spec = COMPONENT_CATALOG[type];
    if (raw.props !== undefined && (!isRecord(raw.props) || Object.values(raw.props).some(v =>
      !['string', 'boolean', 'number'].includes(typeof v) || (typeof v === 'number' && !Number.isFinite(v))))) {
      throw new Error(`元件 ${raw.id} 的参数格式无效`);
    }
    const p2 = raw.pos2d;
    const p3 = raw.pos3d;
    if (p2 !== undefined && (!isRecord(p2) || !Number.isFinite(p2.x) || !Number.isFinite(p2.y))) {
      throw new Error(`元件 ${raw.id} 的二维坐标无效`);
    }
    if (p3 !== undefined && (!Array.isArray(p3) || p3.length !== 3 || !p3.every(Number.isFinite))) {
      throw new Error(`元件 ${raw.id} 的三维坐标无效`);
    }
    for (const key of ['rot2d', 'rotationY']) {
      if (raw[key] !== undefined && !Number.isFinite(raw[key])) throw new Error(`元件 ${raw.id} 的旋转角度无效`);
    }
    const pos2d = p2 as CircuitComponent['pos2d'] | undefined;
    const pos3d = p3 as CircuitComponent['pos3d'] | undefined;
    return {
      id: raw.id, type, label: typeof raw.label === 'string' ? raw.label : raw.id,
      props: { ...spec.defaultProps, ...(raw.props as CircuitComponent['props'] ?? {}) },
      pos2d: pos2d ?? world3dTo2d(pos3d ?? [0, 0, 0]),
      pos3d: pos3d ?? world2dTo3d(pos2d ?? { x: 380, y: 260 }),
      rot2d: Number(raw.rot2d ?? 0), rotationY: Number(raw.rotationY ?? 0),
    };
  });
  const pins = new Map(components.map(c => [c.id, new Set(getComponentPins(c).map(p => p.id))]));
  const wireIds = new Set<string>();
  const wires = value.wires.map((raw, index): Wire => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || wireIds.has(raw.id)) {
      throw new Error(`第 ${index + 1} 条导线的标识缺失或重复`);
    }
    wireIds.add(raw.id);
    for (const endpoint of [raw.from, raw.to]) {
      if (!isRecord(endpoint) || typeof endpoint.componentId !== 'string' || typeof endpoint.pinId !== 'string' ||
          !pins.get(endpoint.componentId)?.has(endpoint.pinId)) {
        throw new Error(`导线 ${raw.id} 连接了不存在的元件或引脚`);
      }
    }
    return { id: raw.id, from: raw.from as unknown as Wire['from'], to: raw.to as unknown as Wire['to'],
      color: typeof raw.color === 'string' ? raw.color : '#38bdf8' };
  });
  return { components, wires };
}

export function serializeProjectFile(
  title: string,
  circuit: CircuitData,
  description?: string,
  category?: string
): LocalProjectFile {
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    projectTitle: title.trim() || '未命名电路工程',
    description,
    category,
    savedAt: new Date().toISOString(),
    circuit: {
      components: JSON.parse(JSON.stringify(circuit.components)),
      wires: JSON.parse(JSON.stringify(circuit.wires)),
    },
  };
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_');
  return cleaned || 'circuit_project';
}

export function downloadProjectFile(
  title: string,
  circuit: CircuitData,
  description?: string
): LocalProjectFile {
  const payload = serializeProjectFile(title, circuit, description);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(payload.projectTitle)}.elab.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload;
}

export function parseProjectFile(rawText: string): {
  title: string;
  circuit: CircuitData;
  description?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('文件不是有效的 JSON 格式，无法解析电路工程');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('电路工程文件内容为空或格式错误');
  }

  const obj = parsed as Record<string, unknown>;

  // Standard ElectroLab v3 .elab.json wrapper
  if (obj.circuit && typeof obj.circuit === 'object') {
    const c = obj.circuit as Record<string, unknown>;
    if (!Array.isArray(c.components) || !Array.isArray(c.wires)) {
      throw new Error('工程文件缺少 components 或 wires 数组');
    }
    if (obj.format && obj.format !== PROJECT_FILE_FORMAT) {
      throw new Error(`不支持的工程文件格式标识: ${String(obj.format)}`);
    }
    return {
      title: typeof obj.projectTitle === 'string' && obj.projectTitle.trim()
        ? obj.projectTitle.trim()
        : '导入本地工程',
      description: typeof obj.description === 'string' ? obj.description : undefined,
      circuit: parseCircuitData(c),
    };
  }

  // Raw CircuitData fallback { components: [...], wires: [...] }
  if (Array.isArray(obj.components) && Array.isArray(obj.wires)) {
    return {
      title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : '导入电路拓扑',
      circuit: parseCircuitData(obj),
    };
  }

  throw new Error('无法识别的电路工程文件结构：缺少有效的电路拓扑数据');
}
