import React, { useMemo } from 'react';
import { getAssetAtlas } from '../game/sprites';
import { IntegralProblem, MathSession } from '../game/types';

interface MathTabletModalProps {
  session: MathSession;
  baldiAnger: number;
  onAnswer: (choiceIndex: number) => void;
}

const IntegralDisplay: React.FC<{ problem: IntegralProblem }> = ({ problem }) => (
  <div className="flex flex-col items-center gap-1.5">
    {problem.regionLabel && (
      <div className="text-xs sm:text-sm font-bold text-emerald-900 font-mono-90s">
        {problem.regionLabel}
      </div>
    )}
    <div
      className="math-expr text-2xl sm:text-4xl font-bold text-zinc-950 py-1 px-2"
      data-testid="integral-expression"
    >
      {/* Outer Integral */}
      <span className="int-group">
        <span className="int-sign" aria-hidden="true">∫</span>
        <span className="int-limits">
          <span>{problem.outerHigh}</span>
          <span>{problem.outerLow}</span>
        </span>
      </span>

      {/* Inner Integral */}
      <span className="int-group">
        <span className="int-sign" aria-hidden="true">∫</span>
        <span className="int-limits">
          <span>{problem.innerHigh}</span>
          <span>{problem.innerLow}</span>
        </span>
      </span>

      {/* Integrand & Differential */}
      <span className="font-serif-90s tracking-tight mx-1">{problem.integrand}</span>
      <span className="font-serif-90s italic text-zinc-800 ml-0.5">{problem.diff}</span>
      <span className="font-mono-90s text-zinc-500 ml-1">= ?</span>
    </div>
  </div>
);

export const MathTabletModal: React.FC<MathTabletModalProps> = ({
  session,
  baldiAnger,
  onAnswer,
}) => {
  const atlas = useMemo(() => getAssetAtlas(), []);
  const problem = session.problems[session.currentIndex];
  const isLocked = session.feedbackTimer > 0;

  const baldiPortraitUrl =
    baldiAnger > 0 || session.lastCorrect === false
      ? atlas.spriteDataUrls.baldi_angry
      : atlas.spriteDataUrls.baldi_calm;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-5 safe-pad"
      role="dialog"
      aria-modal="true"
      aria-label="Tablet de Integrales Dobles"
      data-testid="math-tablet"
    >
      {/* Classic 90s chunky green plastic "Cálculo-Pad 95" bezel */}
      <div className="retro-panel w-full max-w-2xl bg-[#16a34a] p-2.5 sm:p-4 rounded-xl flex flex-col gap-2.5 max-h-[94dvh] overflow-y-auto">
        {/* Top bar: Room + 3 problem slots + Baldo mood */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="font-serif-90s text-sm sm:text-base font-bold text-white drop-shadow-[1px_1px_0_#14532d]">
              CÁLCULO-PAD · {session.roomLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {session.results.map((res, idx) => (
              <div
                key={idx}
                className={`h-7 w-7 sm:h-8 sm:w-8 rounded border-2 border-zinc-900 flex items-center justify-center font-mono-90s text-sm font-bold ${
                  res === 'correct'
                    ? 'bg-emerald-300 text-emerald-950'
                    : res === 'wrong'
                    ? 'bg-red-500 text-white'
                    : idx === session.currentIndex
                    ? 'bg-yellow-300 text-zinc-950'
                    : 'bg-green-800 text-green-200'
                }`}
              >
                {res === 'correct' ? '✓' : res === 'wrong' ? '✕' : idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Inner LCD paper screen */}
        <div className="bg-[#f8fae8] border-[3px] border-zinc-900 rounded-lg p-3 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Baldo Portrait Frame */}
            <div
              className={`shrink-0 w-16 h-20 sm:w-20 sm:h-24 border-[3px] border-zinc-900 rounded overflow-hidden flex items-center justify-center ${
                baldiAnger > 0 || session.lastCorrect === false
                  ? 'bg-red-100'
                  : 'bg-sky-100'
              }`}
            >
              <img
                src={baldiPortraitUrl}
                alt="Profesor Baldo"
                className="w-full h-full object-contain pixelated"
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-white border-2 border-zinc-800 rounded p-2.5 sm:p-4">
              <IntegralDisplay problem={problem} />
            </div>
          </div>

          {/* Feedback strip (appears briefly after answering) */}
          {session.lastCorrect !== null && (
            <div
              className={`px-3 py-2 rounded border-2 border-zinc-900 text-center text-sm sm:text-base font-bold ${
                session.lastCorrect
                  ? 'bg-emerald-200 text-emerald-950'
                  : 'bg-red-200 text-red-950'
              }`}
            >
              {session.lastCorrect
                ? `¡CORRECTO! ${problem.tip}`
                : `¡INCORRECTO! El Profesor está más enojado · ${problem.tip}`}
            </div>
          )}

          {/* 4 Large Touch-Friendly Answer Buttons */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {problem.choices.map((choice, idx) => {
              const isPicked = session.lastPickedIndex === idx;
              const isRightChoice = idx === problem.correctIndex;
              let btnBg = 'bg-[#fef9c3] hover:bg-[#fde047] text-zinc-950';
              if (isLocked) {
                if (isRightChoice) {
                  btnBg = 'bg-emerald-400 text-zinc-950';
                } else if (isPicked && !isRightChoice) {
                  btnBg = 'bg-red-500 text-white';
                } else {
                  btnBg = 'bg-zinc-200 text-zinc-500';
                }
              }

              return (
                <button
                  key={`${problem.id}-${idx}`}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onAnswer(idx)}
                  data-testid={`math-choice-${idx}`}
                  className={`retro-bevel min-h-[56px] sm:min-h-[66px] px-3 py-2 rounded-lg font-mono-90s text-lg sm:text-2xl font-bold transition-colors cursor-pointer disabled:cursor-default ${btnBg}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
