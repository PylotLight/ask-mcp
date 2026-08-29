import { createHash, timingSafeEqual } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import { VERSION } from "../version.js"
import { configFileSchema, writeConfigFile, type Config } from "../config.js"
import type { ArtifactStore } from "../store/artifacts.js"
import type { PendingEntry, PendingStore } from "../store/pending.js"
import type { TemplateStore } from "../store/templates.js"
import { renderAdminLogin, renderAdminPage } from "../render/admin.js"
import { readBody, sendHtml, sendJson } from "./http-util.js"

export interface AdminDeps {
  config: Config
  store: PendingStore
  artifacts: ArtifactStore
  templates: TemplateStore
  startedAt: number
}

const COOKIE_NAME = "ask_admin"
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60

const LOGIN_FAILURE_WINDOW_MS = 60 * 1000
const LOGIN_FAILURE_LIMIT = 10
const loginFailures = new Map<string, { count: number; resetAt: number }>()

function sessionCookieValue(adminToken: string): string {
  return createHash("sha256").update(`ask-mcp-admin:${VERSION}:${adminToken}`).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (name) cookies[name] = value
  }
  return cookies
}

/** The panel exists only when an admin token is configured; otherwise it 404s without explanation. */
export function adminUnlocked(config: Config): boolean {
  return Boolean(config.adminToken)
}

function hasValidSession(deps: AdminDeps, req: IncomingMessage): boolean {
  if (!deps.config.adminToken) return false
  const cookie = parseCookies(req)[COOKIE_NAME]
  if (!cookie) return false
  return safeEqual(cookie, sessionCookieValue(deps.config.adminToken))
}

