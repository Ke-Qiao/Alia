# Web Avatar

## Purpose

The Web Avatar is Alia's digital body. It is not an admin dashboard and it must
not behave like a generic assistant shell. In v0.2 the Web app can load a local
VRM Avatar runtime while preserving all v0.1 Brain-lite ownership behavior.

The runtime first attempts to render a local VRM model. If loading fails, the
CSS placeholder body remains the mandatory fallback and keeps the same body-mode
contract.

## Runtime Structure

`apps/web/src/App.tsx` owns the Brain-lite connection and command flow:

- subscribes to Brain-lite Server-Sent Events;
- stores the latest `AliaState`, decision log, and expression intent;
- requests or releases Web body ownership through Brain-lite;
- passes derived view models to UI components.

The UI is split by responsibility:

- `AvatarView`: main digital body stage and renderer selection.
- `VrmAvatarRenderer`: local VRM loader and minimal body-mode / emotion mapping.
- `PlaceholderAvatarRenderer`: CSS fallback body.
- `DebugPanel`: compact observability area for Brain-lite state.
- `SettingsPanel`: Avatar asset status and runtime model configuration.
- `DemoControls`: manual demo controls kept outside the Avatar stage.
- `avatarModel.ts`: pure ownership and placeholder state helpers.
- `avatarAssets.ts`: pure model URL normalization, renderer selection, and
  fallback status helpers.

Demo controls must remain secondary to the Avatar experience. They may appear in
debug or settings surfaces, but not as the primary content of the Avatar stage.

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

These endpoints map to the same mock perception events used by the server:

- `web.session.started`
- `web.session.ended`

## Body Modes

The Web Avatar renders four body modes:

- `active`: Web body is the active body.
- `rest`: Physical bust is the active body, so the Web Avatar closes eyes,
  lowers its head, and reduces presence.
- `sleep`: Explicit Web sleep state.
- `idle`: No body is active or the server is unavailable.

The Web Avatar derives its rendered mode from Brain-lite ownership state:

```text
activeBody=web            -> Web Avatar active
activeBody=physical       -> Web Avatar rest
currentMode=sleeping      -> Web Avatar sleep
currentMode=resting       -> Web Avatar rest
default activeBody=none   -> Web Avatar idle
```

This keeps Brain-lite as the owner of active body state while ensuring the Web
body never appears active when the physical bust owns embodiment. When the Web
body is active, the derived physical body mode is `sleep`, preserving the
single-active-body rule in the UI.

## Runtime Model

The default runtime model URL is:

```text
/avatar/alia.vrm
```

This maps to the local file:

```text
apps/web/public/avatar/alia.vrm
```

`VITE_AVATAR_MODEL_URL` may override the default URL when a different local or
served model path is needed. The renderer reports three states:

- `loading avatar`
- `VRM avatar active`
- `model load failed` with `using placeholder fallback`

VRM mode mapping is intentionally minimal:

- `active`: upright model, looking forward where the model supports it.
- `rest`: lowered head, reduced presence, blink / sleepy eyes where supported.
- `sleep`: lowered head, closed eyes, lowest presence.
- `idle`: slightly lowered / quiet pose.

Emotion mapping uses standard VRM expressions when present:

- `neutral`
- `happy`
- `curious`
- `sleepy`
- `concerned`

If a VRM does not include a matching expression, that part of the mapping is
skipped and the model still renders. Speaking uses the existing subtitle surface
and a light mouth expression when the VRM supports it.

## Visible State

The debug panel must keep showing the v0.1 observability fields:

- `activeBody`
- `currentMode`
- derived `webMode`
- derived `physicalMode`
- `currentEmotion`
- latest decision log
- latest expression intent
- Web activation feedback

The settings area also shows Avatar Asset Status:

- current renderer: `vrm` or `placeholder`
- runtime model format: `VRM`
- configured model URL, when `VITE_AVATAR_MODEL_URL` is set
- resolved model URL, defaulting to `/avatar/alia.vrm`
- model load state
- fallback status

## Asset Safety

Paid or licensed Avatar source assets must not be committed. The local drop
directory is:

```text
apps/web/public/avatar/
```

`.gitignore` excludes everything under that directory except `.gitkeep`.
Root-level `.vrm`, `.glb`, UnityPackage, FBX, and PSD files are also ignored to
reduce the chance of accidentally committing local paid assets or derivatives.

## Non-goals

The v0.2 Web Avatar runtime does not include GLB loading, UnityPackage parsing,
full VRChat integration, production auth, LLM, TTS, database storage, plugin
systems, smart home integrations, or real hardware drivers.

## Test Scope

`@alia/web` uses Node built-in tests for pure body mode, developer panel,
placeholder expression, renderer selection, model URL, and fallback status
helper logic. SSE rendering, WebGL rendering, and browser DOM updates are not
covered by automated tests because the current app intentionally avoids adding a
heavy browser test framework.
