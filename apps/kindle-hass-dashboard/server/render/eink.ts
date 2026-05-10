import sharp from 'sharp';

const GREY_LEVELS = 16;
const STEP = Math.floor(255 / (GREY_LEVELS - 1));

function quantize(val: number): number {
  const level = Math.round(val / STEP);
  return Math.min(GREY_LEVELS - 1, Math.max(0, level)) * STEP;
}

export async function ditherToEink(png: Uint8Array): Promise<Uint8Array> {
  const raw = await sharp(png).raw().toBuffer();
  const meta = await sharp(png).metadata();

  if (!meta.width || !meta.height) {
    throw new Error('Could not read PNG dimensions');
  }

  const { width, height } = meta;
  const channels = meta.channels ?? 3;
  const pixels = new Uint8Array(raw);
  const rowStride = width * channels;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * rowStride + x * channels;
      const oldR = pixels[idx]!;
      const oldG = pixels[idx + 1]!;
      const oldB = pixels[idx + 2]!;
      const oldL = Math.round(0.299 * oldR + 0.587 * oldG + 0.114 * oldB);
      const newL = quantize(oldL);
      const err = oldL - newL;

      pixels[idx] = newL;
      pixels[idx + 1] = newL;
      pixels[idx + 2] = newL;

      const distribute = (dx: number, dy: number, weight: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = ny * rowStride + nx * channels;
          const val = Math.min(255, Math.max(0, pixels[ni]! + err * weight));
          pixels[ni] = val;
          pixels[ni! + 1] = val;
          pixels[ni! + 2] = val;
        }
      };

      distribute(1, 0, 7 / 16);
      distribute(-1, 1, 3 / 16);
      distribute(0, 1, 5 / 16);
      distribute(1, 1, 1 / 16);
    }
  }

  // Pack into a single-channel grayscale buffer. eips on the Kindle expects
  // 8-bit grayscale PNGs (matches the framebuffer's bits_per_pixel: 8,
  // grayscale: 1). Feeding it RGBA causes a horizontal stretch because the
  // decoded channel layout doesn't match what eips writes into the FB.
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      gray[y * width + x] = pixels[y * rowStride + x * channels]!;
    }
  }

  return sharp(gray, {
    raw: { width, height, channels: 1 },
  })
    .toColourspace('b-w')
    .png()
    .toBuffer() as unknown as Uint8Array;
}
