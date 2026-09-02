/**
 * Abort tests against the real streamCommandCode core.
 */

import assert from "node:assert/strict"
import { after, before, beforeEach, describe, it } from "node:test"

import type { AssistantMessageEvent } from "../src/core.ts"

import {
  collectEvents,
  createTestDeps,
  makeContext,
  makeModel,
  startMockCommandCodeServer,
  type MockCommandCodeServer,
} from "./helpers.ts"

let server: MockCommandCodeServer

before(async () => {
  server = await startMockCommandCodeServer()
})

after(async () => {
  await server.close()
})

beforeEach(() => {
  server.reset()
})

describe("streamCommandCode — abort behavior", () => {
  it("emits aborted error when signal is already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    const { streamCommandCode } = createTestDeps({ apiBase: server.baseUrl() })

    const events = await collectEvents(
      streamCommandCode(makeModel(), makeContext(), {
        apiKey: "mock-key",
        signal: controller.signal,
      }),
    )

    assert.deepEqual(
      events.map((event) => event.type),
      ["start", "error"],
    )
    const error = events.at(-1)
    assert.equal(error?.type, "error")
    if (error?.type !== "error") throw new Error("expected error")
    assert.equal(error.reason, "aborted")
    assert.equal(error.error.stopReason, "aborted")
    assert.equal(server.requestCount(), 0)
  })

  it("emits aborted error and cancels the response reader mid-stream", async () => {
    server.mockResponse({
      type: "success",
      events: [JSON.stringify({ type: "text-delta", text: "first" })],
      hangAfterLast: true,
    })
    const controller = new AbortController()
    const { streamCommandCode } = createTestDeps({ apiBase: server.baseUrl() })

    const stream = streamCommandCode(makeModel(), makeContext(), {
      apiKey: "mock-key",
      signal: controller.signal,
    })

    // Abort deterministically as soon as the first delta arrives, instead of
    // racing a fixed timer: the upstream response hangs after that delta, so
    // aborting right then proves the reader is cancelled mid-stream.
    const eventsPromise = (async () => {
      const events: AssistantMessageEvent[] = []
      for await (const event of stream) {
        events.push(event)
        if (event.type === "text_delta") controller.abort()
        if (event.type === "done" || event.type === "error") break
      }
      return events
    })()
    const events = await Promise.race([
      eventsPromise,
      new Promise<AssistantMessageEvent[]>((_, reject) => {
        setTimeout(
          () => reject(new Error("Timed out collecting stream events after 2000ms")),
          2_000,
        )
      }),
    ])

    assert.ok(
      events.some((event) => event.type === "text_delta"),
      "stream should process data before abort",
    )
    const error = events.at(-1)
    assert.equal(error?.type, "error")
    if (error?.type !== "error") throw new Error("expected error")
    assert.equal(error.reason, "aborted")
    assert.equal(error.error.errorMessage, "Request aborted")
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.ok(server.responseClosedBeforeEnd(), "abort should close the hanging upstream response")
  })
})
