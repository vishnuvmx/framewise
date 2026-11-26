/**
 * Zero-dependency PNG icon generator for Framewise (16x16, 48x48, 128x128).
 * Flat architectural graphite tile with crisp white viewfinder frame and a single
 * drafting-blue center reticle — zero hue gradients or glows.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'icons');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function blendPixel(buf, width, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= width) return;
  const idx = (y * width + x) * 4;
  const srcA = clamp(a, 0, 1);
  if (srcA <= 0) return;
  const dstA = buf[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  buf[idx] = Math.round((r * srcA + buf[idx] * dstA * (1 - srcA)) / outA);
  buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
  buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
  buf[idx + 3] = Math.round(outA * 255);
}

function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = size * 0.05;
  const cx = size / 2;
  const cy = size / 2;
  const hw = size / 2 - pad;
  const hh = size / 2 - pad;
  const radius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Solid graphite tile (#141415) with subtle hairline edge (#2d2d30)
      const bgDist = roundedRectSDF(px, py, cx, cy, hw, hh, radius);
      const bgCov = clamp(0.5 - bgDist, 0, 1);
      if (bgCov > 0) {
        blendPixel(buf, size, x, y, 20, 20, 21, bgCov);
      }

      const borderCov = clamp(0.9 - Math.abs(bgDist + 0.6), 0, 1);
      if (borderCov > 0 && bgCov > 0) {
        blendPixel(buf, size, x, y, 237, 237, 237, borderCov * 0.14);
      }

      // Outer precision frame (clean white stroke, corner-bracket aesthetic)
      const frameHalf = size * 0.29;
      const frameDist = Math.abs(
        roundedRectSDF(px, py, cx, cy, frameHalf, frameHalf, size * 0.06)
      );
      const strokeW = Math.max(1.0, size * 0.065);
      // Leave small caliper gaps centered on each edge
      const gapHalf = size * 0.075;
      const inHorizGap = Math.abs(px - cx) < gapHalf && Math.abs(py - cy) > frameHalf * 0.6;
      const inVertGap = Math.abs(py - cy) < gapHalf && Math.abs(px - cx) > frameHalf * 0.6;
      const frameCov = clamp(strokeW * 0.5 + 0.5 - frameDist, 0, 1);
      if (frameCov > 0 && !inHorizGap && !inVertGap) {
        blendPixel(buf, size, x, y, 237, 237, 237, frameCov);
      }

      // Single drafting-blue center reticle square (#3b82f6)
      const coreDist = roundedRectSDF(px, py, cx, cy, size * 0.095, size * 0.095, size * 0.025);
      const coreCov = clamp(0.5 - coreDist, 0, 1);
      if (coreCov > 0) {
        blendPixel(buf, size, x, y, 59, 130, 246, coreCov);
      }
    }
  }

  return encodePNG(size, size, buf);
}

for (const size of [16, 48, 128]) {
  const png = renderIcon(size);
  const outPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${size}x${size}, ${png.length} bytes)`);
}
