import type { IncomingMessage, ServerResponse } from "node:http"
import type { AdminDeps } from "./admin.js"
import { bearerAuthorized } from "./admin.js"
import { formatAskError, resolveAskArgs, runAsk, type AskFlowDeps, type RawAskRequest } from "./ask-flow.js"
import { readBody, sendJson } from "./http-util.js"

/**
 * POST /api/ask — the direct (non-MCP) ask endpoint for shell scripts and
 * slash-command shell injections. Same contract as the MCP tool minus the
 * protocol: a lenient ask request (optionally a template id), blocking until
 * the user answers, then the structured result as JSON.
 */
export async function handleApiAsk(deps: AdminDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!bearerAuthorized(deps, req)) {
    res.writeHead(401, { "www-authenticate": "Bearer" })
    res.end(JSON.stringify({ error: "unauthorized" }))
    return
  }
  let body: RawAskRequest
  try {
    body = JSON.parse(await readBody(req, 1024 * 1024)) as RawAskRequest
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" })
  }
  if (typeof body !== "object" || body === null) return sendJson(res, 400, { error: "expected a JSON ask request" })

  let askArgs
  try {
    askArgs = await resolveAskArgs(body, deps.templates)
  } catch (err) {
    return sendJson(res, 400, { error: `invalid ask: ${formatAskError(err)}` })
  }
  const flow: AskFlowDeps = {
    store: deps.store,
    artifacts: deps.artifacts,
    baseUrl: deps.config.baseUrl,
    openBrowser: deps.config.openBrowser,
  }
  const result = await runAsk(flow, askArgs, res)
  sendJson(res, 200, result)
}
