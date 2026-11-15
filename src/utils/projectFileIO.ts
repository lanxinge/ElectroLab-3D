import type { CircuitData, LocalProjectFile } from '../../shared/types';

export const PROJECT_FILE_FORMAT = 'electrolab-3d-project' as const;
export const PROJECT_FILE_VERSION = '3.0.0';

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
      circuit: {
        components: c.components as CircuitData['components'],
        wires: c.wires as CircuitData['wires'],
      },
    };
  }

  // Raw CircuitData fallback { components: [...], wires: [...] }
  if (Array.isArray(obj.components) && Array.isArray(obj.wires)) {
    return {
      title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : '导入电路拓扑',
      circuit: {
        components: obj.components as CircuitData['components'],
        wires: obj.wires as CircuitData['wires'],
      },
    };
  }

  throw new Error('无法识别的电路工程文件结构：缺少有效的电路拓扑数据');
}
