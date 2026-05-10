import { renderPng } from '../renderer';
import { getEntities } from '../hass';
import type { RenderResult } from '../../shared/types';

export async function servePng(): Promise<RenderResult> {
  return renderPng(getEntities());
}
