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

test("accepts a mock sensor event", () => {
  const event = {
    ...baseEvent,
    type: "mock.sensor.event",
    payload: {
      name: "user_approached",
      bodyTarget: "physical",
      reading: {
        distanceCm: 80,
      },
    },
  };

  const result = validateAliaEvent(event);

  assert.equal(result.ok, true);
  assert.equal(isAliaEvent(event), true);
});

test("rejects active ownership with both bodies active", () => {
  const event = {
    ...baseEvent,
    id: "evt-2",
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
    id: "evt-3",
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
  const event = {
    ...baseEvent,
    id: "evt-4",
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
  };

  assertAliaEvent(event);
});

test("rejects non-json mock readings", () => {
  const event = {
    ...baseEvent,
    id: "evt-5",
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
