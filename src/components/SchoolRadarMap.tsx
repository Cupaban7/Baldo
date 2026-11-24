import React, { useEffect, useRef } from 'react';
import { MAP_HEIGHT, MAP_WIDTH, SCHOOL_GRID } from '../game/mapData';
import { HudSnapshot, NpcKind } from '../game/types';

interface SchoolRadarMapProps {
  hud: HudSnapshot;
  expanded: boolean;
  onToggleExpand: () => void;
}

const NPC_SHORT_CODES: Record<NpcKind, string> = {
  baldi: 'P',
  principal: 'D',
  playtime: 'N',
  bully: 'A',
  sweep: 'E',
};

/**
 * Live 2D School Floorplan Radar that localizes:
 * - Professor Baldo in real-time (green calm / crimson angry)
 * - Remaining Notebooks (highlighting the nearest classroom with a golden ring)
 * - 3 Emergency Exits (flashing red/gold during Red Alert)
 * - Sound propagation rings when doors open or math fails
 * - Player position & live FOV cone
 */
export const SchoolRadarMap: React.FC<SchoolRadarMapProps> = ({
  hud,
  expanded,
  onToggleExpand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCompactScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const cellSize = expanded ? (isCompactScreen ? 10 : 12) : isCompactScreen ? 4 : 6;
  const width = MAP_WIDTH * cellSize;
  const height = MAP_HEIGHT * cellSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Background floor
    ctx.fillStyle = hud.redAlert ? '#2b1010' : '#f8f5e8';
    ctx.fillRect(0, 0, width, height);

    // Draw school grid
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const t = SCHOOL_GRID[y][x];
        if (t === 0) continue;
        if (t === 3) {
          ctx.fillStyle = '#eab308'; // classroom door
        } else if (t === 4) {
          ctx.fillStyle = '#ea580c'; // faculty door
        } else if (t === 8) {
          ctx.fillStyle = hud.redAlert ? '#ef4444' : '#7f1d1d'; // exit door
        } else if (t === 10) {
          ctx.fillStyle = '#64748b'; // office door
        } else if (t === 6) {
          ctx.fillStyle = '#f87171'; // cafeteria wall
        } else if (t === 5) {
          ctx.fillStyle = '#3b82f6'; // lockers
        } else {
          ctx.fillStyle = hud.redAlert ? '#5c2626' : '#334155'; // standard walls
        }
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Sound propagation rings (shows noise radar live)
    for (const ping of hud.soundPings) {
      const t = ping.age / ping.maxAge;
      const r = (0.6 + t * 4.5) * cellSize;
      ctx.save();
      ctx.strokeStyle = ping.heard
        ? `rgba(239, 68, 68, ${1 - t})`
        : `rgba(59, 130, 246, ${0.8 * (1 - t)})`;
      ctx.lineWidth = expanded ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(ping.x * cellSize, ping.y * cellSize, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Identify nearest uncollected notebook for subtle golden beacon
    let nearestId: number | null = null;
    let nearestDist = Infinity;
    for (const nb of hud.notebooks) {
      if (nb.collected) continue;
      const d = Math.hypot(nb.x - hud.playerX, nb.y - hud.playerY);
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = nb.id;
      }
    }

    // Remaining Notebooks
    const pulse = 0.5 + 0.5 * Math.sin(hud.elapsedTime * 5.2);
    for (const nb of hud.notebooks) {
      if (nb.collected) continue;
      const nx = nb.x * cellSize;
      const ny = nb.y * cellSize;

      if (nb.id === nearestId) {
        ctx.save();
        ctx.strokeStyle = `rgba(234, 179, 8, ${0.45 + pulse * 0.5})`;
        ctx.lineWidth = expanded ? 2 : 1.4;
        ctx.beginPath();
        ctx.arc(nx, ny, cellSize * (0.75 + pulse * 0.45), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(nx - cellSize * 0.42, ny - cellSize * 0.42, cellSize * 0.84, cellSize * 0.84);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(nx - cellSize * 0.42, ny - cellSize * 0.42, cellSize * 0.84, cellSize * 0.84);
    }

    // Unlocked Exits highlight in Red Alert
    if (hud.redAlert) {
      for (const ex of hud.exits) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(ex.x * cellSize, ex.y * cellSize, cellSize * 0.68, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Player FOV cone & dot
    const px = hud.playerX * cellSize;
    const py = hud.playerY * cellSize;
    ctx.save();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, cellSize * 3.2, hud.playerAngle - 0.55, hud.playerAngle + 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(px, py, expanded ? 4.8 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Live Professor Baldo tracker on the map
    for (const npc of hud.npcs) {
      const nx = npc.x * cellSize;
      const ny = npc.y * cellSize;
      const rad = expanded ? 6.4 : 3.8;

      if (npc.angry) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
        ctx.beginPath();
        ctx.arc(nx, ny, rad + (expanded ? 4 : 2.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(nx, ny, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (expanded) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(NPC_SHORT_CODES[npc.id], nx, ny + 0.5);
      }
    }
  }, [hud, expanded, cellSize, width, height]);

  const baldoLive = hud.npcs.find((n) => n.id === 'baldi');
  const baldoColor = baldoLive ? baldoLive.color : '#16a34a';

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-1">
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          onToggleExpand();
        }}
        aria-label={expanded ? 'Contraer mapa escolar' : 'Ampliar mapa escolar'}
        className="retro-panel bg-[#fffef5] p-1 text-left transition-transform hover:scale-[1.01] cursor-pointer"
        title="Clic o [Tab] para ampliar/contraer mapa"
      >
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5 text-[10px] font-bold text-zinc-900 font-mono-90s">
          <span>MAPA · BALDO</span>
          <span className="hidden sm:inline text-zinc-500">
            {expanded ? '[TAB] −' : '[TAB] +'}
          </span>
          <span className="sm:hidden text-zinc-500">{expanded ? '−' : '+'}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          data-testid="npc-radar-map"
          className="block border border-zinc-800 pixelated"
        />
        {expanded && (
          <div className="mt-1.5 flex items-center justify-between gap-3 px-1 pb-0.5 text-[10px] font-bold text-zinc-900">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-900 text-[9px] font-mono-90s text-white shrink-0"
                style={{ backgroundColor: baldoColor }}
              >
                P
              </span>
              <span>Profesor Baldo</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="inline-block h-3 w-3 border border-yellow-400 bg-blue-600 shrink-0" />
              <span>Cuaderno</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="inline-block h-3 w-3 rounded-full border border-red-600 bg-yellow-300 shrink-0" />
              <span>Salida</span>
            </div>
          </div>
        )}
      </button>
    </div>
  );
};
