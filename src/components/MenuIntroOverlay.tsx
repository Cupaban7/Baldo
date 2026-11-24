import React, { useEffect, useMemo, useState } from 'react';
import { getAssetAtlas } from '../game/sprites';
import { TitleLockupSvg } from './SchoolIcons';

interface MenuIntroOverlayProps {
  onSkip: () => void;
}

/**
 * Animated Main-Menu Intro ("Splash") played over the live 3D hallway glide-in.
 * Auto-transitions into the Main Menu after ~3.4s or immediately on tap/click/key.
 */
export const MenuIntroOverlay: React.FC<MenuIntroOverlayProps> = ({ onSkip }) => {
  const atlas = useMemo(() => getAssetAtlas(), []);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setElapsed((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const progressPct = Math.min(100, (elapsed / 4.2) * 100);
  const showLogo = elapsed >= 0.12;
  const showGreeting = elapsed >= 0.85;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-6 safe-pad bg-gradient-to-b from-black/35 via-transparent to-black/65 cursor-pointer select-none"
      data-testid="menu-intro"
      onClick={onSkip}
    >
      {/* Top row: subtle Pocket Edition label + Skip button */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-90s text-[11px] sm:text-xs font-bold tracking-wider text-white/95 drop-shadow-[1px_1px_0_#000]">
          EDICIÓN POCKET · 1999
        </span>
        <button
          type="button"
          data-testid="skip-splash-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="retro-bevel bg-[#fffef5] hover:bg-[#fef08a] text-zinc-950 font-mono-90s text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer whitespace-nowrap"
        >
          Saltar ▸
        </button>
      </div>

      {/* Center animated title lockup popping over the moving hallway */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-2 pointer-events-none">
        <div
          className={`w-full max-w-[430px] transition-all duration-500 ease-out ${
            showLogo ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'
          }`}
        >
          <TitleLockupSvg className="w-full drop-shadow-[4px_6px_0_rgba(0,0,0,0.55)]" />
        </div>

        <p
          className={`font-mono-90s text-xs sm:text-sm font-bold text-[#fef08a] tracking-wide text-center drop-shadow-[1px_2px_0_#000] transition-opacity duration-500 ${
            showLogo ? 'opacity-100' : 'opacity-0'
          }`}
        >
          ESCUELA DE CÁLCULO MULTIVARIABLE
        </p>
      </div>

      {/* Bottom greeting card from Baldo + intro progress bar */}
      <div className="flex flex-col items-center gap-2.5 w-full max-w-md mx-auto pointer-events-none">
        <div
          className={`retro-panel w-full bg-[#fffef5] rounded-2xl px-3.5 py-2.5 flex items-center gap-3 transition-all duration-400 ease-out ${
            showGreeting
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <img
            src={atlas.spriteDataUrls.baldi_calm}
            alt="Profesor Baldo"
            className="h-14 w-12 shrink-0 object-contain pixelated"
          />
          <div className="min-w-0">
            <div className="font-serif-90s text-xs font-bold text-emerald-800">
              Profesor Baldo
            </div>
            <p className="text-xs sm:text-sm font-bold text-zinc-950 leading-snug">
              ¡Bienvenido! Afina tus integrales dobles… ¡la clase está por comenzar!
            </p>
          </div>
        </div>

        {/* Sleek pocket progress strip */}
        <div className="w-full h-2 bg-black/50 border-2 border-zinc-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#16c60c]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
