import { state } from '../state';

export function serveState(): Response {
  return Response.json({
    current_page: state.currentPage,
    paused: state.paused,
    last_render_at: state.lastRenderAt,
    width: state.width,
    height: state.height,
  });
}
