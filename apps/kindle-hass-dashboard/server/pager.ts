import type { ActionHotZone, Action } from '../shared/types';

/** Touch tolerance in px — hot zones are expanded by this margin so
 *  imprecise Kindle touches still hit their target. Must stay smaller
 *  than the smallest gap between adjacent hot zones to avoid misclicks. */
const TOUCH_TOLERANCE = 16;

export function resolveTap(hotzones: ActionHotZone[], x: number, y: number): Action {
  for (let i = hotzones.length - 1; i >= 0; i--) {
    const zone = hotzones[i]!;
    if (
      x >= zone.bbox.x - TOUCH_TOLERANCE &&
      x < zone.bbox.x + zone.bbox.w + TOUCH_TOLERANCE &&
      y >= zone.bbox.y - TOUCH_TOLERANCE &&
      y < zone.bbox.y + zone.bbox.h + TOUCH_TOLERANCE
    ) {
      return zone.action;
    }
  }
  return { kind: 'noop' };
}
