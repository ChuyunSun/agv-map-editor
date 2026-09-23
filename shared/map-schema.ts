import { z } from 'zod';

export const DIRECTIONS = ['North', 'East', 'South', 'West'] as const;

export const directionSchema = z.enum(DIRECTIONS);

const directedFeatureSchema = z.object({
  direction: directionSchema,
});

export const mapNodeSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  code: z.number().int(),
  directions: z.array(directionSchema).optional(),
  charger: directedFeatureSchema.optional(),
  chute: directedFeatureSchema.optional(),
  name: z.string().trim().min(1).optional(),
});

export const agvMapSchema = z.object({
  map: z.object({
    maxNeighborDistance: z.number().int().positive(),
    nodes: z.array(mapNodeSchema),
  }),
});

export type Direction = z.infer<typeof directionSchema>;
export type MapNode = z.infer<typeof mapNodeSchema>;
export type AgvMap = z.infer<typeof agvMapSchema>;

export function parseAgvMap(value: unknown): AgvMap {
  return agvMapSchema.parse(value);
}
