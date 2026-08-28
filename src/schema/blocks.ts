import { z } from "zod"

export const MAX_BLOCKS = 20
export const MAX_OPTION_CARDS = 10
export const MAX_STEPS = 50
export const MAX_TABLE_ROWS = 100

export const blockIdSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/, "id must match [a-zA-Z][a-zA-Z0-9_-]{0,63}")

export const infoBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    text: z.string().min(1).max(300),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1).max(4_000),
  }),
  z.object({
    type: z.literal("markdown"),
    markdown: z.string().min(1).max(20_000),
  }),
  z.object({
    type: z.literal("callout"),
    variant: z.enum(["info", "warn", "success"]),
    text: z.string().min(1).max(2_000),
  }),
  z.object({
    type: z.literal("steps"),
    items: z.array(z.string().min(1).max(1_000)).min(1).max(MAX_STEPS),
  }),
  z.object({
    type: z.literal("option_card"),
    id: blockIdSchema,
    title: z.string().min(1).max(200),
    description: z.string().max(2_000).optional(),
    meta: z.string().max(200).optional(),
  }),
  z
    .object({
      type: z.literal("table"),
      headers: z.array(z.string().min(1).max(100)).min(1).max(12),
      rows: z.array(z.array(z.string().max(500)).max(12)).max(MAX_TABLE_ROWS),
    })
    .refine((t) => t.rows.every((row) => row.length === t.headers.length), {
      message: "every table row must have the same number of cells as headers",
    }),
  z.object({
    type: z.literal("divider"),
  }),
])

export type InfoBlock = z.infer<typeof infoBlockSchema>
