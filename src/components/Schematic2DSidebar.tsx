import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutGrid,
  Maximize2,
  Moon,
  RotateCw,
  Sun,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  CircuitComponent,
  CircuitData,
  ComponentTelemetry,
  PinRef,
  Wire,
  WireTelemetry,
} from '../../shared/types';
import {
  COMPONENT_CATALOG,
  formatEngineeringValue,
  getPinWorld2D,
} from '../engine/componentCatalog';
import { useCircuitStore, type SchematicTheme } from '../store/useCircuitStore';

function computeOrthogonalPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 2 || Math.abs(dy) < 2) {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }
  const midX = Math.round((p1.x + dx * 0.5) / 10) * 10;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

interface SymbolProps {
  comp: CircuitComponent;
  telemetry?: ComponentTelemetry;
  theme: SchematicTheme;
  isSelected: boolean;
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
  10: [1, 1, 1, 0, 1, 1, 1],
  11: [0, 0, 1, 1, 1, 1, 1],
  12: [1, 0, 0, 1, 1, 1, 0],
  13: [0, 1, 1, 1, 1, 0, 1],
  14: [1, 0, 0, 1, 1, 1, 1],
  15: [1, 0, 0, 0, 1, 1, 1],
};

function renderSymbolBody(
  comp: CircuitComponent,
  telemetry: ComponentTelemetry | undefined,
  theme: SchematicTheme
) {
  const stroke = theme === 'dark' ? '#e2e8f0' : '#0f172a';
  const fillBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const muted = theme === 'dark' ? '#94a3b8' : '#475569';
  const activeColor = '#22c55e';

  switch (comp.type) {
    case 'RESISTOR':
      return (
        <g>
          <line x1={-40} y1={0} x2={-22} y2={0} stroke={stroke} strokeWidth={2} />
          <rect
            x={-22}
            y={-8}
            width={44}
            height={16}
            fill={fillBg}
            stroke={stroke}
            strokeWidth={2}
            rx={1}
          />
          <line x1={22} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'POTENTIOMETER':
      return (
        <g>
          <line x1={-40} y1={0} x2={-22} y2={0} stroke={stroke} strokeWidth={2} />
          <rect x={-22} y={-8} width={44} height={16} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={22} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          <line x1={0} y1={-30} x2={0} y2={-11} stroke={stroke} strokeWidth={2} />
          <polygon points="0,-8 -5,-15 5,-15" fill={stroke} />
        </g>
      );

    case 'CAPACITOR':
      return (
        <g>
          <line x1={-40} y1={0} x2={-5} y2={0} stroke={stroke} strokeWidth={2} />
          <line x1={-5} y1={-15} x2={-5} y2={15} stroke={stroke} strokeWidth={2.5} />
          <line x1={5} y1={-15} x2={5} y2={15} stroke={stroke} strokeWidth={2.5} />
          <line x1={5} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          <text x={-14} y={-12} fontSize={10} fill={muted} textAnchor="middle">
            +
          </text>
        </g>
      );

    case 'INDUCTOR':
      return (
        <g>
          <line x1={-40} y1={0} x2={-24} y2={0} stroke={stroke} strokeWidth={2} />
          <path
            d="M -24 0 A 6 7 0 0 1 -12 0 A 6 7 0 0 1 0 0 A 6 7 0 0 1 12 0 A 6 7 0 0 1 24 0"
            fill="none"
            stroke={stroke}
            strokeWidth={2}
          />
          <line x1={24} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'DC_SOURCE':
      return (
        <g>
          <line x1={-40} y1={0} x2={-6} y2={0} stroke={stroke} strokeWidth={2} />
          <line x1={-6} y1={-9} x2={-6} y2={9} stroke={stroke} strokeWidth={3.5} />
          <line x1={6} y1={-17} x2={6} y2={17} stroke={stroke} strokeWidth={2} />
          <line x1={6} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          <text x={15} y={-12} fontSize={11} fontWeight="bold" fill="#ef4444">
            +
          </text>
          <text x={-19} y={-12} fontSize={11} fontWeight="bold" fill={muted}>
            -
          </text>
        </g>
      );

    case 'AC_SOURCE':
      return (
        <g>
          <line x1={-40} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth={2} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <path
            d="M -9 0 Q -4.5 -9 0 0 T 9 0"
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
          />
          <line x1={16} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          <text x={22} y={-8} fontSize={10} fill="#ef4444">
            +
          </text>
        </g>
      );

    case 'CURRENT_SOURCE':
      return (
        <g>
          <line x1={-40} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth={2} />
          <circle cx={0} cy={0} r={16} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={-8} y1={0} x2={7} y2={0} stroke={stroke} strokeWidth={2} />
          <polygon points="11,0 4,-4 4,4" fill={stroke} />
          <line x1={16} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'GROUND':
      return (
        <g>
          <line x1={0} y1={-25} x2={0} y2={0} stroke={stroke} strokeWidth={2} />
          <line x1={-16} y1={0} x2={16} y2={0} stroke={stroke} strokeWidth={2.4} />
          <line x1={-10} y1={6} x2={10} y2={6} stroke={stroke} strokeWidth={2.2} />
          <line x1={-4} y1={12} x2={4} y2={12} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'SWITCH_SPST': {
      const closed = Boolean(comp.props.closed ?? true);
      return (
        <g>
          <line x1={-40} y1={0} x2={-16} y2={0} stroke={stroke} strokeWidth={2} />
          <circle cx={-16} cy={0} r={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line
            x1={-16}
            y1={0}
            x2={16}
            y2={closed ? 0 : -15}
            stroke={closed ? activeColor : '#f59e0b'}
            strokeWidth={2.5}
          />
          <circle cx={16} cy={0} r={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={16} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );
    }

    case 'SWITCH_SPDT': {
      const pos = Number(comp.props.position ?? 0);
      return (
        <g>
          <line x1={-40} y1={0} x2={-14} y2={0} stroke={stroke} strokeWidth={2} />
          <circle cx={-14} cy={0} r={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line
            x1={-14}
            y1={0}
            x2={18}
            y2={pos === 0 ? -18 : 18}
            stroke={activeColor}
            strokeWidth={2.5}
          />
          <circle cx={18} cy={-20} r={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={18} y1={-20} x2={40} y2={-20} stroke={stroke} strokeWidth={2} />
          <circle cx={18} cy={20} r={3} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={18} y1={20} x2={40} y2={20} stroke={stroke} strokeWidth={2} />
        </g>
      );
    }

    case 'DIODE':
    case 'LED': {
      const isLed = comp.type === 'LED';
      const lit = isLed && (telemetry?.current ?? 0) * 1000 > 0.3;
      const ledFill = lit ? (comp.props.color === 'green' ? '#22c55e' : '#ef4444') : fillBg;
      return (
        <g>
          <line x1={-40} y1={0} x2={-12} y2={0} stroke={stroke} strokeWidth={2} />
          <polygon
            points="-12,-12 -12,12 12,0"
            fill={ledFill}
            stroke={stroke}
            strokeWidth={2}
          />
          <line x1={12} y1={-12} x2={12} y2={12} stroke={stroke} strokeWidth={2.5} />
          <line x1={12} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          {isLed && (
            <g stroke={lit ? '#fbbf24' : muted} strokeWidth={1.6}>
              <line x1={2} y1={-15} x2={11} y2={-24} />
              <line x1={10} y1={-12} x2={19} y2={-21} />
            </g>
          )}
        </g>
      );
    }

    case 'BJT_NPN':
      return (
        <g>
          <circle cx={6} cy={0} r={24} fill={fillBg} stroke={stroke} strokeWidth={1.8} />
          <line x1={-40} y1={0} x2={-4} y2={0} stroke={stroke} strokeWidth={2} />
          <line x1={-4} y1={-14} x2={-4} y2={14} stroke={stroke} strokeWidth={3} />
          <line x1={-4} y1={-7} x2={18} y2={-22} stroke={stroke} strokeWidth={2} />
          <line x1={18} y1={-22} x2={30} y2={-30} stroke={stroke} strokeWidth={2} />
          <line x1={-4} y1={7} x2={18} y2={22} stroke={stroke} strokeWidth={2} />
          <line x1={18} y1={22} x2={30} y2={30} stroke={stroke} strokeWidth={2} />
          <polygon points="17,21 9,19 13,13" fill={stroke} />
        </g>
      );

    case 'OPAMP':
      return (
        <g>
          <line x1={-45} y1={-20} x2={-26} y2={-20} stroke={stroke} strokeWidth={2} />
          <line x1={-45} y1={20} x2={-26} y2={20} stroke={stroke} strokeWidth={2} />
          <polygon
            points="-26,-32 -26,32 30,0"
            fill={fillBg}
            stroke={stroke}
            strokeWidth={2}
          />
          <line x1={30} y1={0} x2={45} y2={0} stroke={stroke} strokeWidth={2} />
          <text x={-19} y={-16} fontSize={12} fontWeight="bold" fill="#22c55e">
            +
          </text>
          <text x={-19} y={24} fontSize={14} fontWeight="bold" fill="#ef4444">
            -
          </text>
        </g>
      );

    case 'VOLTMETER':
    case 'AMMETER': {
      const isV = comp.type === 'VOLTMETER';
      return (
        <g>
          <line x1={-40} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={2} />
          <circle
            cx={0}
            cy={0}
            r={18}
            fill={fillBg}
            stroke={isV ? '#34d399' : '#fbbf24'}
            strokeWidth={2.2}
          />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize={14}
            fontWeight="bold"
            fill={isV ? '#34d399' : '#fbbf24'}
          >
            {isV ? 'V' : 'A'}
          </text>
          <line x1={18} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );
    }

    case 'LOGIC_IN':
    case 'CLOCK': {
      const high = (telemetry?.logicState ?? 0) === 1;
      const boxCol = high ? '#22c55e' : muted;
      const txt =
        comp.type === 'LOGIC_IN'
          ? `${String(comp.props.varName || comp.label)}=${high ? 1 : 0}`
          : `CLK:${high ? 1 : 0}`;
      return (
        <g>
          <rect
            x={-28}
            y={-15}
            width={54}
            height={30}
            rx={6}
            fill={high ? 'rgba(34,197,94,0.2)' : fillBg}
            stroke={boxCol}
            strokeWidth={2}
          />
          <line x1={26} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
          <text
            x={-1}
            y={4}
            textAnchor="middle"
            fontSize={11}
            fontWeight="bold"
            fill={high ? '#4ade80' : stroke}
          >
            {txt}
          </text>
        </g>
      );
    }

    case 'LOGIC_OUT': {
      const high = (telemetry?.logicState ?? 0) === 1;
      return (
        <g>
          <line x1={-40} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={2} />
          <circle
            cx={0}
            cy={0}
            r={17}
            fill={high ? 'rgba(34,197,94,0.3)' : fillBg}
            stroke={high ? '#22c55e' : muted}
            strokeWidth={2.2}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill={high ? '#4ade80' : muted}
          >
            {high ? '1' : '0'}
          </text>
        </g>
      );
    }

    case 'AND':
    case 'NAND': {
      const inv = comp.type === 'NAND';
      return (
        <g>
          <line x1={-40} y1={-15} x2={-22} y2={-15} stroke={stroke} strokeWidth={2} />
          <line x1={-40} y1={15} x2={-22} y2={15} stroke={stroke} strokeWidth={2} />
          <path
            d="M -22 -22 L 0 -22 A 22 22 0 0 1 0 22 L -22 22 Z"
            fill={fillBg}
            stroke={stroke}
            strokeWidth={2}
          />
          {inv && <circle cx={26} cy={0} r={4} fill={fillBg} stroke={stroke} strokeWidth={2} />}
          <line x1={inv ? 30 : 22} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );
    }

    case 'OR':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const isXor = comp.type === 'XOR' || comp.type === 'XNOR';
      const isInv = comp.type === 'NOR' || comp.type === 'XNOR';
      return (
        <g>
          <line x1={-40} y1={-15} x2={-18} y2={-15} stroke={stroke} strokeWidth={2} />
          <line x1={-40} y1={15} x2={-18} y2={15} stroke={stroke} strokeWidth={2} />
          {isXor && (
            <path
              d="M -26 -22 Q -16 0 -26 22"
              fill="none"
              stroke={stroke}
              strokeWidth={2}
            />
          )}
          <path
            d="M -20 -22 Q -8 0 -20 22 Q 8 22 22 0 Q 8 -22 -20 -22 Z"
            fill={fillBg}
            stroke={stroke}
            strokeWidth={2}
          />
          {isInv && <circle cx={26} cy={0} r={4} fill={fillBg} stroke={stroke} strokeWidth={2} />}
          <line x1={isInv ? 30 : 22} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );
    }

    case 'NOT':
      return (
        <g>
          <line x1={-40} y1={0} x2={-18} y2={0} stroke={stroke} strokeWidth={2} />
          <polygon points="-18,-16 -18,16 14,0" fill={fillBg} stroke={stroke} strokeWidth={2} />
          <circle cx={18} cy={0} r={4} fill={fillBg} stroke={stroke} strokeWidth={2} />
          <line x1={22} y1={0} x2={40} y2={0} stroke={stroke} strokeWidth={2} />
        </g>
      );

    case 'HEX_DISPLAY': {
      const val = Math.max(0, Math.min(15, telemetry?.logicState ?? 0));
      const segs = SEVEN_SEG_MAP[val] ?? SEVEN_SEG_MAP[0];
      const onC = '#ef4444';
      const offC = theme === 'dark' ? '#1e293b' : '#cbd5e1';
      return (
        <g>
          {[-30, -10, 10, 30].map((y) => (
            <line key={y} x1={-45} y1={y} x2={-26} y2={y} stroke={stroke} strokeWidth={2} />
          ))}
          <rect x={-26} y={-38} width={52} height={76} rx={4} fill="#090d16" stroke={stroke} strokeWidth={2} />
          <line x1={-10} y1={-24} x2={12} y2={-24} stroke={segs[0] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={14} y1={-20} x2={14} y2={-2} stroke={segs[1] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={14} y1={4} x2={14} y2={22} stroke={segs[2] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={-10} y1={24} x2={12} y2={24} stroke={segs[3] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={-12} y1={4} x2={-12} y2={22} stroke={segs[4] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={-12} y1={-20} x2={-12} y2={-2} stroke={segs[5] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
          <line x1={-10} y1={1} x2={12} y2={1} stroke={segs[6] ? onC : offC} strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    }

    default: {
      // HALF_ADDER, FULL_ADDER, D_FF rectangular IC block
      const spec = COMPONENT_CATALOG[comp.type];
      return (
        <g>
          {spec.pins.map((p) => (
            <line
              key={p.id}
              x1={p.offset2d.x < 0 ? -45 : 26}
              y1={p.offset2d.y}
              x2={p.offset2d.x < 0 ? -26 : 45}
              y2={p.offset2d.y}
              stroke={stroke}
              strokeWidth={2}
            />
          ))}
          <rect
            x={-26}
            y={-30}
            width={52}
            height={60}
            rx={4}
            fill={fillBg}
            stroke={stroke}
            strokeWidth={2}
          />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight="bold" fill={stroke}>
            {spec.shortName}
          </text>
        </g>
      );
    }
  }
}

export const CircuitSchematicPreview: React.FC<{
  circuit: CircuitData;
  theme?: SchematicTheme;
  className?: string;
}> = ({ circuit, theme = 'dark', className = '' }) => {
  const bounds = useMemo(() => {
    if (circuit.components.length === 0) {
      return { minX: 0, minY: 0, width: 600, height: 360 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of circuit.components) {
      minX = Math.min(minX, c.pos2d.x - 75);
      minY = Math.min(minY, c.pos2d.y - 60);
      maxX = Math.max(maxX, c.pos2d.x + 75);
      maxY = Math.max(maxY, c.pos2d.y + 60);
    }
    return {
      minX,
      minY,
      width: Math.max(260, maxX - minX),
      height: Math.max(180, maxY - minY),
    };
  }, [circuit.components]);

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      className={`w-full h-full ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'} ${className}`}
    >
      {circuit.wires.map((w) => {
        const fc = circuit.components.find((c) => c.id === w.from.componentId);
        const tc = circuit.components.find((c) => c.id === w.to.componentId);
        if (!fc || !tc) return null;
        const p1 = getPinWorld2D(fc, w.from.pinId);
        const p2 = getPinWorld2D(tc, w.to.pinId);
        return (
          <path
            key={w.id}
            d={computeOrthogonalPath(p1, p2)}
            fill="none"
            stroke={w.color || '#38bdf8'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {circuit.components.map((c) => (
        <g key={c.id} transform={`translate(${c.pos2d.x}, ${c.pos2d.y})`}>
          <g transform={`rotate(${c.rot2d})`}>{renderSymbolBody(c, undefined, theme)}</g>
          <text
            x={0}
            y={-34}
            textAnchor="middle"
            fontSize={10}
            fontWeight="600"
            fill={theme === 'dark' ? '#cbd5e1' : '#1e293b'}
          >
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const Schematic2DSidebar: React.FC<{ onExpandToggle?: () => void }> = ({
  onExpandToggle,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [dragState, setDragState] = useState<
    | { kind: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
    | { kind: 'comp'; compId: string; startSvgX: number; startSvgY: number; origX: number; origY: number; moved: boolean }
    | null
  >(null);
  const [mouseSvgPos, setMouseSvgPos] = useState<{ x: number; y: number } | null>(null);

  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const selected = useCircuitStore((s) => s.selected);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const wireTelemetryById = useCircuitStore((s) => s.wireTelemetryById);
  const schematicTheme = useCircuitStore((s) => s.schematicTheme);
  const wiringDraftFrom = useCircuitStore((s) => s.wiringDraftFrom);

  const setSelected = useCircuitStore((s) => s.setSelected);
  const moveComponent2D = useCircuitStore((s) => s.moveComponent2D);
  const pushUndoSnapshot = useCircuitStore((s) => s.pushUndoSnapshot);
  const rotateComponent = useCircuitStore((s) => s.rotateComponent);
  const removeEntity = useCircuitStore((s) => s.removeEntity);
  const toggleInteractiveComponent = useCircuitStore((s) => s.toggleInteractiveComponent);
  const setWiringDraftFrom = useCircuitStore((s) => s.setWiringDraftFrom);
  const addWire = useCircuitStore((s) => s.addWire);
  const autoLayout2D = useCircuitStore((s) => s.autoLayout2D);
  const setSchematicTheme = useCircuitStore((s) => s.setSchematicTheme);

  const clientToSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom - pan.x,
      y: (clientY - rect.top) / zoom - pan.y,
    };
  };

  // Compute junction points where >= 3 wires meet at same pin coordinate
  const junctionPoints = useMemo(() => {
    const counts = new Map<string, { x: number; y: number; n: number }>();
    for (const w of wires) {
      const fc = components.find((c) => c.id === w.from.componentId);
      const tc = components.find((c) => c.id === w.to.componentId);
      if (!fc || !tc) continue;
      for (const pt of [getPinWorld2D(fc, w.from.pinId), getPinWorld2D(tc, w.to.pinId)]) {
        const key = `${pt.x},${pt.y}`;
        const prev = counts.get(key);
        counts.set(key, { x: pt.x, y: pt.y, n: (prev?.n ?? 0) + 1 });
      }
    }
    return [...counts.values()].filter((p) => p.n >= 3);
  }, [components, wires]);

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      if (wiringDraftFrom) {
        setWiringDraftFrom(null);
        return;
      }
      setSelected(null);
      setDragState({
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      });
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = clientToSvg(e.clientX, e.clientY);
    setMouseSvgPos(pt);

    if (!dragState) return;
    if (dragState.kind === 'pan') {
      setPan({
        x: dragState.origPanX + (e.clientX - dragState.startX) / zoom,
        y: dragState.origPanY + (e.clientY - dragState.startY) / zoom,
      });
    } else if (dragState.kind === 'comp') {
      const dx = pt.x - dragState.startSvgX;
      const dy = pt.y - dragState.startSvgY;
      if (!dragState.moved && Math.hypot(dx, dy) > 4) {
        pushUndoSnapshot();
        setDragState({ ...dragState, moved: true });
      }
      if (Math.hypot(dx, dy) > 4) {
        moveComponent2D(dragState.compId, {
          x: dragState.origX + dx,
          y: dragState.origY + dy,
        });
      }
    }
  };

  const handleSvgPointerUp = () => {
    if (dragState?.kind === 'comp' && !dragState.moved) {
      toggleInteractiveComponent(dragState.compId);
    }
    setDragState(null);
  };

  const handlePinClick = (e: React.MouseEvent, pin: PinRef) => {
    e.stopPropagation();
    if (!wiringDraftFrom) {
      setWiringDraftFrom(pin);
    } else if (
      wiringDraftFrom.componentId === pin.componentId &&
      wiringDraftFrom.pinId === pin.pinId
    ) {
      setWiringDraftFrom(null);
    } else {
      addWire(wiringDraftFrom, pin);
    }
  };

  const fitToView = () => {
    if (components.length === 0) {
      setZoom(0.9);
      setPan({ x: 30, y: 20 });
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const c of components) {
      minX = Math.min(minX, c.pos2d.x - 80);
      minY = Math.min(minY, c.pos2d.y - 70);
      maxX = Math.max(maxX, c.pos2d.x + 80);
      maxY = Math.max(maxY, c.pos2d.y + 70);
    }
    const cw = Math.max(200, maxX - minX);
    const ch = Math.max(200, maxY - minY);
    const nextZoom = Math.min(1.4, Math.max(0.35, Math.min(rect.width / cw, rect.height / ch) * 0.88));
    setZoom(nextZoom);
    setPan({
      x: -minX + (rect.width / nextZoom - cw) / 2,
      y: -minY + (rect.height / nextZoom - ch) / 2,
    });
  };

  const isDark = schematicTheme === 'dark';

  return (
    <div
      className={`flex flex-col h-full border-l ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
      }`}
    >
      {/* 2D Header Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-200'
            : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
          <span>2D 经典原理图 (同步)</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={autoLayout2D}
            title="自动整理 2D 原理图排版"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-sky-500/20 hover:text-sky-400 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            排版
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            title="放大"
            className="p-1 rounded hover:bg-slate-700/40"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.15).toFixed(2))))}
            title="缩小"
            className="p-1 rounded hover:bg-slate-700/40"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fitToView}
            title="适应窗口"
            className="p-1 rounded hover:bg-slate-700/40"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSchematicTheme(isDark ? 'blueprint' : 'dark')}
            title={isDark ? '切换经典白底工程图纸' : '切换暗色 CAD 模式'}
            className="p-1 rounded hover:bg-slate-700/40"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>
          {onExpandToggle && (
            <button
              onClick={onExpandToggle}
              title="切换全屏/分屏视图"
              className="px-1.5 py-0.5 rounded border border-slate-600/40 text-[10px] hover:border-sky-400"
            >
              缩放面板
            </button>
          )}
        </div>
      </div>

      {/* Selected quick bar in 2D */}
      {selected && (
        <div
          className={`flex items-center justify-between px-3 py-1 text-[11px] border-b ${
            isDark
              ? 'bg-slate-900/60 border-slate-800 text-slate-300'
              : 'bg-sky-50 border-slate-200 text-slate-700'
          }`}
        >
          <span>
            已选: {selected.kind === 'component' ? components.find((c) => c.id === selected.id)?.label : '导线'}
          </span>
          <div className="flex items-center gap-2">
            {selected.kind === 'component' && (
              <button
                onClick={() => rotateComponent(selected.id)}
                className="flex items-center gap-1 text-sky-400 hover:underline"
              >
                <RotateCw className="w-3 h-3" />
                旋转90°
              </button>
            )}
            <button
              onClick={() => removeEntity(selected.kind, selected.id)}
              className="flex items-center gap-1 text-red-400 hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              删除
            </button>
          </div>
        </div>
      )}

      {/* Interactive SVG Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onWheel={(e) => {
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            setZoom((z) => Math.min(2.2, Math.max(0.3, Number((z + delta).toFixed(2)))));
          }}
          className={`w-full h-full cursor-grab active:cursor-grabbing ${
            isDark ? 'bg-[#08101e]' : 'bg-[#f8fafc]'
          }`}
        >
          <defs>
            <pattern
              id="grid-2d-pattern"
              width={20 * zoom}
              height={20 * zoom}
              patternUnits="userSpaceOnUse"
              x={(pan.x * zoom) % (20 * zoom)}
              y={(pan.y * zoom) % (20 * zoom)}
            >
              <circle
                cx={1}
                cy={1}
                r={1}
                fill={isDark ? 'rgba(56,189,248,0.16)' : 'rgba(15,23,42,0.16)'}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-2d-pattern)" pointerEvents="none" />

          <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
            {/* Wires */}
            {wires.map((w) => {
              const fc = components.find((c) => c.id === w.from.componentId);
              const tc = components.find((c) => c.id === w.to.componentId);
              if (!fc || !tc) return null;
              const p1 = getPinWorld2D(fc, w.from.pinId);
              const p2 = getPinWorld2D(tc, w.to.pinId);
              const pathD = computeOrthogonalPath(p1, p2);
              const isSel = selected?.kind === 'wire' && selected.id === w.id;
              const wt = wireTelemetryById[w.id];
              const cur = wt?.current ?? 0;
              const hasFlow = Math.abs(cur) > 1e-4;

              return (
                <g
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected({ kind: 'wire', id: w.id });
                  }}
                  className="cursor-pointer"
                >
                  <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSel ? '#38bdf8' : w.color || '#38bdf8'}
                    strokeWidth={isSel ? 3.5 : 2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {hasFlow && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#fef08a"
                      strokeWidth={2}
                      className={cur > 0 ? 'wire-flow-anim' : 'wire-flow-anim-rev'}
                      opacity={0.85}
                    />
                  )}
                </g>
              );
            })}

            {/* Junction Dots */}
            {junctionPoints.map((jp, idx) => (
              <circle
                key={idx}
                cx={jp.x}
                cy={jp.y}
                r={4}
                fill={isDark ? '#38bdf8' : '#0284c7'}
              />
            ))}

            {/* Draft Wire Preview */}
            {wiringDraftFrom && mouseSvgPos && (() => {
              const fc = components.find((c) => c.id === wiringDraftFrom.componentId);
              if (!fc) return null;
              const p1 = getPinWorld2D(fc, wiringDraftFrom.pinId);
              return (
                <path
                  d={computeOrthogonalPath(p1, mouseSvgPos)}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  pointerEvents="none"
                />
              );
            })()}

            {/* Components */}
            {components.map((c) => {
              const spec = COMPONENT_CATALOG[c.type];
              if (!spec) return null;
              const tel = telemetryById[c.id];
              const isSel = selected?.kind === 'component' && selected.id === c.id;
              const valueStr =
                c.type === 'RESISTOR'
                  ? formatEngineeringValue(Number(c.props.resistance ?? 220), 'Ω')
                  : c.type === 'CAPACITOR'
                  ? `${Number(c.props.capacitance ?? 100)} µF`
                  : c.type === 'INDUCTOR'
                  ? `${Number(c.props.inductance ?? 100)} mH`
                  : c.type === 'DC_SOURCE'
                  ? `${Number(c.props.voltage ?? 5)} V`
                  : c.type === 'AC_SOURCE'
                  ? `${Number(c.props.amplitude ?? 5)}V/${Number(c.props.frequency ?? 2)}Hz`
                  : c.type === 'POTENTIOMETER'
                  ? `${formatEngineeringValue(Number(c.props.resistance ?? 1000), 'Ω')} (${Math.round(
                      Number(c.props.ratio ?? 0.5) * 100
                    )}%)`
                  : '';

              const liveStr =
                tel && c.type !== 'GROUND' && c.type !== 'LOGIC_IN' && c.type !== 'LOGIC_OUT'
                  ? `${tel.voltageDrop.toFixed(2)}V · ${(tel.current * 1000).toFixed(1)}mA`
                  : '';

              return (
                <g
                  key={c.id}
                  transform={`translate(${c.pos2d.x}, ${c.pos2d.y})`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelected({ kind: 'component', id: c.id });
                    const pt = clientToSvg(e.clientX, e.clientY);
                    setDragState({
                      kind: 'comp',
                      compId: c.id,
                      startSvgX: pt.x,
                      startSvgY: pt.y,
                      origX: c.pos2d.x,
                      origY: c.pos2d.y,
                      moved: false,
                    });
                  }}
                  className="cursor-move"
                >
                  {(isSel || tel?.overloaded) && (
                    <rect
                      x={-48}
                      y={-38}
                      width={96}
                      height={76}
                      rx={8}
                      fill="none"
                      stroke={tel?.overloaded ? '#ef4444' : '#38bdf8'}
                      strokeWidth={1.8}
                      strokeDasharray="4 3"
                    />
                  )}

                  <g transform={`rotate(${c.rot2d})`}>{renderSymbolBody(c, tel, schematicTheme)}</g>

                  {/* Component Label & Live Value */}
                  <text
                    x={0}
                    y={-34}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="bold"
                    fill={isDark ? '#f1f5f9' : '#0f172a'}
                  >
                    {c.label} {valueStr ? `(${valueStr})` : ''}
                  </text>
                  {liveStr && (
                    <text
                      x={0}
                      y={42}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontFamily="monospace"
                      fill={
                        tel?.overloaded
                          ? '#ef4444'
                          : isDark
                          ? '#34d399'
                          : '#059669'
                      }
                    >
                      {liveStr}
                    </text>
                  )}

                  {/* Interactive Pins */}
                  {spec.pins.map((p) => {
                    const rad = (c.rot2d * Math.PI) / 180;
                    const px = p.offset2d.x * Math.cos(rad) - p.offset2d.y * Math.sin(rad);
                    const py = p.offset2d.x * Math.sin(rad) + p.offset2d.y * Math.cos(rad);
                    const isDraftPin =
                      wiringDraftFrom?.componentId === c.id && wiringDraftFrom?.pinId === p.id;
                    return (
                      <g
                        key={p.id}
                        transform={`translate(${px}, ${py})`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handlePinClick(e, { componentId: c.id, pinId: p.id })}
                        className="cursor-crosshair"
                      >
                        <circle r={9} fill="transparent" />
                        <circle
                          r={isDraftPin ? 5.5 : 3.8}
                          fill={isDraftPin ? '#22c55e' : '#eab308'}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={1.5}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>

        <div
          className={`pointer-events-none absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] ${
            isDark
              ? 'bg-slate-900/80 text-slate-400'
              : 'bg-white/90 text-slate-600 border border-slate-200'
          }`}
        >
          拖拽元件同步 3D 坐标 · 点击黄色端子引脚即可连线 · 点击开关可切换状态
        </div>
      </div>
    </div>
  );
};
