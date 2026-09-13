import { spawn } from "node:child_process"

export interface LaunchSpec {
  cmd: string
  args: string[]
}

/**
 * Pure command construction for opening a URL, split out for testability.
 * Empty browser = system default. Otherwise the value is interpreted per OS:
 * macOS app name ("Google Chrome"), Windows app alias or exe path
 * ("msedge", "chrome"), Linux command ("google-chrome", "firefox").
 */
export function launchArgs(url: string, browser?: string, platform: NodeJS.Platform = process.platform): LaunchSpec {
  const name = browser?.trim()
  if (!name) {
    if (platform === "darwin") return { cmd: "open", args: [url] }
    if (platform === "win32") return { cmd: "cmd", args: ["/c", "start", "", url] }
    return { cmd: "xdg-open", args: [url] }
  }
  if (platform === "darwin") return { cmd: "open", args: ["-a", name, url] }
  if (platform === "win32") {
    if (/[:\\/]/.test(name) || /\.exe$/i.test(name)) return { cmd: name, args: [url] }
    return { cmd: "cmd", args: ["/c", "start", "", name, url] }
  }
  return { cmd: name, args: [url] }
}

/** Best-effort open of a URL, honoring an optional non-default browser. Never throws. */
export function openInBrowser(url: string, browser?: string): void {
  try {
    const spec = launchArgs(url, browser)
    const child = spawn(spec.cmd, spec.args, { stdio: "ignore", detached: true })
    child.on("error", () => {
      if (browser?.trim() && process.platform !== "win32") {
        try {
          const fallback = launchArgs(url)
          spawn(fallback.cmd, fallback.args, { stdio: "ignore", detached: true }).unref()
        } catch {
          // headless or missing helper — the URL is still logged to stderr
        }
      }
    })
    child.unref()
  } catch {
    // headless or missing helper — the URL is still logged to stderr
  }
}
