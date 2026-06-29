# Embedded Mock

`apps/embedded-mock` is the v0.1 mock runtime for Alia's physical bust body.
It is a first-class app, not a temporary throwaway script, because the current
vertical slice must work while physical hardware is unavailable.

## Responsibilities

- emit mock sensor events to Brain-lite;
- receive expression intents and ownership assignments for the physical body;
- log physical body actions instead of driving hardware;
- represent the physical sleep pose required by Active Body Ownership;
- keep future hardware concepts visible without implementing real drivers.

## Sensor Events

The CLI emits these v0.1 mock events:

- `presence.detected`
- `presence.lost`
- `mock.sensor.event`
- `physical.bust.available`
- `physical.bust.unavailable`

By default events are posted to:

```text
POST http://127.0.0.1:3000/mock/events
```

The Brain-lite base URL can be changed with `BRAIN_LITE_URL` or `--brain-url`.
The event path can be changed with `BRAIN_LITE_SENSOR_EVENTS_PATH` or
`--sensor-path`.

Useful scripts:

```bash
pnpm --filter @alia/embedded-mock mock:presence
pnpm --filter @alia/embedded-mock mock:presence-lost
pnpm --filter @alia/embedded-mock mock:event -- --payload '{"name":"manual_button"}'
pnpm --filter @alia/embedded-mock mock:physical-available
pnpm --filter @alia/embedded-mock mock:physical-unavailable
pnpm --filter @alia/embedded-mock mock:web-active-conflict-test
```

`mock:web-active-conflict-test` posts a `web.session.started` event to the same
Brain-lite mock event endpoint so the current server can assign Web Avatar as
active and return the physical `body.sleep` intent.

`mock:physical-available` and `mock:physical-unavailable` emit shared protocol
envelope events with `type` set to `physical.bust.available` or
`physical.bust.unavailable`. Their payload includes `status`, `isMock: true`,
and an optional `detail` string. These commands are mock-only availability
reports for Brain-lite ownership policy; they do not probe real hardware.

Dry-run mode logs the generated event without requiring a running Brain-lite
server:

```bash
pnpm --filter @alia/embedded-mock mock:physical-available -- --dry-run
pnpm --filter @alia/embedded-mock mock:physical-unavailable -- --dry-run
```

## Receiving Brain-lite Dispatch

The receiver command starts a local HTTP runtime for the physical body:

```text
GET  /health
POST /expression-intents
POST /ownership
```

On startup it attempts to register with Brain-lite at:

```text
POST http://127.0.0.1:3000/api/v0/embedded-mock/connect
```

Registration includes the physical callback URL, supported expression intent
kinds, supported physical action names, and the conceptual sleep pose. If the
server is not running, the receiver continues locally and logs the connection
failure.

## Physical Action Log

The mock logs these physical actions as JSON lines:

- `enterActiveMode`
- `enterRestMode`
- `enterSleepPose`
- `lookAtUser`
- `speak`
- `showEmotion`

The log is the actuator surface for v0.1. `speak` does not call TTS, `lookAtUser`
does not use a camera, and mode changes do not drive servos.

## Web Avatar Active Behavior

Brain-lite owns active body state. When the physical runtime receives an
ownership assignment where `activeBody` is `web`, it logs `enterSleepPose`.

The physical sleep pose is represented conceptually as:

```json
{
  "head": "lowered",
  "eyes": "closed",
  "safeServoFixedAngles": {
    "headTilt": 15,
    "neckPan": 0,
    "eyelids": 100
  },
  "servoControl": "mock-fixed-safe-pose"
}
```

These angles are embedded-mock runtime placeholders only. The shared protocol
uses the abstract `fixed_safe_sleep` pose and does not expose servo angles.
These values are not calibration values and must not be connected to real servo
control without a future safety decision that documents limits, timeouts,
calibration, and an emergency stop path.

## Future Real Hardware Mapping

The mock action boundary is intended to map to future hardware services:

- `enterActiveMode`: wake posture and safe neutral head/eye state;
- `enterRestMode`: low-presence physical posture;
- `enterSleepPose`: fixed conservative servo pose while Web Avatar is active;
- `lookAtUser`: future camera or sensor-based gaze targeting;
- `speak`: future TTS and speaker output;
- `showEmotion`: future face, eye, LED, or micro-expression output.

Future hardware code should replace only the action implementation layer. Sensor
event names, expression intent handling, and Active Body Ownership behavior
should remain shared protocol concepts.

The physical availability commands are the mock-first shape for future hardware
availability reporting. A future real hardware bridge may report equivalent
`physical.bust.available` and `physical.bust.unavailable` protocol events after
checking actual device state, but this v0.1 runtime only emits scripted mock
availability events.

## Explicit Non-goals

The embedded mock does not implement:

- GPIO;
- serial communication;
- real camera input;
- real microphone input;
- real servo drivers;
- real TTS.
