# pi-commandcode-provider

A [pi](https://github.com/badlogic/pi-mono) custom provider that connects pi to the official [Command Code Provider API](https://commandcode.ai/docs/provider-api).

> **Disclaimer:** This is an unofficial, community-maintained package. I am not affiliated with, endorsed by, or connected to Command Code in any way. This provider forwards requests to Command Code's documented Provider API using your own API key.

> **Note:** This package only provides a model _provider_. It does **not** include an API key. Command Code's Provider API requires the **Provider plan** or higher.

> 💰 **Current offers:** Command Code offers [4× usage of DeepSeek V4 Pro](https://commandcode.ai/docs/resources/pricing-limits#deepseek-v4-pro-4x-usage), [2× usage of MiniMax M3](https://commandcode.ai/docs/resources/pricing-limits#minimax-m3-2x-usage), and MiMo price cuts.

## Models

Models are fetched live from Command Code's Provider API at startup, so new Provider API models show up without a package release.

The provider uses the documented endpoints:

- `GET https://api.commandcode.ai/provider/v1/models`
- `POST https://api.commandcode.ai/provider/v1/chat/completions` for OpenAI-compatible and open-source models
- `POST https://api.commandcode.ai/provider/v1/messages` for Claude models

You can list the current Command Code models with:

```sh
pi -e index.ts --list-models
```

## Install

```sh
pi install npm:pi-commandcode-provider
```

Or shorthand:

```sh
pi install pi-commandcode-provider
```

Then reload pi:

```txt
/reload
```

### Oh My Pi

```sh
omp plugin install pi-commandcode-provider
```

Then restart OMP or run:

```txt
/reload
```

## Setup

Set your Command Code API key using one of these methods:

### 1. Browser login (recommended)

In pi, run:

```txt
/login
```

Then select **Command Code** from the provider list.

<img width="1520" height="554" alt="image" src="https://github.com/user-attachments/assets/071e929a-6f49-4803-bfec-7a31368fb12a" />

This opens Command Code in your browser and stores the returned API key in pi's auth file. If the browser shows "Copy your API key" because automatic transfer failed, copy that key and paste it into the pi terminal prompt.

> Note: `/login commandcode` is not supported by pi currently; use interactive `/login` and select Command Code.

### 2. Environment variable

```sh
export COMMANDCODE_API_KEY="user_..."
```

### 3. Auth file

Create `~/.commandcode/auth.json`:

```json
{
  "apiKey": "user_..."
}
```

The official Command Code CLI auth shape is also supported:

```json
{
  "command-code": {
    "type": "api",
    "key": "user_..."
  }
}
```

Or use a pi/OMP auth file at `~/.pi/agent/auth.json` or `~/.omp/agent/auth.json`:

```json
{
  "commandcode": "user_..."
}
```

## Usage

After installing and setting your API key, select a Command Code model in pi:

```txt
/model deepseek/deepseek-v4-flash
```

Any query will then use the Command Code API. You can list available models:

```sh
pi -e index.ts --list-models   # or /models within pi
omp -e index.ts --list-models
```

In OMP, use the provider-qualified model name:

```sh
omp -p "hello" --model commandcode/deepseek/deepseek-v4-flash
```

OMP currently resolves `--provider commandcode --model ...` before extension providers are loaded, so prefer `--model commandcode/<model-id>`. <!-- TODO: remove this note once OMP fixes provider resolution order for extension-loaded providers -->

## Model discovery

On startup, the provider fetches:

```txt
https://api.commandcode.ai/provider/v1/models
```

For tests or local mocks, override it with `COMMANDCODE_MODELS_URL`. Override the request base URL with `COMMANDCODE_API_BASE`.

## Zero data retention

Command Code supports zero data retention on the Provider API via `x-cmd-zdr: 1`. To send that header from this provider, start pi with either:

```sh
CMD_ZDR=1 pi
# or
COMMANDCODE_ZDR=1 pi
```

## Pricing

Command Code does not yet expose model pricing through its Provider API. The provider ships a static cost table (`MODEL_COSTS` in `src/pricing.ts`) for known models so that pi can display per-model pricing.

- Models present in `MODEL_COSTS` show their real per-million-token rates, including documented promotional pricing where applicable.
- Models **not** in the table fall back to zero cost. When the Provider API adds a `cost` field, the static table can be removed.

To add or update a price, edit the `MODEL_COSTS` record in `src/pricing.ts` and update `tests/test-pricing.ts`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR expectations, and commit message rules.

## Release

See [RELEASE.md](RELEASE.md) for the prerelease, npm smoke-test, stable publish, git tag, and GitHub follow-up checklist.

## License

MIT
