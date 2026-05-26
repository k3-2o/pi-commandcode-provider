/**
 * Command Code provider for pi.
 *
 * Uses the official Command Code Provider API:
 *   https://api.commandcode.ai/provider/v1
 *
 * Authentication (pick one):
 *   1. Run `/login`, then choose browser login or paste a Command Code API key
 *   2. Set COMMANDCODE_API_KEY environment variable
 *   3. Place API key in `~/.commandcode/auth.json` or `~/.pi/agent/auth.json`
 *      as {"apiKey": "user_..."} or {"commandcode": "user_..."}
 *
 * Models are fetched from Command Code's Provider API at startup.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"

import { getConfiguredApiKey } from "./src/api-key.ts"
import {
  DEFAULT_MODELS_URL,
  DEFAULT_PROVIDER_API_BASE,
  baseUrlForModel,
  fetchCommandCodeModels,
} from "./src/models.ts"
import { getApiKey, login, refreshToken } from "./src/oauth.ts"

const API_BASE = process.env.COMMANDCODE_API_BASE ?? DEFAULT_PROVIDER_API_BASE
const MODELS_URL = process.env.COMMANDCODE_MODELS_URL ?? DEFAULT_MODELS_URL

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default async function (pi: ExtensionAPI) {
  const models = await fetchCommandCodeModels({ url: MODELS_URL })

  pi.registerProvider("commandcode", {
    name: "Command Code",
    baseUrl: API_BASE,
    apiKey: getConfiguredApiKey() ?? "COMMANDCODE_API_KEY",
    api: "openai-completions",
    oauth: {
      name: "Command Code",
      login,
      refreshToken,
      getApiKey,
    },
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
      api: model.api,
      baseUrl: baseUrlForModel(API_BASE, model.api),
      reasoning: model.reasoning,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
    })),
  })
}
