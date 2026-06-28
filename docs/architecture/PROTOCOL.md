# v0.1 Shared Event Protocol

The shared protocol is the small event contract between mock perception sources,
Brain-lite, embodiment ownership, expression dispatch, the Web Avatar, and the
physical bust mock.

The package lives in `packages/protocol` and exports TypeScript event unions,
body target constants, and lightweight runtime validation for boundary checks.
It is not a plugin system, automation platform, memory store, or hardware
driver API.

## Event Shape

Every event uses the same envelope:

```ts
{
  id: string;
  type: string;
  occurredAt: string;
  source: { kind: "brain" | "web" | "physical" | "mock.hardware" | "mock.script"; id?: string };
  correlationId?: string;
  payload: object;
}
```

Body targets are:

- `physical`
- `web`
- `both`
- `none`

Only active ownership uses the stricter active body set:

- `physical`
- `web`
- `none`

`both` is valid as a dispatch target but never valid as the active body.

## Event Categories

### Perception Events

- `presence.detected`
- `presence.left`
- `presence.lost`
- `user.message`
- `web.session.started`
- `web.session.ended`
- `web.acquire_requested`
- `physical.acquire_requested`
- `physical.interaction.started`
- `physical.interaction.ended`
- `physical.bust.available`
- `physical.bust.unavailable`
- `physical.status`
- `mock.sensor.event`

`mock.sensor.event` and source kinds `mock.hardware` / `mock.script` make mock
hardware a first-class input for v0.1.

### Brain Events

- `brain.state.updated`
- `brain.decision.logged`
- `brain.proactive_trigger.accepted`
- `brain.proactive_trigger.rejected`

Brain events expose state transitions, proactive policy results, and explainable
decision logs without introducing real LLM, database, or memory integrations.

### Embodiment Ownership Events

- `embodiment.acquire_requested`
- `embodiment.release_requested`
- `embodiment.active_body.changed`

`embodiment.active_body.changed` must include `previous`, `next`, and a
structured `reason`. If both bodies request ownership, the event can include a
`conflict` object with the requested bodies, resolved active body, and rule.

### Expression Intent Events

- `expression.enter_active_mode`
- `expression.enter_rest_mode`
- `expression.enter_sleep_pose`
- `expression.look_at_user`
- `expression.speak`
- `expression.show_emotion`
- `expression.idle_motion`

These are intents, not renderer commands. The server decides ownership and
targets; body runtimes render or simulate the assigned mode.

## v0.1 Example Event Flow

1. Mock hardware emits `mock.sensor.event` with `name: "user_approached"`.
2. Brain-lite emits `brain.state.updated` with `userPresent: true`.
3. Brain-lite emits `embodiment.acquire_requested` for `physical`.
4. Brain-lite resolves ownership and emits `embodiment.active_body.changed`.
5. Brain-lite emits `brain.proactive_trigger.accepted`.
6. Brain-lite emits `expression.enter_active_mode` targeting `physical`.
7. Brain-lite emits `expression.enter_rest_mode` targeting `web`.
8. Brain-lite emits `expression.show_emotion` or `expression.speak` for the
   active body.
9. Brain-lite emits `brain.decision.logged` with the reason and target.

## Active Body Ownership Sequence

When the physical bust becomes active:

```json
{
  "id": "evt-ownership-1",
  "type": "embodiment.active_body.changed",
  "occurredAt": "2026-06-28T12:00:00.000Z",
  "source": { "kind": "brain" },
  "payload": {
    "previous": "web",
    "next": "physical",
    "reason": {
      "code": "conflict_resolved",
      "detail": "Physical bust is available and has v0.1 product priority."
    },
    "conflict": {
      "requested": ["physical", "web"],
      "resolvedTo": "physical",
      "rule": "physical_priority"
    }
  }
}
```

The paired expression intents should make the active and inactive body modes
explicit:

```json
{
  "id": "evt-expression-1",
  "type": "expression.enter_active_mode",
  "occurredAt": "2026-06-28T12:00:01.000Z",
  "source": { "kind": "brain" },
  "correlationId": "evt-ownership-1",
  "payload": {
    "target": "physical",
    "reason": "Physical bust owns active expression."
  }
}
```

```json
{
  "id": "evt-expression-2",
  "type": "expression.enter_rest_mode",
  "occurredAt": "2026-06-28T12:00:01.000Z",
  "source": { "kind": "brain" },
  "correlationId": "evt-ownership-1",
  "payload": {
    "target": "web",
    "reason": "Web Avatar rests while physical bust is active."
  }
}
```

When the Web Avatar becomes active, the inactive physical bust should receive
`expression.enter_sleep_pose` with `pose: "fixed_safe_sleep"`.

## Mock Sensor Event Sequence

Example user approach:

```json
{
  "id": "evt-mock-1",
  "type": "mock.sensor.event",
  "occurredAt": "2026-06-28T12:00:00.000Z",
  "source": { "kind": "mock.hardware", "id": "scripted-presence-sensor" },
  "payload": {
    "name": "user_approached",
    "bodyTarget": "physical",
    "reading": {
      "distanceCm": 80
    }
  }
}
```

Brain-lite may normalize that into a perception event:

```json
{
  "id": "evt-presence-1",
  "type": "presence.detected",
  "occurredAt": "2026-06-28T12:00:00.100Z",
  "source": { "kind": "brain" },
  "correlationId": "evt-mock-1",
  "payload": {
    "bodyTarget": "physical",
    "confidence": 0.9
  }
}
```

Then Brain-lite updates state, evaluates ownership, emits expression intents,
and records `brain.decision.logged`.
