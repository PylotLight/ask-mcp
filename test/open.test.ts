import { describe, expect, it } from "vitest"
import { launchArgs } from "../src/util/open.js"

describe("launchArgs", () => {
  it("uses the system default when no browser is set", () => {
    expect(launchArgs("http://x/", undefined, "darwin")).toEqual({ cmd: "open", args: ["http://x/"] })
    expect(launchArgs("http://x/", "", "darwin")).toEqual({ cmd: "open", args: ["http://x/"] })
    expect(launchArgs("http://x/", undefined, "win32")).toEqual({ cmd: "cmd", args: ["/c", "start", "", "http://x/"] })
    expect(launchArgs("http://x/", undefined, "linux")).toEqual({ cmd: "xdg-open", args: ["http://x/"] })
  })

  it("targets a named app on macOS", () => {
    expect(launchArgs("http://x/", "Google Chrome", "darwin")).toEqual({ cmd: "open", args: ["-a", "Google Chrome", "http://x/"] })
  })

  it("uses start with an alias on Windows but spawns exe paths directly", () => {
    expect(launchArgs("http://x/", "msedge", "win32")).toEqual({ cmd: "cmd", args: ["/c", "start", "", "msedge", "http://x/"] })
    expect(launchArgs("http://x/", "C:\\Program Files\\Chrome\\chrome.exe", "win32")).toEqual({
      cmd: "C:\\Program Files\\Chrome\\chrome.exe",
      args: ["http://x/"],
    })
  })

  it("spawns the named command on Linux", () => {
    expect(launchArgs("http://x/", "firefox", "linux")).toEqual({ cmd: "firefox", args: ["http://x/"] })
  })
})
