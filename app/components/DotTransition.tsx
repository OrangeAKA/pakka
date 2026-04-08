'use client';

import { useEffect, useState } from 'react';

/**
 * Textured dot field transition.
 *
 * Dots drift inward from scattered positions, converge briefly at center,
 * then the callback fires and the overlay fades. Like waypoints on a map
 * finding their route.
 *
 * Usage: <DotTransition active={true} onComplete={() => setScreen('next')} />
 */

const DOT_COUNT = 18;

interface Dot {
  id: number;
  startX: number;
  startY: number;
  size: number;
  delay: number;
}

function generateDots(): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    // Scatter dots across the viewport
    const angle = (i / DOT_COUNT) * Math.PI * 2;
    const radius = 30 + Math.random() * 25; // % from center
    dots.push({
      id: i,
      startX: 50 + Math.cos(angle) * radius,
      startY: 50 + Math.sin(angle) * radius,
      size: 3 + Math.random() * 4,
      delay: i * 35,
    });
  }
  return dots;
}

export default function DotTransition({
  active,
  onComplete,
  duration = 700,
}: {
  active: boolean;
  onComplete: () => void;
  duration?: number;
}) {
  const [dots] = useState(generateDots);
  const [phase, setPhase] = useState<'idle' | 'converge' | 'done'>('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }

    setPhase('converge');

    const timer = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--bg)',
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: phase === 'done' ? 'none' : 'auto',
      }}
    >
      <div className="relative w-full h-full max-w-sm max-h-[500px]">
        {dots.map((dot) => (
          <span
            key={dot.id}
            className="absolute rounded-full"
            style={{
              width: dot.size,
              height: dot.size,
              background: dot.id % 5 === 0 ? 'var(--accent)' : 'var(--text-faint)',
              opacity: phase === 'converge' ? 0.8 : 0,
              left: phase === 'converge' ? '50%' : `${dot.startX}%`,
              top: phase === 'converge' ? '50%' : `${dot.startY}%`,
              transform: 'translate(-50%, -50%)',
              transition: `all ${duration * 0.7}ms cubic-bezier(0.4, 0, 0.2, 1) ${dot.delay}ms`,
            }}
          />
        ))}
        {/* Center pulse when dots converge */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: phase === 'converge' ? 12 : 0,
            height: phase === 'converge' ? 12 : 0,
            background: 'var(--accent)',
            opacity: phase === 'converge' ? 0.6 : 0,
            transition: `all ${duration * 0.5}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${duration * 0.4}ms`,
          }}
        />
      </div>
    </div>
  );
}
