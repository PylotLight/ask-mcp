import { newFormToken, newRequestId } from "../util/tokens.js"
import type { AskArgs, AskResult } from "../schema/index.js"

export type PendingStatus = "pending" | "submitted" | "consumed" | "expired" | "cancelled"

export interface PendingEntry {
  requestId: string
  token: string
  args: AskArgs
  createdAt: number
  status: PendingStatus
  result?: AskResult
}

interface Internal extends PendingEntry {
  resolve: (result: AskResult) => void
  timeout: NodeJS.Timeout
}

/** Terminal entries are kept this long so late page loads/SSE subscribers see the outcome. */
const TERMINAL_TTL_MS = 10 * 60 * 1000

export class PendingStore {
  private entries = new Map<string, Internal>()

  constructor(private timeoutMs: number) {}

  create(args: AskArgs): { entry: PendingEntry; promise: Promise<AskResult> } {
    this.pruneTerminal()
    const token = newFormToken()
    const requestId = newRequestId()
    let resolve!: (result: AskResult) => void
    const promise = new Promise<AskResult>((res) => {
      resolve = res
    })
    const timeout = setTimeout(() => this.finish(token, "expired", { action: "timeout" }), this.timeoutMs)
    timeout.unref()
    this.entries.set(token, { requestId, token, args, createdAt: Date.now(), status: "pending", resolve, timeout })
    return { entry: this.snapshot(token)!, promise }
  }

  get(token: string): PendingEntry | undefined {
    return this.snapshot(token)
  }

  status(token: string): PendingStatus | undefined {
    return this.entries.get(token)?.status
  }

  result(token: string): AskResult | undefined {
    return this.entries.get(token)?.result
  }

  submit(token: string, result: AskResult): boolean {
    return this.finish(token, "submitted", result, result)
  }

  cancel(token: string): boolean {
    return this.finish(token, "cancelled", { action: "cancel" })
  }

  /** Tool handler calls this once the answer has been delivered, so the page can close. */
  markConsumed(token: string): void {
    const entry = this.entries.get(token)
    if (entry?.status === "submitted") entry.status = "consumed"
  }

  /** Resolve everything still pending (server shutdown). */
  settleAll(): void {
    for (const [token, entry] of this.entries) {
      if (entry.status === "pending") this.finish(token, "expired", { action: "timeout" })
    }
  }

  /** Pending → terminal state transition; clears the timer, stores the result, resolves the tool call. */
  private finish(token: string, status: PendingStatus, result: AskResult, storedResult?: AskResult): boolean {
    const entry = this.entries.get(token)
    if (!entry || entry.status !== "pending") return false
    clearTimeout(entry.timeout)
    entry.status = status
    entry.result = storedResult ?? result
    entry.resolve(result)
    return true
  }

  private pruneTerminal(): void {
    const cutoff = Date.now() - TERMINAL_TTL_MS
    for (const [token, entry] of this.entries) {
      if (entry.status !== "pending" && entry.createdAt < cutoff) {
        clearTimeout(entry.timeout)
        this.entries.delete(token)
      }
    }
  }

  private snapshot(token: string): PendingEntry | undefined {
    const e = this.entries.get(token)
    if (!e) return undefined
    const { requestId, createdAt, status, result, args } = e
    return { requestId, token, args, createdAt, status, result }
  }
}
