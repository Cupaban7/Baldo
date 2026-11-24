import React, { useMemo } from 'react';
import { getAssetAtlas } from '../game/sprites';
import { Difficulty } from '../game/types';
import { TitleLockupSvg } from './SchoolIcons';

interface TitleScreenProps {
  difficulty: Difficulty;
  isMobile: boolean;
  onSelectDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onOpenTutorial: () => void;
}

const DIFF_OPTIONS: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'facil', label: 'Fácil', hint: 'Rectángulos' },
  { id: 'medio', label: 'Medio', hint: 'Tipo I y II' },
  { id: 'dificil', label: 'Difícil', hint: 'Polares e Inv.' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  difficulty,
  isMobile,
  onSelectDifficulty,
  onStart,
  onOpenTutorial,
}) => {
  const atlas = useMemo(() => getAssetAtlas(), []);

  const cast = [
    { key: 'baldi_calm' as const, label: 'Profesor Baldo', h: 'h-24 sm:h-36' },
    { key: 'notebook' as const, label: 'Cuaderno de Integrales', h: 'h-14 sm:h-22' },
    { key: 'coffee' as const, label: 'Café Expreso', h: 'h-12 sm:h-18' },
    { key: 'energy' as const, label: 'Barra Energética', h: 'h-12 sm:h-18' },
    { key: 'oil' as const, label: 'Aceite Silenciador', h: 'h-12 sm:h-18' },
  ];

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between p-3.5 sm:p-6 safe-pad bg-gradient-to-b from-white/70 via-white/25 to-black/60"
      data-testid="title-screen"
    >
      {/* Top / Center Pocket Composition */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto w-full">
        {/* Custom Inline SVG Title Lockup + Unboxed Pocket Subline */}
        <div className="w-full flex flex-col items-center gap-1">
          <TitleLockupSvg className="w-full max-w-[440px] drop-shadow-[4px_5px_0_rgba(0,0,0,0.45)]" />
          <span className="font-mono-90s text-xs font-bold tracking-[0.22em] text-[#fef08a] drop-shadow-[1px_2px_0_#18181b]">
            POCKET EDITION
          </span>
        </div>

        {/* Pocket Control Dock: Difficulty + Chunky Thumb-Friendly Actions */}
        <div className="retro-panel bg-[#fffef5] rounded-2xl p-3 sm:p-4 w-full flex flex-col gap-3">
          {/* Tactile Segmented Difficulty Selector */}
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Selector de dificultad"
          >
            {DIFF_OPTIONS.map((opt) => {
              const active = difficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelectDifficulty(opt.id)}
                  className={`retro-bevel py-2.5 px-2 rounded-xl text-center cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#facc15] text-zinc-950'
                      : 'bg-[#f4f1df] text-zinc-800 hover:bg-[#e9e4c9]'
                  }`}
                >
                  <div className="font-bold text-sm sm:text-base leading-tight whitespace-nowrap">
                    {opt.label}
                  </div>
                  <div className="font-mono-90s text-[10px] text-zinc-700 leading-tight truncate mt-0.5">
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Primary Play + Interactive 3D Tutorial CTAs */}
          <div className="grid grid-cols-5 gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="col-span-3 retro-bevel bg-[#16c60c] hover:bg-[#16a34a] text-white font-serif-90s text-xl sm:text-2xl font-bold py-3.5 px-4 rounded-2xl cursor-pointer whitespace-nowrap"
            >
              JUGAR
            </button>
            <button
              type="button"
              data-testid="open-tutorial-btn"
              onClick={onOpenTutorial}
              className="col-span-2 retro-bevel bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base py-3.5 px-3 rounded-2xl cursor-pointer whitespace-nowrap"
            >
              TUTORIAL
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Stage: Professor Baldo & School Gear Showcase + Platform-Matched Hint */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-end justify-center gap-3 sm:gap-6 pointer-events-none select-none">
          {cast.map((c) => (
            <img
              key={c.key}
              src={atlas.spriteDataUrls[c.key]}
              alt={c.label}
              className={`${c.h} w-auto object-contain pixelated drop-shadow-[2px_3px_0_rgba(0,0,0,0.65)]`}
            />
          ))}
        </div>

        <p className="text-[11px] sm:text-xs font-mono-90s text-white/95 text-center drop-shadow-[1px_1px_0_#000] whitespace-nowrap">
          {isMobile
            ? 'Joystick Izq. · Deslizar Der. · Botones ABRIR y CORRER'
            : 'WASD Mover · Ratón/←→ Girar · Shift Correr · E Puerta · 1-3 Objetos · Tab Mapa'}
        </p>
      </div>
    </div>
  );
};
