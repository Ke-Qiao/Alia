# Avatar Asset Pipeline

## Purpose

v0.2 lets `apps/web` load a local Alia Avatar VRM model while preserving the CSS
placeholder fallback. Current source assets may be UnityPackage, FBX, PSD, and
texture files, but the Web runtime consumes only the exported VRM file, not the
original source package.

## Preferred Runtime Format

The runtime format is:

```text
VRM
```

VRM is used because it carries humanoid Avatar conventions that are closer to
Booth and VRChat-compatible character workflows. GLB remains a possible future
format, but it is not loaded by the current Web runtime.

## Current Web Runtime Status

The current Web renderer order is:

```text
VRM -> placeholder fallback
```

The default model URL is `/avatar/alia.vrm`, served from:

```text
apps/web/public/avatar/alia.vrm
```

`VITE_AVATAR_MODEL_URL` may override the default URL for local experiments.
Settings show the configured URL, resolved URL, load state, active renderer, and
fallback status.

The fallback rule remains:

```text
No successfully loaded VRM -> render placeholder Avatar
```

The placeholder must keep supporting the existing modes:

- `active`
- `rest`
- `sleep`
- `idle`

The Web app starts by attempting the resolved VRM URL. If the browser cannot
load or parse that file, the renderer reports `failed`, Settings shows the
fallback state, and `AvatarView` switches to the placeholder renderer without
changing Brain-lite ownership state.

## Local Asset Directory

Local model experiments may use:

```text
apps/web/public/avatar/
```

Place the exported local model at:

```text
apps/web/public/avatar/alia.vrm
```

This file and the rest of the directory are intentionally ignored by Git except
for `.gitkeep`:

```text
apps/web/public/avatar/*
!apps/web/public/avatar/.gitkeep
```

Do not commit paid Booth assets, UnityPackage files, FBX files, PSD files,
textures, VRM exports, GLB exports, or generated derivatives unless licensing
has been reviewed and a project decision explicitly allows it.

## Expected Future Flow

The local pipeline is:

```text
Licensed source asset
  -> local Unity / Blender conversion
  -> VRM export
  -> apps/web/public/avatar/alia.vrm
  -> Web runtime loader
  -> placeholder fallback if loading fails
```

The loader must preserve Brain-lite ownership semantics:

- physical active -> Web Avatar rests with closed eyes, lowered head, and low
  presence;
- Web active -> physical bust mock sleeps;
- dual active bodies are never displayed or accepted by Web UI logic.

## Non-goals

This document does not define UnityPackage parsing, VRChat upload workflows,
production asset hosting, paid asset redistribution, model optimization
automation, GLB loading, or complex expression retargeting implementation.
