import { z } from "zod"
import { blockIdSchema } from "./blocks.js"

export const MAX_OPTIONS = 20
export const MAX_FORM_FIELDS = 20

export const choiceOptionSchema = z.object({
  id: blockIdSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  meta: z.string().max(40).optional(),
})
export type ChoiceOption = z.infer<typeof choiceOptionSchema>

const fieldTitle = z.string().min(1).max(200)
const fieldDescription = z.string().max(500).optional()

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("string"),
    title: fieldTitle,
    description: fieldDescription,
    default: z.string().max(10_000).optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).max(10_000).optional(),
    format: z.enum(["email", "uri", "date"]).optional(),
    enum: z.array(z.string().min(1).max(200)).min(1).max(50).optional(),
    enumNames: z.array(z.string().min(1).max(200)).max(50).optional(),
  }),
  z.object({
    type: z.literal("number"),
    title: fieldTitle,
    description: fieldDescription,
    default: z.number().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
  }),
  z.object({
    type: z.literal("integer"),
    title: fieldTitle,
    description: fieldDescription,
    default: z.number().int().optional(),
    minimum: z.number().int().optional(),
    maximum: z.number().int().optional(),
  }),
  z.object({
    type: z.literal("boolean"),
    title: fieldTitle,
    description: fieldDescription,
    default: z.boolean().optional(),
  }),
])
export type FormField = z.infer<typeof formFieldSchema>

export const formSchemaSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(blockIdSchema, formFieldSchema),
    required: z.array(z.string()).max(MAX_FORM_FIELDS).optional(),
  })
  .refine((f) => Object.keys(f.properties).length >= 1 && Object.keys(f.properties).length <= MAX_FORM_FIELDS, {
    message: `form must define between 1 and ${MAX_FORM_FIELDS} fields`,
  })
  .refine((f) => (f.required ?? []).every((r) => r in f.properties), {
    message: "required entries must reference declared form fields",
  })
export type FormSchema = z.infer<typeof formSchemaSchema>

export const inputSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("approve"),
    approveLabel: z.string().min(1).max(50).optional(),
    rejectLabel: z.string().min(1).max(50).optional(),
    noteRequired: z.enum(["never", "on_reject", "always"]).optional(),
    notePlaceholder: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("single_choice"),
    options: z.array(choiceOptionSchema).min(2).max(MAX_OPTIONS),
  }),
  z
    .object({
      type: z.literal("multi_choice"),
      options: z.array(choiceOptionSchema).min(1).max(MAX_OPTIONS),
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(1).optional(),
    })
    .refine((i) => (i.min ?? 0) <= (i.max ?? i.options.length) && (i.max ?? i.options.length) <= i.options.length, {
      message: "selection min/max must be consistent with each other and the option count",
    }),
  z
    .object({
      type: z.literal("text"),
      placeholder: z.string().max(200).optional(),
      multiline: z.boolean().optional(),
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).max(20_000).optional(),
      submitLabel: z.string().min(1).max(50).optional(),
    })
    .refine((i) => (i.minLength ?? 0) <= (i.maxLength ?? 20_000), {
      message: "minLength must not exceed maxLength",
    }),
  z.object({
    type: z.literal("form"),
    schema: formSchemaSchema,
    submitLabel: z.string().min(1).max(50).optional(),
  }),
])

export type InputSpec = z.infer<typeof inputSpecSchema>

/** Lenient tool-facing shape: `type` optional, all widget fields flat. */
export const lenientInputSpecSchema = z.object({
  type: z.enum(["approve", "single_choice", "multi_choice", "text", "form"]).optional(),
  approveLabel: z.string().min(1).max(50).optional(),
  rejectLabel: z.string().min(1).max(50).optional(),
  noteRequired: z.enum(["never", "on_reject", "always"]).optional(),
  notePlaceholder: z.string().max(200).optional(),
  options: z.array(choiceOptionSchema).max(MAX_OPTIONS).optional(),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(1).optional(),
  placeholder: z.string().max(200).optional(),
  multiline: z.boolean().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).max(20_000).optional(),
  submitLabel: z.string().min(1).max(50).optional(),
  schema: formSchemaSchema.optional(),
})

export type LenientInputSpec = z.infer<typeof lenientInputSpecSchema>

/** Infer the input kind when `type` is omitted. */
export function inferInputType(raw: LenientInputSpec): InputSpec["type"] {
  if (raw.type) return raw.type
  if (raw.schema) return "form"
  if (raw.options) return "single_choice"
  if (raw.placeholder !== undefined || raw.multiline !== undefined || raw.minLength !== undefined || raw.maxLength !== undefined || raw.submitLabel !== undefined) {
    return "text"
  }
  return "approve"
}

/** Normalize a lenient input into the strict discriminated union. Throws a ZodError on invalid input. */
export function normalizeInputSpec(raw: unknown): InputSpec {
  const lenient = lenientInputSpecSchema.parse(raw)
  const type = inferInputType(lenient)
  switch (type) {
    case "approve":
      return {
        type,
        approveLabel: lenient.approveLabel,
        rejectLabel: lenient.rejectLabel,
        noteRequired: lenient.noteRequired,
        notePlaceholder: lenient.notePlaceholder,
      }
    case "single_choice":
      return { type, options: lenient.options ?? [] }
    case "multi_choice":
      return { type, options: lenient.options ?? [], min: lenient.min, max: lenient.max }
    case "text":
      return {
        type,
        placeholder: lenient.placeholder,
        multiline: lenient.multiline,
        minLength: lenient.minLength,
        maxLength: lenient.maxLength,
        submitLabel: lenient.submitLabel,
      }
    case "form":
      return { type, schema: lenient.schema!, submitLabel: lenient.submitLabel }
  }
}
