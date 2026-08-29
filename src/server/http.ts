import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { askResultSchema } from "../schema/index.js"
import { VERSION } from "../version.js"
import type { Config } from "../config.js"
import type { ArtifactStore } from "../store/artifacts.js"
import type { PendingStore } from "../store/pending.js"
import type { TemplateStore } from "../store/templates.js"
import { renderGonePage, renderPage } from "../render/page.js"
import { validateResultAgainstArgs } from "./validate.js"
import { handleMcpRequest, type McpDeps } from "./mcp.js"
import { sendJson, readBody, sendHtml } from "./http-util.js"
import { bearerAuthorized, handleAdminRoute, type AdminDeps } from "./admin.js"
import { handleApiAsk } from "./api-ask.js"

export interface HttpDeps {
  config: Config
  store: PendingStore
  artifacts: ArtifactStore
  templates: TemplateStore
  startedAt: number
}

export function createHttpServer(deps: HttpDeps): ReturnType<typeof createServer> {
  return createServer((req, res) => {
    route(deps, req, res).catch((err) => {
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) })
    })
  })
}

function mcpDeps(deps: HttpDeps): McpDeps {
  return { store: deps.store, artifacts: deps.artifacts, templates: deps.templates, baseUrl: deps.config.baseUrl, openBrowser: deps.config.openBrowser }
}

function adminDeps(deps: HttpDeps): AdminDeps {
  return { config: deps.config, store: deps.store, artifacts: deps.artifacts, templates: deps.templates, startedAt: deps.startedAt }
}

async function route(deps: HttpDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost")
  const path = url.pathname

  if (path === "/admin" || path.startsWith("/admin/")) {
    await handleAdminRoute(adminDeps(deps), req, res, path)
    return
  }
  if (path === "/api/ask" && req.method === "POST") return handleApiAsk(adminDeps(deps), req, res)
  if (path === "/api/templates" && req.method === "GET") {
    if (!bearerAuthorized(adminDeps(deps), req)) {
      res.writeHead(401, { "www-authenticate": "Bearer" })
      res.end(JSON.stringify({ error: "unauthorized" }))
      return
    }
    const templates = await deps.templates.list()
    return sendJson(res, 200, { templates: templates.map((t) => ({ id: t.id, title: t.title, description: t.description })) })
  }

  if (path === "/mcp") return handleMcpEndpoint(deps, req, res)
  if (path === "/healthz" && req.method === "GET") return sendJson(res, 200, { ok: true, version: VERSION })

  const formMatch = /^\/f\/([A-Za-z0-9_-]{10,64})(?:\/(submit|cancel|events))?$/.exec(path)
  if (formMatch) {
    const token = formMatch[1]!
    const action = formMatch[2]
    if (!action && req.method === "GET") return handleFormPage(deps, token, res)
    if (action === "submit" && req.method === "POST") return handleSubmit(deps, token, req, res)
    if (action === "cancel" && req.method === "POST") return handleCancel(deps, token, res)
    if (action === "events" && req.method === "GET") return handleEvents(deps, token, req, res)
  }

  sendJson(res, 404, { error: "not found" })
}

async function handleMcpEndpoint(deps: HttpDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!bearerAuthorized(adminDeps(deps), req)) {
    res.writeHead(401, { "www-authenticate": "Bearer" })
    res.end(JSON.stringify({ error: "unauthorized" }))
    return
  }
  let body: unknown
  if (req.method === "POST") {
    const raw = await readBody(req)
    try {
      body = JSON.parse(raw)
    } catch {
      return sendJson(res, 400, { error: "invalid JSON body" })
    }
  }
  await handleMcpRequest(mcpDeps(deps), req, res, body)
}

function handleFormPage(deps: HttpDeps, token: string, res: ServerResponse): void {
  const entry = deps.store.get(token)
  if (!entry) return sendHtml(res, 404, renderGonePage())
  const html = renderPage(entry.args, token, entry.status, entry.args.options?.density ?? "comfortable")
  void deps.artifacts.saveRender(token, html)
  sendHtml(res, 200, html)
}

async function handleSubmit(deps: HttpDeps, token: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" })
  }
  const parsed = askResultSchema.safeParse(parsedJson)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    return sendJson(res, 400, { error: `invalid result: ${issues}` })
  }
  const entry = deps.store.get(token)
  if (!entry || entry.status !== "pending") {
    const status = deps.store.status(token)
    return sendJson(res, status === undefined ? 404 : 409, { error: status === undefined ? "unknown or expired token" : `not submittable (status: ${status})` })
  }
  const semanticError = validateResultAgainstArgs(entry.args, parsed.data)
  if (semanticError) return sendJson(res, 400, { error: semanticError })
  if (!deps.store.submit(token, parsed.data)) {
    return sendJson(res, 409, { error: "not submittable" })
  }
  sendJson(res, 200, { ok: true, status: "submitted" })
}

function handleCancel(deps: HttpDeps, token: string, res: ServerResponse): void {
  if (deps.store.cancel(token)) {
    console.error(`[ask] page cancel: ${token}`)
    return sendJson(res, 200, { ok: true, status: "cancelled" })
  }
  const status = deps.store.status(token)
  sendJson(res, status === undefined ? 404 : 409, { error: status === undefined ? "unknown or expired token" : `not cancellable (status: ${status})` })
}

function handleEvents(deps: HttpDeps, token: string, req: IncomingMessage, res: ServerResponse): void {
  const entry = deps.store.get(token)
  if (!entry) return sendJson(res, 404, { error: "unknown or expired token" })
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  })
  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  const status = deps.store.status(token)
  send("status", { status })
  if (status !== "pending") {
    // Terminal at connect: hand the client the final state and end the stream.
    if (status === "submitted" || status === "consumed") send("consumed", { status })
    res.end()
    return
  }
  const interval = setInterval(() => {
    const current = deps.store.status(token)
    if (current === undefined) return // pruned between ticks; keep the stream open
    send("status", { status: current })
    if (current !== "pending") {
      if (current === "submitted" || current === "consumed") send("consumed", { status: current })
      clearInterval(interval)
      res.end()
    }
  }, 1000)
  interval.unref()
  // res 'close' fires both after res.end() and on premature client disconnect.
  res.on("close", () => clearInterval(interval))
}
