import React, { useMemo } from 'react';
import { getAssetAtlas } from '../game/sprites';
import { HudSnapshot } from '../game/types';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenTutorial: () => void;
  onTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenTutorial,
  onTitle,
}) => (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 safe-pad"
    role="dialog"
    aria-modal="true"
    aria-label="Juego en pausa"
  >
    <div className="retro-panel bg-[#fffef5] rounded-xl p-5 w-full max-w-sm flex flex-col gap-3">
      <h2 className="font-serif-90s text-2xl font-bold text-center text-zinc-950">
        Pausa
      </h2>
      <button
        type="button"
        onClick={onResume}
        className="retro-bevel bg-[#16c60c] hover:bg-[#16a34a] text-white font-bold text-lg py-2.5 px-4 rounded-lg cursor-pointer"
      >
        Continuar
      </button>
      <button
        type="button"
        onClick={onOpenTutorial}
        className="retro-bevel bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-base py-2 px-4 rounded-lg cursor-pointer"
      >
        Ver Tutorial
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="retro-bevel bg-[#facc15] hover:bg-[#eab308] text-zinc-950 font-bold text-base py-2 px-4 rounded-lg cursor-pointer"
      >
        Reiniciar
      </button>
      <button
        type="button"
        onClick={onTitle}
        className="retro-bevel bg-zinc-200 hover:bg-zinc-300 text-zinc-950 font-bold text-base py-2 px-4 rounded-lg cursor-pointer"
      >
        Menú Principal
      </button>
    </div>
  </div>
);

interface OutcomeModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
  onTitle: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  hud,
  onRestart,
  onTitle,
}) => {
  const atlas = useMemo(() => getAssetAtlas(), []);
  const isVictory = hud.phase === 'victory';
  const totalAnswers = hud.correctCount + hud.errorsCount;
  const accuracy =
    totalAnswers > 0 ? Math.round((hud.correctCount / totalAnswers) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 safe-pad"
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? 'Victoria' : 'Fin de la partida'}
    >
      <div
        className={`retro-panel rounded-xl p-5 w-full max-w-md flex flex-col items-center gap-4 ${
          isVictory ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'
        }`}
      >
        <div className="flex items-center gap-4 w-full justify-center">
          <img
            src={
              isVictory
                ? atlas.spriteDataUrls.baldi_calm
                : atlas.spriteDataUrls.baldi_slap
            }
            alt="Profesor Baldo"
            className="h-24 w-auto object-contain pixelated"
          />
          <div className="text-left">
            <h2
              className={`font-serif-90s text-2xl sm:text-3xl font-bold ${
                isVictory ? 'text-emerald-800' : 'text-red-700'
              }`}
            >
              {isVictory ? '¡ESCAPASTE!' : 'GAME OVER'}
            </h2>
            <p className="text-sm font-bold text-zinc-800 mt-1">
              {isVictory
                ? 'Dominaste las integrales dobles y saliste de la escuela.'
                : hud.deathReason || 'El Profesor Baldo te alcanzó.'}
            </p>
          </div>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white border-2 border-zinc-900 rounded-lg p-2.5 text-center">
            <div className="text-[10px] font-mono-90s font-bold text-zinc-500">
              TIEMPO
            </div>
            <div className="font-mono-90s text-xl font-bold text-zinc-950">
              {formatTime(hud.elapsedTime)}
            </div>
          </div>
          <div className="bg-white border-2 border-zinc-900 rounded-lg p-2.5 text-center">
            <div className="text-[10px] font-mono-90s font-bold text-zinc-500">
              CUADERNOS
            </div>
            <div className="font-mono-90s text-xl font-bold text-zinc-950">
              {hud.notebooksCollected}/{hud.totalNotebooks}
            </div>
          </div>
          <div className="bg-white border-2 border-zinc-900 rounded-lg p-2.5 text-center">
            <div className="text-[10px] font-mono-90s font-bold text-zinc-500">
              PRECISIÓN
            </div>
            <div className="font-mono-90s text-xl font-bold text-zinc-950">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="retro-bevel bg-[#16c60c] hover:bg-[#16a34a] text-white font-bold text-base py-3 px-4 rounded-xl cursor-pointer whitespace-nowrap"
          >
            {isVictory ? 'Jugar de nuevo' : 'Reintentar'}
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="retro-bevel bg-zinc-200 hover:bg-zinc-300 text-zinc-950 font-bold text-base py-3 px-4 rounded-xl cursor-pointer whitespace-nowrap"
          >
            Menú
          </button>
        </div>
      </div>
    </div>
  );
};
