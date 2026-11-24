import { BoosterType, DoorState, ItemPickup, NotebookEntity, TileType, ZoneType } from './types';

export const MAP_WIDTH = 27;
export const MAP_HEIGHT = 23;

/**
 * Classic Baldi-inspired schoolhouse layout:
 * - Long straight corridors (Principal sightlines + Gotta Sweep runs)
 * - 7 single-door classrooms (Aulas 101-107) with 1 Notebook each
 * - 2 Prohibited Faculty Rooms ("SOLO PERSONAL") with extra boosters
 * - Central Detention Room ("DETENCIÓN")
 * - East Cafeteria closed-loop circuit (with pillars to kite Baldi)
 * - West Janitor Closet (Gotta Sweep home)
 * - 3 Emergency Exits at West, North, East extremities
 *
 * Legend:
 *  '#' = 1 Hallway wall
 *  'P' = 9 Poster / Chalkboard hallway wall
 *  'L' = 5 Lockers wall
 *  'C' = 2 Classroom wall
 *  'F' = 6 Cafeteria wall
 *  'T' = 7 Detention brick wall
 *  'D' = 3 Yellow classroom door
 *  'S' = 4 Orange/Red "SOLO PERSONAL" faculty door
 *  'X' = 10 Detention door
 *  'E' = 8 Emergency Exit door
 *  '.' = 0 Open floor
 */
const RAW_MAP: string[] = [
  '############E##############', // 0  North Exit at (12, 0)
  '#CCCC#.....#.#.....#CCCCCC#', // 1  Aula 101 (W), Aula 102 (E)
  '#C..C#.CCC.#.#.CCC.#C....C#', // 2
  '#C..C#.C.C.#.#.C.C.#C....C#', // 3
  '#CCDC#.CDC.#.#.CDC.#CCCDCC#', // 4  Doors: (3,4), (8,4), (16,4), (23,4)
  '#L...P.....P.P.....P.....L#', // 5  North Long Corridor (y=5)
  '#L.......................L#', // 6  North Wide Corridor (y=6)
  '#CCCC#.##S##.##T##.#FF.FFF#', // 7  Faculty 1 (9,7), Detention (15,7), Cafeteria N entrance (22,7)
  '#C..C#.#...#.#...#.#F....F#', // 8
  '#C..D..#...#.#...#..F.F..F#', // 9  Aula 103 door (4,9)
  '#C..C#.#####.##X##.#F....F#', // 10 Detention door (15,10)
  'E...................D....DE', // 11 Main Central Hallway (y=11), West Exit (0,11), Cafeteria W door (20,11), East Exit (26,11)
  '#L......................FF#', // 12 Main Central Hallway (y=12) + open loop into Cafeteria
  '#CCCC#.##.##.#####.#F.F..F#', // 13
  '#C..D..#...#.#...#.#F....F#', // 14 Aula 104 (4,14), Janitor (8..10), Faculty 2 (14..16)
  '#C..C#.#...#.#...#.#FF.FFF#', // 15 Cafeteria S entrance (22,15)
  '#CCCC#.##D##.##S##.#.....L#', // 16 Janitor door (9,16), Faculty 2 door (15,16)
  '#L.......................L#', // 17 South Wide Corridor (y=17)
  '#L...P.....P.P.....P.....L#', // 18 South Long Corridor (y=18)
  '#CCDC#.CDC.#.#.CDC.#CCCDCC#', // 19 Doors: (3,19), (8,19), (16,19), (23,19)
  '#C..C#.C.C.#.#.C.C.#C....C#', // 20
  '#C..C#.CCC.#.#.CCC.#C....C#', // 21
  '###########################', // 22
];

function charToTile(ch: string): TileType {
  switch (ch) {
    case '#':
      return 1;
    case 'C':
      return 2;
    case 'D':
      return 3;
    case 'S':
      return 4;
    case 'L':
      return 5;
    case 'F':
      return 6;
    case 'T':
      return 7;
    case 'E':
      return 8;
    case 'P':
      return 9;
    case 'X':
      return 10;
    default:
      return 0;
  }
}

