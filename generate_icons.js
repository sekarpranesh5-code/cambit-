const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(2, 9); // color type 2 (Truecolor RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    const crc = calcCrc(combined);
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, combined, crcBuf]);
  }

  // CRC table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function calcCrc(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 per scanline
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      // Border color or inner background color
      const isBorder = (x < 16 || x > width - 16 || y < 16 || y > height - 16);
      if (isBorder) {
        rawData[pxOffset] = 249; // #f97316 (Orange)
        rawData[pxOffset + 1] = 115;
        rawData[pxOffset + 2] = 22;
      } else {
        rawData[pxOffset] = 15; // #0f172a (Dark Slate)
        rawData[pxOffset + 1] = 23;
        rawData[pxOffset + 2] = 42;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), createSolidPng(192, 192, 249, 115, 22));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), createSolidPng(512, 512, 249, 115, 22));
console.log('PWA PNG icons created successfully!');
