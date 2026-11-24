/**
 * Procedural 90s Edutainment Texture & Mixed-Media Sprite Atlas.
 * Applies authentic 4x4 Bayer Ordered Dithering (256-color retro PC aesthetic)
 * while giving every NPC its own deliberately clashing 90s artistic medium:
 * - Profesor Baldo: Pre-rendered Anim8or 3D CGI smooth Gouraud cylinders/spheres + yellow wooden ruler
 * - Director: High-contrast grainy cutout 90s webcam photo silhouette + wagging finger
 * - Niña de la Cuerda: Jagged MS-Paint child crayon scribble + swinging jump rope
 * - El Abusón: Chunky shaded 3D CGI orange egg torso + dark-blue cylinder limbs
 * - La Escoba Gigante: Cutout real-photo green-handled wide push broom
 */

export interface PixelSurface {
  width: number;
  height: number;
  data: Uint32Array; // ABGR little-endian packed pixels for blazing-fast framebuffer copies
  canvas: HTMLCanvasElement;
}

export type SpriteKey =
  | 'baldi_calm'
  | 'baldi_angry'
  | 'baldi_slap'
  | 'principal'
  | 'playtime_a'
  | 'playtime_b'
  | 'bully'
  | 'sweep'
  | 'notebook'
  | 'coffee'
  | 'energy'
  | 'scissors'
  | 'oil'
  | 'coffee_wave';

