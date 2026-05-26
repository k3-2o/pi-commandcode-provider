import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { apiForModelId, baseUrlForModel, commandCodeModelsFromApiResponse } from "../src/models.ts"

describe("apiForModelId()", () => {
  it("routes Claude models to Anthropic Messages and other models to OpenAI Chat Completions", () => {
    assert.equal(apiForModelId("claude-sonnet-4-6"), "anthropic-messages")
    assert.equal(apiForModelId("Qwen/Qwen3.7-Max"), "openai-completions")
    assert.equal(apiForModelId("deepseek/deepseek-v4-flash"), "openai-completions")
  })
})

describe("baseUrlForModel()", () => {
  it("uses the Provider API /v1 base for OpenAI-compatible models and strips /v1 for Anthropic SDK models", () => {
    assert.equal(
      baseUrlForModel("https://api.commandcode.ai/provider/v1", "openai-completions"),
      "https://api.commandcode.ai/provider/v1",
    )
    assert.equal(
      baseUrlForModel("https://api.commandcode.ai/provider/v1", "anthropic-messages"),
      "https://api.commandcode.ai/provider",
    )
  })
})

describe("commandCodeModelsFromApiResponse()", () => {
  it("converts the Provider API model list to pi models", () => {
    const models = commandCodeModelsFromApiResponse({
      object: "list",
      data: [
        {
          id: "Qwen/Qwen3.7-Max",
          object: "model",
          created: 1779824324,
          owned_by: "command-code",
          name: "Qwen 3.7 Max",
          context_length: 1_000_000,
        },
      ],
    })

    assert.deepEqual(models, [
      {
        id: "Qwen/Qwen3.7-Max",
        name: "Qwen 3.7 Max (CC)",
        api: "openai-completions",
        reasoning: true,
        contextWindow: 1_000_000,
        maxTokens: 65_536,
      },
    ])
  })

  it("rejects unexpected API shapes", () => {
    assert.throws(() => commandCodeModelsFromApiResponse({ object: "list", data: [{}] }))
  })
})
