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

  it("reads supported auth file shapes from explicit auth paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-auth-"))
    try {
      const first = join(dir, "first.json")
      const second = join(dir, "second.json")
      const oauth = join(dir, "oauth.json")
      const cli = join(dir, "cli.json")
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
      writeFileSync(
        cli,
        JSON.stringify({
          "command-code": {
            type: "api",
            key: "cli-api-key",
          },
        }),
      )
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [first, second] }), "file-key")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [second] }), "fallback-key")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [oauth] }), "oauth-access-key")
      assert.equal(getConfiguredApiKey({ env: {}, authPaths: [cli] }), "cli-api-key")
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

  it("uses injected homeDir for default pi and OMP auth paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-home-"))
    try {
      const piAuthDir = join(dir, ".pi", "agent")
      const ompAuthDir = join(dir, ".omp", "agent")
      mkdirSync(piAuthDir, { recursive: true })
      mkdirSync(ompAuthDir, { recursive: true })
      writeFileSync(join(ompAuthDir, "auth.json"), JSON.stringify({ commandcode: "omp-key" }))
      assert.equal(getConfiguredApiKey({ env: {}, homeDir: () => dir }), "omp-key")

      writeFileSync(join(piAuthDir, "auth.json"), JSON.stringify({ commandcode: "pi-key" }))
      assert.equal(getConfiguredApiKey({ env: {}, homeDir: () => dir }), "pi-key")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
