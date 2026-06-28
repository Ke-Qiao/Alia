# Brain-lite Server

## Purpose

`apps/server` is the v0.1 Brain-lite coordination service. It receives mock
perception events, owns minimal Alia state, enforces Active Body Ownership,
runs a deterministic proactive policy, emits abstract expression intents, and
records explainable decision logs.

This service is intentionally local-development only in v0.1. It does not
implement production auth, real hardware control, real LLM calls, TTS, STT,
database-backed memory, plugin systems, smart home automation, or agent tools.

## State

The server keeps in-memory state:

```ts
{
  activeBody: "physical" | "web" | "none";
  currentMode: "idle" | "listening" | "thinking" | "speaking" | "resting" | "sleeping";
  lastPresenceAt: string | null;
  lastInteractionAt: string | null;
  currentEmotion: "neutral" | "happy" | "curious" | "thinking" | "sleepy" | "concerned";
}
```

There is no persistence in v0.1. Restarting the server resets state and
decision logs.

## Protocol

Shared protocol contracts live in `packages/protocol/src/index.ts`.

Supported perception events:

- `presence.detected`
- `presence.left`
- `presence.lost`
- `web.session.started`
- `web.session.ended`
- `physical.interaction.started`
- `physical.interaction.ended`
- `physical.bust.available`
- `physical.bust.unavailable`
- `physical.status`
- `mock.sensor.event`
- `user.message`

Expression intents are abstract product intents:

- `greeting`
- `body.rest`
- `body.sleep`

They include target body, mode, emotion, abstract pose, reason, and optional
template text. They do not include servo angles, GPIO commands, audio playback
commands, or renderer-specific animation names.

## Active Body Ownership

The server stores a single `activeBody`, so physical and web cannot both be
active in state.

When `web.session.started` is accepted and `activeBody` is `none`:

- `activeBody` becomes `web`;
- mode becomes `listening`;
- the physical bust mock receives a `body.sleep` expression intent with
  `closed_eyes_lowered_head_safe_fixed_pose`.

When `activeBody` is `physical`, Web active requests are rejected or deferred
with a `physical_currently_active` reason and the Web Avatar remains in rest
mode.

When `physical.interaction.started` is accepted and `activeBody` is `none`:

- `activeBody` becomes `physical`;
- mode becomes `listening`;
- the Web Avatar receives a `body.rest` expression intent with
  `closed_eyes_lowered_head_low_presence`.

When `activeBody` is `web`, normal physical-side presence or mock sensor events
are rejected as active ownership requests with a `web_currently_active` reason.
The physical bust remains or enters sleep pose.

If both bodies request active ownership in the same conflict window, v0.1
resolves to physical priority and logs a `physical_priority` reason.

## Proactive Policy

`presence.detected` updates `lastPresenceAt`. If there is no active body, the
server acquires `physical` by default because the physical bust is the primary
product body.

The v0.1 policy may emit a deterministic greeting when cooldown allows:

- accepted reason: `presence_detected_cooldown_clear`;
- rejected reason: `presence_greeting_cooldown`;
- template text: `Hi, I'm here with you.`

Rejected policy decisions still create decision log entries with the event,
state before and after, reason, and cooldown metadata.

## HTTP API

Default local address:

```bash
http://127.0.0.1:3000
```

Routes:

- `GET /health` returns service status and current state.
- `GET /state` returns current state.
- `GET /logs` returns decision logs.
- `GET /events` opens an SSE stream for state updates, expression intents, and
  decision logs.
- `POST /mock/events` accepts a JSON perception event.
- `GET /mock/presence` injects `presence.detected` for CLI use.
- `POST /mock/presence` injects `presence.detected` with optional payload.
- `GET /api/v0/state` is an API alias for state.
- `POST /api/v0/web-avatar/request-active` maps to `web.session.started`.
- `POST /api/v0/web-avatar/release` maps to `web.session.ended`.
- `POST /api/v0/embedded-mock/connect` accepts embedded mock registration for
  local development.

Example mock event:

```bash
curl -X POST http://127.0.0.1:3000/mock/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"web.session.started","source":"web"}'
```

CLI-friendly presence injection:

```bash
curl http://127.0.0.1:3000/mock/presence
```

SSE stream:

```bash
curl -N http://127.0.0.1:3000/events
```

## Decision Logs

Each decision log entry records:

- triggering event id and type;
- decision kind;
- accepted or rejected status;
- human-readable reason string;
- state before and after;
- emitted expression intent ids;
- small metadata where useful.

The log is an in-memory explainability trail for v0.1 demos and tests.
