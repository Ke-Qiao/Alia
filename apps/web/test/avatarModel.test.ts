import assert from "node:assert/strict";
import test from "node:test";

import type { AliaState, DecisionLogEntry, ExpressionIntent } from "@alia/protocol";
import { BRAIN_LITE_ENDPOINTS } from "@alia/protocol";

import {
  WEB_AVATAR_RELEASE_PATH,
  WEB_AVATAR_REQUEST_ACTIVE_PATH,
  getAvatarSubtitleText,
  getDeveloperPanelModel,
  getPhysicalBodyMode,
  getPhysicalAvailabilityFromDecisionLog,
  getPlaceholderMouthForEmotion,
  getWebActivationFeedback,
  getWebBodyMode,
} from "../src/avatarModel.ts";

test("getWebBodyMode maps physical ownership to rest", () => {
  assert.equal(getWebBodyMode(state({ activeBody: "physical" })), "rest");
});

test("getWebBodyMode maps web ownership to active", () => {
  assert.equal(getWebBodyMode(state({ activeBody: "web" })), "active");
});

test("getWebBodyMode maps sleeping currentMode to sleep", () => {
  assert.equal(getWebBodyMode(state({ currentMode: "sleeping" })), "sleep");
});

test("getWebBodyMode maps resting currentMode to rest", () => {
  assert.equal(getWebBodyMode(state({ currentMode: "resting" })), "rest");
});

test("getWebBodyMode maps default state to idle", () => {
  assert.equal(getWebBodyMode(state()), "idle");
});

test("getPhysicalBodyMode maps web ownership to sleep", () => {
  assert.equal(getPhysicalBodyMode(state({ activeBody: "web" })), "sleep");
});

test("getPhysicalBodyMode maps physical ownership to active", () => {
  assert.equal(getPhysicalBodyMode(state({ activeBody: "physical" })), "active");
});

test("getPhysicalBodyMode maps no ownership to idle", () => {
  assert.equal(getPhysicalBodyMode(state({ activeBody: "none" })), "idle");
});

test("developer panel model exposes real Brain-lite currentMode and derived webMode", () => {
  const inputState = state({
    activeBody: "physical",
    currentMode: "speaking",
    currentEmotion: "happy",
  });
  const latestDecision = decisionLog({
    metadata: {
      physicalAvailable: false,
    },
  });
  const latestExpression = expressionIntent();

  const model = getDeveloperPanelModel(inputState, latestDecision, latestExpression);

  assert.equal(model.activeBody, "physical");
  assert.equal(model.currentMode, "speaking");
  assert.equal(model.webMode, "rest");
  assert.equal(model.physicalMode, "active");
  assert.equal(model.physicalAvailable, false);
  assert.equal(model.currentEmotion, "happy");
  assert.equal(model.lastDecisionLog, latestDecision);
  assert.equal(model.latestExpressionIntent, latestExpression);
});

test("physical availability helper reads optional decision metadata", () => {
  assert.equal(
    getPhysicalAvailabilityFromDecisionLog(
      decisionLog({
        metadata: {
          physicalAvailable: true,
        },
      }),
    ),
    true,
  );
  assert.equal(getPhysicalAvailabilityFromDecisionLog(decisionLog()), null);
  assert.equal(getPhysicalAvailabilityFromDecisionLog(null), null);
});

test("web avatar command paths point to Brain-lite API aliases", () => {
  assert.equal(
    WEB_AVATAR_REQUEST_ACTIVE_PATH,
    BRAIN_LITE_ENDPOINTS.webAvatarRequestActive,
  );
  assert.equal(WEB_AVATAR_RELEASE_PATH, BRAIN_LITE_ENDPOINTS.webAvatarRelease);
});

test("web activation feedback reports granted ownership", () => {
  assert.equal(
    getWebActivationFeedback({
      state: state({ activeBody: "web" }),
      logs: [decisionLog()],
    }),
    "Web activation granted.",
  );
});

test("web activation feedback reports physical-active rejection", () => {
  assert.equal(
    getWebActivationFeedback({
      state: state({ activeBody: "physical" }),
      logs: [
        decisionLog({
          decision: "ownership.web_acquire_rejected",
          accepted: false,
          reason: "physical_currently_active_web_acquire_rejected",
        }),
      ],
    }),
    "Web activation rejected: physical body is active.",
  );
});

test("web activation feedback distinguishes accepted request from ownership grant", () => {
  assert.equal(
    getWebActivationFeedback({
      state: state({ activeBody: "physical" }),
      logs: [],
    }),
    "Web activation request accepted, but ownership was not granted.",
  );
});

test("placeholder mouth helper keeps existing emotion classes", () => {
  assert.equal(getPlaceholderMouthForEmotion("happy"), "smile");
  assert.equal(getPlaceholderMouthForEmotion("curious"), "smile");
  assert.equal(getPlaceholderMouthForEmotion("neutral"), "soft");
  assert.equal(getPlaceholderMouthForEmotion("sleepy"), "soft");
  assert.equal(getPlaceholderMouthForEmotion("concerned"), "flat");
});

test("avatar subtitle helper prefers explicit non-LLM intent text", () => {
  assert.equal(getAvatarSubtitleText(null), "Quiet presence.");
  assert.equal(
    getAvatarSubtitleText(
      expressionIntent({
        kind: "greeting",
        text: "  Hello from Brain-lite.  ",
      }),
    ),
    "Hello from Brain-lite.",
  );
  assert.equal(
    getAvatarSubtitleText(
      expressionIntent({
        target: "physical",
        kind: "body.sleep",
      }),
    ),
    "Physical bust is held in safe sleep pose.",
  );
});

function state(overrides: Partial<AliaState> = {}): AliaState {
  return {
    activeBody: "none",
    currentMode: "idle",
    lastPresenceAt: null,
    lastInteractionAt: null,
    currentEmotion: "neutral",
    ...overrides,
  };
}

function decisionLog(overrides: Partial<DecisionLogEntry> = {}): DecisionLogEntry {
  const currentState = state();

  return {
    id: "decision-test",
    at: "2026-06-29T00:00:00.000Z",
    eventId: "event-test",
    eventType: "presence.detected",
    decision: "policy.noop",
    accepted: true,
    reason: "test_decision",
    stateBefore: currentState,
    stateAfter: currentState,
    emittedIntentIds: [],
    ...overrides,
  };
}

function expressionIntent(
  overrides: Partial<ExpressionIntent> = {},
): ExpressionIntent {
  return {
    id: "intent-test",
    kind: "body.rest",
    target: "web",
    mode: "resting",
    emotion: "sleepy",
    abstractPose: "closed_eyes_lowered_head_low_presence",
    reason: "test_expression",
    createdAt: "2026-06-29T00:00:00.000Z",
    ...overrides,
  };
}