/** Constant-time bearer-token comparison (shared with the MCP endpoint). */
export function bearerAuthorized(deps: AdminDeps, req: IncomingMessage): boolean {
  if (!deps.config.authToken) return true
  const header = req.headers.authorization
  if (typeof header !== "string") return false
  const expected = Buffer.from(`Bearer ${deps.config.authToken}`)
  const actual = Buffer.from(header)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function entryJson(base: string, entry: PendingEntry): Record<string, unknown> {
  return {
    token: entry.token,
    requestId: entry.requestId,
    title: entry.args.title,
    inputType: entry.args.input.type,
    createdAt: entry.createdAt,
    ageMs: Date.now() - entry.createdAt,
    status: entry.status,
    action: entry.result?.action,
    url: `${base}/f/${entry.token}`,
  }
}

function pendingSnapshot(deps: AdminDeps): Record<string, unknown>[] {
  return deps.store
    .list()
    .slice(0, 100)
    .map((entry) => entryJson(deps.config.baseUrl, entry))
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return JSON.parse(await readBody(req))
}

/** True if the request was handled (path under /admin). */
export async function handleAdminRoute(deps: AdminDeps, req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return false

  if (!adminUnlocked(deps.config)) {
    if (req.method === "GET" && pathname === "/admin") sendHtml(res, 404, renderAdminLogin({ lockedOut: true }))
    else sendJson(res, 404, { error: "not found" })
    return true
  }

  if (pathname === "/admin/login" && req.method === "POST") {
    await handleLogin(deps, req, res)
    return true
  }
  if (pathname === "/admin/logout" && req.method === "POST") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    })
    res.end(JSON.stringify({ ok: true }))
    return true
  }
  if (pathname === "/admin" && req.method === "GET") {
    if (!hasValidSession(deps, req)) sendHtml(res, 200, renderAdminLogin())
    else sendHtml(res, 200, renderAdminPage())
    return true
  }

  if (!hasValidSession(deps, req)) {
    sendJson(res, 401, { error: "admin session required (POST /admin/login)" })
    return true
  }

  if (pathname === "/admin/api/server" && req.method === "GET") {
    sendJson(res, 200, serverInfo(deps))
    return true
  }
  if (pathname === "/admin/api/pending" && req.method === "GET") {
    sendJson(res, 200, { entries: pendingSnapshot(deps) })
    return true
  }
  if (pathname === "/admin/api/config" && req.method === "GET") {
    sendJson(res, 200, configInfo(deps))
    return true
  }
  if (pathname === "/admin/api/config" && req.method === "PUT") {
    await handleConfigPut(deps, req, res)
    return true
  }
  if (pathname === "/admin/api/templates" && req.method === "GET") {
    sendJson(res, 200, { templates: await deps.templates.list() })
    return true
  }
  if (pathname === "/admin/events" && req.method === "GET") {
    handleEvents(deps, res)
    return true
  }

  if (pathname === "/admin/api/history" && req.method === "GET") {
    const limit = Number(new URL(req.url ?? "/", "http://localhost").searchParams.get("limit") ?? 30)
    const days = await deps.artifacts.listDays()
    sendJson(res, 200, { days: Number.isFinite(limit) ? days.slice(0, Math.max(1, Math.min(365, limit))) : days })
    return true
  }

  let match = /^\/admin\/api\/pending\/([A-Za-z0-9_-]{10,64})\/cancel$/.exec(pathname)
  if (match && req.method === "POST") {
    const token = match[1]!
    const ok = deps.store.cancel(token)
    const status = deps.store.status(token)
    if (ok) sendJson(res, 200, { ok: true, status })
    else sendJson(res, status === undefined ? 404 : 409, { error: status === undefined ? "unknown token" : `not cancellable (status: ${status})` })
    return true
  }

  match = /^\/admin\/api\/history\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)
  if (match && req.method === "GET") {
    sendJson(res, 200, { date: match[1], asks: await deps.artifacts.listAsks(match[1]!) })
    return true
  }

  match = /^\/admin\/api\/history\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]{10,64})$/.exec(pathname)
  if (match && req.method === "GET") {
    const record = await deps.artifacts.readAsk(match[1]!, match[2]!)
    if (!record) sendJson(res, 404, { error: "not found" })
    else sendJson(res, 200, { date: match[1], token: match[2], spec: record.spec ?? null, response: record.response ?? null, hasRender: record.render !== undefined })
    return true
  }

  match = /^\/admin\/api\/history\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]{10,64})\/render$/.exec(pathname)
  if (match && req.method === "GET") {
    const record = await deps.artifacts.readAsk(match[1]!, match[2]!)
    if (!record?.render) sendJson(res, 404, { error: "no render available" })
    else sendHtml(res, 200, record.render)
    return true
  }

  match = /^\/admin\/api\/templates\/([a-z0-9][a-z0-9_-]{0,63})$/.exec(pathname)
  if (match) {
    const id = match[1]!
    if (req.method === "PUT") {
      await handleTemplatePut(deps, req, res, id)
      return true
    }
    if (req.method === "DELETE") {
      const ok = await deps.templates.remove(id)
      sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: "unknown template" })
      return true
    }
  }

  sendJson(res, 404, { error: "not found" })
  return true
}

async function handleLogin(deps: AdminDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Tiny brute-force guard: per-client failure counter with a rolling window.
  const key = req.socket.remoteAddress ?? "unknown"
  const failures = loginFailures.get(key)
  if (failures && failures.count >= LOGIN_FAILURE_LIMIT && Date.now() < failures.resetAt) {
    sendJson(res, 429, { error: "too many failed attempts; retry shortly" })
    return
  }
  let token = ""
  try {
    const body = (await readJsonBody(req)) as { token?: unknown }
    if (typeof body?.token === "string") token = body.token
  } catch {
    // fall through to invalid-token
  }
  if (!token || !deps.config.adminToken || !safeEqual(token, deps.config.adminToken)) {
    const record = failures && Date.now() < failures.resetAt ? failures : { count: 0, resetAt: Date.now() + LOGIN_FAILURE_WINDOW_MS }
    record.count++
    loginFailures.set(key, record)
    sendJson(res, 401, { error: "invalid token" })
    return
  }
  loginFailures.delete(key)
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "set-cookie": `${COOKIE_NAME}=${sessionCookieValue(deps.config.adminToken)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE_S}`,
  })
  res.end(JSON.stringify({ ok: true }))
}