export interface AssetAtlas {
  walls: Record<number, PixelSurface>;
  floor: PixelSurface;
  ceiling: PixelSurface;
  sprites: Record<SpriteKey, PixelSurface>;
  spriteDataUrls: Record<SpriteKey, string>;
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Applies subtle 90s 256-color ordered Bayer dithering to a canvas, preserving alpha transparency.
 */
function applyRetroDither(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  levels = 10,
  strength = 14
): PixelSurface {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const step = 255 / (levels - 1);

  for (let y = 0; y < h; y++) {
    const bRow = BAYER_4X4[y & 3];
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = d[idx + 3];
      if (a < 110) {
        d[idx + 3] = 0;
        continue;
      }
      d[idx + 3] = 255;
      const threshold = (bRow[x & 3] / 16 - 0.5) * strength;
      for (let c = 0; c < 3; c++) {
        const v = Math.max(0, Math.min(255, d[idx + c] + threshold));
        d[idx + c] = Math.round(Math.round(v / step) * step);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const u32 = new Uint32Array(img.data.buffer);
  return { width: w, height: h, data: u32, canvas: ctx.canvas };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// ======================= WALL / FLOOR / CEILING TEXTURES (64x64) =======================

function buildHallwayWall(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Warm 90s school plaster upper wall
  ctx.fillStyle = '#f2ede0';
  ctx.fillRect(0, 0, 64, 64);
  // Subtle brick/panel texture
  ctx.fillStyle = '#e7dfd0';
  for (let y = 4; y < 38; y += 8) {
    ctx.fillRect(0, y, 64, 1);
    const off = (y / 8) % 2 === 0 ? 0 : 12;
    for (let x = off; x < 64; x += 24) {
      ctx.fillRect(x, y, 1, 8);
    }
  }
  // Top ceiling molding
  ctx.fillStyle = '#c8bfae';
  ctx.fillRect(0, 0, 64, 3);
  // Iconic schoolhouse teal-green lower wainscoting
  ctx.fillStyle = '#4e9c7a';
  ctx.fillRect(0, 39, 64, 21);
  ctx.fillStyle = '#38765b';
  ctx.fillRect(0, 38, 64, 2);
  for (let x = 0; x < 64; x += 16) {
    ctx.fillStyle = '#3e8466';
    ctx.fillRect(x, 40, 1, 20);
    ctx.fillStyle = '#62b390';
    ctx.fillRect(x + 1, 40, 1, 20);
  }
  // Dark wooden baseboard
  ctx.fillStyle = '#4c3626';
  ctx.fillRect(0, 60, 64, 4);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildClassroomWall(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#eef4e6';
  ctx.fillRect(0, 0, 64, 64);
  // Classic green chalkboard mounted on wall
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(6, 12, 52, 30);
  ctx.fillStyle = '#1b4d34';
  ctx.fillRect(9, 15, 46, 24);
  // Chalk formulas ("∬ f dA")
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px serif';
  ctx.fillText('∬ f dA', 13, 30);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(14, 34, 24, 1);
  // Chalk tray
  ctx.fillStyle = '#c28b4e';
  ctx.fillRect(6, 41, 52, 3);
  // Lower yellow-cream wainscot
  ctx.fillStyle = '#d9c78f';
  ctx.fillRect(0, 48, 64, 12);
  ctx.fillStyle = '#4b3726';
  ctx.fillRect(0, 60, 64, 4);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildClassroomDoor(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Dark wood frame
  ctx.fillStyle = '#3f2a1d';
  ctx.fillRect(0, 0, 64, 64);
  // Classic Baldi bright yellow-ochre swinging classroom door
  ctx.fillStyle = '#eab308';
  ctx.fillRect(5, 4, 54, 60);
  // Recessed panels
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(10, 36, 44, 22);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(12, 38, 40, 18);
  // Blue door window with sky reflection
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(16, 10, 32, 18);
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(18, 12, 28, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(20, 14, 5, 10);
  // Classroom number plaque ("AULA")
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(20, 30, 24, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 32, 16, 1);
  // Brass handle
  ctx.fillStyle = '#78350f';
  ctx.fillRect(49, 34, 6, 8);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(50, 36, 4, 3);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildFacultyDoor(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#291515';
  ctx.fillRect(0, 0, 64, 64);
  // Bold orange-red prohibited door ("SOLO PERSONAL")
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(5, 4, 54, 60);
  // Yellow-black warning stripe banner
  ctx.fillStyle = '#facc15';
  ctx.fillRect(8, 25, 48, 12);
  ctx.fillStyle = '#18181b';
  for (let x = 8; x < 54; x += 8) {
    ctx.fillRect(x, 25, 3, 12);
  }
  // Red "NO!" badge
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(18, 27, 28, 8);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('STAFF', 21, 33);
  // Frosted window
  ctx.fillStyle = '#334155';
  ctx.fillRect(18, 8, 28, 13);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(20, 10, 24, 9);
  // Silver handle
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(48, 41, 6, 4);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildLockersWall(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#e8e2d3';
  ctx.fillRect(0, 0, 64, 64);
  // 4 classic blue-steel school lockers
  for (let i = 0; i < 4; i++) {
    const x = i * 16;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x + 1, 10, 14, 50);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + 2, 11, 11, 48);
    // Top louver vents
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(x + 4, 15, 8, 2);
    ctx.fillRect(x + 4, 19, 8, 2);
    ctx.fillRect(x + 4, 23, 8, 2);
    // Silver handle & lock dial
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x + 10, 34, 3, 6);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 11, 35, 1, 2);
  }
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 60, 64, 4);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildCafeteriaWall(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, 64, 64);
  // Pastel retro cafeteria checkered tiles
  for (let y = 28; y < 60; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#fca5a5' : '#fef3c7';
      ctx.fillRect(x, y, 8, 8);
    }
  }
  // Red cafe trim & awning stripes
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 24, 64, 4);
  for (let x = 0; x < 64; x += 16) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, 0, 8, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 8, 0, 8, 12);
  }
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 60, 64, 4);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildDetentionWall(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Gloomy grey cinderblock wall
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#475569';
  for (let y = 0; y < 64; y += 8) {
    ctx.fillRect(0, y, 64, 1);
    const off = (y / 8) % 2 === 0 ? 0 : 8;
    for (let x = off; x < 64; x += 16) {
      ctx.fillRect(x, y, 1, 8);
    }
  }
  // School rules paper taped to wall
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(18, 16, 28, 26);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(21, 19, 22, 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(21, 26, 20, 2);
  ctx.fillRect(21, 31, 18, 2);
  ctx.fillRect(21, 36, 22, 2);
  return applyRetroDither(ctx, 64, 64, 10, 12);
}

function buildExitDoor(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 64, 64);
  // Bold emergency crimson double doors
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(4, 14, 27, 50);
  ctx.fillRect(33, 14, 27, 50);
  // Glowing white/red EXIT header sign
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8, 3, 48, 10);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('SALIDA', 15, 11);
  // Silver panic push bars
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(7, 36, 21, 4);
  ctx.fillRect(36, 36, 21, 4);
  // Small wired windows
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(12, 18, 12, 13);
  ctx.fillRect(40, 18, 12, 13);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildPosterWall(): PixelSurface {
  const base = buildHallwayWall();
  const [, ctx] = makeCanvas(64, 64);
  ctx.drawImage(base.canvas, 0, 0);
  // Corkboard / 90s Math Poster ("NO CORRER!" + integral poster)
  ctx.fillStyle = '#92400e';
  ctx.fillRect(10, 7, 44, 28);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(13, 10, 38, 22);
  // Green Baldo math poster graphic
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(15, 12, 15, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px serif';
  ctx.fillText('∬', 19, 25);
  // Red "NO CORRER" warning sheet
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(33, 12, 16, 6);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(34, 20, 14, 2);
  ctx.fillRect(34, 24, 12, 2);
  ctx.fillRect(34, 28, 14, 2);
  return applyRetroDither(ctx, 64, 64, 12, 10);
}

function buildDetentionDoor(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#475569';
  ctx.fillRect(5, 4, 54, 60);
  // Barred detention window
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 10, 32, 18);
  ctx.fillStyle = '#94a3b8';
  for (let x = 20; x <= 44; x += 6) {
    ctx.fillRect(x, 10, 2, 18);
  }
  ctx.fillStyle = '#facc15';
  ctx.fillRect(15, 32, 34, 7);
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 6px monospace';
  ctx.fillText('DETENCION', 16, 37);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(49, 43, 6, 4);
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildFloorTile(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Classic 90s school speckled checkered linoleum floor
  for (let y = 0; y < 64; y += 32) {
    for (let x = 0; x < 64; x += 32) {
      const even = ((x / 32) + (y / 32)) % 2 === 0;
      ctx.fillStyle = even ? '#d8d4c8' : '#c6c2b4';
      ctx.fillRect(x, y, 32, 32);
    }
  }
  // Subtle tile grout lines
  ctx.fillStyle = '#a8a293';
  ctx.fillRect(0, 0, 64, 1);
  ctx.fillRect(0, 32, 64, 1);
  ctx.fillRect(0, 0, 1, 64);
  ctx.fillRect(32, 0, 1, 64);
  // Speckled vinyl flecks
  for (let i = 0; i < 65; i++) {
    const px = (i * 37) % 63;
    const py = (i * 53) % 63;
    ctx.fillStyle = i % 2 === 0 ? '#edeae0' : '#9c9686';
    ctx.fillRect(px, py, 2, 1);
  }
  return applyRetroDither(ctx, 64, 64, 12, 8);
}

function buildCeilingTile(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, 64, 64);
  // Drop ceiling grid
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 0, 64, 2);
  ctx.fillRect(0, 0, 2, 64);
  ctx.fillRect(0, 32, 64, 1);
  ctx.fillRect(32, 0, 1, 64);
  // Fluorescent school ceiling light panel
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(14, 12, 36, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16, 14, 32, 12);
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(18, 16, 28, 8);
  return applyRetroDither(ctx, 64, 64, 12, 8);
}

