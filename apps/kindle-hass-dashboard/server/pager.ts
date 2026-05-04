import type { ActionHotZone, Action } from '../shared/types';

export function resolveTap(
  hotzones: ActionHotZone[],
  x: number,
  y: number
): Action {
  for (let i = hotzones.length - 1; i >= 0; i--) {
    const zone = hotzones[i]!;
    if (
      x >= zone.bbox.x &&
      x < zone.bbox.x + zone.bbox.w &&
      y >= zone.bbox.y &&
      y < zone.bbox.y + zone.bbox.h
    ) {
      return zone.action;
    }
  }
  return { kind: 'noop' };
}
