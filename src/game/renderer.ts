import { MAP_HEIGHT, MAP_WIDTH, SCHOOL_GRID, isDoorTile } from './mapData';
import { AssetAtlas, PixelSurface, SpriteKey } from './sprites';
import {
  DoorState,
  ItemPickup,
  NotebookEntity,
  NpcEntity,
  PlayerState,
  ProjectileWave,
} from './types';

export interface Particle3D {
  active: boolean;
  x: number;
  y: number;
  z: number; // -0.5..0.5 vertical offset
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: number; // packed ABGR
  size: number;
}

interface RenderBillboard {
  x: number;
  y: number;
  sprite: PixelSurface;
  scaleX: number;
  scaleY: number;
  zOffset: number; // vertical shift in sprite height units
  distSq: number;
  flash: boolean;
}

export class RaycastRenderer {
  private bufCanvas: HTMLCanvasElement;
  private bufCtx: CanvasRenderingContext2D;
  private imgData: ImageData;
  private pixels: Uint32Array;
  private zBuffer: Float32Array;
  private width: number;
  private height: number;
  private atlas: AssetAtlas;

  constructor(atlas: AssetAtlas, internalW = 480, internalH = 270) {
    this.atlas = atlas;
    this.width = internalW;
    this.height = internalH;
    this.bufCanvas = document.createElement('canvas');
    this.bufCanvas.width = internalW;
    this.bufCanvas.height = internalH;
    this.bufCtx = this.bufCanvas.getContext('2d', { alpha: false })!;
    this.imgData = this.bufCtx.createImageData(internalW, internalH);
    this.pixels = new Uint32Array(this.imgData.data.buffer);
    this.zBuffer = new Float32Array(internalW);
  }

  public setResolution(w: number, h: number): void {
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.bufCanvas.width = w;
    this.bufCanvas.height = h;
    this.imgData = this.bufCtx.createImageData(w, h);
    this.pixels = new Uint32Array(this.imgData.data.buffer);
    this.zBuffer = new Float32Array(w);
  }

