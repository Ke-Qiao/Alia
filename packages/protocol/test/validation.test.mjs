import assert from "node:assert/strict";
import { test } from "node:test";

import { assertAliaEvent, isAliaEvent, validateAliaEvent } from "../src/index.ts";

const baseEvent = {
  id: "evt-1",
  occurredAt: "2026-06-28T12:00:00.000Z",
  source: {
    kind: "mock.hardware",
    id: "scripted-sensor",
  },
};

test("rejects legacy non-envelope inputs as public AliaEvent values", () => {
  const legacyInput = {
    type: "presence.detected",
    source: "mock",
    at: "2026-06-28T12:00:00.000Z",
    payload: {
      bodyTarget: "physical",
      confidence: 0.9,
    },
  };

  const result = validateAliaEvent(legacyInput);

  assert.equal(result.ok, false);
  assert.equal(isAliaEvent(legacyInput), false);
  assert.match(result.errors.join("\n"), /id must be a non-empty string/);
  assert.match(result.errors.join("\n"), /occurredAt must be a non-empty string/);
  assert.match(result.errors.join("\n"), /source must be an object/);
  assert.throws(() => assertAliaEvent(legacyInput), /Invalid Alia event/);
});

test("validates presence.detected envelope events", () => {
  assertValid({
    ...baseEvent,
    type: "presence.detected",
    payload: {
      bodyTarget: "physical",
      confidence: 0.9,
    },
  });
});

test("validates presence.lost envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-presence-lost",
    type: "presence.lost",
    payload: {
      bodyTarget: "physical",
      confidence: 1,
    },
  });
});

test("validates web.session.started envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-web-session",
    source: {
      kind: "web",
      id: "web-avatar",
    },
    type: "web.session.started",
    payload: {
      sessionId: "session-1",
      userId: "local-user",
    },
  });
});

test("validates web.acquire_requested envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-web-acquire",
    source: {
      kind: "web",
      id: "web-avatar",
    },
    type: "web.acquire_requested",
    payload: {
      requestedBody: "web",
      reason: {
        code: "manual_request",
        detail: "Web Avatar requested active ownership.",
      },
    },
  });
});

test("validates physical.bust.available envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-physical-available",
    source: {
      kind: "physical",
      id: "physical-bust-mock",
    },
    type: "physical.bust.available",
    payload: {
      status: "available",
      isMock: true,
      detail: "Physical bust mock is available.",
    },
  });
});

test("validates physical.bust.unavailable envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-physical-unavailable",
    source: {
      kind: "physical",
      id: "physical-bust-mock",
    },
    type: "physical.bust.unavailable",
    payload: {
      status: "unavailable",
      isMock: true,
      detail: "Physical bust mock is unavailable.",
    },
  });
});

test("validates brain.decision.logged envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-decision",
    source: {
      kind: "brain",
    },
    type: "brain.decision.logged",
    payload: {
      decisionId: "decision-1",
      reason: "physical_unavailable_web_fallback_acquired",
      activeBody: "web",
      target: "web",
      sourceEventId: "evt-web-acquire",
    },
  });
});

test("validates expression.enter_rest_mode envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-expression-rest",
    source: {
      kind: "brain",
    },
    type: "expression.enter_rest_mode",
    payload: {
      target: "web",
      reason: "Physical bust owns active expression.",
    },
  });
});

test("validates expression.enter_sleep_pose envelope events", () => {
  assertValid({
    ...baseEvent,
    id: "evt-expression-sleep",
    source: {
      kind: "brain",
    },
    type: "expression.enter_sleep_pose",
    payload: {
      target: "physical",
      pose: "fixed_safe_sleep",
      reason: "Web Avatar owns active expression.",
    },
  });
});

test("validates fallback conflict when physical is unavailable", () => {
  assertValid({
    ...baseEvent,
    id: "evt-fallback-conflict",
    source: {
      kind: "brain",
    },
    type: "embodiment.active_body.changed",
    payload: {
      previous: "none",
      next: "web",
      reason: {
        code: "physical_unavailable",
        detail: "Physical bust is unavailable, so Web acquired fallback ownership.",
      },
      conflict: {
        requested: ["physical", "web"],
        resolvedTo: "web",
        rule: "availability",
      },
    },
  });
});

test("accepts a mock sensor event", () => {
  assertValid({
    ...baseEvent,
    id: "evt-mock",
    type: "mock.sensor.event",
    payload: {
      name: "user_approached",
      bodyTarget: "physical",
      reading: {
        distanceCm: 80,
      },
    },
  });
});

test("rejects active ownership with both bodies active", () => {
  const event = {
    ...baseEvent,
    id: "evt-invalid-active-body",
    source: {
      kind: "brain",
    },
    type: "embodiment.active_body.changed",
    payload: {
      previous: "none",
      next: "both",
      reason: {
        code: "conflict_resolved",
      },
    },
  };

  const result = validateAliaEvent(event);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /payload\.next must be physical, web, or none/);
});

test("requires an ownership change reason", () => {
  const event = {
    ...baseEvent,
    id: "evt-missing-reason",
    source: {
      kind: "brain",
    },
    type: "embodiment.active_body.changed",
    payload: {
      previous: "web",
      next: "physical",
    },
  };

  const result = validateAliaEvent(event);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /payload\.reason must be an object/);
});

test("accepts a physical-priority conflict resolution", () => {
  assertValid({
    ...baseEvent,
    id: "evt-physical-priority",
    source: {
      kind: "brain",
    },
    type: "embodiment.active_body.changed",
    payload: {
      previous: "web",
      next: "physical",
      reason: {
        code: "conflict_resolved",
        detail: "Physical bust is available and has v0.1 product priority.",
      },
      conflict: {
        requested: ["physical", "web"],
        resolvedTo: "physical",
        rule: "physical_priority",
      },
    },
  });
});

test("rejects non-json mock readings", () => {
  const event = {
    ...baseEvent,
    id: "evt-invalid-reading",
    type: "mock.sensor.event",
    payload: {
      name: "user_approached",
      bodyTarget: "physical",
      reading: {
        invalid: Number.POSITIVE_INFINITY,
      },
    },
  };

  const result = validateAliaEvent(event);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /payload\.reading must be JSON-serializable/);
});

function assertValid(event) {
  const result = validateAliaEvent(event);

  assert.equal(result.ok, true, result.ok ? undefined : result.errors.join("\n"));
  assert.equal(isAliaEvent(event), true);
  assert.doesNotThrow(() => assertAliaEvent(event));
}
