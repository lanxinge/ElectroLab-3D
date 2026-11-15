import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  PONDER_DWELL_READY_MS,
  PONDER_DWELL_SHOW_MS,
  PONDER_EXIT_GRACE_MS,
  usePonderStore,
} from '../store/usePonderStore';
import type { PonderTarget } from '../ponder/ponderTypes';
import { useCircuitStore } from '../store/useCircuitStore';

export const PonderHoverOverlay: React.FC = () => {
  const hoveredTarget = usePonderStore((s) => s.hoveredTarget);
  const isPopupHovered = usePonderStore((s) => s.isPopupHovered);
  const hoverStartMs = usePonderStore((s) => s.hoverStartMs);
  const modalOpen = usePonderStore((s) => s.modalOpen);
  const setPopupHovered = usePonderStore((s) => s.setPopupHovered);
  const openPonder = usePonderStore((s) => s.openPonder);

  const [displayTarget, setDisplayTarget] = useState<PonderTarget | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (modalOpen) {
      setDisplayTarget(null);
      setElapsedMs(0);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      return;
    }

    if (hoveredTarget) {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setDisplayTarget(hoveredTarget);
      startRef.current = hoverStartMs || performance.now();
    } else if (isPopupHovered) {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    } else {
      // Grace period before dismissing so user can move cursor onto the popup button
      if (exitTimerRef.current === null && displayTarget) {
        exitTimerRef.current = window.setTimeout(() => {
          exitTimerRef.current = null;
          const st = usePonderStore.getState();
          if (!st.hoveredTarget && !st.isPopupHovered) {
            setDisplayTarget(null);
            setElapsedMs(0);
          }
        }, PONDER_EXIT_GRACE_MS);
      }
    }
  }, [hoveredTarget, isPopupHovered, hoverStartMs, modalOpen, displayTarget]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // Tick dwell progress smoothly while a target is active
  useEffect(() => {
    if (!displayTarget || modalOpen) return;
    let raf = 0;
    const tick = () => {
      const dt = Math.max(0, performance.now() - startRef.current);
      setElapsedMs(dt);
      if (dt < PONDER_DWELL_READY_MS + 60) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [displayTarget, hoverStartMs, modalOpen]);

  // Global [W] hotkey matching Create Mod's signature "Hold/Press W to Ponder"
  useEffect(() => {
    if (modalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'w' && e.key !== 'W') return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (displayTarget && elapsedMs >= PONDER_DWELL_SHOW_MS) {
        e.preventDefault();
        openPonder(displayTarget.type, displayTarget.componentId);
        return;
      }
      const st = useCircuitStore.getState();
      if (st.selected?.kind === 'component') {
        const comp = st.components.find((c) => c.id === st.selected?.id);
        if (comp) {
          e.preventDefault();
          openPonder(comp.type, comp.id);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [displayTarget, modalOpen, elapsedMs, openPonder]);

  if (!displayTarget || modalOpen || elapsedMs < PONDER_DWELL_SHOW_MS) {
    return null;
  }

  const ready = elapsedMs >= PONDER_DWELL_READY_MS;
  const pct = Math.min(
    100,
    Math.max(
      0,
      ((elapsedMs - PONDER_DWELL_SHOW_MS) /
        (PONDER_DWELL_READY_MS - PONDER_DWELL_SHOW_MS)) *
        100
    )
  );

  // Clamp floating anchor safely inside viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const left = Math.min(vw - 220, Math.max(12, displayTarget.anchorX + 10));
  const top = Math.min(vh - 76, Math.max(56, displayTarget.anchorY - 12));

  return (
    <div
      style={{ left, top }}
      data-testid="ponder-hover-overlay"
      onMouseEnter={() => setPopupHovered(true)}
      onMouseLeave={() => setPopupHovered(false)}
      className={`fixed z-40 select-none transition-all duration-150 ${
        ready ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-95'
      }`}
    >
      {ready ? (
        <button
          type="button"
          data-testid="ponder-trigger-btn"
          onClick={() => openPonder(displayTarget.type, displayTarget.componentId)}
          className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-amber-400/70 shadow-xl shadow-amber-950/40 backdrop-blur-md text-left transition cursor-pointer"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="text-xs font-semibold text-amber-200 whitespace-nowrap flex items-center gap-1.5">
              <span>思索 · {displayTarget.label}</span>
              <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono text-slate-300">
                W
              </kbd>
            </div>
            <div className="text-[10px] text-slate-400 whitespace-nowrap">
              点击开启 Create 风格 3D 原理剧场
            </div>
          </div>
        </button>
      ) : (
        <div className="w-48 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-sky-500/40 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-sky-200 mb-1.5">
            <span className="flex items-center gap-1 truncate font-medium">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
              思索 {displayTarget.label}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{Math.round(pct)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-amber-300 transition-[width] duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
