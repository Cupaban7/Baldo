import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { IntroDialogueOverlay } from './components/IntroDialogueOverlay';
import { MathTabletModal } from './components/MathTabletModal';
import { MenuIntroOverlay } from './components/MenuIntroOverlay';
import { OutcomeModal, PauseModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { TutorialModal } from './components/TutorialModal';
import { SchoolGameEngine } from './game/engine';
import { Difficulty, HudSnapshot } from './game/types';

function detectMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    window.innerWidth <= 840
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SchoolGameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(detectMobileViewport);

  // Detect mobile / touch viewport dynamically on resize
  useEffect(() => {
    const onResize = () => setIsMobile(detectMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Mount decoupled 2.5D raycasting engine ONCE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SchoolGameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.startLoop();

    // Support ?autostart=1 for immediate entry into playing state without autoplay audio warning
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame(undefined, { skipIntro: true, fromUserGesture: false });
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync live 3D camera tour whenever Tutorial opens, changes step, or closes
  useEffect(() => {
    engineRef.current?.setTutorialCameraStep(showTutorial ? tutorialStep : null);
  }, [showTutorial, tutorialStep]);

  // Tab toggles expanded School Radar Map during play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab' && hud?.phase === 'playing') {
        e.preventDefault();
        setMapExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud?.phase]);

  const handleSkipSplash = useCallback(() => {
    engineRef.current?.skipSplash();
  }, []);

  const handleSelectDifficulty = useCallback((d: Difficulty) => {
    engineRef.current?.setDifficulty(d);
  }, []);

  const handleStartWithIntro = useCallback(() => {
    setShowTutorial(false);
    engineRef.current?.setTutorialCameraStep(null);
    engineRef.current?.startGame(undefined, { skipIntro: false, fromUserGesture: true });
    canvasRef.current?.focus();
  }, []);

  const handleRestartQuick = useCallback(() => {
    setShowTutorial(false);
    engineRef.current?.setTutorialCameraStep(null);
    engineRef.current?.startGame(undefined, { skipIntro: true, fromUserGesture: true });
    canvasRef.current?.focus();
  }, []);

  const handleFinishIntro = useCallback(() => {
    engineRef.current?.finishIntro();
    canvasRef.current?.focus();
  }, []);

  const handleVoiceBlip = useCallback((pitchOffset?: number) => {
    engineRef.current?.audio.playVoiceBlip(pitchOffset);
  }, []);

  const handleCanvasClick = useCallback(() => {
    if (hud?.phase !== 'playing') return;
    engineRef.current?.triggerInteract();
    if (!isMobile) {
      engineRef.current?.requestPointerLock();
    }
  }, [hud?.phase, isMobile]);

  const handleMoveTouch = useCallback((strafe: number, forward: number) => {
    engineRef.current?.setTouchMove(strafe, forward);
  }, []);

  const handleLookTouch = useCallback((deltaRad: number) => {
    engineRef.current?.addTouchLook(deltaRad);
  }, []);

  const handleToggleRunTouch = useCallback((running: boolean) => {
    engineRef.current?.setTouchRun(running);
  }, []);

  const handleInteract = useCallback(() => {
    engineRef.current?.triggerInteract();
  }, []);

  const handleUseSlot = useCallback((idx: number) => {
    engineRef.current?.useInventorySlot(idx);
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleTitle = useCallback(() => {
    setShowTutorial(false);
    engineRef.current?.setTutorialCameraStep(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleMathAnswer = useCallback((idx: number) => {
    engineRef.current?.submitMathAnswer(idx);
  }, []);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#141914]">
      {/* Isolated 2.5D Raycasting Canvas Mount (never re-created by HUD updates) */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onClick={handleCanvasClick}
        data-testid="raycast-canvas"
        aria-label="Vista en primera persona de la escuela"
        className="block w-full h-full pixelated outline-none cursor-crosshair"
      />

      {/* Animated Main Menu Opening Intro */}
      {hud && hud.phase === 'splash' && (
        <MenuIntroOverlay onSkip={handleSkipSplash} />
      )}

      {/* Title Screen (hidden while watching live 3D Tutorial camera tour) */}
      {hud && hud.phase === 'title' && !showTutorial && (
        <TitleScreen
          difficulty={hud.difficulty}
          isMobile={isMobile}
          onSelectDifficulty={handleSelectDifficulty}
          onStart={handleStartWithIntro}
          onOpenTutorial={() => {
            setTutorialStep(0);
            setShowTutorial(true);
          }}
        />
      )}

      {/* Opening Interactive Dialogue with Professor Baldo */}
      {hud && hud.phase === 'intro' && (
        <IntroDialogueOverlay
          onFinish={handleFinishIntro}
          onVoiceBlip={handleVoiceBlip}
        />
      )}

      {/* Active Playing HUD */}
      {hud && hud.phase === 'playing' && (
        <>
          <TouchControls
            visible={isMobile}
            isRunning={hud.isRunning}
            hasDoorPrompt={Boolean(hud.promptText)}
            onMove={handleMoveTouch}
            onLook={handleLookTouch}
            onToggleRun={handleToggleRunTouch}
            onInteract={handleInteract}
          />
          <GameHud
            hud={hud}
            mapExpanded={mapExpanded}
            onToggleMap={() => setMapExpanded((v) => !v)}
            onUseSlot={handleUseSlot}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
          />
        </>
      )}

      {/* Retro Double-Integral Math Tablet */}
      {hud && hud.phase === 'math' && hud.mathSession && (
        <MathTabletModal
          session={hud.mathSession}
          baldiAnger={hud.baldiAnger}
          onAnswer={handleMathAnswer}
        />
      )}

      {/* Pause Modal */}
      {hud && hud.phase === 'paused' && !showTutorial && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestartQuick}
          onOpenTutorial={() => {
            setTutorialStep(0);
            setShowTutorial(true);
          }}
          onTitle={handleTitle}
        />
      )}

      {/* Victory / Game Over Modal */}
      {hud && (hud.phase === 'victory' || hud.phase === 'gameover') && (
        <OutcomeModal hud={hud} onRestart={handleRestartQuick} onTitle={handleTitle} />
      )}

      {/* Interactive 3D Camera-Guided Tutorial */}
      {showTutorial && (
        <TutorialModal
          isMobile={isMobile}
          onStepChange={setTutorialStep}
          onClose={() => setShowTutorial(false)}
          onStartPlay={() => {
            if (hud?.phase === 'paused') {
              setShowTutorial(false);
              handleResume();
            } else {
              handleStartWithIntro();
            }
          }}
        />
      )}
    </main>
  );
}