  /**
   * Renders full 2.5D raycasted scene (textured floor/ceiling, walls, sliding doors,
   * Z-buffered mixed-media billboard sprites, pooled 3D particles, and jump-rope overlay)
   * onto the target display canvas.
   */
  public render(
    targetCtx: CanvasRenderingContext2D,
    targetW: number,
    targetH: number,
    camera: { x: number; y: number; angle: number; bobY: number; shakeX: number; shakeY: number },
    doors: Map<string, DoorState>,
    npcs: NpcEntity[],
    notebooks: NotebookEntity[],
    pickups: ItemPickup[],
    waves: ProjectileWave[],
    particles: Particle3D[],
    redAlert: boolean,
    timeSec: number,
    baldiAnger: number,
    player: PlayerState | null
  ): void {
    const W = this.width;
    const H = this.height;
    const pixels = this.pixels;
    const zBuf = this.zBuffer;

    const dirX = Math.cos(camera.angle);
    const dirY = Math.sin(camera.angle);
    // Aspect-adaptive FOV plane so both 16:9 desktop and 9:19 portrait phones keep crisp 1:1 proportions
    const aspect = W / Math.max(1, H);
    const fovPlane = aspect < 1 ? Math.max(0.46, 0.68 * aspect * 1.18) : 0.68;
    const planeX = -dirY * fovPlane;
    const planeY = dirX * fovPlane;
    const projScale = aspect < 1 ? W * 0.92 : H;

    const pitchOffset = Math.round(camera.bobY + camera.shakeY);
    const halfH = (H >> 1) + pitchOffset;

    const redPulse = redAlert ? 0.5 + 0.5 * Math.sin(timeSec * 5.2) : 0;

    // 1. FLOOR & CEILING TEXTURED CASTING
    const floorData = this.atlas.floor.data;
    const ceilData = this.atlas.ceiling.data;
    const rayDirX0 = dirX - planeX;
    const rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX;
    const rayDirY1 = dirY + planeY;
    const posZ = 0.5 * projScale;

    for (let y = 0; y < H; y++) {
      const isFloor = y >= halfH;
      const p = isFloor ? y - halfH : halfH - y;
      const rowDist = p === 0 ? 100 : posZ / p;
      const floorStepX = (rowDist * (rayDirX1 - rayDirX0)) / W;
      const floorStepY = (rowDist * (rayDirY1 - rayDirY0)) / W;
      let floorX = camera.x + rowDist * rayDirX0;
      let floorY = camera.y + rowDist * rayDirY0;

      // Distance brightness shading (bright 90s schoolhouse with atmospheric depth)
      const shade = Math.max(0.26, Math.min(1.0, 1.08 - rowDist * 0.058));
      const shadeR = redAlert ? Math.min(1.25, shade * (1.1 + redPulse * 0.25)) : shade;
      const shadeG = redAlert ? shade * (0.58 - redPulse * 0.14) : shade;
      const shadeB = redAlert ? shade * (0.55 - redPulse * 0.14) : shade;

      const rowOff = y * W;
      const src = isFloor ? floorData : ceilData;

      for (let x = 0; x < W; x++) {
        const tx = (floorX * 64) & 63;
        const ty = (floorY * 64) & 63;
        floorX += floorStepX;
        floorY += floorStepY;

        const c = src[(ty << 6) + tx];
        const r = Math.min(255, ((c & 0xff) * shadeR) | 0);
        const g = Math.min(255, (((c >> 8) & 0xff) * shadeG) | 0);
        const b = Math.min(255, (((c >> 16) & 0xff) * shadeB) | 0);
        pixels[rowOff + x] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }

    // 2. WALL & SLIDING DOOR RAYCASTING (DDA)
    for (let x = 0; x < W; x++) {
      const cameraX = (2 * x) / W - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(camera.x);
      let mapY = Math.floor(camera.y);

      const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
      const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

      let stepX = 0;
      let stepY = 0;
      let sideDistX = 0;
      let sideDistY = 0;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (camera.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - camera.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (camera.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - camera.y) * deltaDistY;
      }

      let hit = false;
      let side = 0;
      let tile = 1;
      let doorOpenOffset = 0;
      let steps = 0;

      while (!hit && steps < 48) {
        steps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= MAP_WIDTH || mapY >= MAP_HEIGHT) {
          tile = 1;
          hit = true;
          break;
        }
        const t = SCHOOL_GRID[mapY][mapX];
        if (t > 0) {
          if (isDoorTile(t)) {
            const d = doors.get(`${mapX},${mapY}`);
            const openAmt = t === 8 && redAlert ? 1 : d ? d.openAmount : 0;
            if (openAmt >= 0.96) {
              // Fully open door: ray passes straight through!
              continue;
            }
            // Partially open door: check sliding texture offset
            const perpD = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
            let wallXCheck =
              side === 0
                ? camera.y + perpD * rayDirY
                : camera.x + perpD * rayDirX;
            wallXCheck -= Math.floor(wallXCheck);
            if (wallXCheck < openAmt) {
              continue;
            }
            doorOpenOffset = openAmt;
          }
          tile = t;
          hit = true;
        }
      }

      const perpWallDist = Math.max(
        0.08,
        side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY
      );
      zBuf[x] = perpWallDist;

      const lineHeight = Math.floor(projScale / perpWallDist);
      const rawStart = (-lineHeight >> 1) + halfH;
      const rawEnd = (lineHeight >> 1) + halfH;
      const drawStart = Math.max(0, rawStart);
      const drawEnd = Math.min(H - 1, rawEnd);

      let wallX =
        side === 0
          ? camera.y + perpWallDist * rayDirY
          : camera.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);
      if (doorOpenOffset > 0) {
        wallX = Math.max(0, Math.min(0.999, wallX - doorOpenOffset));
      }

      let texX = Math.floor(wallX * 64);
      if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
        texX = 63 - texX;
      }

      const wallTex = (this.atlas.walls[tile] || this.atlas.walls[1]).data;
      const texStep = 64 / Math.max(1, lineHeight);
      let texPos = (drawStart - rawStart) * texStep;

      // Directional side contrast + distance shading + red alert tint
      const sideShade = side === 1 ? 0.84 : 1.0;
      const distShade = Math.max(0.28, Math.min(1.0, 1.08 - perpWallDist * 0.052));
      const baseShade = sideShade * distShade;

      let shadeR = redAlert ? Math.min(1.3, baseShade * (1.12 + redPulse * 0.22)) : baseShade;
      let shadeG = redAlert ? baseShade * (0.64 - redPulse * 0.14) : baseShade;
      let shadeB = redAlert ? baseShade * (0.6 - redPulse * 0.14) : baseShade;

      // Highlight unlocked Exit doors brightly during Red Alert
      if (tile === 8 && redAlert) {
        shadeR = 1.35;
        shadeG = 0.95;
        shadeB = 0.95;
      }

