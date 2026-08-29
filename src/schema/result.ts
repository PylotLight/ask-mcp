import { z } from "zod"
import { blockIdSchema } from "./blocks.js"
import { MAX_OPTIONS, OTHER_ID } from "./input.js"

export const askActionSchema = z.enum(["approve", "reject", "choose", "submit", "cancel", "timeout"])
export type AskAction = z.infer<typeof askActionSchema>

export const requestIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/)
export const otherIdSchema = z.literal(OTHER_ID)

export const askResultSchema = z.object({
  action: askActionSchema,
  optionId: blockIdSchema.optional(),
  optionIds: z.array(blockIdSchema).max(MAX_OPTIONS).optional(),
  otherText: z.string().max(20_000).optional(),
  value: z.string().max(20_000).optional(),
  values: z.record(z.string(), z.unknown()).optional(),
  note: z.string().max(20_000).optional(),
  requestId: requestIdSchema.optional(),
})
export type AskResult = z.infer<typeof askResultSchema>
