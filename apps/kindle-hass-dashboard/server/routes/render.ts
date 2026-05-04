import { render } from '../renderer';
import { getEntities } from '../hass';
import type { RenderResult } from '../../shared/types';

export async function createRenderResult(device: string): Promise<RenderResult> {
  const entities = getEntities();
  return render(device, entities);
}
