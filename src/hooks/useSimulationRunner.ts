import { useEffect } from 'react';
import { useCircuitStore } from '../store/useCircuitStore';

/**
 * Top-level simulation loop independent of 3D WebGL mount state.
 * Keeps MNA/digital ticking and waveform sampling active in 2d-only mode as well as split/3d-only.
 */
export function useSimulationRunner(active = true): void {
  useEffect(() => {
    if (!active) return;

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const rawDt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const dt = Math.min(0.035, Math.max(0.001, rawDt));

      useCircuitStore.getState().stepSimulation(dt);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [active]);
}
