import { RetroAudioEngine } from './audio';
import {
  PLAYER_SPAWN,
  SCHOOL_GRID,
  createInitialDoors,
  createInitialNotebooks,
  createInitialPickups,
  findNextStepBFS,
  getZoneDisplayName,
  hasLineOfSight,
  isDoorTile,
} from './mapData';
import { drawNotebookProblems } from './mathProblems';
import { Particle3D, RaycastRenderer } from './renderer';
import {
  BALDI_SLAP_BURST_DURATION,
  PLAYER_RADIUS,
  RUN_SPEED,
  WALK_SPEED,
  addToInventory,
  checkExitReached,
  computeBaldiSlapLungeSpeed,
  computeBaldiStats,
  evaluateJumpRopePress,
  moveWithCollision,
  openDoorAction,
  updateStamina,
} from './rules';
import { getAssetAtlas } from './sprites';
import {
  BOOSTER_META,
  BoosterType,
  Difficulty,
  DoorState,
  GamePhase,
  HudSnapshot,
  ItemPickup,
  MathSession,
  NotebookEntity,
  NpcEntity,
  PlayerState,
  ProjectileWave,
  SoundPing,
} from './types';

const PARTICLE_POOL_SIZE = 72;

export class SchoolGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: RaycastRenderer;
  public audio: RetroAudioEngine;
  private onHudUpdate: (hud: HudSnapshot) => void;

  private rafId: number | null = null;
  private lastTs = 0;
  private hudAccum = 0;
  private timeSec = 0;
  private hitstop = 0;

  private phase: GamePhase = 'splash';
  private splashTimer = 0;
  private tutorialStep: number | null = null;
  private tutorialCamTime = 0;
  private previewCam = { x: 12.5, y: 16.4, angle: -Math.PI / 2, initialized: false };
  private difficulty: Difficulty = 'medio';

  private player: PlayerState;
  private doors: Map<string, DoorState>;
  private notebooks: NotebookEntity[];
  private pickups: ItemPickup[];
  private npcs: NpcEntity[];
  private waves: ProjectileWave[] = [];
  private soundPings: SoundPing[] = [];
  private particles: Particle3D[];
  private particleCursor = 0;
  private usedProblemIds = new Set<string>();
  private mathSession: MathSession | null = null;

  private baldiAnger = 0;
  private baldiHeardTimer = 0;
  private redAlert = false;
  private elapsedTime = 0;
  private errorsCount = 0;
  private correctCount = 0;
  private deathReason = '';
  private nextEntityId = 1;
  private footstepAccum = 0;

  private bannerText: string | null = null;
  private bannerTone: 'info' | 'warn' | 'danger' | 'success' = 'info';
  private bannerTimer = 0;
  private promptText: string | null = null;

  // Input state
  private keysHeld = new Set<string>();
  private touchMove = { x: 0, y: 0 }; // x = strafe (-1..1), y = forward (-1..1)
  private touchRunning = false;
  private pendingLookDelta = 0;
  private pointerLocked = false;

  // Bound listeners for clean unmount
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private handleKeyUpBound: (e: KeyboardEvent) => void;
  private handleBlurBound: () => void;
  private handleVisibilityBound: () => void;
  private handleMouseMoveBound: (e: MouseEvent) => void;
  private handlePointerLockBound: () => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    onHudUpdate: (hud: HudSnapshot) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.onHudUpdate = onHudUpdate;
    this.audio = new RetroAudioEngine();
    this.renderer = new RaycastRenderer(getAssetAtlas(), 480, 270);

    this.particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.4,
      color: 0xffffffff,
      size: 2,
    }));

    this.player = this.createInitialPlayer();
    this.doors = createInitialDoors();
    this.notebooks = createInitialNotebooks();
    this.pickups = createInitialPickups();
    this.npcs = this.createInitialNpcs();

    this.handleKeyDownBound = this.onKeyDown.bind(this);
    this.handleKeyUpBound = this.onKeyUp.bind(this);
    this.handleBlurBound = this.clearInputs.bind(this);
    this.handleVisibilityBound = () => {
      if (document.hidden) this.clearInputs();
    };
    this.handleMouseMoveBound = this.onMouseMove.bind(this);
    this.handlePointerLockBound = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };

    this.attachEvents();
    this.updateCanvasSize();
    this.syncBodyState();
    this.emitHud();
  }

  private createInitialPlayer(): PlayerState {
    return {
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      angle: PLAYER_SPAWN.angle,
      stamina: 100,
      staminaGhost: 100,
      isRunning: false,
      isMoving: false,
      bobPhase: 0,
      detentionTimer: 0,
      oilCharges: 0,
      jumpRopeActive: false,
      jumpRopeCount: 0,
      jumpRopePhase: 0,
      jumpRopeGrace: 0,
      jumpHeight: 0,
      jumpVel: 0,
      cameraShake: 0,
      hitFlash: 0,
      inventory: [null, null, null],
      selectedSlot: 0,
    };
  }

  private createInitialNpcs(): NpcEntity[] {
    return [
      {
        id: 'baldi',
        name: 'Profesor Baldo',
        x: 12.5,
        y: 8.6,
        vx: 0,
        vy: 0,
        speed: 1.05,
        state: 'amable',
        timer: 0,
        cooldown: 0,
        targetX: 12.5,
        targetY: 6.2,
        animPhase: 0,
        slapTimer: 1.4,
        slapBurstTimer: 0,
        slapAnim: 0,
        pushTimer: 0,
        hitFlash: 0,
        active: true,
      },
    ];
  }

  private attachEvents(): void {
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    window.addEventListener('blur', this.handleBlurBound);
    document.addEventListener('visibilitychange', this.handleVisibilityBound);
    document.addEventListener('mousemove', this.handleMouseMoveBound);
    document.addEventListener('pointerlockchange', this.handlePointerLockBound);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
      this.resizeObserver.observe(this.canvas);
    }
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.audio.stopAllLoops();
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    window.removeEventListener('blur', this.handleBlurBound);
    document.removeEventListener('visibilitychange', this.handleVisibilityBound);
    document.removeEventListener('mousemove', this.handleMouseMoveBound);
    document.removeEventListener('pointerlockchange', this.handlePointerLockBound);
    this.resizeObserver?.disconnect();
  }

  private updateCanvasSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || window.innerWidth));
    const h = Math.max(200, Math.floor(rect.height || window.innerHeight));
    this.canvas.width = w;
    this.canvas.height = h;
    // Adaptive crisp retro resolution: higher on desktop, smooth 60fps on phones
    const isNarrow = w < 720;
    const aspect = w / h;
    const internalH = isNarrow ? 210 : 270;
    const internalW = Math.max(240, Math.min(540, Math.round(internalH * aspect)));
    this.renderer.setResolution(internalW, internalH);
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTs) / 1000;
      this.lastTs = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      this.step(dt);
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private syncBodyState(): void {
    const mapped =
      this.phase === 'victory' || this.phase === 'gameover'
        ? 'gameover'
        : this.phase === 'math' || this.phase === 'intro'
        ? 'playing'
        : this.phase === 'splash'
        ? 'title'
        : this.phase;
    document.body.dataset.state = mapped;
    document.body.dataset.phase = this.phase;
    document.body.dataset.notebooks = String(
      this.notebooks.filter((n) => n.collected).length
    );
    document.body.dataset.anger = String(this.baldiAnger);
  }

  public skipSplash(): void {
    if (this.phase !== 'splash') return;
    this.phase = 'title';
    this.syncBodyState();
    this.emitHud();
  }

  public setTutorialCameraStep(step: number | null): void {
    if (this.tutorialStep === step) return;
    this.tutorialStep = step;
    this.tutorialCamTime = 0;
    if (step === null) {
      // Restore Baldo to standard position if previewing from title screen
      if (this.phase === 'title') {
        const baldi = this.npcs[0];
        if (baldi) {
          baldi.x = 12.5;
          baldi.y = 8.6;
          baldi.slapAnim = 0;
        }
      }
    }
  }

  public setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
    this.emitHud();
  }

  public startGame(diff?: Difficulty, options?: { skipIntro?: boolean; fromUserGesture?: boolean }): void {
    if (diff) this.difficulty = diff;
    const fromUserGesture = options?.fromUserGesture !== false;
    if (fromUserGesture) {
      this.audio.unlock();
    }
    this.audio.stopAllLoops();

    this.player = this.createInitialPlayer();
    this.doors = createInitialDoors();
    this.notebooks = createInitialNotebooks();
    this.pickups = createInitialPickups();
    this.npcs = this.createInitialNpcs();
    this.waves = [];
    this.soundPings = [];
    this.usedProblemIds.clear();
    this.mathSession = null;

    this.baldiAnger = 0;
    this.baldiHeardTimer = 0;
    this.redAlert = false;
    this.elapsedTime = 0;
    this.errorsCount = 0;
    this.correctCount = 0;
    this.deathReason = '';
    this.hitstop = 0;
    this.clearInputs();

    if (options?.skipIntro) {
      const baldi = this.npcs[0];
      if (baldi) baldi.y = 6.2;
      this.phase = 'playing';
      this.showBanner('Recoge los 7 cuadernos de integrales dobles', 'info', 4.5);
      if (fromUserGesture) {
        this.audio.startSchoolMusic();
      }
    } else {
      // Position Baldo greeting warmly in front of the player during opening dialogue
      const baldi = this.npcs[0];
      if (baldi) {
        baldi.x = 12.5;
        baldi.y = 9.3;
      }
      this.phase = 'intro';
      this.bannerText = null;
      this.bannerTimer = 0;
    }

    this.syncBodyState();
    this.emitHud();
  }

  public finishIntro(): void {
    if (this.phase !== 'intro') return;
    this.audio.unlock();
    // Place Baldo comfortably further down the hall as exploration begins
    const baldi = this.npcs[0];
    if (baldi) {
      baldi.x = 12.5;
      baldi.y = 6.2;
      baldi.targetX = 12.5;
      baldi.targetY = 6.2;
    }
    this.phase = 'playing';
    this.clearInputs();
    this.showBanner('Recoge los 7 cuadernos de integrales dobles', 'info', 4.5);
    this.audio.startSchoolMusic();
    this.syncBodyState();
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.clearInputs();
    this.exitPointerLock();
    this.audio.stopAllLoops();
    this.syncBodyState();
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.clearInputs();
    if (this.baldiAnger === 0) this.audio.startSchoolMusic();
    if (this.redAlert) this.audio.setRedAlertAlarm(true);
    this.syncBodyState();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.mathSession = null;
    this.clearInputs();
    this.exitPointerLock();
    this.audio.stopAllLoops();
    this.syncBodyState();
    this.emitHud();
  }

  public toggleMute(): void {
    this.audio.unlock();
    this.audio.toggleMute();
    this.emitHud();
  }

  public requestPointerLock(): void {
    if (this.phase !== 'playing') return;
    this.audio.unlock();
    if (document.pointerLockElement !== this.canvas && this.canvas.requestPointerLock) {
      try {
        this.canvas.requestPointerLock();
      } catch {
        // Ignore browser rejection in headless/touch
      }
    }
  }

  private exitPointerLock(): void {
    if (document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
  }

  private clearInputs(): void {
    this.keysHeld.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.touchRunning = false;
    this.pendingLookDelta = 0;
  }

  // ======================= TOUCH / MOBILE CONTROLS =======================

  public setTouchMove(strafe: number, forward: number): void {
    this.audio.unlock();
    this.touchMove.x = Math.max(-1, Math.min(1, strafe));
    this.touchMove.y = Math.max(-1, Math.min(1, forward));
  }

  public addTouchLook(deltaRad: number): void {
    this.audio.unlock();
    this.pendingLookDelta += deltaRad;
  }

  public setTouchRun(running: boolean): void {
    this.audio.unlock();
    this.touchRunning = running;
  }

  public triggerInteract(): void {
    this.audio.unlock();
    if (this.phase !== 'playing') return;
    this.performInteract();
  }

  public triggerJump(): void {
    this.audio.unlock();
    if (this.phase !== 'playing') return;
    if (this.player.jumpRopeActive) {
      const res = evaluateJumpRopePress(this.player);
      if (res === 'complete') {
        this.audio.playJump(true);
        this.showBanner('¡Te liberaste de la cuerda!', 'success', 2.4);
        this.spawnBurst(this.player.x, this.player.y, 0xff22c55e, 14);
      } else if (res === 'hit') {
        this.audio.playJump(true);
        this.spawnBurst(this.player.x, this.player.y, 0xff38bdf8, 6);
      } else {
        this.audio.playJump(false);
        this.player.cameraShake = Math.max(this.player.cameraShake, 0.35);
      }
      this.emitHud();
    } else if (this.player.jumpHeight <= 0.01) {
      this.player.jumpVel = 2.6;
      this.audio.playJump(true);
    }
  }

  public useInventorySlot(slotIdx: number): void {
    this.audio.unlock();
    if (this.phase !== 'playing') return;
    if (slotIdx < 0 || slotIdx > 2) return;
    const item = this.player.inventory[slotIdx];
    if (!item) return;

    if (item === 'coffee') {
      // Fires an espresso shockwave down the hallway
      const dirX = Math.cos(this.player.angle);
      const dirY = Math.sin(this.player.angle);
      this.waves.push({
        id: this.nextEntityId++,
        x: this.player.x + dirX * 0.6,
        y: this.player.y + dirY * 0.6,
        vx: dirX * 7.6,
        vy: dirY * 7.6,
        life: 0,
        maxLife: 2.8,
      });
      this.player.inventory[slotIdx] = null;
      this.audio.playBooster('coffee');
      this.player.cameraShake = Math.max(this.player.cameraShake, 0.25);
      this.spawnBurst(this.player.x + dirX * 0.5, this.player.y + dirY * 0.5, 0xff1e40af, 12);
      this.showBanner('¡Onda de Café Expreso lanzada!', 'info', 2.0);
    } else if (item === 'energy') {
      this.player.stamina = 100;
      this.player.staminaGhost = 100;
      this.player.inventory[slotIdx] = null;
      this.audio.playBooster('energy');
      this.showBanner('¡Estamina al 100%!', 'success', 2.0);
    } else if (item === 'scissors') {
      if (this.player.jumpRopeActive) {
        this.player.jumpRopeActive = false;
        this.player.jumpRopeCount = 0;
        this.player.jumpRopeGrace = 6.0;
        this.player.inventory[slotIdx] = null;
        this.audio.playBooster('scissors');
        this.showBanner('¡Cortaste la cuerda con las Tijeras!', 'success', 2.5);
        this.spawnBurst(this.player.x, this.player.y, 0xff60a5fa, 16);
      } else {
        this.showBanner('Las Tijeras cortan la cuerda cuando te atrape la Niña', 'info', 2.2);
      }
    } else if (item === 'oil') {
      this.player.oilCharges += 2;
      this.player.inventory[slotIdx] = null;
      this.audio.playBooster('oil');
      this.showBanner('Aceite aplicado: próximas 2 puertas sin ruido', 'success', 2.6);
    }

    this.emitHud();
  }

  // ======================= MATH TABLET INTERACTION =======================

  public submitMathAnswer(choiceIndex: number): void {
    if (this.phase !== 'math' || !this.mathSession) return;
    if (this.mathSession.feedbackTimer > 0) return;

    this.audio.unlock();
    const problem = this.mathSession.problems[this.mathSession.currentIndex];
    const isCorrect = choiceIndex === problem.correctIndex;
    this.mathSession.lastPickedIndex = choiceIndex;
    this.mathSession.lastCorrect = isCorrect;
    this.mathSession.results[this.mathSession.currentIndex] = isCorrect
      ? 'correct'
      : 'wrong';
    this.mathSession.feedbackTimer = isCorrect ? 0.65 : 1.05;

    if (isCorrect) {
      this.correctCount += 1;
      this.audio.playMathResult(true);
    } else {
      this.errorsCount += 1;
      this.baldiAnger += 1;
      this.audio.stopSchoolMusic(); // Classic Baldi sudden terrifying silence!
      this.audio.playMathResult(false);
      // Loud global sound ping alerting Baldi straight to the classroom!
      this.emitSoundPing(this.player.x, this.player.y, 2);
      const baldi = this.npcs.find((n) => n.id === 'baldi');
      if (baldi) {
        baldi.state = 'enojado';
        baldi.targetX = this.player.x;
        baldi.targetY = this.player.y;
      }
      this.baldiHeardTimer = 3.2;
      this.syncBodyState();
    }

    this.emitHud();
  }

  private finishMathNotebook(): void {
    if (!this.mathSession) return;
    const nb = this.notebooks.find((n) => n.id === this.mathSession!.notebookId);
    if (nb) nb.collected = true;

    const totalCollected = this.notebooks.filter((n) => n.collected).length;
    this.mathSession = null;
    this.phase = 'playing';
    this.clearInputs();

    if (totalCollected >= this.notebooks.length) {
      this.redAlert = true;
      this.audio.stopSchoolMusic();
      this.audio.setRedAlertAlarm(true);
      this.player.cameraShake = 0.7;
      this.showBanner(
        '¡ALERTA ROJA! 7/7 CUADERNOS — ¡CORRE A UNA DE LAS 3 SALIDAS!',
        'danger',
        6.0
      );
      // Unlock all 3 exit doors visually
      for (const door of this.doors.values()) {
        if (door.tileType === 8) {
          door.openAmount = 1;
        }
      }
    } else if (this.baldiAnger > 0) {
      this.showBanner(
        `Cuaderno ${totalCollected}/7 — ¡Baldo escuchó tus errores!`,
        'warn',
        3.2
      );
    } else {
      this.showBanner(`¡Cuaderno ${totalCollected}/7 completado!`, 'success', 2.8);
    }

    this.syncBodyState();
    this.emitHud();
  }

  // ======================= KEYBOARD & MOUSE HANDLERS =======================

  private onKeyDown(e: KeyboardEvent): void {
    this.audio.unlock();
    const code = e.code;

    if (this.phase === 'splash') {
      if (code === 'Enter' || code === 'Space' || code === 'Escape') {
        e.preventDefault();
        this.skipSplash();
      }
      return;
    }

    if (this.phase === 'title') {
      if (this.tutorialStep !== null) return;
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.phase === 'playing') {
        e.preventDefault();
        this.pauseGame();
      } else if (this.phase === 'paused') {
        e.preventDefault();
        this.resumeGame();
      }
      return;
    }

    if (code === 'KeyM' && (this.phase === 'playing' || this.phase === 'paused')) {
      this.toggleMute();
      return;
    }

    if (this.phase !== 'playing') return;

    const wasHeld = this.keysHeld.has(code);
    this.keysHeld.add(code);

    if (!wasHeld) {
      if (code === 'KeyE') {
        e.preventDefault();
        this.performInteract();
      } else if (code === 'Space') {
        e.preventDefault();
        this.triggerJump();
      } else if (code === 'Digit1') {
        this.useInventorySlot(0);
      } else if (code === 'Digit2') {
        this.useInventorySlot(1);
      } else if (code === 'Digit3') {
        this.useInventorySlot(2);
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysHeld.delete(e.code);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.phase !== 'playing' || !this.pointerLocked) return;
    this.pendingLookDelta += e.movementX * 0.0026;
  }

  // ======================= MAIN SIMULATION STEP =======================

  private step(dt: number): void {
    this.timeSec += dt;

    // Main Menu Intro ("splash") smooth 4.2s hallway glide before Title Menu
    if (this.phase === 'splash') {
      this.splashTimer += dt;
      if (this.splashTimer >= 4.2) {
        this.skipSplash();
      }
      return;
    }

    // Advance live Tutorial 3D camera showcase animation (works on Title & Pause)
    if (this.tutorialStep !== null) {
      this.tutorialCamTime += dt;
    }

    // Math tablet feedback countdown ticks in real dt while simulation is paused
    if (this.phase === 'math' && this.mathSession) {
      if (this.mathSession.feedbackTimer > 0) {
        this.mathSession.feedbackTimer -= dt;
        if (this.mathSession.feedbackTimer <= 0) {
          this.mathSession.feedbackTimer = 0;
          this.mathSession.lastPickedIndex = null;
          this.mathSession.lastCorrect = null;
          if (this.mathSession.currentIndex + 1 < this.mathSession.problems.length) {
            this.mathSession.currentIndex += 1;
            this.emitHud();
          } else {
            this.finishMathNotebook();
          }
        }
      }
      return;
    }

    if (this.phase !== 'playing') return;

    // Real-time visual juice timers (shake, hitFlash, hitstop)
    this.player.cameraShake = Math.max(0, this.player.cameraShake - dt * 2.4);
    this.player.hitFlash = Math.max(0, this.player.hitFlash - dt * 4.5);
    this.baldiHeardTimer = Math.max(0, this.baldiHeardTimer - dt);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerText = null;
      }
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    this.elapsedTime += dt;
    this.updatePlayer(dt);
    this.updateDoors(dt);
    this.updateWaves(dt);
    this.updateNpcs(dt);
    this.updatePickupsAndNotebooks();
    this.updateSoundPings(dt);
    this.updateParticles(dt);

    // Check victory condition (7/7 + reached exit)
    if (checkExitReached(this.player.x, this.player.y, this.redAlert)) {
      this.phase = 'victory';
      this.audio.stopAllLoops();
      this.audio.playVictoryFanfare();
      this.exitPointerLock();
      this.clearInputs();
      this.syncBodyState();
      this.emitHud();
      return;
    }

    // Throttle HUD snapshots to ~15Hz
    this.hudAccum += dt;
    if (this.hudAccum >= 0.065) {
      this.hudAccum = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    // Detention countdown
    if (p.detentionTimer > 0) {
      p.detentionTimer = Math.max(0, p.detentionTimer - dt);
      if (p.detentionTimer === 0) {
        this.showBanner('¡Fin de la detención! Puedes salir.', 'info', 2.4);
      }
    }

    if (p.jumpRopeGrace > 0) {
      p.jumpRopeGrace = Math.max(0, p.jumpRopeGrace - dt);
    }

    // Vertical hop physics
    if (p.jumpHeight > 0 || p.jumpVel !== 0) {
      p.jumpHeight += p.jumpVel * dt;
      p.jumpVel -= 14.5 * dt;
      if (p.jumpHeight <= 0) {
        p.jumpHeight = 0;
        p.jumpVel = 0;
      }
    }

    // Jump-rope cycle progression
    if (p.jumpRopeActive) {
      p.jumpRopePhase = (p.jumpRopePhase + dt * 0.92) % 1;
    }

    // Camera rotation (Mouse + Touch + Arrow keys)
    const turnSpeed = 2.45;
    if (this.keysHeld.has('ArrowLeft')) p.angle -= turnSpeed * dt;
    if (this.keysHeld.has('ArrowRight')) p.angle += turnSpeed * dt;
    if (this.pendingLookDelta !== 0) {
      p.angle += this.pendingLookDelta;
      this.pendingLookDelta = 0;
    }

    // Movement input (locked in place while jumping Playtime's rope!)
    let forward = this.touchMove.y;
    let strafe = this.touchMove.x;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) forward += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) forward -= 1;
    if (this.keysHeld.has('KeyD')) strafe += 1;
    if (this.keysHeld.has('KeyA')) strafe -= 1;

    if (p.jumpRopeActive) {
      forward = 0;
      strafe = 0;
    }

    const len = Math.hypot(forward, strafe);
    if (len > 1) {
      forward /= len;
      strafe /= len;
    }

    p.isMoving = len > 0.08;
    const wantsRun =
      this.keysHeld.has('ShiftLeft') ||
      this.keysHeld.has('ShiftRight') ||
      this.touchRunning;

    const stamRes = updateStamina(p.stamina, p.isMoving, wantsRun, dt);
    p.stamina = stamRes.stamina;
    p.isRunning = stamRes.isRunning;

    // Delayed ghost trailing stamina bar
    if (p.staminaGhost > p.stamina) {
      p.staminaGhost = Math.max(p.stamina, p.staminaGhost - dt * 28);
    } else {
      p.staminaGhost = p.stamina;
    }

    if (p.isMoving) {
      const speed = p.isRunning ? RUN_SPEED : WALK_SPEED;
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);
      const dx = (cos * forward - sin * strafe) * speed * dt;
      const dy = (sin * forward + cos * strafe) * speed * dt;

      const moved = moveWithCollision(
        p.x,
        p.y,
        dx,
        dy,
        PLAYER_RADIUS,
        this.doors,
        this.redAlert,
        p.detentionTimer > 0
      );
      const stepDist = Math.hypot(moved.x - p.x, moved.y - p.y);
      p.x = moved.x;
      p.y = moved.y;

      // Gait-synced head bob & footsteps
      p.bobPhase += stepDist * 4.4;
      this.footstepAccum += stepDist;
      if (this.footstepAccum >= (p.isRunning ? 1.15 : 1.05)) {
        this.footstepAccum = 0;
        this.audio.playFootstep(p.isRunning);
      }
    }

    // Update contextual interaction prompt in front of player
    this.promptText = this.findInteractionPrompt();
  }

  private findDoorInFront(): DoorState | null {
    const cos = Math.cos(this.player.angle);
    const sin = Math.sin(this.player.angle);
    for (let dist = 0.5; dist <= 1.95; dist += 0.22) {
      const gx = Math.floor(this.player.x + cos * dist);
      const gy = Math.floor(this.player.y + sin * dist);
      const key = `${gx},${gy}`;
      const door = this.doors.get(key);
      if (door) return door;
    }
    return null;
  }

  private findInteractionPrompt(): string | null {
    const door = this.findDoorInFront();
    if (door) {
      if (door.tileType === 8 && !this.redAlert) {
        return `${door.label} (Cerrada — faltan cuadernos)`;
      }
      if (door.tileType === 10 && this.player.detentionTimer > 0) {
        return `DETENCIÓN (${Math.ceil(this.player.detentionTimer)}s)`;
      }
      if (door.openAmount < 0.5) {
        const oilTag = this.player.oilCharges > 0 || door.silenced ? ' [Silenciosa]' : '';
        return `[E] Abrir ${door.label}${oilTag}`;
      }
    }
    return null;
  }

  private performInteract(): void {
    const door = this.findDoorInFront();
    if (door) {
      const res = openDoorAction(door, this.player, this.redAlert);
      if (!res.opened) {
        if (res.reason) this.showBanner(res.reason, 'warn', 2.2);
        return;
      }
      this.audio.playDoor(!res.madeNoise);
      this.spawnBurst(door.x + 0.5, door.y + 0.5, res.madeNoise ? 0xfffacc15 : 0xff2dd4bf, 6);
      if (res.madeNoise) {
        this.emitSoundPing(door.x + 0.5, door.y + 0.5, 1);
      }
      this.emitHud();
    }
  }

  private emitSoundPing(x: number, y: number, priority: number): void {
    const baldi = this.npcs.find((n) => n.id === 'baldi');
    let heard = false;
    if (baldi) {
      const dist = Math.hypot(baldi.x - x, baldi.y - y);
      // Forgiving acoustic radar: Baldo hears math errors globally, and unoiled doors within 10.5 tiles
      if (priority >= 2 || dist <= 10.5) {
        heard = true;
        if (this.baldiAnger > 0 || priority >= 2) {
          baldi.targetX = x;
          baldi.targetY = y;
        }
        this.baldiHeardTimer = 2.4;
      }
    }
    this.soundPings.push({
      id: this.nextEntityId++,
      x,
      y,
      priority,
      age: 0,
      maxAge: 2.2,
      heardByBaldi: heard,
    });
  }

  private updateDoors(dt: number): void {
    for (const door of this.doors.values()) {
      if (door.tileType === 8 && this.redAlert) {
        door.openAmount = 1;
        continue;
      }
      if (door.openTimer > 0) {
        door.openTimer -= dt;
        door.openAmount = Math.min(1, door.openAmount + dt * 5);
      } else if (door.openAmount > 0) {
        // Keep door open if player or NPC stands inside doorway tile
        const occupied =
          (Math.floor(this.player.x) === door.x && Math.floor(this.player.y) === door.y) ||
          this.npcs.some(
            (n) => Math.floor(n.x) === door.x && Math.floor(n.y) === door.y
          );
        if (!occupied) {
          door.openAmount = Math.max(0, door.openAmount - dt * 2.8);
        }
      }
    }
  }

  private updateWaves(dt: number): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.life += dt;
      const nx = w.x + w.vx * dt;
      const ny = w.y + w.vy * dt;
      const gx = Math.floor(nx);
      const gy = Math.floor(ny);
      const tile =
        gy >= 0 && gy < SCHOOL_GRID.length && gx >= 0 && gx < SCHOOL_GRID[0].length
          ? SCHOOL_GRID[gy][gx]
          : 1;

      if (w.life >= w.maxLife || (tile > 0 && !isDoorTile(tile))) {
        this.spawnBurst(w.x, w.y, 0xffd97706, 10);
        this.waves.splice(i, 1);
        continue;
      }
      w.x = nx;
      w.y = ny;

      // Push Professor Baldo strongly backward when hit by Café Expreso!
      for (const npc of this.npcs) {
        if (!npc.active) continue;
        const dist = Math.hypot(npc.x - w.x, npc.y - w.y);
        if (dist < 1.25) {
          const pushStep = moveWithCollision(
            npc.x,
            npc.y,
            w.vx * dt * 1.45,
            w.vy * dt * 1.45,
            0.28,
            this.doors,
            true,
            false
          );
          npc.x = pushStep.x;
          npc.y = pushStep.y;
          npc.pushTimer = 1.6;
          npc.hitFlash = 0.25;
        }
      }
    }
  }

  private updatePickupsAndNotebooks(): void {
    // Check Notebooks
    for (const nb of this.notebooks) {
      if (nb.collected) continue;
      if (Math.hypot(this.player.x - nb.x, this.player.y - nb.y) < 0.78) {
        const problems = drawNotebookProblems(this.difficulty, this.usedProblemIds, 3);
        this.mathSession = {
          notebookId: nb.id,
          roomLabel: nb.roomLabel,
          problems,
          currentIndex: 0,
          results: ['pending', 'pending', 'pending'],
          feedbackTimer: 0,
          lastPickedIndex: null,
          lastCorrect: null,
        };
        this.phase = 'math';
        this.clearInputs();
        this.exitPointerLock();
        this.audio.playPickup();
        this.emitHud();
        return;
      }
    }

    // Check Boosters
    for (const item of this.pickups) {
      if (item.collected) continue;
      if (Math.hypot(this.player.x - item.x, this.player.y - item.y) < 0.72) {
        const slot = addToInventory(this.player.inventory, item.type);
        if (slot !== -1) {
          item.collected = true;
          this.audio.playPickup();
          this.spawnBurst(item.x, item.y, 0xfffacc15, 10);
          this.showBanner(
            `Recogiste: ${BOOSTER_META[item.type].name} [${slot + 1}]`,
            'success',
            2.2
          );
          this.emitHud();
        }
      }
    }
  }

  private updateNpcs(dt: number): void {
    const collectedCount = this.notebooks.filter((n) => n.collected).length;

    for (const npc of this.npcs) {
      npc.animPhase += dt;
      npc.hitFlash = Math.max(0, npc.hitFlash - dt);
      if (npc.pushTimer > 0) {
        npc.pushTimer = Math.max(0, npc.pushTimer - dt);
        continue;
      }
      if (npc.cooldown > 0) {
        npc.cooldown = Math.max(0, npc.cooldown - dt);
      }

      if (npc.id === 'baldi') {
        this.updateBaldi(npc, dt, collectedCount);
      }
    }
  }

  private moveNpcToward(npc: NpcEntity, tx: number, ty: number, speed: number, dt: number): void {
    const next = findNextStepBFS(npc.x, npc.y, tx, ty);
    const dx = next.x - npc.x;
    const dy = next.y - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.04) return;
    const step = Math.min(dist, speed * dt);
    npc.vx = (dx / dist) * speed;
    npc.vy = (dy / dist) * speed;
    npc.x += (dx / dist) * step;
    npc.y += (dy / dist) * step;

    // Auto-open doors Baldo passes through
    const gx = Math.floor(npc.x);
    const gy = Math.floor(npc.y);
    const door = this.doors.get(`${gx},${gy}`);
    if (door && door.tileType !== 8) {
      door.openAmount = 1;
      door.openTimer = 1.8;
    }
  }

  private updateBaldi(npc: NpcEntity, dt: number, collectedCount: number): void {
    const stats = computeBaldiStats(this.baldiAnger, this.difficulty, collectedCount);

    // Friendly welcome phase: before any errors AND fewer than 3 notebooks, Baldo stays smiling peacefully
    const isHunting = this.baldiAnger > 0 || collectedCount >= 3;
    if (!isHunting) {
      npc.state = 'amable';
      npc.slapBurstTimer = 0;
      npc.slapAnim = 0;
      npc.vx = 0;
      npc.vy = 0;
      return;
    }

    npc.state = this.baldiAnger > 0 ? 'enojado' : 'siguiendo';

    // Direct line of sight updates Baldo's target to player
    const distToPlayer = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
    if (hasLineOfSight(npc.x, npc.y, this.player.x, this.player.y, this.doors)) {
      npc.targetX = this.player.x;
      npc.targetY = this.player.y;
    } else if (Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y) < 0.65) {
      npc.targetX = this.player.x;
      npc.targetY = this.player.y;
    }

    // Authentic Baldi's Basics movement: stands STILL between slaps, lunges ONLY when the ruler slaps!
    npc.slapBurstTimer = Math.max(0, npc.slapBurstTimer - dt);
    npc.slapAnim =
      npc.slapBurstTimer > 0 ? npc.slapBurstTimer / BALDI_SLAP_BURST_DURATION : 0;

    npc.slapTimer -= dt;
    if (npc.slapTimer <= 0) {
      npc.slapTimer = stats.slapInterval;
      npc.slapBurstTimer = BALDI_SLAP_BURST_DURATION;
      npc.slapAnim = 1.0;

      const angleToBaldi = Math.atan2(npc.y - this.player.y, npc.x - this.player.x);
      const relAngle = Math.sin(angleToBaldi - this.player.angle);
      this.audio.playRulerSlap(distToPlayer, relAngle, this.baldiAnger);
    }

    const lungeSpeed = computeBaldiSlapLungeSpeed(
      npc.slapBurstTimer,
      stats.stridePerSlap,
      BALDI_SLAP_BURST_DURATION
    );
    if (lungeSpeed > 0.001) {
      this.moveNpcToward(npc, npc.targetX, npc.targetY, lungeSpeed, dt);
    } else {
      npc.vx = 0;
      npc.vy = 0;
    }

    // Catch check (forgiving hitbox radius)
    if (distToPlayer < 0.56) {
      this.hitstop = 0.08;
      this.player.hitFlash = 0.4;
      this.player.cameraShake = 0.9;
      this.deathReason = '¡El Profesor Baldo te alcanzó con su regla!';
      this.phase = 'gameover';
      this.audio.stopAllLoops();
      this.audio.playGameOverScare();
      this.exitPointerLock();
      this.clearInputs();
      this.syncBodyState();
      this.emitHud();
    }
  }

  private updateSoundPings(dt: number): void {
    for (let i = this.soundPings.length - 1; i >= 0; i--) {
      this.soundPings[i].age += dt;
      if (this.soundPings[i].age >= this.soundPings[i].maxAge) {
        this.soundPings.splice(i, 1);
      }
    }
  }

  private spawnBurst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const a = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 2.2;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = (Math.random() - 0.3) * 0.35;
      p.vx = Math.cos(a) * spd;
      p.vy = Math.sin(a) * spd;
      p.vz = -0.6 - Math.random() * 1.1;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.color = color;
      p.size = 2 + Math.random() * 2;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz += 3.2 * dt;
    }
  }

  private showBanner(
    text: string,
    tone: 'info' | 'warn' | 'danger' | 'success',
    duration = 2.6
  ): void {
    this.bannerText = text;
    this.bannerTone = tone;
    this.bannerTimer = duration;
  }

  // ======================= RENDERING =======================

  private draw(): void {
    let camX = this.player.x;
    let camY = this.player.y;
    let camAngle = this.player.angle;
    let bobY = 0;
    let shakeX = 0;
    let shakeY = 0;
    let renderNpcs = this.npcs;

    if (this.tutorialStep !== null) {
      // Live 3D Cinematic Camera Tour tailored to each Tutorial Step!
      const t = this.tutorialCamTime;
      let targetX = 12.5;
      let targetY = 12.0;
      let targetAngle = -Math.PI / 2;

      if (this.tutorialStep === 0) {
        // Step 0 (Objetivo): Smooth orbit inside Aula 102 framing the glowing Spiral Notebook (23.0, 2.5)
        targetX = 21.35 + Math.sin(t * 0.75) * 0.25;
        targetY = 3.52 + Math.cos(t * 0.75) * 0.16;
        targetAngle = Math.atan2(2.5 - targetY, 23.0 - targetX);
        bobY = Math.sin(t * 1.8) * 2.0;
      } else if (this.tutorialStep === 1) {
        // Step 1 (Controles): First-person walking & looking demo down the sunlit North Corridor
        targetX = 12.5 + Math.sin(t * 0.55) * 5.2;
        targetY = 6.0 + Math.cos(t * 1.1) * 0.16;
        const movingRight = Math.cos(t * 0.55) >= 0;
        const baseDir = movingRight ? 0 : Math.PI;
        targetAngle = baseDir + Math.sin(t * 1.35) * 0.42;
        bobY = Math.sin(t * 7.5) * 4.2;
      } else if (this.tutorialStep === 2) {
        // Step 2 (El Profesor): Live 3D demonstration of Baldo's discrete ruler slap-step!
        targetX = 12.5 + Math.sin(t * 0.65) * 0.32;
        targetY = 12.1;
        targetAngle = -Math.PI / 2 + Math.sin(t * 0.65) * 0.08;
        // Simulate 3 discrete slap steps down the corridor toward the camera, then loop smoothly
        const cycle = t % 4.5;
        const beatIdx = Math.floor(cycle / 1.5);
        const beatLocal = cycle % 1.5;
        const burstU = Math.min(1, beatLocal / 0.28);
        const easedStep = 1 - (1 - burstU) * (1 - burstU);
        const demoY = 7.4 + (beatIdx + easedStep) * 0.88;
        const demoSlap = beatLocal < 0.28 ? 1 - burstU : 0;
        renderNpcs = [
          {
            ...this.npcs[0],
            x: 12.5,
            y: Math.min(10.4, demoY),
            slapAnim: demoSlap,
            state: 'enojado',
          },
        ];
      } else {
        // Step 3 (Objetos): Gentle Cafeteria showcase orbiting the Café Expreso booster (22.5, 11.5)
        targetX = 21.45 + Math.cos(t * 0.8) * 0.35;
        targetY = 12.35 + Math.sin(t * 0.8) * 0.22;
        targetAngle = Math.atan2(11.5 - targetY, 22.5 - targetX);
        bobY = Math.sin(t * 2.0) * 1.8;
      }

      // Snap smoothly when jumping across distant rooms, glide continuously within the same room
      const jumpDist = Math.hypot(targetX - this.previewCam.x, targetY - this.previewCam.y);
      if (!this.previewCam.initialized || jumpDist > 3.5) {
        this.previewCam.x = targetX;
        this.previewCam.y = targetY;
        this.previewCam.angle = targetAngle;
        this.previewCam.initialized = true;
      } else {
        this.previewCam.x += (targetX - this.previewCam.x) * 0.14;
        this.previewCam.y += (targetY - this.previewCam.y) * 0.14;
        const diffA = Math.atan2(
          Math.sin(targetAngle - this.previewCam.angle),
          Math.cos(targetAngle - this.previewCam.angle)
        );
        this.previewCam.angle += diffA * 0.14;
      }
      camX = this.previewCam.x;
      camY = this.previewCam.y;
      camAngle = this.previewCam.angle;
    } else if (this.phase === 'splash') {
      // Opening Menu Intro: dramatic smooth glide down the sunlit central hallway toward Baldo!
      const progress = Math.min(1, this.splashTimer / 4.0);
      const eased = 1 - Math.pow(1 - progress, 3);
      camX = 12.5 + Math.sin(progress * Math.PI) * 0.22;
      camY = 16.5 - eased * 4.2;
      camAngle = -Math.PI / 2 + Math.sin(progress * Math.PI * 1.4) * 0.1;
      bobY = Math.sin(this.splashTimer * 5.2) * (1 - progress * 0.6) * 3.0;
      this.previewCam = { x: camX, y: camY, angle: camAngle, initialized: true };
    } else if (this.phase === 'title') {
      // Atmospheric Live World Camera Tour gliding down the sunlit central school corridor
      const t = this.timeSec * 0.3;
      camX = 12.5 + Math.sin(t) * 0.22;
      camY = 12.2 + Math.cos(t * 0.6) * 1.1;
      camAngle = -Math.PI / 2 + Math.sin(t * 0.7) * 0.16;
      this.previewCam = { x: camX, y: camY, angle: camAngle, initialized: true };
    } else if (this.phase === 'intro') {
      // Gentle breathing idle framing facing Professor Baldo in the sunlit lobby
      camX = this.player.x;
      camY = this.player.y;
      camAngle = this.player.angle + Math.sin(this.timeSec * 0.8) * 0.025;
      bobY = Math.sin(this.timeSec * 2.2) * 1.8;
    } else {
      const trauma = this.player.cameraShake * this.player.cameraShake;
      shakeX = (Math.random() * 2 - 1) * trauma * 16;
      shakeY = (Math.random() * 2 - 1) * trauma * 10;
      bobY =
        (this.player.isMoving ? Math.sin(this.player.bobPhase) * 4.2 : 0) +
        this.player.jumpHeight * 36;
    }

    const effectiveAnger = this.tutorialStep === 2 ? 1 : this.baldiAnger;

    this.renderer.render(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      { x: camX, y: camY, angle: camAngle, bobY, shakeX, shakeY },
      this.doors,
      renderNpcs,
      this.notebooks,
      this.pickups,
      this.waves,
      this.particles,
      this.redAlert,
      this.timeSec,
      effectiveAnger,
      this.phase === 'playing' && this.tutorialStep === null ? this.player : null
    );
  }

  // ======================= HUD SNAPSHOT =======================

  private emitHud(): void {
    const baldi = this.npcs.find((n) => n.id === 'baldi');
    const baldiDistance = baldi
      ? Math.hypot(baldi.x - this.player.x, baldi.y - this.player.y)
      : 99;

    const npcColors: Record<NpcEntity['id'], string> = {
      baldi: this.baldiAnger > 0 ? '#dc2626' : '#16a34a',
      principal: '#475569',
      playtime: '#ec4899',
      bully: '#ea580c',
      sweep: '#059669',
    };

    this.onHudUpdate({
      phase: this.phase,
      difficulty: this.difficulty,
      notebooksCollected: this.notebooks.filter((n) => n.collected).length,
      totalNotebooks: this.notebooks.length,
      redAlert: this.redAlert,
      baldiAnger: this.baldiAnger,
      baldiHeardTimer: this.baldiHeardTimer,
      baldiDistance,
      stamina: Math.round(this.player.stamina),
      staminaGhost: Math.round(this.player.staminaGhost),
      isRunning: this.player.isRunning,
      oilCharges: this.player.oilCharges,
      detentionTimer: this.player.detentionTimer,
      jumpRopeActive: this.player.jumpRopeActive,
      jumpRopeCount: this.player.jumpRopeCount,
      jumpRopePhase: this.player.jumpRopePhase,
      inventory: [...this.player.inventory],
      elapsedTime: this.elapsedTime,
      errorsCount: this.errorsCount,
      correctCount: this.correctCount,
      promptText: this.promptText,
      bannerText: this.bannerText,
      bannerTone: this.bannerTone,
      muted: this.audio.isMuted(),
      playerX: this.player.x,
      playerY: this.player.y,
      playerAngle: this.player.angle,
      npcs: this.npcs
        .filter((n) => n.active)
        .map((n) => ({
          id: n.id,
          name: n.name,
          x: n.x,
          y: n.y,
          state: n.state,
          color: npcColors[n.id],
          angry: n.id === 'baldi' && this.baldiAnger > 0,
        })),
      notebooks: this.notebooks.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        collected: n.collected,
        roomLabel: n.roomLabel,
      })),
      exits: [
        { x: 12.5, y: 0.5, open: this.redAlert },
        { x: 0.5, y: 11.5, open: this.redAlert },
        { x: 26.5, y: 11.5, open: this.redAlert },
      ],
      soundPings: this.soundPings.map((s) => ({
        x: s.x,
        y: s.y,
        age: s.age,
        maxAge: s.maxAge,
        heard: s.heardByBaldi,
      })),
      mathSession: this.mathSession
        ? {
            ...this.mathSession,
            results: [...this.mathSession.results],
          }
        : null,
      deathReason: this.deathReason,
      zoneLabel: getZoneDisplayName(this.player.x, this.player.y),
    });
  }
}