function serverInfo(deps: AdminDeps): Record<string, unknown> {
  const c = deps.config
  return {
    version: VERSION,
    startedAt: deps.startedAt,
    uptimeSeconds: Math.floor((Date.now() - deps.startedAt) / 1000),
    pending: deps.store.list().filter((e) => e.status === "pending").length,
    config: {
      port: c.port,
      host: c.host,
      baseUrl: c.baseUrl,
      dataDir: c.dataDir,
      configPath: c.configPath,
      retentionDays: c.retentionDays,
      timeoutMs: c.timeoutMs,
      surface: c.surface,
      openBrowser: c.openBrowser,
      authTokenConfigured: Boolean(c.authToken),
      adminTokenConfigured: Boolean(c.adminToken),
    },
  }
}

/** Fields the panel may edit; tokens stay out (manage them via env/CLI/file). */
function configInfo(deps: AdminDeps): Record<string, unknown> {
  const c = deps.config
  return {
    configPath: c.configPath,
    values: {
      port: c.port,
      host: c.host,
      baseUrl: c.baseUrl,
      dataDir: c.dataDir,
      retentionDays: c.retentionDays,
      timeoutMs: c.timeoutMs,
      surface: c.surface,
    },
    notes: {
      runtimeApplied: ["timeoutMs", "retentionDays"],
      restartRequired: ["port", "host", "baseUrl", "dataDir", "surface"],
      tokens: "authToken/adminToken are not editable here — set them via --auth-token/--admin-token, env, or config.json",
    },
  }
}

const NUMERIC_FIELDS = ["port", "retentionDays", "timeoutMs"] as const

async function handleConfigPut(deps: AdminDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" })
  }
  if (typeof body !== "object" || body === null) return sendJson(res, 400, { error: "expected a JSON object" })
  const patch: Record<string, unknown> = { ...(body as Record<string, unknown>) }
  for (const field of NUMERIC_FIELDS) {
    if (typeof patch[field] === "string" && patch[field] !== "") patch[field] = Number(patch[field])
    if (patch[field] === "") delete patch[field]
  }
  const parsed = configFileSchema.safeParse(patch)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    return sendJson(res, 400, { error: `invalid config: ${issues}` })
  }
  const saved = await writeConfigFile(deps.config.configPath, parsed.data)
  // Apply the safe subset to the live process.
  const appliedRuntime: string[] = []
  if (saved.timeoutMs !== undefined) {
    deps.store.setTimeout(saved.timeoutMs)
    deps.config.timeoutMs = saved.timeoutMs
    appliedRuntime.push("timeoutMs")
  }
  if (saved.retentionDays !== undefined) {
    deps.config.retentionDays = saved.retentionDays
    appliedRuntime.push("retentionDays")
  }
  const restartRequired: string[] = []
  if (saved.port !== undefined && saved.port !== deps.config.port) restartRequired.push("port")
  if (saved.host !== undefined && saved.host !== deps.config.host) restartRequired.push("host")
  if (saved.baseUrl !== undefined && saved.baseUrl !== deps.config.baseUrl) restartRequired.push("baseUrl")
  if (saved.dataDir !== undefined && saved.dataDir !== deps.config.dataDir) restartRequired.push("dataDir")
  if (saved.surface !== undefined && saved.surface !== deps.config.surface) restartRequired.push("surface")
  sendJson(res, 200, { ok: true, saved, appliedRuntime, restartRequired })
}

async function handleTemplatePut(deps: AdminDeps, req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" })
  }
  if (typeof body !== "object" || body === null) return sendJson(res, 400, { error: "expected a JSON object" })
  const { title, description, spec } = body as { title?: unknown; description?: unknown; spec?: unknown }
  if (typeof title !== "string" || typeof spec !== "object" || spec === null) {
    return sendJson(res, 400, { error: "template requires { title: string, spec: object }" })
  }
  try {
    const template = await deps.templates.put(id, { title, description: typeof description === "string" ? description : undefined, spec: spec as Record<string, unknown> })
    sendJson(res, 200, { ok: true, template })
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) })
  }
}

function handleEvents(deps: AdminDeps, res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  })
  const send = (): void => {
    res.write(`event: pending\ndata: ${JSON.stringify({ entries: pendingSnapshot(deps) })}\n\n`)
  }
  send()
  const unsubscribe = deps.store.subscribe(send)
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000)
  heartbeat.unref()
  res.on("close", () => {
    unsubscribe()
    clearInterval(heartbeat)
  })
}
