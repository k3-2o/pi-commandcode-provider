import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"

import { getConfiguredApiKey } from "../src/api-key.ts"

describe("getConfiguredApiKey()", () => {
  it("uses COMMANDCODE_API_KEY from provided env", () => {
    assert.equal(
      getConfiguredApiKey({ env: { COMMANDCODE_API_KEY: "env-key" }, authPaths: [] }),
      "env-key",
    )
  })

  it("reads apiKey, commandcode, and pi OAuth credential fields from explicit auth paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-auth-"))
    try {
      const first = join(dir, "first.json")
      const second = join(dir, "second.json")
      const oauth = join(dir, "oauth.json")
      writeFileSync(first, JSON.stringify({ apiKey: "file-key" }))
      writeFileSync(second, JSON.stringify({ commandcode: "fallback-key" }))
      writeFileSync(
        oauth,
        JSON.stringify({
          commandcode: {
            type: "oauth",
            access: "oauth-access-key",
            refresh: "oauth-refresh-key",
            expires: Date.now() + 3600000,
          },
        }),
      )
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [first, second] }), "file-key")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [second] }), "fallback-key")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [oauth] }), "oauth-access-key")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("ignores malformed auth files", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-auth-bad-"))
    try {
      const bad = join(dir, "bad.json")
      writeFileSync(bad, "not json")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [bad] }), undefined)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("uses injected homeDir for default auth paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-home-"))
    try {
      const authDir = join(dir, ".pi", "agent")
      mkdirSync(authDir, { recursive: true })
      writeFileSync(join(authDir, "auth.json"), JSON.stringify({ commandcode: "pi-key" }))
      assert.equal(getConfiguredApiKey({ env: {}, homeDir: () => dir }), "pi-key")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
