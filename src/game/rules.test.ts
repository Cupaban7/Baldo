import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETENTION_SPAWN,
  EXIT_TILES,
  JANITOR_HOME,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_SPAWN,
  SCHOOL_GRID,
  createInitialDoors,
  createInitialNotebooks,
  createInitialPickups,
  findNextStepBFS,
  getZoneAt,
  getZoneDisplayName,
} from './mapData';
import {
  BALDI_SLAP_BURST_DURATION,
  WALK_SPEED,
  addToInventory,
  checkExitReached,
  computeBaldiSlapLungeSpeed,
  computeBaldiStats,
  computeReachableTiles,
  consumeScissorsIfPresent,
  evaluateJumpRopePress,
  moveWithCollision,
  openDoorAction,
  sendPlayerToDetention,
  takeAnyBooster,
  updateStamina,
} from './rules';
import { PlayerState } from './types';

function makePlayer(): PlayerState {
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

test('school map has exact rectangular dimensions and open player spawn', () => {
  assert.equal(SCHOOL_GRID.length, MAP_HEIGHT);
  for (let y = 0; y < MAP_HEIGHT; y++) {
    assert.equal(
      SCHOOL_GRID[y].length,
      MAP_WIDTH,
      `row ${y} width mismatch: ${SCHOOL_GRID[y].length} vs ${MAP_WIDTH}`
    );
  }
  assert.equal(
    SCHOOL_GRID[Math.floor(PLAYER_SPAWN.y)][Math.floor(PLAYER_SPAWN.x)],
    0,
    'player spawn must be open floor'
  );
  assert.equal(
    SCHOOL_GRID[Math.floor(DETENTION_SPAWN.y)][Math.floor(DETENTION_SPAWN.x)],
    0,
    'detention spawn must be open floor'
  );
  assert.equal(
    SCHOOL_GRID[Math.floor(JANITOR_HOME.y)][Math.floor(JANITOR_HOME.x)],
    0,
    'janitor home must be open floor'
  );
});

test('all 7 notebooks, all 10 active pickups (no scissors), and all 3 exits are reachable from spawn', () => {
  const reachable = computeReachableTiles(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  const notebooks = createInitialNotebooks();
  assert.equal(notebooks.length, 7);
  for (const nb of notebooks) {
    const gx = Math.floor(nb.x);
    const gy = Math.floor(nb.y);
    assert.equal(
      SCHOOL_GRID[gy][gx],
      0,
      `Notebook ${nb.id} (${nb.roomLabel}) is inside a wall at (${gx},${gy})`
    );
    assert.ok(
      reachable.has(`${gx},${gy}`),
      `Notebook ${nb.id} (${nb.roomLabel}) at (${gx},${gy}) is NOT reachable from spawn`
    );
  }

  const pickups = createInitialPickups();
  assert.equal(pickups.length, 10);
  for (const item of pickups) {
    assert.notEqual(item.type, 'scissors', 'Scissors should not spawn in Baldo-only mode');
    const gx = Math.floor(item.x);
    const gy = Math.floor(item.y);
    assert.equal(
      SCHOOL_GRID[gy][gx],
      0,
      `Pickup ${item.id} (${item.type}) is inside a wall at (${gx},${gy})`
    );
    assert.ok(
      reachable.has(`${gx},${gy}`),
      `Pickup ${item.id} (${item.type}) at (${gx},${gy}) is NOT reachable from spawn`
    );
  }

  for (const exit of EXIT_TILES) {
    assert.ok(
      reachable.has(`${exit.x},${exit.y}`),
      `Exit ${exit.label} at (${exit.x},${exit.y}) is NOT reachable from spawn`
    );
  }

  assert.ok(
    reachable.has(`${Math.floor(DETENTION_SPAWN.x)},${Math.floor(DETENTION_SPAWN.y)}`),
    'Detention room must be reachable'
  );
  assert.ok(
    reachable.has(`${Math.floor(JANITOR_HOME.x)},${Math.floor(JANITOR_HOME.y)}`),
    'Janitor closet must be reachable'
  );
});

test('BFS pathfinding moves toward distant classroom notebook', () => {
  const step = findNextStepBFS(PLAYER_SPAWN.x, PLAYER_SPAWN.y, 2.5, 2.5);
  assert.ok(
    Math.hypot(step.x - PLAYER_SPAWN.x, step.y - PLAYER_SPAWN.y) <= 1.5,
    'BFS step should be adjacent tile'
  );
});

test('Baldi moves ONLY on ruler slaps and escalates gradually below player walk speed', () => {
  const calm = computeBaldiStats(0, 'medio', 0);
  const angry1 = computeBaldiStats(1, 'medio', 1);
  const angry4 = computeBaldiStats(4, 'medio', 4);

  assert.equal(calm.isAngry, false);
  assert.equal(angry1.isAngry, true);
  assert.ok(angry1.speed > calm.speed);
  assert.ok(angry4.speed > angry1.speed);
  assert.ok(angry1.slapInterval < calm.slapInterval);
  assert.ok(angry4.slapInterval < angry1.slapInterval);

  // Between slaps (slapBurstTimer === 0), instantaneous speed MUST be strictly 0
  assert.equal(computeBaldiSlapLungeSpeed(0, angry1.stridePerSlap), 0);
  assert.equal(computeBaldiSlapLungeSpeed(-0.2, angry1.stridePerSlap), 0);

  // Integrating lunge speed over the burst duration equals stridePerSlap (within numerical tolerance)
  const steps = 1000;
  const dt = BALDI_SLAP_BURST_DURATION / steps;
  let distCovered = 0;
  for (let i = 0; i < steps; i++) {
    const remaining = BALDI_SLAP_BURST_DURATION - (i + 0.5) * dt;
    distCovered += computeBaldiSlapLungeSpeed(remaining, angry1.stridePerSlap) * dt;
  }
  assert.ok(
    Math.abs(distCovered - angry1.stridePerSlap) < 0.01,
    `Expected lunge distance ~${angry1.stridePerSlap}, got ${distCovered}`
  );

  for (const diff of ['facil', 'medio', 'dificil'] as const) {
    const maxed = computeBaldiStats(8, diff, 7);
    assert.ok(
      maxed.speed < WALK_SPEED,
      `Baldi max avg speed on ${diff} (${maxed.speed}) must stay strictly below WALK_SPEED (${WALK_SPEED})`
    );
  }
});

test('getZoneDisplayName returns human-readable Spanish room and hallway labels', () => {
  assert.equal(getZoneDisplayName(2.5, 2.5), 'Aula 101');
  assert.equal(getZoneDisplayName(22.5, 11.5), 'Cafetería');
  assert.equal(getZoneDisplayName(PLAYER_SPAWN.x, PLAYER_SPAWN.y), 'Pasillo Central');
});

test('inventory enforces max 3 slots, Bully tax, and Scissors rope cut', () => {
  const inv: (import('./types').BoosterType | null)[] = [null, null, null];
  assert.equal(addToInventory(inv, 'coffee'), 0);
  assert.equal(addToInventory(inv, 'energy'), 1);
  assert.equal(addToInventory(inv, 'scissors'), 2);
  assert.equal(addToInventory(inv, 'oil'), -1);

  assert.equal(consumeScissorsIfPresent(inv), true);
  assert.equal(inv[2], null);
  assert.equal(consumeScissorsIfPresent(inv), false);

  const taken = takeAnyBooster(inv);
  assert.equal(taken, 'coffee');
  assert.equal(inv[0], null);
});

test('oil silences door noise and red alert unlocks emergency exits', () => {
  const doors = createInitialDoors();
  const player = makePlayer();
  const classDoor = doors.get('3,4')!;
  const exitDoor = doors.get('12,0')!;

  // Normal door makes noise
  const r1 = openDoorAction(classDoor, player, false);
  assert.equal(r1.opened, true);
  assert.equal(r1.madeNoise, true);

  // Close door, apply oil -> zero noise
  classDoor.openAmount = 0;
  player.oilCharges = 1;
  const r2 = openDoorAction(classDoor, player, false);
  assert.equal(r2.opened, true);
  assert.equal(r2.madeNoise, false);
  assert.equal(player.oilCharges, 0);

  // Exit stays locked before red alert, opens after
  assert.equal(openDoorAction(exitDoor, player, false).opened, false);
  assert.equal(checkExitReached(12.5, 0.7, false), false);
  assert.equal(openDoorAction(exitDoor, player, true).opened, true);
  assert.equal(checkExitReached(12.5, 0.7, true), true);
});

test('stamina drains when running, recovers faster standing still, and detention locks player', () => {
  const s1 = updateStamina(50, true, true, 1.0);
  assert.ok(s1.stamina < 50 && s1.isRunning);
  const sStill = updateStamina(50, false, false, 1.0);
  const sWalk = updateStamina(50, true, false, 1.0);
  assert.ok(sStill.stamina > sWalk.stamina);

  const doors = createInitialDoors();
  const player = makePlayer();
  sendPlayerToDetention(player, doors);
  assert.equal(player.detentionTimer, 15);
  assert.equal(getZoneAt(player.x, player.y), 'detention');

  // Cannot open detention door while timer > 0
  const detDoor = doors.get('15,10')!;
  assert.equal(openDoorAction(detDoor, player, false).opened, false);

  // Collision prevents walking through wall
  const moved = moveWithCollision(12.5, 12.0, 0, -0.3, 0.28, doors, false, false);
  assert.equal(moved.collided, false);
});

test('jump rope completes after 5 timed presses', () => {
  const player = makePlayer();
  player.jumpRopeActive = true;
  player.jumpRopePhase = 0.6; // inside jump window
  for (let i = 0; i < 4; i++) {
    assert.equal(evaluateJumpRopePress(player), 'hit');
  }
  assert.equal(evaluateJumpRopePress(player), 'complete');
  assert.equal(player.jumpRopeActive, false);
  assert.ok(player.jumpRopeGrace > 0);
});