export const SCHOOL_GRID: TileType[][] = RAW_MAP.map((row) =>
  row.split('').map(charToTile)
);

export const PLAYER_SPAWN = {
  x: 12.5,
  y: 12.0,
  angle: -Math.PI / 2, // Facing North down the open central hall
};

export const DETENTION_SPAWN = {
  x: 15.0,
  y: 8.8,
  angle: Math.PI / 2,
};

export const JANITOR_HOME = {
  x: 9.0,
  y: 14.5,
};

export const EXIT_TILES = [
  { x: 12, y: 0, label: 'SALIDA NORTE' },
  { x: 0, y: 11, label: 'SALIDA OESTE' },
  { x: 26, y: 11, label: 'SALIDA ESTE' },
];

export function createInitialNotebooks(): NotebookEntity[] {
  return [
    { id: 1, x: 2.5, y: 2.5, roomLabel: 'Aula 101', collected: false, color: '#2563eb' },
    { id: 2, x: 23.0, y: 2.5, roomLabel: 'Aula 102', collected: false, color: '#dc2626' },
    { id: 3, x: 2.5, y: 9.0, roomLabel: 'Aula 103', collected: false, color: '#16a34a' },
    { id: 4, x: 2.5, y: 14.5, roomLabel: 'Aula 104', collected: false, color: '#9333ea' },
    { id: 5, x: 2.5, y: 20.5, roomLabel: 'Aula 105', collected: false, color: '#ea580c' },
    { id: 6, x: 16.0, y: 20.5, roomLabel: 'Aula 106', collected: false, color: '#0891b2' },
    { id: 7, x: 23.0, y: 20.5, roomLabel: 'Aula 107', collected: false, color: '#ca8a04' },
  ];
}

export function createInitialPickups(): ItemPickup[] {
  return [
    // Hallway & Cafeteria accessible boosters
    { id: 1, x: 22.5, y: 11.5, type: 'coffee', collected: false },
    { id: 2, x: 23.5, y: 14.2, type: 'energy', collected: false },
    { id: 3, x: 8.5, y: 20.5, type: 'coffee', collected: false },
    { id: 4, x: 16.5, y: 3.5, type: 'oil', collected: false },
    // Side storage rooms (safe to enter since only Baldo patrols!)
    { id: 5, x: 8.8, y: 8.5, type: 'coffee', collected: false },
    { id: 6, x: 9.8, y: 9.0, type: 'oil', collected: false },
    { id: 7, x: 15.0, y: 14.5, type: 'oil', collected: false },
    { id: 8, x: 16.0, y: 14.5, type: 'energy', collected: false },
    // Extra classrooms / hallways
    { id: 9, x: 8.5, y: 3.5, type: 'energy', collected: false },
    { id: 10, x: 19.5, y: 6.0, type: 'coffee', collected: false },
  ];
}

export function createInitialDoors(): Map<string, DoorState> {
  const doors = new Map<string, DoorState>();
  const labels: Record<string, string> = {
    '3,4': 'AULA 101',
    '8,4': 'SALA DE ESTUDIO',
    '16,4': 'BIBLIOTECA',
    '23,4': 'AULA 102',
    '4,9': 'AULA 103',
    '4,14': 'AULA 104',
    '3,19': 'AULA 105',
    '8,19': 'AULA 108',
    '16,19': 'AULA 106',
    '23,19': 'AULA 107',
    '9,7': 'SOLO PERSONAL',
    '15,16': 'SOLO PERSONAL',
    '15,10': 'DETENCIÓN',
    '9,16': 'CONSERJERÍA',
    '12,0': 'SALIDA NORTE',
    '0,11': 'SALIDA OESTE',
    '26,11': 'SALIDA ESTE',
  };

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = SCHOOL_GRID[y][x];
      if (tile === 3 || tile === 4 || tile === 8 || tile === 10) {
        const key = `${x},${y}`;
        doors.set(key, {
          key,
          x,
          y,
          tileType: tile,
          openAmount: 0,
          openTimer: 0,
          silenced: false,
          label: labels[key] || 'PUERTA',
        });
      }
    }
  }
  return doors;
}

