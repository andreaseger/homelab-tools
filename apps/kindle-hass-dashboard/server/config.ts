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

export const deviceProfileSchema = z.object({
  id: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.enum(['0', '90', '180', '270']).transform(Number).optional(),
  startPageId: z.string().min(1),
});

export function validatePages(data: unknown) {
  return z.array(pageConfigSchema).parse(data);
}

export function validateDevices(data: unknown) {
  return z.array(deviceProfileSchema).parse(data);
}
