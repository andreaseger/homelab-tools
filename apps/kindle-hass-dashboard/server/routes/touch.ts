export async function handleTouch(_body: unknown): Promise<{ status: number; body: unknown }> {
  return { status: 200, body: { ok: true } };
}
