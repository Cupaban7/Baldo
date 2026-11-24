import {
  DETENTION_SPAWN,
  EXIT_TILES,
  MAP_HEIGHT,
  MAP_WIDTH,
  SCHOOL_GRID,
  isTileSolidForPlayer,
} from './mapData';
import { BoosterType, Difficulty, DoorState, PlayerState } from './types';

export const PLAYER_RADIUS = 0.28;
export const WALK_SPEED = 3.65;
export const RUN_SPEED = 5.95;
export const STAMINA_DRAIN_PER_SEC = 15;
export const STAMINA_REGEN_STILL = 34;
export const STAMINA_REGEN_WALK = 16;
export const DETENTION_DURATION = 15;
export const JUMP_ROPE_TARGET = 5;
export const BALDI_SLAP_BURST_DURATION = 0.28; // seconds of slide-step right when ruler slaps

/**
 * Computes Baldi's discrete slap-step stats based on anger & difficulty.
 * Just like the original Baldi's Basics, Baldi stands completely still between
 * ruler slaps and lunges forward by `stridePerSlap` tiles each time the ruler hits.
 * Effective average speed (`stridePerSlap / slapInterval`) stays safely below WALK_SPEED.
 */
export function computeBaldiStats(
  anger: number,
  difficulty: Difficulty,
  notebooksCollected: number
): { speed: number; slapInterval: number; stridePerSlap: number; isAngry: boolean } {
  const diffMult =
    difficulty === 'facil' ? 0.85 : difficulty === 'medio' ? 0.92 : 1.0;

  if (anger === 0) {
    const slapInterval = 2.05;
    const stridePerSlap = 1.25 * diffMult;
    return {
      speed: stridePerSlap / slapInterval,
      slapInterval,
      stridePerSlap,
      isAngry: false,
    };
  }

  const slapInterval = Math.max(0.68, 1.82 - anger * 0.11 - notebooksCollected * 0.025);
  const rawAvgSpeed = Math.min(3.05, (1.25 + anger * 0.21 + notebooksCollected * 0.05) * diffMult);
  // Each ruler slap covers a crisp, readable lunge capped for fairness
  const stridePerSlap = Math.min(2.05, rawAvgSpeed * slapInterval);
  const speed = stridePerSlap / slapInterval;

  return { speed, slapInterval, stridePerSlap, isAngry: true };
}

/**
 * Returns Baldi's instantaneous movement speed during a ruler slap.
 * - Returns 0 whenever `slapBurstTimer <= 0` (Baldi stands still between slaps).
 * - During the brief slap burst (`0 < slapBurstTimer <= burstDuration`), applies a
 *   quadratic ease-out pulse whose integral over `[0, burstDuration]` equals `stridePerSlap`.
 */
export function computeBaldiSlapLungeSpeed(
  slapBurstTimer: number,
  stridePerSlap: number,
  burstDuration: number = BALDI_SLAP_BURST_DURATION
): number {
  if (slapBurstTimer <= 0 || burstDuration <= 0 || stridePerSlap <= 0) {
    return 0;
  }
  const u = Math.min(1, slapBurstTimer / burstDuration);
  return (stridePerSlap / burstDuration) * (2 * u);
}

/**
 * Smooth circle-vs-grid collision resolution with independent axis sliding.
 */
export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  doors: Map<string, DoorState>,
  redAlert: boolean,
  inDetention: boolean
): { x: number; y: number; collided: boolean } {
  let nx = x + dx;
  let ny = y;
  let collided = false;

  const isBlocked = (px: number, py: number): boolean => {
    const corners = [
      [px - radius, py - radius],
      [px + radius, py - radius],
      [px - radius, py + radius],
      [px + radius, py + radius],
    ];
    for (let i = 0; i < 4; i++) {
      const gx = Math.floor(corners[i][0]);
      const gy = Math.floor(corners[i][1]);
      if (isTileSolidForPlayer(gx, gy, doors, redAlert, inDetention)) {
        return true;
      }
    }
    return false;
  };

  if (isBlocked(nx, y)) {
    nx = x;
    collided = true;
  }

  ny = y + dy;
  if (isBlocked(nx, ny)) {
    ny = y;
    collided = true;
  }

  return { x: nx, y: ny, collided };
}

/**
 * Adds a booster to the first available inventory slot (max 3).
 * Returns the slot index if added, or -1 if inventory is full.
 */
export function addToInventory(
  inventory: (BoosterType | null)[],
  item: BoosterType
): number {
  const emptyIdx = inventory.findIndex((slot) => slot === null);
  if (emptyIdx === -1) return -1;
  inventory[emptyIdx] = item;
  return emptyIdx;
}

/**
 * Removes and returns the first non-null booster from inventory (used by Bully tax).
 */
export function takeAnyBooster(
  inventory: (BoosterType | null)[]
): BoosterType | null {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] !== null) {
      const item = inventory[i];
      inventory[i] = null;
      return item;
    }
  }
  return null;
}

