# pi-commandcode-provider

A [pi](https://github.com/badlogic/pi-mono) custom provider that connects pi to the official [Command Code Provider API](https://commandcode.ai/docs/provider-api).

> **Disclaimer:** This is an unofficial, community-maintained package. I am not affiliated with, endorsed by, or connected to Command Code in any way. This provider simply forwards requests to the public Command Code API using your own API key.

> **Note:** This package only provides a model _provider_. It does **not** include an API key. You must bring your own Command Code API key and a plan that can use the Provider API.

> 💰 **Current offers:** Command Code offers [4× usage of DeepSeek V4 Pro](https://commandcode.ai/docs/resources/pricing-limits#deepseek-v4-pro-4x-usage) and [2× usage of Qwen 3.7 Max](https://commandcode.ai/docs/resources/pricing-limits#qwen-3.7-max-2x-usage).

## Models

Models are fetched live from Command Code's Provider API at startup, so new models like Qwen 3.7 Max show up without a package release.

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

## Setup

Set your Command Code API key using one of these methods:

### 1. Login flow: paste API key (recommended)

In pi, run:

```txt
/login
```

Then select **Command Code** from the provider list. Type `key` or paste your Studio API key directly. The key is stored in pi's auth file.

> Recommended: use a Command Code Studio API key with the official Provider API.

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

Or use pi's auth file at `~/.pi/agent/auth.json`:

```json
{
  "commandcode": "user_..."
}
```

### Legacy browser-assisted login

The previous browser-assisted login flow is still available by pressing Enter at the Command Code login prompt. It opens Command Code in your browser and waits for the returned API key.

> Warning: this legacy browser flow follows Command Code's CLI auth flow. In [#5](https://github.com/patlux/pi-commandcode-provider/issues/5), Command Code warned that use of reverse-engineered/internal paths may lead to accounts being banned. Prefer the API key flow above with the official Provider API.
>
> Note: `/login commandcode` is not supported by pi currently; use interactive `/login` and select Command Code.

## Usage

After installing and setting your API key, select a Command Code model in pi:

```txt
/model deepseek/deepseek-v4-flash
```

Any query will then use the Command Code API. You can list available models within pi:

```txt
/models
```

## Provider API

The provider uses the official Command Code Provider API:

```txt
https://api.commandcode.ai/provider/v1
```

On startup, it fetches models from `/models`. Non-Claude models use `/chat/completions`; Claude models use `/messages`.

For tests or local mocks, override the API base with `COMMANDCODE_API_BASE` and the model-list URL with `COMMANDCODE_MODELS_URL`.

## Publish

```sh
npm login
npm publish --access public
```

## License

MIT
