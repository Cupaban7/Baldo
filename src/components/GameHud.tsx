import React from 'react';
import { BOOSTER_META, HudSnapshot } from '../game/types';
import {
  BaldicatorEarIcon,
  BoosterIcon,
  NotebookIcon,
  PauseIcon,
  VolumeIcon,
} from './SchoolIcons';
import { SchoolRadarMap } from './SchoolRadarMap';

interface GameHudProps {
  hud: HudSnapshot;
  mapExpanded: boolean;
  onToggleMap: () => void;
  onUseSlot: (idx: number) => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  mapExpanded,
  onToggleMap,
  onUseSlot,
  onToggleMute,
  onPause,
}) => {
  const baldiHeard = hud.baldiHeardTimer > 0;
  const baldiAngry = hud.baldiAnger > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-2.5 sm:p-4 safe-pad">
      {/* Subtle Crimson Vignette during 7/7 Red Alert */}
      {hud.redAlert && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 border-[10px] border-red-600/70 animate-red-alert"
        />
      )}

      {/* TOP ROW: Pocket Top Bar — Left (Notebooks + Zone + Radar) | Right (3 Pocket Slots + Mute/Pause) */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        {/* Top-Left Pocket Cluster */}
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div
              className="retro-panel bg-[#fffef5] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl flex items-center gap-1.5 sm:gap-2"
              data-testid="notebook-counter"
            >
              <NotebookIcon className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="font-mono-90s text-lg sm:text-3xl font-bold leading-none text-zinc-950">
                  {hud.notebooksCollected}/{hud.totalNotebooks}
                </span>
                {hud.redAlert && (
                  <span className="ml-1 font-mono-90s text-[10px] sm:text-xs font-bold text-red-600">
                    ¡SALIDAS!
                  </span>
                )}
              </div>
            </div>

            {/* Quiet unboxed live room/zone indicator */}
            <span
              data-testid="zone-label"
              className="hidden sm:inline font-mono-90s text-xs font-bold text-white/95 drop-shadow-[1px_1px_0_#000] whitespace-nowrap"
            >
              {hud.zoneLabel}
            </span>
          </div>

          <span className="sm:hidden font-mono-90s text-[10px] font-bold text-white/95 drop-shadow-[1px_1px_0_#000] leading-none pl-1">
            {hud.zoneLabel}
          </span>

          <SchoolRadarMap
            hud={hud}
            expanded={mapExpanded}
            onToggleExpand={onToggleMap}
          />
        </div>

        {/* Top-Right Pocket Dock: [1][2][3] Boosters + Mute/Pause */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {hud.inventory.map((item, idx) => (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onUseSlot(idx);
                }}
                aria-label={
                  item
                    ? `Usar ranura ${idx + 1}: ${BOOSTER_META[item].name}`
                    : `Ranura ${idx + 1} vacía`
                }
                data-testid={`inv-slot-${idx}`}
                className={`pointer-events-auto relative h-11 w-11 sm:h-14 sm:w-14 rounded-2xl border-2 sm:border-[3px] border-zinc-900 flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                  item
                    ? 'bg-[#fef9c3] hover:bg-[#fde047] shadow-[2px_3px_0_#18181b]'
                    : 'bg-[#fffef5]/90 text-zinc-400 shadow-[2px_2px_0_rgba(24,24,27,0.55)]'
                }`}
                title={item ? `${BOOSTER_META[item].name}: ${BOOSTER_META[item].desc}` : `Ranura ${idx + 1}`}
              >
                <span className="absolute top-0.5 left-1.5 font-mono-90s text-[9px] sm:text-[10px] font-bold text-zinc-900 leading-none">
                  {idx + 1}
                </span>
                {item ? (
                  <BoosterIcon type={item} className="w-6 h-6 sm:w-8 sm:h-8 mt-1" />
                ) : (
                  <span className="font-mono-90s text-xs opacity-40">—</span>
                )}
              </button>
            ))}

            {/* Compact Pocket Mute [M] and Pause [P] buttons */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={hud.muted ? 'Activar sonido' : 'Silenciar sonido'}
              className="pointer-events-auto retro-bevel h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#fffef5] hover:bg-zinc-100 text-zinc-950 flex items-center justify-center cursor-pointer"
              title="Silenciar [M]"
            >
              <VolumeIcon muted={hud.muted} />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pausar partida"
              className="pointer-events-auto retro-bevel h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#fffef5] hover:bg-zinc-100 text-zinc-950 flex items-center justify-center cursor-pointer"
              title="Pausa [P / Esc]"
            >
              <PauseIcon />
            </button>
          </div>

          {/* Oil charges indicator if active */}
          {hud.oilCharges > 0 && (
            <div className="retro-panel bg-[#ccfbf1] px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono-90s font-bold text-teal-950">
              ACEITE: {hud.oilCharges}
            </div>
          )}
        </div>
      </div>

      {/* CENTER CROSSHAIR + CONTEXTUAL DOOR PROMPT */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full border-2 border-black bg-white/95" />
        {hud.promptText && (
          <div className="bg-zinc-950/90 text-[#fef08a] border-2 border-[#fef08a] px-3.5 py-1 rounded-full font-mono-90s text-xs sm:text-sm font-bold whitespace-nowrap shadow-md">
            {hud.promptText}
          </div>
        )}
      </div>

      {/* Transient Event Banner: top-center on desktop, bottom-center above stamina on mobile */}
      {hud.bannerText && (
        <div className="pointer-events-none fixed bottom-12 sm:bottom-auto sm:top-4 left-1/2 -translate-x-1/2 z-30 max-w-[90vw]">
          <div
            className={`retro-panel px-3.5 py-1 rounded-2xl text-[11px] sm:text-sm font-bold text-center whitespace-nowrap truncate ${
              hud.bannerTone === 'danger'
                ? 'bg-red-600 text-white'
                : hud.bannerTone === 'warn'
                ? 'bg-amber-300 text-zinc-950'
                : hud.bannerTone === 'success'
                ? 'bg-emerald-300 text-zinc-950'
                : 'bg-[#fffef5] text-zinc-950'
            }`}
          >
            {hud.bannerText}
          </div>
        </div>
      )}

      {/* BOTTOM ROW: Pocket Rounded Staminaometer | Bottom-Right Baldicator */}
      <div className="flex items-end justify-between gap-2">
        {/* Left spacer for symmetry */}
        <div className="w-10 sm:w-20" />

        {/* Bottom-Center Pocket Staminaometer */}
        <div className="flex flex-col items-center gap-1 w-48 sm:w-72">
          <div className="w-full h-5 sm:h-6 bg-zinc-900 border-[3px] border-zinc-950 rounded-full overflow-hidden relative shadow-[2px_3px_0_rgba(0,0,0,0.65)]">
            {/* Trailing ghost stamina bar */}
            <div
              className="absolute inset-y-0 left-0 bg-amber-300 transition-transform duration-100"
              style={{ width: `${hud.staminaGhost}%` }}
            />
            {/* Active live stamina fill */}
            <div
              className={`absolute inset-y-0 left-0 transition-colors ${
                hud.stamina < 22
                  ? 'bg-red-500'
                  : hud.isRunning
                  ? 'bg-emerald-400'
                  : 'bg-[#16a34a]'
              }`}
              style={{ width: `${hud.stamina}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 font-mono-90s text-[10px] sm:text-[11px] font-bold text-white drop-shadow-[1px_1px_0_#000]">
              <span className="inline-flex items-center gap-1">
                <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="#fef08a" aria-hidden="true">
                  <path d="M9.5 1L3.5 9H8L6.5 15L12.5 7H8L9.5 1Z" />
                </svg>
                ESTAMINA
              </span>
              <span>{hud.stamina}%</span>
            </div>
          </div>
        </div>

        {/* Bottom-Right Pocket Baldicator */}
        <div
          className={`retro-panel rounded-2xl px-2 py-1.5 flex items-center gap-1.5 transition-transform ${
            baldiHeard
              ? 'bg-red-100 scale-105'
              : 'bg-[#fffef5]'
          }`}
          title="Baldicator: indica si el Profesor escuchó ruido"
        >
          <BaldicatorEarIcon heard={baldiHeard} angry={baldiAngry} />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-mono-90s text-[10px] font-bold text-zinc-900">
              {baldiHeard ? '¡TE OYÓ!' : baldiAngry ? 'ENOJADO' : 'CALMADO'}
            </span>
            <span className="font-mono-90s text-[10px] text-zinc-600">
              {Math.round(hud.baldiDistance)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