/**
 * Checks whether player carries Scissors and consumes them to immediately escape Playtime.
 */
export function consumeScissorsIfPresent(
  inventory: (BoosterType | null)[]
): boolean {
  const idx = inventory.indexOf('scissors');
  if (idx === -1) return false;
  inventory[idx] = null;
  return true;
}

/**
 * Updates stamina obeying classic Baldi Staminaometer rule:
 * only recovers when standing still (faster) or walking slowly; drains when running.
 */
export function updateStamina(
  stamina: number,
  isMoving: boolean,
  wantsRun: boolean,
  dt: number
): { stamina: number; isRunning: boolean } {
  const canRun = wantsRun && isMoving && stamina > 1;
  if (canRun) {
    const next = Math.max(0, stamina - STAMINA_DRAIN_PER_SEC * dt);
    return { stamina: next, isRunning: next > 0 };
  }
  const regenRate = isMoving ? STAMINA_REGEN_WALK : STAMINA_REGEN_STILL;
  return {
    stamina: Math.min(100, stamina + regenRate * dt),
    isRunning: false,
  };
}

/**
 * Opens a door if permitted, returning whether the door makes noise (alerts Baldi).
 */
export function openDoorAction(
  door: DoorState,
  player: PlayerState,
  redAlert: boolean
): { opened: boolean; madeNoise: boolean; reason?: string } {
  if (door.tileType === 8 && !redAlert) {
    return {
      opened: false,
      madeNoise: false,
      reason: 'Reúne los 7 cuadernos para desbloquear la salida',
    };
  }
  if (door.tileType === 10 && player.detentionTimer > 0) {
    return {
      opened: false,
      madeNoise: false,
      reason: `Detención: espera ${Math.ceil(player.detentionTimer)}s`,
    };
  }

  const wasClosed = door.openAmount < 0.2;
  door.openAmount = 1;
  door.openTimer = 3.2;

  if (!wasClosed) {
    return { opened: true, madeNoise: false };
  }

  if (player.oilCharges > 0 || door.silenced) {
    if (!door.silenced && player.oilCharges > 0) {
      player.oilCharges -= 1;
      door.silenced = true;
    }
    return { opened: true, madeNoise: false };
  }

  return { opened: true, madeNoise: true };
}

/**
 * Checks whether player has reached an unlocked Emergency Exit during Red Alert.
 */
export function checkExitReached(
  px: number,
  py: number,
  redAlert: boolean
): boolean {
  if (!redAlert) return false;
  for (const exit of EXIT_TILES) {
    const dist = Math.hypot(px - (exit.x + 0.5), py - (exit.y + 0.5));
    if (dist < 0.92) return true;
  }
  return false;
}

/**
 * Sends player to Detention Room for 15s.
 */
export function sendPlayerToDetention(
  player: PlayerState,
  doors: Map<string, DoorState>
): void {
  player.x = DETENTION_SPAWN.x;
  player.y = DETENTION_SPAWN.y;
  player.angle = DETENTION_SPAWN.angle;
  player.detentionTimer = DETENTION_DURATION;
  player.jumpRopeActive = false;
  player.jumpRopeCount = 0;
  player.isRunning = false;
  const detDoor = doors.get('15,10');
  if (detDoor) {
    detDoor.openAmount = 0;
    detDoor.openTimer = 0;
  }
}

/**
 * Evaluates a jump-rope timing press. Returns 'hit' if within rhythm window,
 * 'complete' if target count (5) reached, or 'miss' if mistimed.
 */
export function evaluateJumpRopePress(
  player: PlayerState
): 'hit' | 'complete' | 'miss' {
  // Generous rhythmic window around rope passing under feet (phase near 0.0/1.0 or 0.35..0.85)
  // Using a clear visual arc where bottom sweep is phase 0.55..0.95 (or 0..0.15)
  const inWindow = player.jumpRopePhase >= 0.42 || player.jumpRopePhase <= 0.12;
  player.jumpVel = 3.6;
  if (!inWindow) {
    return 'miss';
  }
  player.jumpRopeCount += 1;
  if (player.jumpRopeCount >= JUMP_ROPE_TARGET) {
    player.jumpRopeActive = false;
    player.jumpRopeCount = 0;
    player.jumpRopeGrace = 5.0;
    return 'complete';
  }
  return 'hit';
}

/**
 * Utility for verifying grid reachability in unit tests (BFS from spawn).
 */
export function computeReachableTiles(startX: number, startY: number): Set<string> {
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  const visited = new Set<string>();
  const queue: [number, number][] = [[sx, sy]];
  visited.add(`${sx},${sy}`);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const tile = SCHOOL_GRID[ny][nx];
      // Walkable floors + any door (including exits)
      if (tile === 0 || tile === 3 || tile === 4 || tile === 8 || tile === 10) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}
