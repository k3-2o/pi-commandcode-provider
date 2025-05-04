/**
 * Command Code provider for pi.
 * Connects pi to Command Code's API (https://api.commandcode.ai/alpha/generate).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const API_BASE = "https://api.commandcode.ai";

// ---------------------------------------------------------------------------
// Model definitions
// ---------------------------------------------------------------------------

const MODELS = [
  // Premium (Anthropic)
  { id: "claude-opus-4-7", name: "Claude Opus 4.7 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 32_000 },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 32_000 },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 16_384 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 8_192 },
  // Premium (OpenAI)
  { id: "gpt-5.5", name: "GPT-5.5 (CC)", reasoning: true, contextWindow: 256_000, maxTokens: 128_000 },
  { id: "gpt-5.4", name: "GPT-5.4 (CC)", reasoning: true, contextWindow: 256_000, maxTokens: 128_000 },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex (CC)", reasoning: true, contextWindow: 256_000, maxTokens: 128_000 },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini (CC)", reasoning: false, contextWindow: 256_000, maxTokens: 128_000 },
  // Open-source
  { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro (CC)", reasoning: true, contextWindow: 1_000_000, maxTokens: 384_000 },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash (CC)", reasoning: true, contextWindow: 1_000_000, maxTokens: 384_000 },
  { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6 (CC)", reasoning: true, contextWindow: 262_144, maxTokens: 131_072 },
  { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5 (CC)", reasoning: true, contextWindow: 262_144, maxTokens: 131_072 },
  { id: "zai-org/GLM-5.1", name: "GLM-5.1 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 131_072 },
  { id: "zai-org/GLM-5", name: "GLM-5 (CC)", reasoning: true, contextWindow: 200_000, maxTokens: 131_072 },
  { id: "MiniMaxAI/MiniMax-M2.7", name: "MiniMax M2.7 (CC)", reasoning: true, contextWindow: 1_048_576, maxTokens: 131_072 },
  { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5 (CC)", reasoning: true, contextWindow: 1_048_576, maxTokens: 131_072 },
  { id: "Qwen/Qwen3.6-Max-Preview", name: "Qwen 3.6 Max (CC)", reasoning: true, contextWindow: 1_000_000, maxTokens: 131_072 },
  { id: "Qwen/Qwen3.6-Plus", name: "Qwen 3.6 Plus (CC)", reasoning: true, contextWindow: 1_000_000, maxTokens: 131_072 },
];

// ---------------------------------------------------------------------------
// Typebox → JSON Schema conversion
// ---------------------------------------------------------------------------

function toJsonSchema(schema: any): any {
  if (!schema) return {};
  const s = schema as Record<string, any>;
  const kind = s.kind ?? s.type;

  if (s.enum) {
    return { type: typeof s.enum[0], enum: s.enum };
  }

  switch (kind) {
    case "string":
    case "String":
      return { type: "string" };
    case "number":
    case "Number":
      return { type: "number" };
    case "boolean":
    case "Boolean":
      return { type: "boolean" };
    case "object":
    case "Object": {
      const props: Record<string, any> = {};
      const inferredRequired: string[] = [];
      if (s.properties) {
        for (const [k, v] of Object.entries(s.properties)) {
          props[k] = toJsonSchema(v);
          if (!(v as any).optional && !s.optional?.includes?.(k))
            inferredRequired.push(k);
        }
      }
      const required = Array.isArray(s.required) ? s.required : inferredRequired;
      const out: any = { type: "object" };
      if (Object.keys(props).length) out.properties = props;
      if (required.length) out.required = required;
      return out;
    }
    case "array":
    case "Array":
      return { type: "array", items: toJsonSchema(s.items ?? s.element) };
    case "union":
    case "Union": {
      const variants = s.variants ?? s.anyOf ?? [];
      for (const v of variants) {
        const schema = toJsonSchema(v);
        if (schema && Object.keys(schema).length) return schema;
      }
      return {};
    }
    case "optional":
    case "Optional":
      return toJsonSchema(s.wrapped ?? s.inner);
    default:
      return {};
  }
}

function toolsToJson(tools: any[]): any[] {
  if (!tools) return [];
  return tools.map((t) => {
    const schema = t.parameters ? toJsonSchema(t.parameters) : {};
    return {
      type: "function",
      name: t.name,
      description: t.description,
      input_schema: schema,
    };
  });
}

function messagesToCC(msgs: any[]): any[] {
  const out: any[] = [];
  for (const m of msgs) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: typeof m.content === "string" ? m.content : m.content,
      });
    } else if (m.role === "assistant") {
      const parts: any[] = [];
      for (const c of m.content) {
        if (c.type === "text") {
          parts.push({ type: "text", text: c.text });
        } else if (c.type === "thinking") {
          parts.push({ type: "reasoning", text: c.thinking });
        } else if (c.type === "toolCall") {
          parts.push({
            type: "tool-call",
            toolCallId: c.id,
            toolName: c.name,
            input: c.arguments,
          });
        }
      }
      out.push({ role: "assistant", content: parts });
    } else if (m.role === "toolResult") {
      const text = (m.content ?? [])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text ?? "")
        .join("\n");
      out.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: m.toolCallId,
            toolName: m.toolName,
            output: m.isError
              ? { type: "error-text", value: text }
              : { type: "text", value: text },
          },
        ],
      });
    }
  }
  return out;
}

function getEnvironmentInfo(): string {
  return `${process.platform}-${process.arch}, Node.js ${process.version}`;
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerProvider("commandcode", {
    name: "Command Code",
    baseUrl: API_BASE,
    api: "commandcode-custom" as any,
    headers: {
      "x-command-code-version": "0.24.1",
      "x-cli-environment": "production",
    },
    models: MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      reasoning: m.reasoning,
      input: ["text"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
    })),
  });
}
