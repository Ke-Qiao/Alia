# v0.1 Vertical Slice Demo Script

This demo runs the mock-first embodied loop:

mock event -> Brain-lite ownership policy -> expression intent -> Web Avatar or
embedded physical mock -> explainable decision log.

## Prerequisites

- Node.js with the repository's configured pnpm version.
- No physical hardware is required.
- Ports `3000`, `3101`, and the Vite Web port, usually `5173`, must be free.
- Run commands from the repository root.

## Install

```bash
pnpm install
```

## Start Brain-lite Server

Terminal 1:

```bash
pnpm dev:server
```

Expected startup:

```text
Alia Brain-lite server listening on http://127.0.0.1:3000
```

## Start Web Avatar

Terminal 2:

```bash
pnpm dev:web
```

Open the Vite URL printed by the command, usually:

```text
http://127.0.0.1:5173
```

The Web Avatar connects to `http://127.0.0.1:3000/events`.

## Start Embedded Mock Receiver

Terminal 3:

```bash
pnpm dev:embedded
```

Expected receiver logs include:

```text
{"component":"embedded-mock","event":"receiver.started",...}
```

When Brain-lite is already running, the server should also log:

```text
{"component":"brain-lite","event":"embedded-mock.registered",...}
```

## Demo A: Physical Primary / Presence Greeting

Terminal 4:

```bash
pnpm demo:physical-available
pnpm demo:presence
```

Expected Brain-lite state:

- `activeBody` is `physical`.
- `currentMode` becomes `speaking` after the greeting policy runs.
- Decision logs include `presence_detected_acquired_physical_body`.
- Decision logs include `presence_detected_cooldown_clear`.

Expected Web Avatar state:

- `activeBody`: `physical`.
- `webMode`: `rest`.
- The avatar has closed eyes, lowered head, and low-presence posture.

Expected Embedded Mock logs:

- Receiver terminal logs `enterActiveMode` for the physical greeting path.
- Receiver terminal logs `lookAtUser`, `showEmotion`, and `speak`.
- The command terminal may also print the same mock physical actions from the
  Brain-lite response because the CLI applies returned intents locally for
  observability.

Useful inspection:

```bash
curl http://127.0.0.1:3000/state
curl http://127.0.0.1:3000/logs
```

## Demo B: Web Active / Physical Sleep Pose

If Demo A already made the physical bust active, release ownership first:

```bash
pnpm demo:presence-lost
```

Then request Web Avatar ownership:

```bash
pnpm demo:web-active
```

Expected Brain-lite state:

- `activeBody` is `web`.
- Decision logs include `web_session_acquired_active_body`.
- Server logs include `embedded.dispatch.sent` for a physical `body.sleep`
  intent.

Expected Web Avatar state:

- `activeBody`: `web`.
- `webMode`: `active`.
- `physicalMode`: `sleep`.

Expected Embedded Mock logs:

- Receiver terminal logs `enterSleepPose`.
- Sleep details include lowered head, closed eyes, and mock fixed safe servo
  angles.
- No real servo, GPIO, camera, microphone, speaker, TTS, or hardware driver is
  used.

## Demo C: Physical Unavailable / Web Fallback

Reset to no active body if needed:

```bash
pnpm demo:presence-lost
```

Mark the physical bust mock unavailable:

```bash
pnpm demo:physical-unavailable
```

Optional: prove physical presence is rejected while unavailable:

```bash
pnpm demo:presence
```

Then request Web ownership:

```bash
pnpm demo:web-active
```

Expected Brain-lite state:

- Physical unavailability does not automatically make Web active.
- The optional presence command keeps `activeBody` as `none` and logs
  `physical_unavailable_presence_rejected`.
- `pnpm demo:web-active` changes `activeBody` to `web`.
- Decision logs include `physical_unavailable_web_fallback_acquired`.

Expected Web Avatar state:

- Before `demo:web-active`: `webMode` is `idle` or `rest`, depending on the
  previous release state.
- After `demo:web-active`: `webMode` is `active`.
- `physicalMode` is `sleep`.

Expected Embedded Mock logs:

- `demo:physical-unavailable` logs a mock availability event.
- The optional rejected presence path logs physical sleep intent handling.
- `demo:web-active` logs `enterSleepPose`.

## Dry-Run Commands

Dry runs print the protocol envelope that would be posted, without requiring a
running server and without changing Brain-lite state.

```bash
pnpm demo:presence -- --dry-run
pnpm demo:physical-available -- --dry-run
pnpm demo:physical-unavailable -- --dry-run
pnpm demo:web-active -- --dry-run
```

## Expected Server Logs

The server always prints startup text. With the embedded receiver running, it
also prints JSON lines similar to:

```text
{"component":"brain-lite","event":"embedded-mock.registered","details":{"callbackUrl":"http://127.0.0.1:3101/expression-intents",...}}
{"component":"brain-lite","event":"embedded.dispatch.sent","details":{"dispatch":{"kind":"expression.intent","intentKind":"greeting","target":"physical"}}}
{"component":"brain-lite","event":"embedded.dispatch.sent","details":{"dispatch":{"kind":"expression.intent","intentKind":"body.sleep","target":"physical"}}}
```

Decision logs are available through:

```bash
curl http://127.0.0.1:3000/logs
```

## Troubleshooting

- If Web shows `offline`, confirm `pnpm dev:server` is running on
  `http://127.0.0.1:3000`.
- If the embedded receiver logs `brain-lite.connection.failed`, start
  Brain-lite first or restart `pnpm dev:embedded`.
- If `demo:web-active` is rejected, the physical body is probably still active.
  Run `pnpm demo:presence-lost` or restart Brain-lite.
- If `demo:presence` does not activate physical, check whether
  `pnpm demo:physical-unavailable` was run. Use
  `pnpm demo:physical-available` to make the mock physical bust available
  again.
- If a port is already in use, stop the old process or set the documented env
  vars: `PORT`, `EMBEDDED_MOCK_PORT`, or `VITE_BRAIN_LITE_URL`.

## Known Limitations

- All state and decision logs are in memory.
- The Web Avatar is a CSS-rendered placeholder digital body.
- Embedded Mock logs actions only; it does not drive hardware.
- No real LLM, TTS, STT, database, auth, smart home, plugin marketplace,
  VRChat integration, or long-term memory is included in v0.1.
- Server-to-embedded dispatch is best-effort local HTTP for demo integration.
- Dry-run commands do not update server state or Web Avatar state.