      for (let y = drawStart; y <= drawEnd; y++) {
        const texY = (texPos | 0) & 63;
        texPos += texStep;
        const c = wallTex[(texY << 6) + texX];
        const r = Math.min(255, ((c & 0xff) * shadeR) | 0);
        const g = Math.min(255, (((c >> 8) & 0xff) * shadeG) | 0);
        const b = Math.min(255, (((c >> 16) & 0xff) * shadeB) | 0);
        pixels[y * W + x] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }

    // 3. COLLECT & Z-SORT BILLBOARD SPRITES
    const billboards: RenderBillboard[] = [];

    // Notebooks (floating/bobbing)
    const nbSprite = this.atlas.sprites.notebook;
    for (let i = 0; i < notebooks.length; i++) {
      const nb = notebooks[i];
      if (nb.collected) continue;
      const dx = nb.x - camera.x;
      const dy = nb.y - camera.y;
      billboards.push({
        x: nb.x,
        y: nb.y,
        sprite: nbSprite,
        scaleX: 0.56,
        scaleY: 0.56,
        zOffset: 0.16 + Math.sin(timeSec * 3.4 + nb.id) * 0.06,
        distSq: dx * dx + dy * dy,
        flash: false,
      });
    }

    // Boosters
    for (let i = 0; i < pickups.length; i++) {
      const item = pickups[i];
      if (item.collected) continue;
      const dx = item.x - camera.x;
      const dy = item.y - camera.y;
      billboards.push({
        x: item.x,
        y: item.y,
        sprite: this.atlas.sprites[item.type],
        scaleX: 0.48,
        scaleY: 0.48,
        zOffset: 0.24 + Math.sin(timeSec * 4.0 + item.id) * 0.04,
        distSq: dx * dx + dy * dy,
        flash: false,
      });
    }

    // Coffee espresso shockwaves
    for (let i = 0; i < waves.length; i++) {
      const wv = waves[i];
      const dx = wv.x - camera.x;
      const dy = wv.y - camera.y;
      billboards.push({
        x: wv.x,
        y: wv.y,
        sprite: this.atlas.sprites.coffee_wave,
        scaleX: 0.92,
        scaleY: 0.85,
        zOffset: 0.05,
        distSq: dx * dx + dy * dy,
        flash: false,
      });
    }

    // 5 Mixed-Media NPCs
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      if (!npc.active) continue;
      let key: SpriteKey = 'baldi_calm';
      let scaleX = 0.78;
      let scaleY = 0.98;
      let zOffset = 0.02;

      if (npc.id === 'baldi') {
        if (baldiAnger === 0) {
          key = 'baldi_calm';
        } else {
          key = npc.slapAnim > 0.35 ? 'baldi_slap' : 'baldi_angry';
        }
        scaleX = 0.82;
        scaleY = 1.04;
      } else if (npc.id === 'principal') {
        key = 'principal';
        scaleX = 0.78;
        scaleY = 1.0;
      } else if (npc.id === 'playtime') {
        key = Math.sin(timeSec * 8.5) > 0 ? 'playtime_a' : 'playtime_b';
        scaleX = 0.72;
        scaleY = 0.82;
        zOffset = 0.1;
      } else if (npc.id === 'bully') {
        key = 'bully';
        scaleX = 0.95;
        scaleY = 0.96;
      } else if (npc.id === 'sweep') {
        key = 'sweep';
        scaleX = 1.08;
        scaleY = 1.04;
      }

