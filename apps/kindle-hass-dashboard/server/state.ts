import type { ActionHotZone } from '../shared/types';
import { dashboard } from '../config/dashboard';

export interface DashboardState {
  width: number;
  height: number;
  currentPage: string;
  currentEtag: string | null;
  touchmap: ActionHotZone[];
  lastRenderAt: number;
  paused: boolean;
}

export const state: DashboardState = {
  width: dashboard.width,
  height: dashboard.height,
  currentPage: dashboard.startPageId,
  currentEtag: null,
  touchmap: [],
  lastRenderAt: 0,
  paused: false,
};

export function setPage(pageId: string): void {
  state.currentPage = pageId;
}

export function setPaused(paused: boolean): void {
  state.paused = paused;
}
