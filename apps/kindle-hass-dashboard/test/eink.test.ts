import { test, expect, describe } from 'bun:test';
import { ditherToEink } from '../server/render/eink';
import sharp from 'sharp';

describe('ditherToEink', () => {
  async function createTestPNG(
    width: number,
    height: number,
    r: number,
    g: number,
    b: number
  ): Promise<Uint8Array> {
    const pixels = new Uint8Array(width * height * 3);
    for (let i = 0; i < pixels.length; i += 3) {
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
    return (await sharp(pixels, { raw: { width, height, channels: 3 } })
      .png()
      .toBuffer()) as unknown as Uint8Array;
  }

  test('valid PNG returns dithered PNG', async () => {
    const input = await createTestPNG(10, 10, 128, 128, 128);
    const output = await ditherToEink(input);
    expect(output).toBeInstanceOf(Uint8Array);
    expect(output.length).toBeGreaterThan(0);
  });

  test('white input returns valid PNG', async () => {
    const input = await createTestPNG(4, 4, 255, 255, 255);
    const output = await ditherToEink(input);
    expect(output).toBeInstanceOf(Uint8Array);
  });

  test('black input returns valid PNG', async () => {
    const input = await createTestPNG(4, 4, 0, 0, 0);
    const output = await ditherToEink(input);
    expect(output).toBeInstanceOf(Uint8Array);
  });

  test('1x1 pixel works', async () => {
    const input = await createTestPNG(1, 1, 100, 100, 100);
    const output = await ditherToEink(input);
    expect(output).toBeInstanceOf(Uint8Array);
  });
});
