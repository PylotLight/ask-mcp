import { z } from "zod"
import { infoBlockSchema, MAX_BLOCKS, MAX_OPTION_CARDS } from "./blocks.js"
import { inputSpecSchema } from "./input.js"

export const askOptionsSchema = z.object({
  locale: z.string().max(35).optional(),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  allowCancel: z.boolean().default(true),
})
export type AskOptions = z.infer<typeof askOptionsSchema>

export const askArgsSchema = z
  .object({
    title: z.string().min(1).max(120),
    subtitle: z.string().max(200).optional(),
    blocks: z.array(infoBlockSchema).min(1).max(MAX_BLOCKS),
    input: inputSpecSchema,
    options: askOptionsSchema.optional(),
  })
  .refine((args) => args.blocks.filter((b) => b.type === "option_card").length <= MAX_OPTION_CARDS, {
    message: `at most ${MAX_OPTION_CARDS} option_card blocks are allowed`,
  })

export type AskArgs = z.infer<typeof askArgsSchema>
export type AskArgsInput = z.input<typeof askArgsSchema>
