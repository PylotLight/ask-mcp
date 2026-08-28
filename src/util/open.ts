import { spawn } from "node:child_process"

/** Best-effort open of a URL in the user's default browser. Never throws. */
export function openInBrowser(url: string): void {
  try {
    if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref()
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref()
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref()
    }
  } catch {
    // headless or missing helper — the URL is still logged to stderr
  }
}