      const dx = npc.x - camera.x;
      const dy = npc.y - camera.y;
      billboards.push({
        x: npc.x,
        y: npc.y,
        sprite: this.atlas.sprites[key],
        scaleX,
        scaleY,
        zOffset,
        distSq: dx * dx + dy * dy,
        flash: npc.hitFlash > 0,
      });
    }

    // Far-to-near painter sort
    billboards.sort((a, b) => b.distSq - a.distSq);

    const invDet = 1.0 / (planeX * dirY - dirX * planeY);

    for (let i = 0; i < billboards.length; i++) {
      const b = billboards[i];
      const spriteX = b.x - camera.x;
      const spriteY = b.y - camera.y;

      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
      if (transformY <= 0.14) continue;

      const spriteScreenX = Math.floor((W / 2) * (1 + transformX / transformY));
      const vMove = Math.floor((b.zOffset * H) / transformY);

      const spriteH = Math.abs(Math.floor((H / transformY) * b.scaleY));
      const spriteW = Math.abs(Math.floor((H / transformY) * b.scaleX));

      const rawDrawStartY = (-spriteH >> 1) + halfH + vMove;
      const drawStartY = Math.max(0, rawDrawStartY);
      const drawEndY = Math.min(H - 1, (spriteH >> 1) + halfH + vMove);

      const rawDrawStartX = (-spriteW >> 1) + spriteScreenX;
      const drawStartX = Math.max(0, rawDrawStartX);
      const drawEndX = Math.min(W - 1, (spriteW >> 1) + spriteScreenX);

      const texW = b.sprite.width;
      const texH = b.sprite.height;
      const texData = b.sprite.data;

      const shade = Math.max(0.32, Math.min(1.0, 1.12 - transformY * 0.045));
      const sR = b.flash ? 1.8 : redAlert ? Math.min(1.25, shade * (1.1 + redPulse * 0.2)) : shade;
      const sG = b.flash ? 1.8 : redAlert ? shade * 0.72 : shade;
      const sB = b.flash ? 1.8 : redAlert ? shade * 0.68 : shade;

      for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
        if (transformY >= zBuf[stripe]) continue;
        const texX = Math.floor(((stripe - rawDrawStartX) * texW) / Math.max(1, spriteW));
        if (texX < 0 || texX >= texW) continue;

        for (let y = drawStartY; y <= drawEndY; y++) {
          const texY = Math.floor(((y - rawDrawStartY) * texH) / Math.max(1, spriteH));
          if (texY < 0 || texY >= texH) continue;
          const c = texData[texY * texW + texX];
          if (c >>> 24 === 0) continue; // transparent
          const r = Math.min(255, ((c & 0xff) * sR) | 0);
          const g = Math.min(255, (((c >> 8) & 0xff) * sG) | 0);
          const bl = Math.min(255, (((c >> 16) & 0xff) * sB) | 0);
          pixels[y * W + stripe] = 0xff000000 | (bl << 16) | (g << 8) | r;
        }
      }
    }

    // 4. POOLED 3D PARTICLES (Zero-GC)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      const tx = invDet * (dirY * sx - dirX * sy);
      const ty = invDet * (-planeY * sx + planeX * sy);
      if (ty <= 0.15) continue;
      const screenX = Math.floor((W / 2) * (1 + tx / ty));
      const screenY = Math.floor(halfH + (p.z * H) / ty);
      const rad = Math.max(1, Math.min(6, Math.floor((p.size * H) / (ty * 40))));
      if (screenX < 0 || screenX >= W || ty >= zBuf[screenX]) continue;

      for (let py = screenY - rad; py <= screenY + rad; py++) {
        if (py < 0 || py >= H) continue;
        const row = py * W;
        for (let px = screenX - rad; px <= screenX + rad; px++) {
          if (px < 0 || px >= W) continue;
          pixels[row + px] = p.color;
        }
      }
    }

    // Blit offscreen pixel buffer to display canvas with crisp 90s pixelated scaling
    this.bufCtx.putImageData(this.imgData, 0, 0);
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(
      this.bufCanvas,
      Math.round(camera.shakeX),
      0,
      targetW,
      targetH
    );

    // 5. FIRST-PERSON JUMP ROPE OVERLAY WHEN CAUGHT BY PLAYTIME
    if (player && player.jumpRopeActive) {
      const phase = player.jumpRopePhase;
      // Sine wave sweeps from top of screen down across bottom!
      const ropeY = targetH * (0.15 + Math.sin(phase * Math.PI) * 0.8);
      const inSweetSpot = phase >= 0.42 || phase <= 0.12;
      targetCtx.save();
      targetCtx.lineWidth = Math.max(5, targetH * 0.014);
      targetCtx.strokeStyle = inSweetSpot ? '#22c55e' : '#ef4444';
      targetCtx.beginPath();
      targetCtx.moveTo(0, targetH * 0.52);
      targetCtx.quadraticCurveTo(targetW * 0.5, ropeY, targetW, targetH * 0.52);
      targetCtx.stroke();
      targetCtx.lineWidth = Math.max(2, targetH * 0.005);
      targetCtx.strokeStyle = '#ffffff';
      targetCtx.stroke();
      targetCtx.restore();
    }

    // 6. HIT FLASH OVERLAY
    if (player && player.hitFlash > 0) {
      targetCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.45, player.hitFlash * 2)})`;
      targetCtx.fillRect(0, 0, targetW, targetH);
    }
  }
}
