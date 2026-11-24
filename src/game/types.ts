export type Difficulty = 'facil' | 'medio' | 'dificil';

export type GamePhase =
  | 'splash'
  | 'title'
  | 'intro'
  | 'playing'
  | 'math'
  | 'paused'
  | 'victory'
  | 'gameover';

export type BoosterType = 'coffee' | 'energy' | 'scissors' | 'oil';

export type NpcKind = 'baldi' | 'principal' | 'playtime' | 'bully' | 'sweep';

/**
 * Grid tile definitions for the 2.5D raycasting schoolhouse.
 * 0 = empty floor (hallway)
 * 1 = hallway plaster wall (with wainscoting)
 * 2 = classroom wall (teal/green chalk trim)
 * 3 = yellow classroom door (interactive)
 * 4 = red/orange prohibited faculty door ("SOLO PERSONAL")
 * 5 = locker wall
 * 6 = cafeteria tile wall
 * 7 = detention room wall (brick/slate)
 * 8 = emergency exit door (locked until 7/7 notebooks, then opens in red alert)
 * 9 = poster / chalkboard wall (decorated hallway wall)
 * 10 = detention door (locked while in detention)
 */
export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ZoneType =
  | 'hall'
  | 'classroom'
  | 'faculty'
  | 'detention'
  | 'cafeteria'
  | 'janitor'
  | 'exit';

export interface DoorState {
  key: string;
  x: number;
  y: number;
  tileType: 3 | 4 | 8 | 10;
  openAmount: number; // 0 = closed, 1 = open
  openTimer: number;
  silenced: boolean;
  label: string;
}

export interface NotebookEntity {
  id: number;
  x: number;
  y: number;
  roomLabel: string;
  collected: boolean;
  color: string;
}

export interface ItemPickup {
  id: number;
  x: number;
  y: number;
  type: BoosterType;
  collected: boolean;
}

export interface ProjectileWave {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface SoundPing {
  id: number;
  x: number;
  y: number;
  priority: number; // 1 = door, 2 = math error
  age: number;
  maxAge: number;
  heardByBaldi: boolean;
}

export interface NpcEntity {
  id: NpcKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  state: string;
  timer: number;
  cooldown: number;
  targetX: number;
  targetY: number;
  animPhase: number;
  slapTimer: number;
  slapBurstTimer: number; // > 0 only during the discrete slide-step after a ruler slap
  slapAnim: number; // 0..1 ruler slap animation pulse
  pushTimer: number;
  hitFlash: number;
  active: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  angle: number; // radians
  stamina: number; // 0..100
  staminaGhost: number; // delayed trailing bar
  isRunning: boolean;
  isMoving: boolean;
  bobPhase: number;
  detentionTimer: number; // > 0 when locked in detention
  oilCharges: number; // next doors opened make zero sound
  jumpRopeActive: boolean;
  jumpRopeCount: number; // 0..5
  jumpRopePhase: number; // 0..1 rope swing cycle
  jumpRopeGrace: number; // immunity timer after escaping Playtime
  jumpHeight: number; // visual vertical hop offset
  jumpVel: number;
  cameraShake: number;
  hitFlash: number;
  inventory: (BoosterType | null)[]; // length 3
  selectedSlot: number;
}

export interface IntegralProblem {
  id: string;
  difficulty: Difficulty;
  /** Optional subtitle / domain hint e.g. "R = [0,2] × [0,1]" or "Disco r ≤ 2" */
  regionLabel?: string;
  /** Outer integral lower & upper limits */
  outerLow: string;
  outerHigh: string;
  /** Inner integral lower & upper limits */
  innerLow: string;
  innerHigh: string;
  /** Integrand expression using clean Unicode math */
  integrand: string;
  /** Differential order e.g. "dy dx" or "r dr dθ" */
  diff: string;
  /** 4 answer choices */
  choices: [string, string, string, string];
  /** Index 0..3 of the exact verified answer */
  correctIndex: number;
  /** Short explanation shown briefly on wrong/right feedback */
  tip: string;
}

export interface MathSession {
  notebookId: number;
  roomLabel: string;
  problems: IntegralProblem[];
  currentIndex: number;
  results: ('pending' | 'correct' | 'wrong')[];
  feedbackTimer: number;
  lastPickedIndex: number | null;
  lastCorrect: boolean | null;
}

export interface NpcMapMarker {
  id: NpcKind;
  name: string;
  x: number;
  y: number;
  state: string;
  color: string;
  angry: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  difficulty: Difficulty;
  notebooksCollected: number;
  totalNotebooks: number;
  redAlert: boolean;
  baldiAnger: number;
  baldiHeardTimer: number;
  baldiDistance: number;
  stamina: number;
  staminaGhost: number;
  isRunning: boolean;
  oilCharges: number;
  detentionTimer: number;
  jumpRopeActive: boolean;
  jumpRopeCount: number;
  jumpRopePhase: number;
  inventory: (BoosterType | null)[];
  elapsedTime: number;
  errorsCount: number;
  correctCount: number;
  promptText: string | null;
  bannerText: string | null;
  bannerTone: 'info' | 'warn' | 'danger' | 'success';
  muted: boolean;
  playerX: number;
  playerY: number;
  playerAngle: number;
  npcs: NpcMapMarker[];
  notebooks: { id: number; x: number; y: number; collected: boolean; roomLabel: string }[];
  exits: { x: number; y: number; open: boolean }[];
  soundPings: { x: number; y: number; age: number; maxAge: number; heard: boolean }[];
  mathSession: MathSession | null;
  deathReason: string;
  zoneLabel: string;
}

export const BOOSTER_META: Record<
  BoosterType,
  { name: string; short: string; desc: string; color: string }
> = {
  coffee: {
    name: 'Café Expreso',
    short: 'Expreso',
    desc: 'Lanza onda frontal que empuja enemigos atrás',
    color: '#92400e',
  },
  energy: {
    name: 'Barra Energética',
    short: 'Barra',
    desc: 'Rellena el 100% de la estamina al instante',
    color: '#d97706',
  },
  scissors: {
    name: 'Tijeras',
    short: 'Tijeras',
    desc: 'Corta la cuerda de la niña al instante',
    color: '#2563eb',
  },
  oil: {
    name: 'Aceite Silenciador',
    short: 'Aceite',
    desc: 'Silencia las siguientes 2 puertas que abras',
    color: '#0f766e',
  },
};
