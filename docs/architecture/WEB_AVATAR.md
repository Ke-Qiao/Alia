# Web Avatar

## Purpose

The Web Avatar is Alia's digital body for v0.1. It is not an admin dashboard,
although it includes a small developer panel so the vertical slice can be
observed during development.

The first implementation uses a CSS-rendered placeholder 3D body. A VRM asset
can replace the placeholder later without changing the active body ownership
contract.

## Brain-lite Connection

The Web app connects to the Brain-lite server with Server-Sent Events at:

```text
GET /events
```

The server currently emits:

- `state.updated` with the current `AliaState`.
- `decision.logged` with an explainable `DecisionLogEntry`.
- `expression.intent` with the latest `ExpressionIntent`.

The Web app can request and release ownership through Brain-lite API aliases:

```text
POST /api/v0/web-avatar/request-active
POST /api/v0/web-avatar/release
```

These endpoints map to the same v0.1 mock perception events used by the server:

- `web.session.started`
- `web.session.ended`

## Body Modes

The Web Avatar renders four body modes:

- `active`: Web body is the active body.
- `rest`: Physical bust is the active body, so the Web Avatar closes eyes,
  lowers its head, and reduces presence.
- `sleep`: Reserved for explicit Web sleep state.
- `idle`: No body is active or the server is unavailable.

The Web Avatar derives its rendered mode from Brain-lite ownership state:

```text
activeBody=web      -> Web Avatar active
activeBody=physical -> Web Avatar rest
activeBody=none     -> Web Avatar idle
```

This keeps Brain-lite as the owner of active body state while ensuring the Web
body never appears active when the physical bust owns embodiment.

## Developer Panel

The panel shows only v0.1 observability fields:

- `activeBody`
- `currentMode`
- `currentEmotion`
- physical body mode
- last decision log
- latest expression intent

It also exposes two manual controls:

- Request Web body activation.
- Release Web body activation.

## Non-goals

The v0.1 Web Avatar does not include full VRChat integration, production
authentication, a complex VRM expression system, accounts, or chat UI.
