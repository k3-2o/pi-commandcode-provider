# Changelog

## 0.2.0 - 2026-05-27

- Stream `reasoning-delta` events incrementally instead of buffering the full thinking block until `reasoning-end`. Emits `thinking_start`, `thinking_delta`, and `thinking_end` events as they arrive so the UI can show reasoning in real time.
- Close open text blocks on `reasoning-start` and `reasoning-delta` so thinking and text never overlap in the output.
- Add live display pricing (`MODEL_COSTS`) for known Command Code models. Cost falls back to zero for models not yet in the price table until the Provider API exposes pricing directly.
- Fetch models from the Command Code Provider API at startup (inherited from upstream 0.1.1) and overlay the static cost table.

## 0.1.1 - 2026-05-26

- Align Command Code generate requests with CLI `0.27.2` headers and payload shape.
- Support official Command Code CLI auth files using the `command-code` credential key.
- Handle `reasoning-start` and ignore streamed `tool-result` events.
- Cap generated `max_tokens` by the selected model and the Command Code output limit.

## 0.1.0 - 2026-05-05

- Initial public release.
