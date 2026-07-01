import assert from "node:assert/strict";
import test from "node:test";

import {
  AVATAR_EXPECTED_MODEL_FORMAT,
  AVATAR_EXPECTED_FUTURE_MODEL_FORMAT,
  DEFAULT_AVATAR_MODEL_URL,
  getAvatarAssetStatus,
  getAvatarFallbackStatus,
  getAvatarModelUrl,
  getAvatarRendererSelection,
  normalizeConfiguredModelUrl,
} from "../src/avatarAssets.ts";

test("avatar model URL defaults to local public VRM path", () => {
  assert.equal(getAvatarModelUrl(undefined), DEFAULT_AVATAR_MODEL_URL);
  assert.equal(getAvatarModelUrl("   "), DEFAULT_AVATAR_MODEL_URL);
});

test("avatar model URL uses configured Vite value when present", () => {
  assert.equal(getAvatarModelUrl(" /avatar/custom.vrm "), "/avatar/custom.vrm");
});

test("avatar renderer selection attempts VRM while loading", () => {
  const selection = getAvatarRendererSelection(
    DEFAULT_AVATAR_MODEL_URL,
    "loading",
  );

  assert.equal(selection.renderer, "vrm");
  assert.equal(selection.modelUrl, DEFAULT_AVATAR_MODEL_URL);
  assert.equal(selection.statusLabel, "loading avatar");
  assert.equal(selection.fallbackLabel, null);
});

test("avatar renderer selection keeps VRM when ready", () => {
  const selection = getAvatarRendererSelection(DEFAULT_AVATAR_MODEL_URL, "ready");

  assert.equal(selection.renderer, "vrm");
  assert.equal(selection.statusLabel, "VRM avatar active");
});

test("avatar renderer selection falls back after model load failure", () => {
  const selection = getAvatarRendererSelection(
    DEFAULT_AVATAR_MODEL_URL,
    "failed",
  );

  assert.equal(selection.renderer, "placeholder");
  assert.equal(selection.statusLabel, "model load failed");
  assert.equal(selection.fallbackLabel, "using placeholder fallback");
});

test("avatar asset status reports default VRM loading state", () => {
  const status = getAvatarAssetStatus("", "loading");

  assert.equal(status.currentRenderer, "vrm");
  assert.equal(status.expectedModelFormat, AVATAR_EXPECTED_MODEL_FORMAT);
  assert.equal(
    status.expectedFutureModelFormat,
    AVATAR_EXPECTED_FUTURE_MODEL_FORMAT,
  );
  assert.equal(status.configuredModelUrl, null);
  assert.equal(status.resolvedModelUrl, DEFAULT_AVATAR_MODEL_URL);
  assert.equal(status.modelLoadState, "loading");
  assert.equal(status.fallbackStatus, "loading avatar");
});

test("avatar asset status reports configured model URL and failed fallback", () => {
  const status = getAvatarAssetStatus(" /avatar/alia.vrm ", "failed");

  assert.equal(status.currentRenderer, "placeholder");
  assert.equal(status.configuredModelUrl, "/avatar/alia.vrm");
  assert.equal(status.resolvedModelUrl, "/avatar/alia.vrm");
  assert.equal(
    status.fallbackStatus,
    "model load failed; using placeholder fallback",
  );
});

test("avatar asset status reports ready VRM renderer", () => {
  const status = getAvatarAssetStatus(undefined, "ready");

  assert.equal(status.currentRenderer, "vrm");
  assert.equal(status.resolvedModelUrl, DEFAULT_AVATAR_MODEL_URL);
  assert.equal(status.modelLoadState, "ready");
  assert.equal(status.fallbackStatus, "VRM avatar active");
});

test("avatar fallback status is explicit for each load state", () => {
  assert.equal(getAvatarFallbackStatus("loading"), "loading avatar");
  assert.equal(getAvatarFallbackStatus("ready"), "VRM avatar active");
  assert.equal(
    getAvatarFallbackStatus("failed"),
    "model load failed; using placeholder fallback",
  );
});

test("normalizeConfiguredModelUrl treats blank input as unavailable", () => {
  assert.equal(normalizeConfiguredModelUrl(undefined), null);
  assert.equal(normalizeConfiguredModelUrl(null), null);
  assert.equal(normalizeConfiguredModelUrl("   "), null);
});
