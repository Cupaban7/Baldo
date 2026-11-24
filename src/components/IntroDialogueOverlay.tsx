import React, { useEffect, useMemo, useState } from 'react';
import { getAssetAtlas } from '../game/sprites';

export interface IntroDialogueLine {
  speaker: string;
  mood: 'calm' | 'angry';
  text: string;
}

export const INTRO_DIALOGUE_LINES: IntroDialogueLine[] = [
  {
    speaker: 'Profesor Baldo',
    mood: 'calm',
    text: '¡Hola! ¡Bienvenido a mi escuela de Cálculo Multivariable! Soy el Profesor Baldo.',
  },
  {
    speaker: 'Profesor Baldo',
    mood: 'calm',
    text: 'Para aprobar el curso debes encontrar los 7 cuadernos repartidos en las aulas y resolver sus integrales dobles.',
  },
  {
    speaker: 'Profesor Baldo',
    mood: 'angry',
    text: 'Empezaré muy tranquilo y despacio... pero si fallas alguna integral, mi regla y yo iremos a buscarte por los pasillos.',
  },
  {
    speaker: 'Profesor Baldo',
    mood: 'calm',
    text: 'Mira el Mapa Radar para localizarme siempre y aprovecha el Café Expreso, las Barras y el Aceite Silenciador. ¡Mucha suerte!',
  },
];

interface IntroDialogueOverlayProps {
  onFinish: () => void;
  onVoiceBlip: (pitchOffset?: number) => void;
}

export const IntroDialogueOverlay: React.FC<IntroDialogueOverlayProps> = ({
  onFinish,
  onVoiceBlip,
}) => {
  const atlas = useMemo(() => getAssetAtlas(), []);
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const currentLine = INTRO_DIALOGUE_LINES[lineIdx];
  const isFinishedTyping = charCount >= currentLine.text.length;
  const isLastLine = lineIdx === INTRO_DIALOGUE_LINES.length - 1;

  // Typewriter reveal with subtle retro voice chatter blips
  useEffect(() => {
    if (isFinishedTyping) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(currentLine.text.length, charCount + 2);
      setCharCount(next);
      if (next % 6 === 0) {
        onVoiceBlip(currentLine.mood === 'angry' ? -2 : 1);
      }
    }, 24);
    return () => window.clearTimeout(timer);
  }, [charCount, currentLine, isFinishedTyping, onVoiceBlip]);

  const handleAdvance = () => {
    if (!isFinishedTyping) {
      setCharCount(currentLine.text.length);
      return;
    }
    if (isLastLine) {
      onFinish();
    } else {
      setLineIdx((i) => i + 1);
      setCharCount(0);
      onVoiceBlip(2);
    }
  };

  // Allow Enter / Space to advance and Escape to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        handleAdvance();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onFinish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const portraitUrl =
    currentLine.mood === 'angry'
      ? atlas.spriteDataUrls.baldi_angry
      : atlas.spriteDataUrls.baldi_calm;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end items-center p-3 sm:p-6 safe-pad pointer-events-auto bg-gradient-to-t from-black/65 via-transparent to-transparent"
      role="dialog"
      aria-modal="true"
      aria-label="Diálogo inicial con el Profesor Baldo"
      data-testid="intro-dialogue"
      onClick={handleAdvance}
    >
      <div
        className="retro-panel w-full max-w-2xl bg-[#fffef5] rounded-xl p-3.5 sm:p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Animated Baldo portrait frame */}
          <div
            className={`shrink-0 w-18 h-22 sm:w-22 sm:h-26 rounded-lg border-[3px] border-zinc-900 flex items-center justify-center overflow-hidden transition-transform ${
              currentLine.mood === 'angry' ? 'bg-red-100' : 'bg-emerald-100'
            } ${!isFinishedTyping ? 'scale-[1.03]' : ''}`}
          >
            <img
              src={portraitUrl}
              alt="Profesor Baldo"
              className="w-full h-full object-contain pixelated"
            />
          </div>

          {/* Speech text */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif-90s text-sm sm:text-base font-bold text-emerald-900">
                {currentLine.speaker}
              </span>
              <span className="font-mono-90s text-xs font-bold text-zinc-500">
                {lineIdx + 1}/{INTRO_DIALOGUE_LINES.length}
              </span>
            </div>

            <p
              className="min-h-[66px] sm:min-h-[72px] text-sm sm:text-lg font-bold text-zinc-950 leading-snug"
              data-testid="intro-dialogue-text"
            >
              {currentLine.text.slice(0, charCount)}
              {!isFinishedTyping && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-zinc-900 align-middle animate-pulse" />
              )}
            </p>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-2 border-t-2 border-zinc-200 pt-2.5">
          <button
            type="button"
            onClick={onFinish}
            className="retro-bevel bg-zinc-200 hover:bg-zinc-300 text-zinc-900 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-lg cursor-pointer whitespace-nowrap"
          >
            Saltar diálogo
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono-90s text-[11px] text-zinc-500">
              [Espacio / Enter]
            </span>
            <button
              type="button"
              onClick={handleAdvance}
              data-testid="intro-next-btn"
              className="retro-bevel bg-[#16c60c] hover:bg-[#16a34a] text-white font-bold text-sm sm:text-base px-5 py-2 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {!isFinishedTyping
                ? 'Completar'
                : isLastLine
                ? '¡Empezar!'
                : 'Siguiente ▸'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
