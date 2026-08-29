import { afterAll, describe, expect, it } from "vitest"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import type { AddressInfo } from "node:net"
import { createHttpServer, type HttpDeps } from "../src/server/http.js"
import type { Config } from "../src/config.js"
import { PendingStore } from "../src/store/pending.js"
import { ArtifactStore } from "../src/store/artifacts.js"
import { TemplateStore } from "../src/store/templates.js"

function makeDeps(opts: { adminToken?: string; authToken?: string } = {}): { deps: HttpDeps; url: string; close: () => Promise<void>; config: Config } {
  const dir = mkdtempSync(path.join(tmpdir(), "ask-admin-"))
  const config: Config = {
    port: 0,
    host: "127.0.0.1",
    baseUrl: "",
    dataDir: dir,
    retentionDays: 0,
    timeoutMs: 60_000,
    surface: "auto",
    authToken: opts.authToken,
    adminToken: opts.adminToken,
    openBrowser: false,
    configPath: path.join(dir, "config.json"),
  }
  config.baseUrl = `http://127.0.0.1:${config.port}`
  const store = new PendingStore(60_000)
  const artifacts = new ArtifactStore(dir)
  const templates = new TemplateStore(path.join(dir, "templates"))
  const server = createHttpServer({ config, store, artifacts, templates, startedAt: Date.now() })
  const close = (): Promise<void> =>
    new Promise((resolve) => {
      store.settleAll()
      server.close(() => resolve())
    })
  return { deps: { config, store, artifacts, templates, startedAt: Date.now() }, url: "", close, config }
}

async function listen(deps: HttpDeps, server: ReturnType<typeof createHttpServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  void port
  deps.config.port = port
  deps.config.baseUrl = `http://127.0.0.1:${port}`
  return deps.config.baseUrl
}

const askArgs = {
  title: "Deploy?",
  blocks: [{ type: "paragraph", text: "x" }],
  input: { type: "approve" as const },
}

describe("admin panel HTTP surface", () => {
  it("404s everything under /admin when no admin token is configured", async () => {
    const { deps, close } = makeDeps()
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    try {
      expect((await fetch(`${url}/admin`)).status).toBe(404)
      expect((await fetch(`${url}/admin/api/pending`)).status).toBe(404)
      expect((await fetch(`${url}/admin/api/server`)).status).toBe(404)
    } finally {
      await close()
    }
  })

  it("gates the dashboard and APIs behind the token cookie", async () => {
    const { deps, close } = makeDeps({ adminToken: "sekrit" })
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    try {
      const page = await fetch(`${url}/admin`)
      expect(page.status).toBe(200)
      expect(await page.text()).toContain("Admin sign-in")

      // APIs reject without a session.
      expect((await fetch(`${url}/admin/api/server`)).status).toBe(401)

      // Wrong token → 401.
      const bad = await fetch(`${url}/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "wrong" }) })
      expect(bad.status).toBe(401)

      // Right token → cookie → dashboard.
      const login = await fetch(`${url}/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "sekrit" }) })
      expect(login.status).toBe(200)
      const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0]!
      expect(cookie).toMatch(/^ask_admin=/)

      const dash = await fetch(`${url}/admin`, { headers: { cookie } })
      expect(await dash.text()).toContain("Control panel")

      const info = (await (await fetch(`${url}/admin/api/server`, { headers: { cookie } })).json()) as { version: string; config: { adminTokenConfigured: boolean } }
      expect(info.config.adminTokenConfigured).toBe(true)
      expect(JSON.stringify(info)).not.toContain("sekrit")
    } finally {
      await close()
    }
  })

  it("lists and cancels pending asks from the panel", async () => {
    const { deps, close } = makeDeps({ adminToken: "t" })
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    const { store } = deps
    try {
      const { promise } = store.create(askArgs as never)
      const entry = store.list()[0]!

      const pending = (await (await fetch(`${url}/admin/api/pending`, { headers: { cookie: "ask_admin=bogus" } })).json()) // 401 json
      expect((pending as { error?: string }).error).toContain("admin session")

      const list = (await (await fetch(`${url}/admin/api/pending`, { headers: { cookie: "ask_admin=x" } })).status) // still 401 with bad cookie value
      expect(list).toBe(401)

      // Login properly.
      const login = await fetch(`${url}/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "t" }) })
      const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0]!

      const ok = (await (await fetch(`${url}/admin/api/pending`, { headers: { cookie } })).json()) as { entries: Array<{ token: string; status: string; title: string }> }
      expect(ok.entries).toHaveLength(1)
      expect(ok.entries[0]!.title).toBe("Deploy?")

      const cancel = await fetch(`${url}/admin/api/pending/${entry.token}/cancel`, { method: "POST", headers: { cookie } })
      expect(cancel.status).toBe(200)
      await expect(promise).resolves.toEqual({ action: "cancel" })
    } finally {
      await close()
    }
  })

  it("serves history, config and template APIs", async () => {
    const { deps, close } = makeDeps({ adminToken: "t" })
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    const { artifacts, templates, store } = deps
    await templates.init()
    try {
      const login = await fetch(`${url}/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "t" }) })
      const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0]!
      const headers = { cookie }

      // History: persist a fake settled ask.
      const { entry } = store.create(askArgs as never)
      await artifacts.saveSpec(entry.token, entry.requestId, askArgs as never)
      await artifacts.saveResponse(entry.token, entry.requestId, { action: "approve" })

      const { days } = (await (await fetch(`${url}/admin/api/history`, { headers })).json()) as { days: string[] }
      expect(days.length).toBeGreaterThanOrEqual(1)
      const { asks } = (await (await fetch(`${url}/admin/api/history/${days[0]}`, { headers })).json()) as { asks: Array<{ token: string; responseAction?: string }> }
      expect(asks.some((a) => a.token === entry.token && a.responseAction === "approve")).toBe(true)
      const record = (await (await fetch(`${url}/admin/api/history/${days[0]}/${entry.token}`, { headers })).json()) as { spec: { args: { title: string } } | null }
      expect(record.spec?.args.title).toBe("Deploy?")
      // Path traversal is rejected by the token regex.
      expect((await fetch(`${url}/admin/api/history/${days[0]}/..%2F..%2Fetc`, { headers })).status).toBe(404)

      // Config: GET then PUT (numeric strings coerced; runtime-applied fields).
      const cfgGet = (await (await fetch(`${url}/admin/api/config`, { headers })).json()) as { configPath: string; values: { timeoutMs: number } }
      expect(cfgGet.configPath).toBe(deps.config.configPath)
      const cfgPut = (await (await fetch(`${url}/admin/api/config`, { method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ timeoutMs: "45000", port: "9999" }) })).json()) as { appliedRuntime: string[]; restartRequired: string[] }
      expect(cfgPut.appliedRuntime).toContain("timeoutMs")
      expect(cfgPut.restartRequired).toContain("port")
      const cfgGet2 = (await (await fetch(`${url}/admin/api/config`, { headers })).json()) as { values: { timeoutMs: number } }
      expect(cfgGet2.values.timeoutMs).toBe(45000)
      expect(deps.config.timeoutMs).toBe(45000)

      // Templates: list seeds, create, delete.
      const list = (await (await fetch(`${url}/admin/api/templates`, { headers })).json()) as { templates: Array<{ id: string }> }
      expect(list.templates.map((t) => t.id)).toContain("deploy-confirm")
      const created = await fetch(`${url}/admin/api/templates/room-choice`, {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ title: "Room", spec: { title: "Room", blocks: [{ type: "paragraph", text: "x" }], input: { type: "single_choice", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] } } }),
      })
      expect(created.status).toBe(200)
      const invalid = await fetch(`${url}/admin/api/templates/broken`, {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ title: "Broken", spec: { title: "Broken", blocks: [{ type: "wat" }] } }),
      })
      expect(invalid.status).toBe(400)
      expect((await fetch(`${url}/admin/api/templates/room-choice`, { method: "DELETE", headers })).status).toBe(200)
    } finally {
      await close()
    }
  })
})

