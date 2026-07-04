import type { Api } from "@earendil-works/pi-ai"

export const DEFAULT_PROVIDER_API_BASE = "https://api.commandcode.ai/provider/v1"
export const DEFAULT_MODELS_URL = `${DEFAULT_PROVIDER_API_BASE}/models`

const DEFAULT_MAX_OUTPUT_TOKENS = 65_536

interface ApiModel {
  id: string
  name: string
  contextLength: number
}

export interface CommandCodeModel {
  id: string
  name: string
  api: Api
  reasoning: boolean
  contextWindow: number
  maxTokens: number
}

interface FetchCommandCodeModelsOptions {
  url?: string
  fetchImpl?: typeof fetch
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string`)
  return value
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== "number") throw new Error(`Expected ${key} to be a number`)
  return value
}

function parseApiModel(value: unknown): ApiModel {
  if (!isRecord(value)) throw new Error("Expected model entry to be an object")

  return {
    id: stringField(value, "id"),
    name: stringField(value, "name"),
    contextLength: numberField(value, "context_length"),
  }
}

export function apiForModelId(id: string): Api {
  if (id.startsWith("claude-")) return "anthropic-messages"
  return "openai-completions"
}

export function baseUrlForModel(apiBase: string, api: Api): string {
  const normalized = apiBase.replace(/\/+$/g, "")
  if (api !== "anthropic-messages") return normalized
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized
}

export function commandCodeModelsFromApiResponse(value: unknown): readonly CommandCodeModel[] {
  if (!isRecord(value)) throw new Error("Expected models response to be an object")
  if (value.object !== "list") throw new Error("Expected models response object to be 'list'")

  const data = value.data
  if (!Array.isArray(data)) throw new Error("Expected models response data to be an array")

  return data.map(parseApiModel).map((model) => ({
    id: model.id,
    name: `${model.name} (CC)`,
    api: apiForModelId(model.id),
    reasoning: true,
    contextWindow: model.contextLength,
    maxTokens: Math.min(model.contextLength, DEFAULT_MAX_OUTPUT_TOKENS),
  }))
}

export async function fetchCommandCodeModels(
  options: FetchCommandCodeModelsOptions = {},
): Promise<readonly CommandCodeModel[]> {
  const url = options.url ?? DEFAULT_MODELS_URL
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Command Code models: ${response.status} ${response.statusText}`,
    )
  }

  const body: unknown = await response.json()
  return commandCodeModelsFromApiResponse(body)
}
