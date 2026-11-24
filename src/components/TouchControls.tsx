import React, { useEffect, useRef, useState } from 'react';

interface TouchControlsProps {
  visible: boolean;
  isRunning: boolean;
  hasDoorPrompt: boolean;
  onMove: (strafe: number, forward: number) => void;
  onLook: (deltaRad: number) => void;
  onToggleRun: (running: boolean) => void;
  onInteract: () => void;
}

/**
 * Simultaneous Multi-Touch Controls for Android & iOS Safari:
 * - Left half of screen: dynamic floating virtual joystick (walk & strafe)
 * - Right half of screen: smooth horizontal drag to rotate camera
 * - Ergonomic buttons: CORRER (toggle) and ACCIÓN (doors)
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  isRunning,
  hasDoorPrompt,
  onMove,
  onLook,
  onToggleRun,
  onInteract,
}) => {
  const moveTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const moveOrigin = useRef({ x: 0, y: 0 });
  const lookLastX = useRef(0);

  const [joyState, setJoyState] = useState<{
    active: boolean;
    ox: number;
    oy: number;
    dx: number;
    dy: number;
  }>({ active: false, ox: 0, oy: 0, dx: 0, dy: 0 });

  useEffect(() => {
    if (!visible) {
      moveTouchId.current = null;
      lookTouchId.current = null;
      onMove(0, 0);
    }
  }, [visible, onMove]);

  if (!visible) return null;

  const MAX_JOY_R = 46;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Ignore touches that began on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    const halfW = window.innerWidth * 0.5;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < halfW && moveTouchId.current === null) {
        moveTouchId.current = t.identifier;
        moveOrigin.current = { x: t.clientX, y: t.clientY };
        setJoyState({ active: true, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
      } else if (t.clientX >= halfW && lookTouchId.current === null) {
        lookTouchId.current = t.identifier;
        lookLastX.current = t.clientX;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === moveTouchId.current) {
        let dx = t.clientX - moveOrigin.current.x;
        let dy = t.clientY - moveOrigin.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_JOY_R) {
          dx = (dx / dist) * MAX_JOY_R;
          dy = (dy / dist) * MAX_JOY_R;
        }
        setJoyState((prev) => ({ ...prev, dx, dy }));
        onMove(dx / MAX_JOY_R, -dy / MAX_JOY_R);
      } else if (t.identifier === lookTouchId.current) {
        const deltaX = t.clientX - lookLastX.current;
        lookLastX.current = t.clientX;
        onLook(deltaX * 0.0072);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === moveTouchId.current) {
        moveTouchId.current = null;
        setJoyState({ active: false, ox: 0, oy: 0, dx: 0, dy: 0 });
        onMove(0, 0);
      } else if (t.identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-auto select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Resting Left-Side Pocket Virtual Thumb Pad */}
      {!joyState.active && (
        <div className="pointer-events-none fixed bottom-16 left-4 h-24 w-24 rounded-full border-[3px] border-white/60 bg-black/30 flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.4)]">
          <span className="absolute top-1.5 text-[9px] text-white/75 leading-none">▲</span>
          <span className="absolute bottom-1.5 text-[9px] text-white/75 leading-none">▼</span>
          <span className="absolute left-1.5 text-[9px] text-white/75 leading-none">◄</span>
          <span className="absolute right-1.5 text-[9px] text-white/75 leading-none">►</span>
          <div className="h-10 w-10 rounded-full border-2 border-zinc-900 bg-[#fffef5]/90 shadow-inner" />
        </div>
      )}

      {/* Active Dynamic Floating Pocket Joystick */}
      {joyState.active && (
        <div
          className="pointer-events-none fixed h-26 w-26 -ml-13 -mt-13 rounded-full border-[3px] border-[#facc15] bg-black/40"
          style={{ left: joyState.ox, top: joyState.oy }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-11 w-11 -ml-5.5 -mt-5.5 rounded-full border-2 border-zinc-950 bg-[#facc15] shadow-md"
            style={{
              transform: `translate(${joyState.dx}px, ${joyState.dy}px)`,
            }}
          />
        </div>
      )}

      {/* Ergonomic Right-Side Pocket Action Cluster */}
      <div className="fixed bottom-16 right-3 flex flex-col items-end gap-2.5 safe-pad">
        <button
          type="button"
          onTouchStart={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          aria-label="Abrir puerta o interactuar"
          className={`retro-bevel h-14 min-w-[82px] px-3.5 rounded-2xl font-mono-90s font-bold text-xs flex flex-col items-center justify-center leading-tight cursor-pointer transition-transform active:scale-95 ${
            hasDoorPrompt
              ? 'bg-[#facc15] text-zinc-950 scale-105'
              : 'bg-[#fffef5]/95 text-zinc-950'
          }`}
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
            <circle cx="13" cy="10" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span>ABRIR</span>
        </button>

        <button
          type="button"
          onTouchStart={(e) => {
            e.stopPropagation();
            onToggleRun(!isRunning);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleRun(!isRunning);
          }}
          aria-label="Alternar correr"
          className={`retro-bevel h-14 min-w-[82px] px-3.5 rounded-2xl font-mono-90s font-bold text-xs flex flex-col items-center justify-center leading-tight cursor-pointer transition-transform active:scale-95 ${
            isRunning
              ? 'bg-[#ef4444] text-white'
              : 'bg-[#dcfce7] text-zinc-950'
          }`}
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 mb-0.5" fill="currentColor" aria-hidden="true">
            <path d="M11.5 2L4.5 11H10L8.5 18L15.5 9H10L11.5 2Z" />
          </svg>
          <span>{isRunning ? 'CORRE' : 'CORRER'}</span>
        </button>
      </div>
    </div>
  );
};
