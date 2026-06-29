export const DEFAULT_AVATAR_MODEL_URL = "/avatar/alia.vrm";
export const AVATAR_EXPECTED_MODEL_FORMAT = "VRM";
export const AVATAR_EXPECTED_FUTURE_MODEL_FORMAT = "VRM preferred, GLB fallback";

export type AvatarRendererKind = "placeholder" | "vrm";
export type AvatarModelLoadState = "loading" | "ready" | "failed";

export interface AvatarAssetStatus {
  currentRenderer: AvatarRendererKind;
  expectedModelFormat: typeof AVATAR_EXPECTED_MODEL_FORMAT;
  expectedFutureModelFormat: typeof AVATAR_EXPECTED_FUTURE_MODEL_FORMAT;
  configuredModelUrl: string | null;
  resolvedModelUrl: string;
  modelLoadState: AvatarModelLoadState;
  fallbackStatus: string;
}

export interface AvatarRendererSelection {
  renderer: AvatarRendererKind;
  modelUrl: string;
  statusLabel: "loading avatar" | "VRM avatar active" | "model load failed";
  fallbackLabel: "using placeholder fallback" | null;
}

export function getAvatarAssetStatus(
  configuredModelUrl: string | null | undefined,
  modelLoadState: AvatarModelLoadState,
): AvatarAssetStatus {
  const normalizedModelUrl = normalizeConfiguredModelUrl(configuredModelUrl);
  const resolvedModelUrl = normalizedModelUrl ?? DEFAULT_AVATAR_MODEL_URL;
  const selection = getAvatarRendererSelection(
    resolvedModelUrl,
    modelLoadState,
  );

  return {
    currentRenderer: selection.renderer,
    expectedModelFormat: AVATAR_EXPECTED_MODEL_FORMAT,
    expectedFutureModelFormat: AVATAR_EXPECTED_FUTURE_MODEL_FORMAT,
    configuredModelUrl: normalizedModelUrl,
    resolvedModelUrl,
    modelLoadState,
    fallbackStatus: getAvatarFallbackStatus(modelLoadState),
  };
}

export function getAvatarModelUrl(
  configuredModelUrl: string | null | undefined,
): string {
  return (
    normalizeConfiguredModelUrl(configuredModelUrl) ?? DEFAULT_AVATAR_MODEL_URL
  );
}

export function getAvatarRendererSelection(
  modelUrl: string,
  modelLoadState: AvatarModelLoadState,
): AvatarRendererSelection {
  if (modelLoadState === "failed") {
    return {
      renderer: "placeholder",
      modelUrl,
      statusLabel: "model load failed",
      fallbackLabel: "using placeholder fallback",
    };
  }

  return {
    renderer: "vrm",
    modelUrl,
    statusLabel:
      modelLoadState === "ready" ? "VRM avatar active" : "loading avatar",
    fallbackLabel: null,
  };
}

export function getAvatarFallbackStatus(
  modelLoadState: AvatarModelLoadState,
): string {
  if (modelLoadState === "failed") {
    return "model load failed; using placeholder fallback";
  }

  if (modelLoadState === "loading") {
    return "loading avatar";
  }

  return "VRM avatar active";
}

export function normalizeConfiguredModelUrl(
  configuredModelUrl: string | null | undefined,
): string | null {
  const trimmedModelUrl = configuredModelUrl?.trim() ?? "";

  return trimmedModelUrl.length > 0 ? trimmedModelUrl : null;
}
