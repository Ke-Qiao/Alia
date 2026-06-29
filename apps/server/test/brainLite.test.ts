import assert from "node:assert/strict";
import test from "node:test";

import type { ActiveBody, ExpressionIntent, PerceptionEventType } from "@alia/protocol";

import { BrainLite } from "../src/brainLite.ts";

test("physical active blocks web session acquisition", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({
    type: "physical.interaction.started",
  });
  const result = brain.handleEvent({ type: "web.session.started" });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertLogReasonIncludes(result.logs, "physical_currently_active");
  assert.equal(
    result.logs.find((log) => log.decision === "ownership.web_acquire_rejected")
      ?.accepted,
    false,
  );
  assert.equal(
    result.logs.some(
      (log) =>
        log.decision === "ownership.web_acquired" && log.accepted === false,
    ),
    false,
  );
});

test("physical active rejects web acquire request with explicit reason", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "presence.detected" });
  const result = brain.handleEvent({ type: "web.acquire_requested" });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertLogReasonIncludes(result.logs, "physical_currently_active");
  assert.equal(
    result.logs.find((log) => log.decision === "ownership.web_acquire_rejected")
      ?.accepted,
    false,
  );
});

test("web active blocks presence from acquiring physical ownership", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "web.session.started" });
  const result = brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:00:10.000Z",
  });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertLogReasonIncludes(result.logs, "web_currently_active");
});

test("web active keeps physical asleep for physical-side events", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "web.session.started" });
  const result = brain.handleEvent({ type: "physical.interaction.started" });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertNoIntent(result.intents, "web", "body.rest");
  assertLogReasonIncludes(result.logs, "web_currently_active");
});

test("no active body allows web session and sleeps physical", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  const result = brain.handleEvent({ type: "web.session.started" });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assert.equal(
    result.logs.find((log) => log.decision === "ownership.web_acquired")
      ?.accepted,
    true,
  );
});

test("no active body allows presence to acquire physical and rests web", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  const result = brain.handleEvent({ type: "presence.detected" });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertHasIntent(result.intents, "physical", "greeting");
});

test("simultaneous conflict resolves to physical priority", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "web.session.started" });
  const result = brain.handleEvent({
    type: "web.session.started",
    payload: {
      requestedBodies: ["physical", "web"],
    },
  });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertLogReasonIncludes(result.logs, "physical_priority");
});

test("mock sensor conflict resolves to physical priority", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "web.session.started" });
  const result = brain.handleEvent({
    type: "mock.sensor.event",
    payload: {
      name: "web_active_conflict_test",
      requestedBodies: ["physical", "web"],
    },
  });

  assert.equal(result.state.activeBody, "physical");
  assertHasIntent(result.intents, "web", "body.rest");
  assertLogReasonIncludes(result.logs, "physical_priority");
});

test("physical unavailable releases physical and allows web fallback", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "presence.detected" });
  const unavailableResult = brain.handleEvent({ type: "physical.bust.unavailable" });
  assert.equal(unavailableResult.state.activeBody, "none");

  const webResult = brain.handleEvent({ type: "web.session.started" });
  assert.equal(webResult.state.activeBody, "web");
  assertHasIntent(webResult.intents, "physical", "body.sleep");
});

test("physical unavailable blocks presence from acquiring physical ownership", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({ type: "presence.detected" });

  assert.equal(result.state.activeBody, "none");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertNoIntent(result.intents, "physical", "greeting");
  assertLogReasonIncludes(result.logs, "physical_unavailable_presence_rejected");
});

test("physical unavailable presence rejection remains explicit while web is active", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  brain.handleEvent({ type: "web.session.started" });
  const result = brain.handleEvent({ type: "presence.detected" });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertLogReasonIncludes(result.logs, "physical_unavailable_presence_rejected");
});

test("physical unavailable blocks mock user approach from acquiring physical ownership", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({
    type: "mock.sensor.event",
    payload: {
      name: "user_approached",
      bodyTarget: "physical",
    },
  });

  assert.equal(result.state.activeBody, "none");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertNoIntent(result.intents, "physical", "greeting");
  assertLogReasonIncludes(result.logs, "physical_unavailable_mock_sensor_rejected");
});

test("physical unavailable rejects physical acquire requests", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({ type: "physical.acquire_requested" });

  assert.equal(result.state.activeBody, "none");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertLogReasonIncludes(result.logs, "physical_unavailable_physical_acquire_rejected");
  assert.equal(
    result.logs.find((log) => log.decision === "ownership.physical_acquire_rejected")
      ?.accepted,
    false,
  );
});

