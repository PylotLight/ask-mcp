import { z } from "zod"
import { askArgsSchema, type AskArgs, type AskArgsInput, type AskOptions } from "./args.js"
import { infoBlockSchema, type InfoBlock, type TreeNode } from "./blocks.js"
import {
  choiceOptionSchema,
  formFieldSchema,
  formSchemaSchema,
  inferInputType,
  inputSpecSchema,
  lenientInputSpecSchema,
  normalizeInputSpec,
  type ChoiceOption,
  type FormField,
  type FormSchema,
  type InputSpec,
} from "./input.js"
import { askActionSchema, askResultSchema, requestIdSchema, type AskAction, type AskResult } from "./result.js"

export { MAX_BLOCKS, MAX_OPTION_CARDS, MAX_STEPS, MAX_TABLE_ROWS, MAX_TREE_CHILDREN, MAX_TREE_DEPTH, MAX_TREE_NODES, blockIdSchema, infoBlockSchema, treeBlockSchema, treeNodeSchema } from "./blocks.js"
export {
  MAX_FORM_FIELDS,
  MAX_OPTIONS,
  choiceOptionSchema,
  formFieldSchema,
  formSchemaSchema,
  inferInputType,
  inputSpecSchema,
  lenientInputSpecSchema,
  normalizeInputSpec,
} from "./input.js"
export { askActionSchema, askResultSchema, requestIdSchema } from "./result.js"
export { askArgsSchema, askOptionsSchema } from "./args.js"

export type {
  AskArgs,
  AskArgsInput,
  AskOptions,
  InfoBlock,
  InputSpec,
  AskAction,
  AskResult,
  ChoiceOption,
  FormField,
  FormSchema,
  TreeNode,
}

export function askArgsJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(askArgsSchema, { io: "input" }) as Record<string, unknown>
}

export function askResultJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(askResultSchema, { io: "input" }) as Record<string, unknown>
}
