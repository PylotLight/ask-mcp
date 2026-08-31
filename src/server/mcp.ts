import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import type { IncomingMessage, ServerResponse } from "node:http"
import {
  askOptionsSchema,
  infoBlockSchema,
  lenientInputSpecSchema,
  MAX_BLOCKS,
  type AskResult,
} from "../schema/index.js"
import type { ArtifactStore } from "../store/artifacts.js"
import type { PendingStore } from "../store/pending.js"
import type { TemplateStore } from "../store/templates.js"
import { summarizeResult } from "./summary.js"
import { formatAskError, resolveAskArgs, runAsk } from "./ask-flow.js"
import { VERSION } from "../version.js"

export interface McpDeps {
  store: PendingStore
  artifacts: ArtifactStore
  templates: TemplateStore
  baseUrl: string
  openBrowser: boolean
}

export const ASK_TOOL_DESCRIPTION = `Show structured information (plans, options, diffs, tables) to the user in a rendered form and collect a decision or input.

Use whenever the user must review content and respond: approvals, choosing between alternatives, multi-selects, free text, or short forms. Do not use for pure questions that chat handles fine.

Guidance:
- Put alternatives in option_card blocks; reference the same ids in single_choice/multi_choice options.
- Use approve for a single recommended plan (reject usually warrants a note).
- Use form or text to collect data, not to choose between plans.
- Keep copy concise; do not dump entire conversation history into blocks.
- One primary input per call; ask follow-ups in subsequent calls.
- For recurring interactions, pass a template id (see the ask_templates tool) and override only what differs.

Blocks the tool call until the user responds, cancels, or the timeout is reached. Returns a structured result (action, selected ids/values, optional note). On timeout, treat the question as unanswered and proceed without pestering again.

The form URL opens in the user's browser automatically when the call starts.`

/**
 * Stateless pattern: a fresh server+transport pair per request, no session state.
 * The blocking `ask` handler keeps the HTTP response open until the user answers.
 */
export async function handleMcpRequest(deps: McpDeps, req: IncomingMessage, res: ServerResponse, body?: unknown): Promise<void> {
  const server = createMcpServer(deps, res)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on("close", () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, body)
}

/**
 * Build the MCP server (tools: ask, ask_templates). Shared by the HTTP
 * endpoint (stateless, per-request with `res` wired for disconnect cancels)
 * and the stdio transport (single long-lived instance, `res` undefined).
 */
export function createMcpServer(deps: McpDeps, res?: ServerResponse): McpServer {
  const server = new McpServer({ name: "ask-mcp", version: VERSION })

  server.registerTool(
    "ask",
    {
      title: "Ask the user",
      description: ASK_TOOL_DESCRIPTION,
      // Intentionally lenient vs askArgsSchema: `input.type` may be omitted
      // (inferred server-side) so LLM callers can pass a minimal spec. With a
      // template id, even `title`/`blocks` can be omitted (the template fills them).
      inputSchema: {
        template: z
          .string()
          .max(100)
          .optional()
          .describe("Optional ask template id (see ask_templates): its spec supplies defaults; explicit fields here override it"),
        title: z.string().min(1).max(120).optional().describe("Short heading for the question surface (required unless a template supplies it)"),
        subtitle: z.string().max(200).optional().describe("Optional supporting line under the title"),
        blocks: z
          .array(infoBlockSchema)
          .max(MAX_BLOCKS)
          .optional()
          .describe("Info blocks shown to the user before they respond (context, options, tables, steps)"),
        input: lenientInputSpecSchema.describe(
          "The single primary input the user must respond with. `type` may be omitted: it is inferred from the other fields (options→single_choice, schema→form, text fields→text, otherwise approve).",
        ),
        options: askOptionsSchema.optional().describe("Presentation options (density, cancel button, locale)"),
      },
    },
    async (args) => {
      let askArgs
      try {
        askArgs = await resolveAskArgs(args, deps.templates)
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid ask arguments: ${formatAskError(err)}` }],
        }
      }
      const result: AskResult = await runAsk(deps, askArgs, res)
      return {
        content: [{ type: "text", text: summarizeResult(askArgs, result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      }
    },
  )

  server.registerTool(
    "ask_templates",
    {
      title: "List ask templates",
      description: `List the reusable ask templates ("recipes") available on this ask-mcp server.

Each template is a hand-tuned, validated ask spec (title, blocks, input kind). Pass the id to the ask tool's \`template\` field and override only the parts that differ (e.g. fill in the change summary). Use this when a recurring decision (deploy gates, sign-offs, region picks) should look consistent instead of being re-authored per call.`,
      inputSchema: {},
    },
    async () => {
      const templates = await deps.templates.list()
      const lines = templates.map((t) => `- **${t.id}** — ${t.title}${t.description ? `: ${t.description}` : ""}`)
      const text = templates.length ? `Available ask templates:\n${lines.join("\n")}` : "No ask templates are installed on this server."
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          templates: templates.map((t) => ({ id: t.id, title: t.title, description: t.description })),
        },
      }
    },
  )

  return server
}
