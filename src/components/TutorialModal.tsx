import React, { useEffect, useMemo, useState } from 'react';
import { getAssetAtlas } from '../game/sprites';
import { BOOSTER_META, BoosterType } from '../game/types';
import { BaldicatorEarIcon, BoosterIcon, NotebookIcon } from './SchoolIcons';

interface TutorialModalProps {
  isMobile: boolean;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onStartPlay: () => void;
}

const STEPS = [
  { id: 'objetivo', label: '1. Objetivo', camLabel: 'CÁMARA · Aula 102 (Cuaderno)' },
  { id: 'controles', label: '2. Controles', camLabel: 'CÁMARA · Pasillo Norte (Movimiento)' },
  { id: 'baldo', label: '3. Baldo', camLabel: 'CÁMARA · Paso de Regla en Vivo' },
  { id: 'objetos', label: '4. Objetos', camLabel: 'CÁMARA · Cafetería (Boosters)' },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isMobile,
  onStepChange,
  onClose,
  onStartPlay,
}) => {
  const [step, setStep] = useState(0);
  const [platformView, setPlatformView] = useState<'mobile' | 'pc'>(
    isMobile ? 'mobile' : 'pc'
  );
  const atlas = useMemo(() => getAssetAtlas(), []);

  useEffect(() => {
    setPlatformView(isMobile ? 'mobile' : 'pc');
  }, [isMobile]);

  useEffect(() => {
    onStepChange(step);
  }, [step, onStepChange]);

  const boosters: BoosterType[] = ['coffee', 'energy', 'oil'];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between p-2.5 sm:p-5 safe-pad bg-gradient-to-b from-black/20 via-transparent to-black/75"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial interactivo del juego"
      data-testid="tutorial-modal"
    >
      {/* Top Live 3D Camera Indicator + Close button (leaves top 42%+ open for live 3D camera tour!) */}
      <div className="flex items-start justify-between gap-2 w-full max-w-2xl mx-auto">
        <div
          data-testid="tutorial-cam-label"
          className="retro-panel bg-[#fffef5] px-2.5 py-1 rounded-xl flex items-center gap-2 text-[11px] sm:text-xs font-mono-90s font-bold text-zinc-950"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
          <span className="truncate">{STEPS[step].camLabel}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar tutorial"
          className="retro-bevel bg-[#fffef5] hover:bg-zinc-200 text-zinc-950 px-3 py-1 rounded-xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
        >
          Cerrar ✕
        </button>
      </div>

      {/* Bottom Pocket-Edition Tutorial Sheet */}
      <div className="retro-panel w-full max-w-2xl mx-auto bg-[#fffef5] rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 max-h-[58dvh] overflow-y-auto">
        {/* Step tabs */}
        <div className="grid grid-cols-4 gap-1.5">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              data-testid={`tutorial-tab-${idx}`}
              onClick={() => setStep(idx)}
              className={`px-1.5 sm:px-2 py-1.5 rounded-xl border-2 border-zinc-900 text-[11px] sm:text-xs font-bold cursor-pointer truncate transition-colors ${
                step === idx
                  ? 'bg-[#16a34a] text-white'
                  : 'bg-[#f4f1df] text-zinc-800 hover:bg-[#e9e4c9]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white border-2 border-zinc-900 rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-center">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="border-2 border-zinc-800 rounded-xl p-2.5 bg-[#f0f9ff] flex sm:flex-col items-center sm:text-center gap-2.5">
                <NotebookIcon className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-zinc-950">7 Cuadernos (∬)</div>
                  <p className="text-[11px] sm:text-xs text-zinc-700 leading-snug">
                    Entra a las aulas y resuelve 3 integrales dobles por cuaderno.
                  </p>
                </div>
              </div>
              <div className="border-2 border-zinc-800 rounded-xl p-2.5 bg-[#fefce8] flex sm:flex-col items-center sm:text-center gap-2.5">
                <BaldicatorEarIcon heard={true} angry={true} />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-zinc-950">Audio = Radar</div>
                  <p className="text-[11px] sm:text-xs text-zinc-700 leading-snug">
                    Cada golpe de regla mueve a Baldo. Las puertas suenan salvo con Aceite.
                  </p>
                </div>
              </div>
              <div className="border-2 border-zinc-800 rounded-xl p-2.5 bg-[#fef2f2] flex sm:flex-col items-center sm:text-center gap-2.5">
                <div className="h-10 w-10 shrink-0 rounded-lg border-2 border-zinc-900 bg-red-600 text-white font-mono-90s font-bold flex items-center justify-center text-[10px]">
                  SALIDA
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-zinc-950">Alerta Roja (7/7)</div>
                  <p className="text-[11px] sm:text-xs text-zinc-700 leading-snug">
                    Reúne los 7 cuadernos para abrir las 3 salidas y escapar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-2.5" data-testid="tutorial-controls-step">
              {/* Platform-detected switcher so user sees THEIR device first, with option to peek at the other */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-serif-90s font-bold text-xs sm:text-sm text-zinc-950">
                  Controles para{' '}
                  <span className="text-emerald-700">
                    {platformView === 'mobile' ? 'Celular (Táctil)' : 'PC (Teclado y Ratón)'}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="platform-btn-mobile"
                    onClick={() => setPlatformView('mobile')}
                    className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono-90s text-[11px] font-bold cursor-pointer ${
                      platformView === 'mobile'
                        ? 'bg-[#facc15] text-zinc-950'
                        : 'bg-[#f4f1df] text-zinc-700'
                    }`}
                  >
                    Celular{isMobile ? ' ★' : ''}
                  </button>
                  <button
                    type="button"
                    data-testid="platform-btn-pc"
                    onClick={() => setPlatformView('pc')}
                    className={`px-2.5 py-1 rounded-lg border-2 border-zinc-900 font-mono-90s text-[11px] font-bold cursor-pointer ${
                      platformView === 'pc'
                        ? 'bg-[#facc15] text-zinc-950'
                        : 'bg-[#f4f1df] text-zinc-700'
                    }`}
                  >
                    PC{!isMobile ? ' ★' : ''}
                  </button>
                </div>
              </div>

              {platformView === 'mobile' ? (
                <div className="grid grid-cols-2 gap-2" data-testid="controls-mobile-guide">
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#f0fdf4] flex items-center gap-2">
                    <div className="h-10 w-10 shrink-0 rounded-full border-2 border-zinc-900 bg-zinc-200 flex items-center justify-center">
                      <div className="h-5 w-5 rounded-full border-2 border-zinc-900 bg-[#facc15]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-950">Joystick Izq.</div>
                      <p className="text-[11px] text-zinc-700 leading-tight">
                        Arrastra en la mitad izquierda para caminar.
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#eff6ff] flex items-center gap-2">
                    <div className="h-10 w-10 shrink-0 rounded-xl border-2 border-zinc-900 bg-blue-100 flex items-center justify-center font-mono-90s font-bold text-sm text-blue-900">
                      ◄ ►
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-950">Deslizar Der.</div>
                      <p className="text-[11px] text-zinc-700 leading-tight">
                        Desliza en la mitad derecha para girar cámara.
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#fefce8] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-[#facc15] font-mono-90s text-[10px] font-bold text-zinc-950">
                      ABRIR
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-950">Abrir Puertas</div>
                      <p className="text-[11px] text-zinc-700 leading-tight">
                        Brilla en amarillo al acercarte a un aula.
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#fef2f2] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-[#dcfce7] font-mono-90s text-[10px] font-bold text-zinc-950">
                      CORRER
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-zinc-950">Correr + [1-3]</div>
                      <p className="text-[11px] text-zinc-700 leading-tight">
                        Activa sprint y toca [1][2][3] o el Mapa arriba.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="controls-pc-guide">
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#f8fafc] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-white font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      WASD
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Caminar y esquivar
                    </span>
                  </div>
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#f8fafc] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-white font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      Ratón / ←→
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Girar la cámara
                    </span>
                  </div>
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#f8fafc] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-[#dcfce7] font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      Shift
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Correr (usa estamina)
                    </span>
                  </div>
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#fefce8] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-[#facc15] font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      E / Clic
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Abrir puertas
                    </span>
                  </div>
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#fefce8] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-white font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      1 · 2 · 3
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Usar objetos
                    </span>
                  </div>
                  <div className="border-2 border-zinc-800 rounded-xl p-2 bg-[#eff6ff] flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-lg border-2 border-zinc-900 bg-white font-mono-90s text-xs font-bold text-zinc-950 shadow-[2px_2px_0_#18181b]">
                      Tab / P
                    </span>
                    <span className="text-xs font-bold text-zinc-800 leading-tight">
                      Mapa y Pausa
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5 border-2 border-zinc-800 rounded-xl p-2.5 bg-[#f0fdf4]">
                <div className="relative shrink-0 w-13 h-16 bg-white border-2 border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={atlas.spriteDataUrls.baldi_calm}
                    alt="Profesor Baldo calmado"
                    className="w-full h-full object-contain pixelated"
                  />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full border border-zinc-900 bg-[#16a34a] text-[9px] font-mono-90s font-bold text-white flex items-center justify-center">
                    P
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-emerald-900">
                    ¡Solo avanza al golpear la regla!
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-700 leading-snug mt-0.5">
                    Mira arriba: Baldo permanece quieto entre golpes y da un impulso cada vez que suena <em>¡ZAS!</em>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 border-2 border-zinc-800 rounded-xl p-2.5 bg-[#fef2f2]">
                <div className="relative shrink-0 w-13 h-16 bg-white border-2 border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={atlas.spriteDataUrls.baldi_slap}
                    alt="Profesor Baldo golpeando regla"
                    className="w-full h-full object-contain pixelated"
                  />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full border border-zinc-900 bg-[#dc2626] text-[9px] font-mono-90s font-bold text-white flex items-center justify-center">
                    P
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-red-800">
                    Ritmo justo y localizable
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-700 leading-snug mt-0.5">
                    Cada fallo acelera su ritmo, pero siempre puedes rastrearlo en tu Mapa Radar (P) y esquivarlo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {boosters.map((b) => (
                <div
                  key={b}
                  className="flex sm:flex-col items-center sm:text-center gap-2.5 sm:gap-1.5 border-2 border-zinc-900 rounded-xl p-2.5 bg-[#fefce8]"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg border-2 border-zinc-900 bg-white flex items-center justify-center">
                    <BoosterIcon type={b} className="w-8 h-8" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-zinc-950">{BOOSTER_META[b].name}</div>
                    <p className="text-[11px] text-zinc-700 leading-snug">{BOOSTER_META[b].desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="retro-bevel bg-zinc-200 hover:bg-zinc-300 disabled:opacity-40 text-zinc-950 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
          >
            ◂ Anterior
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                data-testid="tutorial-next-btn"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="retro-bevel bg-[#facc15] hover:bg-[#eab308] text-zinc-950 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                Siguiente ▸
              </button>
            ) : null}
            <button
              type="button"
              onClick={onStartPlay}
              className="retro-bevel bg-[#16c60c] hover:bg-[#16a34a] text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            >
              ¡Jugar!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
