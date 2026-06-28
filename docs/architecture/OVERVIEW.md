# Architecture Overview

## Monorepo Shape

```text
apps/server
apps/web
apps/embedded-mock
packages/protocol
packages/core
```

## Responsibilities

`apps/server` is the future Brain-lite service. In v0.1 it will own system
state, active body ownership, mock perception event handling, simple proactive
policy, expression intent generation, dispatch, and explainable logs.

`apps/web` is the future Web 3D Avatar body. It should represent Alia's digital
body and support active and rest modes.

`apps/embedded-mock` is the future mock hardware runtime. It should emit scripted
sensor events and accept physical bust mock expression commands.

`packages/protocol` is the future shared contract layer for events, body
ownership state, expression intents, and dispatch payloads.

`packages/core` is the future shared domain behavior layer for ownership and
policy logic that should not be tied to a specific app runtime.

## v0.1 Flow

```text
mock perception event
  -> Brain-lite state update
  -> active body ownership check
  -> simple proactive policy
  -> expression intent
  -> Web Avatar dispatch or physical bust mock dispatch
  -> explainable decision log
```

## Boundary Rules

- Keep protocol types separate from app runtime code.
- Keep proactive policy separate from transport and rendering code.
- Keep mock hardware as a first-class app, not a throwaway script.
- Do not add real LLM, TTS, database, auth, plugin, or hardware integrations for
  the v0.1 skeleton.
