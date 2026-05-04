import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { devices } from '../devices';
import type { RenderResult } from '../../shared/types';

export function createRenderResult(_device: string): RenderResult {
  const profile = devices.getProfile(_device);
  const { width, height } = profile;

  const solid = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 192, g: 192, b: 192 },
    },
  });

  const png = solid.png().toBuffer() as unknown as Uint8Array;
  const hash = createHash('sha256').update(png).digest('hex').slice(0, 16);

  return {
    png,
    etag: `"${hash}"`,
    touchmap: [],
    pageId: profile.startPageId,
    width,
    height,
  };
}
