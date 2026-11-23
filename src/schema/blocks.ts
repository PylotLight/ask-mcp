import { z } from "zod"

export const MAX_BLOCKS = 20
export const MAX_OPTION_CARDS = 10
export const MAX_STEPS = 50
export const MAX_TABLE_ROWS = 100
export const MAX_TREE_NODES = 60
export const MAX_TREE_DEPTH = 5
export const MAX_TREE_CHILDREN = 8

export const blockIdSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/, "id must match [a-zA-Z][a-zA-Z0-9_-]{0,63}")

export interface TreeNode {
  title: string
  note?: string
  meta?: string
  status?: "neutral" | "active" | "done" | "warn" | "muted"
  children?: TreeNode[]
}

export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    title: z.string().min(1).max(200),
    note: z.string().min(1).max(400).optional(),
    meta: z.string().min(1).max(40).optional(),
    status: z.enum(["neutral", "active", "done", "warn", "muted"]).optional(),
    children: z.array(treeNodeSchema).min(1).max(MAX_TREE_CHILDREN).optional(),
  }),
)

export const treeBlockSchema = z
  .object({
    type: z.literal("tree"),
    layout: z.enum(["flow", "list"]).optional(),
    root: treeNodeSchema,
  })
  .superRefine((block, ctx) => {
    let count = 0
    let depth = 0
    const stack: Array<[TreeNode, number]> = [[block.root, 1]]
    while (stack.length > 0) {
      const [node, level] = stack.pop()!
      count++
      depth = Math.max(depth, level)
      for (const child of node.children ?? []) stack.push([child, level + 1])
    }
    if (count > MAX_TREE_NODES) {
      ctx.addIssue({ code: "custom", message: `tree has ${count} nodes; maximum is ${MAX_TREE_NODES}`, path: ["root"] })
    }
    if (depth > MAX_TREE_DEPTH) {
      ctx.addIssue({ code: "custom", message: `tree is ${depth} levels deep; maximum is ${MAX_TREE_DEPTH}`, path: ["root"] })
    }
  })

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
    type: z.literal("diff"),
    path: z.string().min(1).max(200).optional(),
    diff: z.string().min(1).max(20_000),
  }),
  treeBlockSchema,
  z.object({
    type: z.literal("divider"),
  }),
])

export type InfoBlock = z.infer<typeof infoBlockSchema>