test("physical unavailable while physical active releases ownership to none", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.interaction.started" });
  const result = brain.handleEvent({ type: "physical.bust.unavailable" });

  assert.equal(result.state.activeBody, "none");
  assertLogReasonIncludes(result.logs, "physical_unavailable_released_active_body");
});

test("physical unavailable allows web to acquire as fallback", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({ type: "web.session.started" });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertLogReasonIncludes(result.logs, "physical_unavailable_web_fallback_acquired");
});

test("web fallback acquisition log includes unavailable and fallback", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({ type: "web.acquire_requested" });

  const webLog = result.logs.find(
    (log) => log.decision === "ownership.web_acquired",
  );
  assert.ok(webLog);
  assert.equal(webLog.accepted, true);
  assert.match(webLog.reason, /physical_unavailable/);
  assert.match(webLog.reason, /fallback/);
});

test("conflict while physical unavailable resolves to web fallback", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({ type: "physical.bust.unavailable" });
  const result = brain.handleEvent({
    type: "web.session.started",
    payload: {
      requestedBodies: ["physical", "web"],
    },
  });

  assert.equal(result.state.activeBody, "web");
  assertHasIntent(result.intents, "physical", "body.sleep");
  assertLogReasonIncludes(result.logs, "physical_unavailable_web_fallback_acquired");
  assertNoLogReasonIncludes(result.logs, "physical_priority");
});

test("presence greeting respects cooldown", () => {
  const brain = new BrainLite({
    greetingCooldownMs: 60_000,
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  const firstResult = brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:00:00.000Z",
  });
  assert.equal(firstResult.state.activeBody, "physical");
  assertHasIntent(firstResult.intents, "physical", "greeting");

  const secondResult = brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:00:30.000Z",
  });
  assertNoIntentKind(secondResult.intents, "greeting");
  assert.equal(
    secondResult.logs.find((log) => log.decision === "policy.presence_greeting")
      ?.accepted,
    false,
  );

  const thirdResult = brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:01:01.000Z",
  });
  assertHasIntent(thirdResult.intents, "physical", "greeting");
});

test("rejected proactive trigger records an explainable reason", () => {
  const brain = new BrainLite({
    greetingCooldownMs: 60_000,
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });

  brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:00:00.000Z",
  });
  const rejectedResult = brain.handleEvent({
    type: "presence.detected",
    at: "2026-06-28T00:00:10.000Z",
  });

  const rejectedLog = rejectedResult.logs.find(
    (log) => log.decision === "policy.presence_greeting",
  );
  assert.ok(rejectedLog);
  assert.equal(rejectedLog.accepted, false);
  assert.equal(rejectedLog.reason, "presence_greeting_cooldown");
  assert.deepEqual(rejectedLog.emittedIntentIds, []);
  assert.equal(rejectedLog.metadata?.cooldownMs, 60_000);
});

test("state never represents both bodies as active", () => {
  const brain = new BrainLite({
    now: fixedClock("2026-06-28T00:00:00.000Z"),
  });
  const events: PerceptionEventType[] = [
    "web.session.started",
    "presence.detected",
    "physical.interaction.started",
    "presence.detected",
    "web.session.started",
    "physical.interaction.ended",
  ];

  for (const type of events) {
    const result = brain.handleEvent({ type });
    assertSingleActiveBody(result.state.activeBody);

    const greetingTargets = result.intents
      .filter((intent) => intent.kind === "greeting")
      .map((intent) => intent.target);
    assert.ok(greetingTargets.length <= 1);
  }
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

function assertNoIntent(
  intents: ExpressionIntent[],
  target: ExpressionIntent["target"],
  kind: ExpressionIntent["kind"],
): void {
  assert.equal(
    intents.some((intent) => intent.target === target && intent.kind === kind),
    false,
    `Expected no ${target} ${kind} intent.`,
  );
}

function assertNoIntentKind(
  intents: ExpressionIntent[],
  kind: ExpressionIntent["kind"],
): void {
  assert.equal(
    intents.some((intent) => intent.kind === kind),
    false,
    `Expected no ${kind} intent.`,
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

function assertNoLogReasonIncludes(
  logs: { reason: string }[],
  expected: string,
): void {
  assert.equal(
    logs.some((log) => log.reason.includes(expected)),
    false,
    `Expected no decision log reason containing ${expected}.`,
  );
}

function assertSingleActiveBody(activeBody: ActiveBody): void {
  assert.ok(
    activeBody === "physical" || activeBody === "web" || activeBody === "none",
  );
}