describe("direct ask API", () => {
  it("blocks on POST /api/ask until the form is answered (template flow)", async () => {
    const { deps, close } = makeDeps()
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    await deps.templates.init()
    try {
      const pendingResponse = fetch(`${url}/api/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template: "deploy-confirm" }),
      }).then((r) => r.json() as Promise<{ action: string; title?: string }>)

      await new Promise((r) => setTimeout(r, 50))
      const entry = deps.store.list().find((e) => e.status === "pending")
      expect(entry?.args.title).toBe("Deploy to production?")
      const submit = await fetch(`${deps.config.baseUrl}/f/${entry!.token}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject", note: "not yet" }),
      })
      expect(submit.status).toBe(200)
      await expect(pendingResponse).resolves.toMatchObject({ action: "reject", note: "not yet" })
    } finally {
      await close()
    }
  })

  it("reports unknown templates with available ids and honours bearer auth", async () => {
    const { deps, close } = makeDeps({ authToken: "bearer-token", adminToken: "admin-t" })
    const server = createHttpServer(deps)
    const url = await listen(deps, server)
    await deps.templates.init()
    try {
      const auth = { authorization: "Bearer bearer-token" }
      const miss = await fetch(`${url}/api/ask`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ template: "nope" }) })
      expect(miss.status).toBe(400)
      expect(((await miss.json()) as { error: string }).error).toContain("deploy-confirm")

      const unauthTemplates = await fetch(`${url}/api/templates`)
      expect(unauthTemplates.status).toBe(401)
      const templates = await fetch(`${url}/api/templates`, { headers: auth })
      expect(templates.status).toBe(200)
      expect(((await templates.json()) as { templates: unknown[] }).templates.length).toBeGreaterThan(0)

      const unauthAsk = await fetch(`${url}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ template: "deploy-confirm" }) })
      expect(unauthAsk.status).toBe(401)
    } finally {
      await close()
    }
  })
})

describe("PendingStore events", () => {
  it("emits create/settle/consume to subscribers", async () => {
    const store = new PendingStore(60_000)
    const events: string[] = []
    const unsubscribe = store.subscribe((event) => events.push(event))
    const { promise } = store.create(askArgs as never)
    store.submit(store.list()[0]!.token, { action: "approve" })
    store.markConsumed(store.list()[0]!.token)
    await promise
    expect(events).toEqual(["create", "settle", "consume"])
    unsubscribe()
    store.create(askArgs as never)
    expect(events).toEqual(["create", "settle", "consume"])
  })
})

afterAll(() => {
  // Keep vitest quiet about open handles; each test closes its own server.
})
