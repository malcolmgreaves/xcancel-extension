#!/usr/bin/env node

/**
 * Generates extension icons at 16x16, 48x48, and 128x128 pixels.
 * Uses only Node.js built-ins (zlib, fs, path) — no npm packages.
 *
 * Icon design: purple background (#6B21A8) with a white X and right-arrow.
 * Run once and commit the generated PNGs; re-run only if the design changes.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// CRC32 (polynomial 0xEDB88320, used in PNG chunk checksums)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---------------------------------------------------------------------------
// PNG chunk builder
// ---------------------------------------------------------------------------

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(db.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, db])));
  return Buffer.concat([lenBuf, tb, db, crcBuf]);
}

// ---------------------------------------------------------------------------
// Shape primitives
// ---------------------------------------------------------------------------

// Minimum distance from point (px,py) to line segment (ax,ay)→(bx,by)
function lineDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Point-in-triangle test (sign-of-cross-product method)
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

// ---------------------------------------------------------------------------
// Icon shape: returns true if sub-pixel (nx, ny) in [0,1]² is white
//
// Layout in centered coords cx,cy ∈ [-1,+1]:
//   Left ~57%:  X made of two crossing diagonals
//   Right ~40%: right-pointing arrow (shaft + triangular head)
// ---------------------------------------------------------------------------

function isWhite(nx, ny) {
  const cx = (nx - 0.5) * 2;  // map [0,1] → [-1,+1]
  const cy = (ny - 0.5) * 2;

  const xStrokeHW = 0.13; // X stroke half-width in icon coords

  // X: diagonal 1 (top-left → bottom-right)
  if (lineDist(cx, cy, -0.80, -0.72, 0.08, 0.72) < xStrokeHW) return true;
  // X: diagonal 2 (bottom-left → top-right)
  if (lineDist(cx, cy, -0.80, 0.72, 0.08, -0.72) < xStrokeHW) return true;

  // Arrow shaft (horizontal, slightly right of center)
  if (lineDist(cx, cy, 0.22, 0.0, 0.60, 0.0) < 0.15) return true;

  // Arrowhead triangle: tip (0.90, 0), base corners (0.55, ±0.52)
  if (inTriangle(cx, cy, 0.90, 0.0, 0.55, -0.52, 0.55, 0.52)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// PNG generator with 4× supersampling for smooth edges
// ---------------------------------------------------------------------------

function generatePNG(size) {
  const BG = [107, 33, 168]; // #6B21A8 — purple background
  const FG = [255, 255, 255]; // white foreground

  // One filter byte (0 = None) + R,G,B per pixel, per scanline
  const raw = Buffer.alloc(size * (1 + size * 3), 0);

  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter byte: None
    for (let x = 0; x < size; x++) {
      // 4× supersampling: sample at four sub-pixel offsets
      let coverage = 0;
      for (const ox of [0.25, 0.75]) {
        for (const oy of [0.25, 0.75]) {
          if (isWhite((x + ox) / size, (y + oy) / size)) coverage += 0.25;
        }
      }
      const r = Math.round(BG[0] + (FG[0] - BG[0]) * coverage);
      const g = Math.round(BG[1] + (FG[1] - BG[1]) * coverage);
      const b = Math.round(BG[2] + (FG[2] - BG[2]) * coverage);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }

  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), rest zeroed
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (no alpha)

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Write icons to all browser directories
// ---------------------------------------------------------------------------

const SIZES = [16, 48, 128];
const TARGETS = [
  path.join('chrome', 'icons'),
  path.join('firefox', 'icons'),
  path.join('edge', 'icons'),
  path.join('safari', 'Shared (Extension)', 'icons'),
];

let written = 0;
let failed = 0;

console.log('Generating XCancel extension icons...\n');

for (const size of SIZES) {
  const png = generatePNG(size);
  for (const rel of TARGETS) {
    const dir = path.join(ROOT, rel);
    const file = path.join(dir, `icon${size}.png`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, png);
      console.log(`  wrote  ${path.join(rel, `icon${size}.png`)}`);
      written++;
    } catch (err) {
      console.error(`  ERROR  ${path.join(rel, `icon${size}.png`)}: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\n${written} icons written, ${failed} errors.`);
process.exit(failed > 0 ? 1 : 0);
