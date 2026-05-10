import { z } from 'zod';

const bboxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
});

const placedWidgetSchema = z.object({
  widget: z.string(),
  bbox: bboxSchema,
  config: z.unknown(),
});

export const pageConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  layout: z.array(placedWidgetSchema).min(1),
});

export function validatePages(data: unknown) {
  return z.array(pageConfigSchema).parse(data);
}
