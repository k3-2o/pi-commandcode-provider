import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function defaultAuthPaths(home: string): string[] {
  return [join(home, ".commandcode", "auth.json"), join(home, ".pi", "agent", "auth.json")]
}

export function getConfiguredApiKey(
  options: {
    env?: NodeJS.ProcessEnv
    authPaths?: readonly string[]
    homeDir?: () => string
  } = {},
): string | undefined {
  const env = options.env ?? process.env
  if (env.COMMANDCODE_API_KEY) return env.COMMANDCODE_API_KEY

  const home = options.homeDir?.() ?? homedir()
  const authPaths = options.authPaths ?? defaultAuthPaths(home)

  for (const authPath of authPaths) {
    try {
      if (!existsSync(authPath)) continue
      const parsed: unknown = JSON.parse(readFileSync(authPath, "utf-8"))
      if (!isRecord(parsed)) continue

      const apiKey = stringValue(parsed.apiKey)
      if (apiKey) return apiKey

      const commandcode = stringValue(parsed.commandcode)
      if (commandcode) return commandcode

      const providerKey = isRecord(parsed.commandcode) ? parsed.commandcode : undefined
      if (providerKey && stringValue(providerKey.type) === "oauth") {
        const access = stringValue(providerKey.access)
        if (access) return access
      }
    } catch {
      // Ignore malformed or unreadable auth files.
    }
  }

  return undefined
}