export function getZoneAt(x: number, y: number): ZoneType {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  // Faculty Room 1
  if (gx >= 8 && gx <= 10 && gy >= 8 && gy <= 9) return 'faculty';
  // Faculty Room 2
  if (gx >= 14 && gx <= 16 && gy >= 14 && gy <= 15) return 'faculty';
  // Detention Room
  if (gx >= 14 && gx <= 16 && gy >= 8 && gy <= 9) return 'detention';
  // Janitor Closet
  if (gx >= 8 && gx <= 10 && gy >= 14 && gy <= 15) return 'janitor';
  // Cafeteria
  if (gx >= 20 && gx <= 24 && gy >= 8 && gy <= 14) return 'cafeteria';
  // Exits
  if (
    (gx === 12 && gy === 0) ||
    (gx === 0 && gy === 11) ||
    (gx === 26 && gy === 11)
  ) {
    return 'exit';
  }
  // Classrooms
  if (gy <= 3 || gy >= 20 || (gx <= 3 && (gy >= 8 && gy <= 15))) {
    return 'classroom';
  }
  return 'hall';
}

export function getZoneDisplayName(x: number, y: number): string {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx <= 4 && gy <= 3) return 'Aula 101';
  if (gx >= 20 && gy <= 3) return 'Aula 102';
  if (gx <= 4 && gy >= 8 && gy <= 10) return 'Aula 103';
  if (gx <= 4 && gy >= 13 && gy <= 15) return 'Aula 104';
  if (gx <= 4 && gy >= 20) return 'Aula 105';
  if (gx >= 14 && gx <= 18 && gy >= 20) return 'Aula 106';
  if (gx >= 20 && gy >= 20) return 'Aula 107';
  if (gx >= 7 && gx <= 10 && gy <= 3) return 'Sala de Estudio';
  if (gx >= 15 && gx <= 18 && gy <= 3) return 'Biblioteca';
  if (gx >= 7 && gx <= 10 && gy >= 20) return 'Aula 108';
  if (gx >= 20 && gx <= 25 && gy >= 8 && gy <= 14) return 'Cafetería';
  if ((gx >= 8 && gx <= 10 && gy >= 8 && gy <= 9) || (gx >= 14 && gx <= 16 && gy >= 14 && gy <= 15)) {
    return 'Sala de Profesores';
  }
  if (gx >= 14 && gx <= 16 && gy >= 8 && gy <= 9) return 'Sala de Dirección';
  if (gx >= 8 && gx <= 10 && gy >= 14 && gy <= 15) return 'Conserjería';
  if (gy <= 6) return 'Pasillo Norte';
  if (gy >= 17) return 'Pasillo Sur';
  return 'Pasillo Central';
}

export function isWallTile(tile: TileType): boolean {
  return tile === 1 || tile === 2 || tile === 5 || tile === 6 || tile === 7 || tile === 9;
}

export function isDoorTile(tile: TileType): boolean {
  return tile === 3 || tile === 4 || tile === 8 || tile === 10;
}

export function isTileSolidForPlayer(
  gx: number,
  gy: number,
  doors: Map<string, DoorState>,
  redAlert: boolean,
  inDetention: boolean
): boolean {
  if (gx < 0 || gy < 0 || gx >= MAP_WIDTH || gy >= MAP_HEIGHT) return true;
  const tile = SCHOOL_GRID[gy][gx];
  if (tile === 0) return false;
  if (isWallTile(tile)) return true;
  if (isDoorTile(tile)) {
    const door = doors.get(`${gx},${gy}`);
    if (!door) return true;
    if (tile === 8) {
      // Exit doors open automatically once red alert is active
      return !redAlert;
    }
    if (tile === 10 && inDetention) {
      return true;
    }
    return door.openAmount < 0.65;
  }
  return true;
}

