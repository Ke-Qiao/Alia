import assert from "node:assert/strict";
import test from "node:test";

import type { ExpressionIntent } from "@alia/protocol";

import { BrainLite } from "../src/brainLite.ts";

test("v0.1 smoke: presence acquires physical body when physical is available", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-29T00:00:00.000Z"),
  });

  const result = brain.handleEvent({
    type: "presence.detected",
    payload: {
      bodyTarget: "physical",
      confidence: 1,
    },
  });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertHasIntent(result.intents, "physical", "greeting");
  assertLogReasonIncludes(result.logs, "presence_detected_acquired_physical_body");
});

test("v0.1 smoke: web active ownership causes physical sleep pose intent", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-29T00:00:00.000Z"),
  });

  const result = brain.handleEvent({
    type: "web.session.started",
    payload: {
      sessionId: "smoke-web-session",
    },
  });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertIntentPose(
    result.intents,
    "physical",
    "closed_eyes_lowered_head_safe_fixed_pose",
  );
});

test("v0.1 smoke: physical unavailable allows web fallback ownership", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-29T00:00:00.000Z"),
  });

  brain.handleEvent({
    type: "physical.bust.unavailable",
    payload: {
      status: "unavailable",
      isMock: true,
    },
  });

  const rejectedPresence = brain.handleEvent({
    type: "presence.detected",
    payload: {
      bodyTarget: "physical",
      confidence: 1,
    },
  });

  assert.equal(rejectedPresence.state.activeBody, "none");
  assertLogReasonIncludes(
    rejectedPresence.logs,
    "physical_unavailable_presence_rejected",
  );

  const webFallback = brain.handleEvent({
    type: "web.session.started",
    payload: {
      sessionId: "smoke-web-fallback",
    },
  });

  assert.equal(webFallback.state.activeBody, "web");
  assertHasIntent(webFallback.intents, "physical", "body.sleep");
  assertLogReasonIncludes(
    webFallback.logs,
    "physical_unavailable_web_fallback_acquired",
  );
});

function fixedClock(iso: string): () => Date {
  return () => new Date(iso);
}

function assertHasIntent(
  intents: ExpressionIntent[],
  target: ExpressionIntent["target"],
  kind: ExpressionIntent["kind"],
): void {
  assert.ok(
    intents.some((intent) => intent.target === target && intent.kind === kind),
    `Expected ${target} ${kind} intent.`,
  );
}

function assertIntentPose(
  intents: ExpressionIntent[],
  target: ExpressionIntent["target"],
  abstractPose: ExpressionIntent["abstractPose"],
): void {
  assert.ok(
    intents.some(
      (intent) => intent.target === target && intent.abstractPose === abstractPose,
    ),
    `Expected ${target} intent with ${abstractPose}.`,
  );
}

function assertLogReasonIncludes(
  logs: { reason: string }[],
  expected: string,
): void {
  assert.ok(
    logs.some((log) => log.reason.includes(expected)),
    `Expected a decision log reason containing ${expected}.`,
  );
}