// ======================= 90s MIXED-MEDIA NPC SPRITES (96x128) =======================

/**
 * 1. EL PROFESOR (Anim8or 90s Pre-Rendered 3D CGI Smooth-Shaded Cylinders & Spheres)
 */
function buildBaldiSprite(mode: 'calm' | 'angry' | 'slap'): PixelSurface {
  const [, ctx] = makeCanvas(96, 128);

  // Royal-blue CGI cylinder legs
  const drawCylinder = (x: number, y: number, w: number, h: number, c1: string, c2: string, c3: string) => {
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, c1);
    g.addColorStop(0.38, c2);
    g.addColorStop(1, c3);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };

  drawCylinder(35, 86, 11, 34, '#0c1d73', '#2563eb', '#09114a');
  drawCylinder(50, 86, 11, 34, '#0c1d73', '#2563eb', '#09114a');
  // Brown shoes
  ctx.fillStyle = '#4a2e16';
  ctx.fillRect(32, 118, 15, 7);
  ctx.fillRect(49, 118, 15, 7);

  // Iconic neon-green Anim8or cylindrical sweater torso
  const torsoGrad = ctx.createLinearGradient(28, 45, 68, 45);
  torsoGrad.addColorStop(0, '#0b5e14');
  torsoGrad.addColorStop(0.35, '#22e536');
  torsoGrad.addColorStop(0.75, '#15b825');
  torsoGrad.addColorStop(1, '#07450d');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.roundRect(29, 44, 38, 45, 8);
  ctx.fill();

  // Arms
  drawCylinder(16, 48, 14, 30, '#0a5211', '#22e536', '#0a5211');
  if (mode === 'slap') {
    // Arm swung inward slapping ruler!
    drawCylinder(54, 48, 22, 14, '#0a5211', '#22e536', '#0a5211');
  } else {
    drawCylinder(66, 48, 14, 30, '#0a5211', '#22e536', '#0a5211');
  }

  // Shaded sphere hands
  const drawSphere = (cx: number, cy: number, r: number) => {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#f8e6c8');
    g.addColorStop(0.65, '#cfa97a');
    g.addColorStop(1, '#6e5232');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawSphere(22, 79, 7);
  drawSphere(mode === 'slap' ? 68 : 74, mode === 'slap' ? 62 : 79, 7);

  // Wooden Ruler with inch markings (held vertically or mid-slap!)
  ctx.save();
  if (mode === 'slap') {
    ctx.translate(45, 66);
    ctx.rotate(-0.68);
  } else if (mode === 'angry') {
    ctx.translate(76, 52);
    ctx.rotate(0.12);
  } else {
    ctx.translate(78, 56);
    ctx.rotate(0.28);
  }
  const rulerGrad = ctx.createLinearGradient(-5, -34, 5, -34);
  rulerGrad.addColorStop(0, '#a16207');
  rulerGrad.addColorStop(0.5, '#facc15');
  rulerGrad.addColorStop(1, '#854d0e');
  ctx.fillStyle = rulerGrad;
  ctx.fillRect(-5, -34, 11, 56);
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1;
  ctx.strokeRect(-5, -34, 11, 56);
  // Ruler tick marks
  ctx.fillStyle = '#18181b';
  for (let y = -30; y < 20; y += 5) {
    ctx.fillRect(0, y, 5, 1.5);
  }
  ctx.restore();

  // Neck
  drawCylinder(42, 36, 12, 10, '#80613d', '#dfc096', '#694e30');

  // Iconic oval Anim8or CGI Head
  const headGrad = ctx.createRadialGradient(42, 17, 3, 48, 23, 21);
  headGrad.addColorStop(0, '#fff0d6');
  headGrad.addColorStop(0.55, '#d6b485');
  headGrad.addColorStop(1, '#6b5031');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(48, 22, 16, 19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Single iconic curved hair strand on top!
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(47, 4);
  ctx.quadraticCurveTo(53, -1, 59, 6);
  ctx.stroke();

  // Glossy oval eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(41, 18, 4.2, 5.2, 0, 0, Math.PI * 2);
  ctx.ellipse(55, 18, 4.2, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(41.5, 18.5, mode === 'calm' ? 2.4 : 1.9, 0, Math.PI * 2);
  ctx.arc(54.5, 18.5, mode === 'calm' ? 2.4 : 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#b99364';
  ctx.beginPath();
  ctx.ellipse(48, 24, 2.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows & Mouth (Friendly smile vs Angry scowl!)
  if (mode === 'calm') {
    ctx.strokeStyle = '#4a2e16';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(41, 13, 4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(55, 13, 4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Big red friendly smile
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(48, 27, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    // Furrowed angry V-brows
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(35, 11);
    ctx.lineTo(46, 15);
    ctx.moveTo(61, 11);
    ctx.lineTo(50, 15);
    ctx.stroke();

    // Menacing frowning red lips
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(48, 37, 8, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  }

  return applyRetroDither(ctx, 96, 128, 8, 16);
}

/**
 * 2. EL DIRECTOR (Grainy 90s Cutout Photo Collage Style with Pointing Finger)
 */
function buildPrincipalSprite(): PixelSurface {
  const [, ctx] = makeCanvas(96, 128);

  // Jeans (faded grainy blue-grey denim photo look)
  ctx.fillStyle = '#3b4961';
  ctx.fillRect(36, 76, 11, 44);
  ctx.fillRect(49, 76, 11, 44);
  ctx.fillStyle = '#2a3447';
  ctx.fillRect(41, 78, 3, 40);
  ctx.fillRect(54, 78, 3, 40);
  // Sneakers
  ctx.fillStyle = '#5c4b3c';
  ctx.fillRect(32, 119, 14, 6);
  ctx.fillRect(50, 119, 14, 6);

  // Dark charcoal-grey crewneck sweater (photo cutout roughness)
  ctx.fillStyle = '#33363d';
  ctx.fillRect(31, 38, 34, 40);
  ctx.fillStyle = '#474b54';
  ctx.fillRect(35, 41, 14, 34);
  ctx.fillStyle = '#22242a';
  ctx.fillRect(51, 41, 12, 34);

  // Right arm down
  ctx.fillStyle = '#2d3038';
  ctx.fillRect(63, 40, 10, 34);
  ctx.fillStyle = '#d49b7b';
  ctx.fillRect(65, 73, 7, 8);

  // Left arm raised wagging scolding finger ("¡NO CORRAS EN LOS PASILLOS!")
  ctx.fillStyle = '#33363d';
  ctx.beginPath();
  ctx.moveTo(32, 42);
  ctx.lineTo(15, 42);
  ctx.lineTo(15, 22);
  ctx.lineTo(24, 22);
  ctx.lineTo(24, 34);
  ctx.lineTo(32, 34);
  ctx.closePath();
  ctx.fill();

  // Pointing hand + index finger
  ctx.fillStyle = '#dba07e';
  ctx.fillRect(15, 16, 9, 8);
  ctx.fillRect(18, 7, 3.5, 10);

  // Cutout realistic-toned webcam photo head
  ctx.fillStyle = '#c98e6e';
  ctx.beginPath();
  ctx.ellipse(48, 22, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e3ae90';
  ctx.beginPath();
  ctx.ellipse(46, 20, 8, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Short brown hair
  ctx.fillStyle = '#4a3222';
  ctx.beginPath();
  ctx.ellipse(48, 10, 12, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(36, 9, 4, 7);
  ctx.fillRect(56, 9, 4, 7);

  // Photo-grain eyes & open scolding "O" mouth
  ctx.fillStyle = '#18181b';
  ctx.fillRect(42, 19, 3, 3);
  ctx.fillRect(51, 19, 3, 3);
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.ellipse(48, 29, 3.8, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Grainy 90s JPEG/scanner noise texture
  for (let i = 0; i < 240; i++) {
    const nx = 14 + ((i * 73) % 66);
    const ny = 8 + ((i * 41) % 114);
    const px = ctx.getImageData(nx, ny, 1, 1).data;
    if (px[3] > 0) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.16)';
      ctx.fillRect(nx, ny, 2, 2);
    }
  }

  return applyRetroDither(ctx, 96, 128, 7, 22);
}

/**
 * 3. LA NIÑA DE LA CUERDA (Rough MS-Paint Child Scribble 2D Style)
 */
function buildPlaytimeSprite(frame: 'a' | 'b'): PixelSurface {
  const [, ctx] = makeCanvas(96, 128);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Swinging jump rope behind/in front
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (frame === 'a') {
    // Rope arcing high above head
    ctx.moveTo(18, 76);
    ctx.quadraticCurveTo(48, 2, 78, 76);
  } else {
    // Rope sweeping low near shoes
    ctx.moveTo(18, 76);
    ctx.quadraticCurveTo(48, 125, 78, 76);
  }
  ctx.stroke();

  // Blue sketchy MS-Paint legs (kicking playfully!)
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(39, 96);
  ctx.lineTo(25, frame === 'a' ? 116 : 110);
  ctx.lineTo(34, frame === 'a' ? 120 : 114);
  ctx.lineTo(47, 96);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(50, 96);
  ctx.lineTo(54, 118);
  ctx.lineTo(64, 118);
  ctx.lineTo(58, 96);
  ctx.fill();

  // Brown scribble shoes
  ctx.fillStyle = '#92400e';
  ctx.fillRect(21, frame === 'a' ? 115 : 109, 12, 6);
  ctx.fillRect(54, 116, 13, 6);

  // Flat bright MS-Paint red dress triangle + sleeves
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(48, 52);
  ctx.lineTo(28, 98);
  ctx.lineTo(68, 98);
  ctx.closePath();
  ctx.fill();

  // Stick arms holding rope handles
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(39, 64);
  ctx.lineTo(20, 74);
  ctx.moveTo(57, 64);
  ctx.lineTo(76, 74);
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(19, 75, 4, 0, Math.PI * 2);
  ctx.arc(77, 75, 4, 0, Math.PI * 2);
  ctx.fill();

  // Scribbly peach circle head
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(48, 42, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wild black MS-Paint scribbled hair spikes!
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 24; i++) {
    const a = Math.PI + (i / 23) * Math.PI;
    const x1 = 48 + Math.cos(a) * 11;
    const y1 = 40 + Math.sin(a) * 10;
    const len = 8 + ((i * 7) % 10);
    const x2 = 48 + Math.cos(a + (i % 2 === 0 ? 0.18 : -0.18)) * (14 + len);
    const y2 = 38 + Math.sin(a) * (12 + len);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Big scribbled hollow/black eyes + wide grin
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(42, 41, 3.2, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(54, 41, 3.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(48, 46, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  return applyRetroDither(ctx, 96, 128, 8, 12);
}

/**
 * 4. EL ABUSÓN (It's a Bully — Chunky Pre-Rendered Orange Oval CGI Character)
 */
function buildBullySprite(): PixelSurface {
  const [, ctx] = makeCanvas(96, 128);

  // Royal-blue cylinder legs
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(32, 92, 9, 30);
  ctx.fillRect(55, 92, 9, 30);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(38, 92, 3, 30);
  ctx.fillRect(61, 92, 3, 30);

  // Blue bent stick-cylinder arms
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(22, 56);
  ctx.lineTo(10, 68);
  ctx.lineTo(14, 86);
  ctx.moveTo(74, 56);
  ctx.lineTo(86, 68);
  ctx.lineTo(82, 86);
  ctx.stroke();

  // Giant glossy shaded orange egg torso!
  const eggGrad = ctx.createRadialGradient(40, 56, 6, 48, 68, 34);
  eggGrad.addColorStop(0, '#fdba74');
  eggGrad.addColorStop(0.45, '#ea580c');
  eggGrad.addColorStop(1, '#7c2d12');
  ctx.fillStyle = eggGrad;
  ctx.beginPath();
  ctx.ellipse(48, 68, 28, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lumpy clay-CGI beige head
  const headGrad = ctx.createRadialGradient(44, 20, 3, 48, 24, 17);
  headGrad.addColorStop(0, '#f3d7b3');
  headGrad.addColorStop(0.6, '#b88e5e');
  headGrad.addColorStop(1, '#5c4125');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(48, 24, 15, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark brown hair tuft
  ctx.fillStyle = '#3f2311';
  ctx.beginPath();
  ctx.ellipse(48, 11, 12, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Squinting bully eyes & scowl
  ctx.fillStyle = '#18181b';
  ctx.fillRect(40, 21, 5, 3);
  ctx.fillRect(51, 21, 5, 3);
  ctx.fillRect(43, 31, 10, 3);

  return applyRetroDither(ctx, 96, 128, 8, 16);
}

/**
 * 5. LA ESCOBA GIGANTE (Gotta Sweep — Cutout Green-Handled Wide Push Broom)
 */
function buildSweepSprite(): PixelSurface {
  const [, ctx] = makeCanvas(96, 128);

  // Metallic green broom handle shaft
  const handleGrad = ctx.createLinearGradient(42, 6, 54, 6);
  handleGrad.addColorStop(0, '#064e3b');
  handleGrad.addColorStop(0.4, '#22c55e');
  handleGrad.addColorStop(0.75, '#15803d');
  handleGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = handleGrad;
  ctx.fillRect(43, 6, 10, 92);

  // Handle cap & screw holes
  ctx.fillStyle = '#09090b';
  ctx.fillRect(46, 14, 4, 4);
  ctx.fillRect(43, 4, 10, 4);

  // Metal brace bracket
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(43, 86);
  ctx.lineTo(24, 98);
  ctx.lineTo(72, 98);
  ctx.lineTo(53, 86);
  ctx.closePath();
  ctx.fill();

  // Wide wooden broom block
  ctx.fillStyle = '#3f2a1d';
  ctx.fillRect(10, 96, 76, 9);
  ctx.fillStyle = '#166534';
  ctx.fillRect(12, 97, 72, 4);

  // Thick dark sweeping bristles (cutout jagged bottom!)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(7, 104, 82, 20);
  for (let x = 8; x < 88; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? '#3f3f46' : '#09090b';
    ctx.fillRect(x, 105, 2, 19 + ((x * 5) % 4));
  }

  return applyRetroDither(ctx, 96, 128, 8, 18);
}

// ======================= PICKUP & PROJECTILE SPRITES (64x64) =======================

function buildNotebookSprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(32, 57, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Vibrant blue-yellow spiral math notebook
  ctx.fillStyle = '#18181b';
  ctx.fillRect(15, 10, 36, 44);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(17, 12, 32, 40);
  // Spiral rings
  ctx.fillStyle = '#e2e8f0';
  for (let y = 14; y <= 48; y += 6) {
    ctx.fillRect(12, y, 6, 3);
  }
  // White title sticker with bold "∬"
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(22, 18, 22, 20);
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 16px serif';
  ctx.fillText('∬', 26, 34);
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildCoffeeSprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Foaming Café Expreso cup (BSODA vibe)
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(18, 20);
  ctx.lineTo(46, 20);
  ctx.lineTo(42, 54);
  ctx.lineTo(22, 54);
  ctx.closePath();
  ctx.fill();
  // Label sleeve
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(20, 30, 24, 12);
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('CAFE', 22, 39);
  // White lid + steam swirl
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16, 15, 32, 6);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(28, 9, 8, 6);
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildEnergySprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Bright yellow/red energy bar wrapper
  ctx.save();
  ctx.translate(32, 34);
  ctx.rotate(-0.32);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-24, -12, 48, 24);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-18, -9, 36, 18);
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('100%', -12, 3);
  ctx.restore();
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildScissorsSprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Metallic scissor blades
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(24, 34);
  ctx.lineTo(48, 12);
  ctx.moveTo(24, 30);
  ctx.lineTo(50, 44);
  ctx.stroke();
  // Blue safety handles
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(17, 23, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(17, 42, 7, 0, Math.PI * 2);
  ctx.stroke();
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildOilSprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Teal WD-NoSquee spray can
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(21, 20, 22, 34);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(21, 28, 22, 14);
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('OIL', 24, 38);
  // Red nozzle & straw
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(25, 13, 14, 7);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(28, 9, 8, 5);
  ctx.fillRect(36, 10, 14, 2);
  return applyRetroDither(ctx, 64, 64, 10, 10);
}

function buildCoffeeWaveSprite(): PixelSurface {
  const [, ctx] = makeCanvas(64, 64);
  // Foaming espresso shockwave cloud
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
  g.addColorStop(0, '#fef3c7');
  g.addColorStop(0.45, '#b45309');
  g.addColorStop(0.85, '#451a03');
  g.addColorStop(1, 'rgba(69,26,3,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 27, 0, Math.PI * 2);
  ctx.fill();
  // Foam bubbles
  ctx.fillStyle = '#fffbeb';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(32 + Math.cos(a) * 16, 32 + Math.sin(a) * 16, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return applyRetroDither(ctx, 64, 64, 8, 14);
}

let cachedAtlas: AssetAtlas | null = null;

export function getAssetAtlas(): AssetAtlas {
  if (cachedAtlas) return cachedAtlas;

  const walls: Record<number, PixelSurface> = {
    1: buildHallwayWall(),
    2: buildClassroomWall(),
    3: buildClassroomDoor(),
    4: buildFacultyDoor(),
    5: buildLockersWall(),
    6: buildCafeteriaWall(),
    7: buildDetentionWall(),
    8: buildExitDoor(),
    9: buildPosterWall(),
    10: buildDetentionDoor(),
  };

  const sprites: Record<SpriteKey, PixelSurface> = {
    baldi_calm: buildBaldiSprite('calm'),
    baldi_angry: buildBaldiSprite('angry'),
    baldi_slap: buildBaldiSprite('slap'),
    principal: buildPrincipalSprite(),
    playtime_a: buildPlaytimeSprite('a'),
    playtime_b: buildPlaytimeSprite('b'),
    bully: buildBullySprite(),
    sweep: buildSweepSprite(),
    notebook: buildNotebookSprite(),
    coffee: buildCoffeeSprite(),
    energy: buildEnergySprite(),
    scissors: buildScissorsSprite(),
    oil: buildOilSprite(),
    coffee_wave: buildCoffeeWaveSprite(),
  };

  const spriteDataUrls = {} as Record<SpriteKey, string>;
  (Object.keys(sprites) as SpriteKey[]).forEach((k) => {
    spriteDataUrls[k] = sprites[k].canvas.toDataURL('image/png');
  });

  cachedAtlas = {
    walls,
    floor: buildFloorTile(),
    ceiling: buildCeilingTile(),
    sprites,
    spriteDataUrls,
  };
  return cachedAtlas;
}
