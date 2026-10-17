import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Pure Node.js PNG encoder without external dependencies
function createPNG(width, height, getPixelRGBA) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC table for PNG chunks
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw image data with 1 filter byte (0 = None) per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Function to draw the Safar India Cabs icon (Amber rounded background with car silhouette)
function renderSafarIconPixel(x, y, width, height, isMaskable = false) {
  // Normalize coords to [-1, 1]
  const nx = (x / width) * 2 - 1;
  const ny = (y / height) * 2 - 1;

  // Background colors: Brand Amber #F59E0B -> [245, 158, 11]
  const amber = [245, 158, 11, 255];
  const darkBg = [9, 13, 22, 255]; // #090D16
  const white = [248, 250, 252, 255]; // #F8FAFC
  const black = [15, 23, 42, 255]; // #0F172A

  // For maskable, full bleed amber background; for non-maskable, rounded rectangle with corner radius ~0.22
  if (!isMaskable) {
    const cornerRadius = 0.28;
    const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
    const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
    const distFromCorner = Math.sqrt(qx * qx + qy * qy);
    if (distFromCorner > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outside rounded rect
    }
  }

  // Scale inside icon: for maskable scale is 0.65 to fit in safe zone; for standard scale is 0.78
  const scale = isMaskable ? 0.62 : 0.74;
  const cx = nx / scale;
  const cy = (ny + (isMaskable ? 0.02 : 0.02)) / scale; // slight vertical center

  // Car geometry bounds
  // Car roof/windshield: y from -0.38 to -0.05
  // Car body: y from -0.05 to +0.40
  // Wheels: cy around +0.42

  // Cab Roof & Windshield
  if (cy >= -0.38 && cy <= -0.05) {
    // Trapezoid roof: top width 0.35, bottom width 0.62
    const t = (cy - (-0.38)) / 0.33; // 0 at top, 1 at bottom
    const halfWidth = 0.30 + t * 0.32;
    if (Math.abs(cx) <= halfWidth) {
      // Windshield inner glass
      const innerT = (cy - (-0.34)) / 0.26;
      if (cy >= -0.33 && cy <= -0.08) {
        const innerHalfWidth = 0.24 + innerT * 0.28;
        if (Math.abs(cx) <= innerHalfWidth) {
          return white; // Windshield glass
        }
      }
      return black; // Cab roof frame
    }
  }

  // Taxi Sign on roof
  if (cy >= -0.48 && cy < -0.38 && Math.abs(cx) <= 0.18) {
    if (cy >= -0.46 && cy <= -0.40 && Math.abs(cx) <= 0.15) {
      return amber; // "TAXI" sign inner
    }
    return black;
  }

  // Main Car Body
  if (cy > -0.05 && cy <= 0.38) {
    // Body width is 0.72 with rounded bottom edges
    if (Math.abs(cx) <= 0.72) {
      // Headlights: circles at cx = +/- 0.48, cy = +0.12
      const leftLightDist = Math.hypot(cx - (-0.46), cy - 0.14);
      const rightLightDist = Math.hypot(cx - 0.46, cy - 0.14);
      if (leftLightDist < 0.085 || rightLightDist < 0.085) {
        return amber; // Glowing amber headlights
      }

      // Radiator Grille in center: cy from 0.10 to 0.24, Math.abs(cx) <= 0.28
      if (cy >= 0.10 && cy <= 0.24 && Math.abs(cx) <= 0.26) {
        const line = Math.floor((cy - 0.10) / 0.035) % 2;
        return line === 0 ? [51, 65, 85, 255] : white; // Chrome horizontal grill slats
      }

      // Front bumper
      if (cy >= 0.28 && cy <= 0.36 && Math.abs(cx) <= 0.65) {
        return [30, 41, 59, 255]; // Dark slate bumper
      }

      return black; // Cab body
    }
  }

  // Wheels / Tyres at cy = +0.38 to +0.48
  if (cy > 0.30 && cy <= 0.50) {
    const leftWheelDist = Math.hypot(cx - (-0.48), cy - 0.38);
    const rightWheelDist = Math.hypot(cx - 0.48, cy - 0.38);
    if (leftWheelDist < 0.12 || rightWheelDist < 0.12) {
      if (leftWheelDist < 0.05 || rightWheelDist < 0.05) {
        return [148, 163, 184, 255]; // Silver wheel hub
      }
      return [15, 23, 42, 255]; // Black rubber tyre
    }
  }

  return amber; // Amber background
}

const publicDir = path.resolve('public');

const sizes = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { name, size, maskable } of sizes) {
  const pngBuf = createPNG(size, size, (x, y, w, h) => renderSafarIconPixel(x, y, w, h, maskable));
  const outPath = path.join(publicDir, name);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${name} (${size}x${size}, ${pngBuf.length} bytes)`);
}
