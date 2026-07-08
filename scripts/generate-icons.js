#!/usr/bin/env node

/**
 * Placeholder icon generator for the XCancel Redirect extension.
 *
 * Draws a brand-colored rounded square with a white "X" and writes
 * icon16.png / icon48.png / icon128.png into every browser's icons/ dir.
 *
 * Dependency-free: builds valid PNGs by hand using the built-in zlib module.
 * Replace the generated PNGs with real artwork whenever you like.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.join(__dirname, '..');

// Each browser's icons directory.
const ICON_DIRS = [
  path.join(ROOT_DIR, 'chrome', 'icons'),
  path.join(ROOT_DIR, 'edge', 'icons'),
  path.join(ROOT_DIR, 'firefox', 'icons'),
  path.join(ROOT_DIR, 'safari', 'Shared (Extension)', 'icons'),
];

const SIZES = [16, 48, 128];

// Brand colors (RGB). Background is X-black; the glyph is white.
const BG = [21, 32, 43];
const FG = [255, 255, 255];

/**
 * Render the icon into a raw RGBA pixel buffer.
 * A rounded square background with a centered diagonal "X".
 */
function renderPixels(size) {
  const pixels = Buffer.alloc(size * size * 4);

  const radius = Math.round(size * 0.18); // corner radius
  const margin = Math.round(size * 0.22); // keep the X inset from edges
  // Stroke half-width of the X, scaled with size (min 1px).
  const half = Math.max(1, Math.round(size * 0.085));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = insideRoundedSquare(x, y, size, radius);
      const onGlyph = inside && onX(x, y, size, margin, half);

      let r;
      let g;
      let b;
      let a;
      if (!inside) {
        a = 0; // transparent outside the rounded square
        r = g = b = 0;
      } else if (onGlyph) {
        [r, g, b] = FG;
        a = 255;
      } else {
        [r, g, b] = BG;
        a = 255;
      }

      const i = (y * size + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }
  }

  return pixels;
}

/** True if (x, y) is within the rounded-square mask. */
function insideRoundedSquare(x, y, size, radius) {
  const max = size - 1;
  // Distance into each corner region; only corners are rounded.
  const dx = Math.min(x - radius, max - radius - x, 0);
  const dy = Math.min(y - radius, max - radius - y, 0);
  return dx * dx + dy * dy <= radius * radius;
}

/** True if (x, y) lies on either diagonal stroke of the "X". */
function onX(x, y, size, margin, half) {
  const lo = margin;
  const hi = size - 1 - margin;
  if (x < lo || x > hi || y < lo || y > hi) return false;

  const span = hi - lo;
  // Normalized 0..span coordinates within the drawable box.
  const u = x - lo;
  const v = y - lo;
  // Two diagonals: v == u  and  v == span - u.
  return Math.abs(v - u) <= half || Math.abs(v - (span - u)) <= half;
}

/** Encode a raw RGBA buffer as a PNG buffer. */
function encodePng(pixels, size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Add a filter-type byte (0 = none) at the start of every scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Build a PNG chunk (length + type + data + CRC32). */
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// CRC32 table + implementation (PNG uses the standard polynomial).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function main() {
  console.log('Generating placeholder icons...');

  // Pre-render each size once, then write to every browser dir.
  const pngs = {};
  for (const size of SIZES) {
    pngs[size] = encodePng(renderPixels(size), size);
  }

  for (const dir of ICON_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
    for (const size of SIZES) {
      const file = path.join(dir, `icon${size}.png`);
      fs.writeFileSync(file, pngs[size]);
    }
    console.log(`  Wrote icon16/48/128.png -> ${path.relative(ROOT_DIR, dir)}`);
  }

  console.log('Done.');
}

main();