export function isTileWalkableForNpc(gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= MAP_WIDTH || gy >= MAP_HEIGHT) return false;
  const tile = SCHOOL_GRID[gy][gx];
  if (tile === 0) return true;
  // NPCs can walk through classroom, faculty, and detention doors, but not sealed exits
  return tile === 3 || tile === 4 || tile === 10;
}

/**
 * Grid BFS pathfinding returning the next tile center to step toward (tx, ty).
 */
export function findNextStepBFS(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): { x: number; y: number } {
  const sx = Math.floor(fromX);
  const sy = Math.floor(fromY);
  const gx = Math.floor(toX);
  const gy = Math.floor(toY);

  if (sx === gx && sy === gy) return { x: toX, y: toY };

  const visited = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
  const parent = new Int16Array(MAP_WIDTH * MAP_HEIGHT).fill(-1);
  const queue: number[] = [];

  const startIdx = sy * MAP_WIDTH + sx;
  const goalIdx = gy * MAP_WIDTH + gx;
  visited[startIdx] = 1;
  queue.push(startIdx);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let found = false;
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (curr === goalIdx) {
      found = true;
      break;
    }
    const cx = curr % MAP_WIDTH;
    const cy = Math.floor(curr / MAP_WIDTH);
    for (let i = 0; i < 4; i++) {
      const nx = cx + dirs[i][0];
      const ny = cy + dirs[i][1];
      if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
      const nIdx = ny * MAP_WIDTH + nx;
      if (visited[nIdx]) continue;
      if (!isTileWalkableForNpc(nx, ny) && nIdx !== goalIdx) continue;
      visited[nIdx] = 1;
      parent[nIdx] = curr;
      queue.push(nIdx);
    }
  }

  if (!found) {
    return { x: toX, y: toY };
  }

  // Backtrack from goal to find immediate neighbor of start
  let step = goalIdx;
  while (parent[step] !== -1 && parent[step] !== startIdx) {
    step = parent[step];
  }
  return {
    x: (step % MAP_WIDTH) + 0.5,
    y: Math.floor(step / MAP_WIDTH) + 0.5,
  };
}

/**
 * Checks line-of-sight between two points (blocked by solid walls & closed doors).
 */
export function hasLineOfSight(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  doors?: Map<string, DoorState>
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist * 6);
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = Math.floor(x0 + dx * t);
    const py = Math.floor(y0 + dy * t);
    if (px < 0 || py < 0 || px >= MAP_WIDTH || py >= MAP_HEIGHT) return false;
    const tile = SCHOOL_GRID[py][px];
    if (isWallTile(tile)) return false;
    if (isDoorTile(tile) && doors) {
      const d = doors.get(`${px},${py}`);
      if (d && d.openAmount < 0.5) return false;
    }
  }
  return true;
}

export const HALLWAY_WAYPOINTS: { x: number; y: number }[] = [
  { x: 5.5, y: 5.5 },
  { x: 12.5, y: 5.5 },
  { x: 19.5, y: 5.5 },
  { x: 12.5, y: 11.5 },
  { x: 5.5, y: 11.5 },
  { x: 19.5, y: 11.5 },
  { x: 5.5, y: 17.5 },
  { x: 12.5, y: 17.5 },
  { x: 19.5, y: 17.5 },
  { x: 22.5, y: 11.5 },
  { x: 22.5, y: 14.5 },
  { x: 24.0, y: 9.0 },
];

export const BULLY_CORRIDOR_SPOTS: { x: number; y: number }[] = [
  { x: 12.5, y: 5.5 },
  { x: 6.5, y: 11.5 },
  { x: 18.5, y: 11.5 },
  { x: 12.5, y: 17.5 },
  { x: 20.5, y: 5.5 },
  { x: 5.5, y: 17.5 },
];
