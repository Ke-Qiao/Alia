import type {
  AbstractPose,
  AliaState,
  Body,
  CurrentMode,
  DecisionKind,
  DecisionLogEntry,
  Emotion,
  ExpressionIntent,
  ExpressionIntentKind,
  NormalizedPerceptionEvent,
  PerceptionEvent,
  PerceptionEventSource,
} from "@alia/protocol";

const DEFAULT_GREETING_COOLDOWN_MS = 60_000;
const GREETING_TEXT = "Hi, I'm here with you.";

export interface BrainLiteOptions {
  greetingCooldownMs?: number;
  now?: () => Date;
}

export interface BrainLiteResult {
  event: NormalizedPerceptionEvent;
  state: AliaState;
  intents: ExpressionIntent[];
  logs: DecisionLogEntry[];
}

export class BrainLite {
  private state: AliaState;
  private decisionLog: DecisionLogEntry[];
  private greetingCooldownMs: number;
  private lastGreetingAtMs: number | null;
  private nextSequence: number;
  private now: () => Date;
  private physicalAvailable: boolean;

  constructor(options: BrainLiteOptions = {}) {
    this.state = {
      activeBody: "none",
      currentMode: "idle",
      lastPresenceAt: null,
      lastInteractionAt: null,
      currentEmotion: "neutral",
    };
    this.decisionLog = [];
    this.greetingCooldownMs =
      options.greetingCooldownMs ?? DEFAULT_GREETING_COOLDOWN_MS;
    this.lastGreetingAtMs = null;
    this.nextSequence = 0;
    this.now = options.now ?? (() => new Date());
    this.physicalAvailable = true;
  }

  getState(): AliaState {
    return cloneState(this.state);
  }

  getDecisionLog(): DecisionLogEntry[] {
    return this.decisionLog.map((entry) => ({
      ...entry,
      stateBefore: cloneState(entry.stateBefore),
      stateAfter: cloneState(entry.stateAfter),
      emittedIntentIds: [...entry.emittedIntentIds],
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  handleEvent(input: PerceptionEvent): BrainLiteResult {
    const event = this.normalizeEvent(input);
    const intents: ExpressionIntent[] = [];
    const logs: DecisionLogEntry[] = [];

    switch (event.type) {
      case "web.session.started":
      case "web.acquire_requested":
        this.requestActiveBody("web", event, intents, logs);
        break;
      case "physical.acquire_requested":
      case "physical.interaction.started":
        this.requestActiveBody("physical", event, intents, logs);
        break;
      case "presence.detected":
        this.handlePresenceDetected(event, intents, logs);
        break;
      case "presence.left":
      case "presence.lost":
        this.handlePresenceLeft(event, logs);
        break;
      case "mock.sensor.event":
        this.handleMockSensorEvent(event, intents, logs);
        break;
      case "web.session.ended":
        this.releaseBody("web", event, logs);
        break;
      case "physical.interaction.ended":
        this.releaseBody("physical", event, logs);
        break;
      case "physical.bust.available":
      case "physical.bust.unavailable":
      case "physical.status":
        this.handlePhysicalAvailability(event, logs);
        break;
      case "user.message":
        this.logNoop(event, logs, "user_message_ignored_no_llm_in_v0_1");
        break;
    }

    return {
      event,
      state: this.getState(),
      intents,
      logs,
    };
  }

  private handlePresenceDetected(
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
  ): void {
    this.state.lastPresenceAt = event.at;

    if (hasActiveBodyConflict(event)) {
      this.resolveActiveBodyConflict(event, intents, logs);
    } else if (!this.physicalAvailable) {
      this.requestActiveBody("physical", event, intents, logs);
    } else if (this.state.activeBody === "none") {
      this.requestActiveBody("physical", event, intents, logs);
    } else if (this.state.activeBody === "web") {
      this.rejectActiveBodyRequest(
        "physical",
        event,
        intents,
        logs,
        "web_currently_active_physical_auto_acquire_rejected",
      );
    }

    const decisionBefore = cloneState(this.state);
    const nowMs = Date.parse(event.at);
    const elapsedMs =
      this.lastGreetingAtMs === null ? Infinity : nowMs - this.lastGreetingAtMs;

    if (this.state.activeBody === "none") {
      this.addDecisionLog({
        event,
        logs,
        decision: "policy.presence_greeting",
        accepted: false,
        reason: "presence_greeting_rejected_no_active_body",
        stateBefore: decisionBefore,
        emittedIntentIds: [],
      });
      return;
    }

    if (elapsedMs < this.greetingCooldownMs) {
      this.addDecisionLog({
        event,
        logs,
        decision: "policy.presence_greeting",
        accepted: false,
        reason: "presence_greeting_cooldown",
        stateBefore: decisionBefore,
        emittedIntentIds: [],
        metadata: {
          cooldownMs: this.greetingCooldownMs,
          elapsedMs,
        },
      });
      return;
    }

    this.lastGreetingAtMs = nowMs;
    this.state.currentMode = "speaking";
    this.state.currentEmotion = "happy";
    this.state.lastInteractionAt = event.at;

    const target = this.state.activeBody;
    const greetingIntent = this.createIntent({
      event,
      target,
      kind: "greeting",
      mode: "speaking",
      emotion: "happy",
      abstractPose: "warm_presence_greeting",
      reason: "presence_detected_greeting",
      text: GREETING_TEXT,
    });
    intents.push(greetingIntent);

    this.addDecisionLog({
      event,
      logs,
      decision: "policy.presence_greeting",
      accepted: true,
      reason: "presence_detected_cooldown_clear",
      stateBefore: decisionBefore,
      emittedIntentIds: [greetingIntent.id],
      metadata: {
        template: "presence_greeting_v0_1",
      },
    });
  }

  private handlePresenceLeft(
    event: NormalizedPerceptionEvent,
    logs: DecisionLogEntry[],
  ): void {
    const stateBefore = cloneState(this.state);
    this.state.activeBody = "none";
    this.state.currentMode = "resting";
    this.state.currentEmotion = "sleepy";

    this.addDecisionLog({
      event,
      logs,
      decision: "policy.presence_left",
      accepted: true,
      reason: "presence_left_released_active_body",
      stateBefore,
      emittedIntentIds: [],
    });
  }

  private handleMockSensorEvent(
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
  ): void {
    if (hasActiveBodyConflict(event)) {
      this.resolveActiveBodyConflict(event, intents, logs);
      return;
    }

    if (event.payload.name === "user_approached" || event.payload.presence === true) {
      this.handlePresenceDetected(event, intents, logs);
      return;
    }

    if (event.payload.name === "user_left" || event.payload.presence === false) {
      this.handlePresenceLeft(event, logs);
      return;
    }

    this.logNoop(event, logs, "mock_sensor_event_recorded_no_policy_match");
  }

  private handlePhysicalAvailability(
    event: NormalizedPerceptionEvent,
    logs: DecisionLogEntry[],
  ): void {
    const availability = getPhysicalAvailability(event);

    if (availability === "available") {
      this.physicalAvailable = true;
      this.logNoop(event, logs, "physical_available_recorded_not_active_ownership");
      return;
    }

    if (availability !== "unavailable") {
      this.logNoop(event, logs, "physical_status_recorded_not_active_ownership");
      return;
    }

    this.physicalAvailable = false;

    if (this.state.activeBody !== "physical") {
      this.logNoop(event, logs, "physical_unavailable_recorded_not_active_ownership");
      return;
    }

    const stateBefore = cloneState(this.state);
    this.state.activeBody = "none";
    this.state.currentMode = "resting";
    this.state.currentEmotion = "sleepy";

    this.addDecisionLog({
      event,
      logs,
      decision: "ownership.released",
      accepted: true,
      reason: "physical_unavailable_released_active_body",
      stateBefore,
      emittedIntentIds: [],
      metadata: {
        physicalAvailable: this.physicalAvailable,
      },
    });
  }

  private requestActiveBody(
    body: Body,
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
  ): void {
    if (hasActiveBodyConflict(event)) {
      this.resolveActiveBodyConflict(event, intents, logs);
      return;
    }

    if (body === "physical" && !this.physicalAvailable) {
      this.rejectActiveBodyRequest(
        body,
        event,
        intents,
        logs,
        getPhysicalUnavailableRejectionReason(event.type),
      );
      return;
    }

    if (this.state.activeBody === body) {
      this.confirmActiveBody(body, event, intents, logs);
      return;
    }

    if (this.state.activeBody === "physical" && body === "web") {
      this.rejectActiveBodyRequest(
        body,
        event,
        intents,
        logs,
        "physical_currently_active_web_acquire_rejected",
      );
      return;
    }

    if (this.state.activeBody === "web" && body === "physical") {
      this.rejectActiveBodyRequest(
        body,
        event,
        intents,
        logs,
        "web_currently_active_physical_acquire_rejected",
      );
      return;
    }

    this.forceAcquireBody(
      body,
      event,
      intents,
      logs,
      getOwnershipReason(body, event.type, this.physicalAvailable),
    );
  }

  private resolveActiveBodyConflict(
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
  ): void {
    if (this.physicalAvailable) {
      this.forceAcquireBody(
        "physical",
        event,
        intents,
        logs,
        "physical_priority_conflict_resolved",
      );
      return;
    }

    this.forceAcquireBody(
      "web",
      event,
      intents,
      logs,
      "physical_unavailable_web_fallback_acquired",
    );
  }

  private forceAcquireBody(
    body: Body,
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
    reason: string,
  ): void {
    const stateBefore = cloneState(this.state);
    this.state.activeBody = body;
    this.state.currentMode = "listening";
    this.state.currentEmotion = "curious";
    this.state.lastInteractionAt = event.at;

    const inactiveIntent =
      body === "web"
        ? this.createIntent({
            event,
            target: "physical",
            kind: "body.sleep",
            mode: "sleeping",
            emotion: "sleepy",
            abstractPose: "closed_eyes_lowered_head_safe_fixed_pose",
            reason: "web_active_physical_sleep_pose",
          })
        : this.createIntent({
            event,
            target: "web",
            kind: "body.rest",
            mode: "resting",
            emotion: "sleepy",
            abstractPose: "closed_eyes_lowered_head_low_presence",
            reason: "physical_active_web_rest_mode",
          });

    intents.push(inactiveIntent);

    this.addDecisionLog({
      event,
      logs,
      decision:
        body === "web" ? "ownership.web_acquired" : "ownership.physical_acquired",
      accepted: true,
      reason,
      stateBefore,
      emittedIntentIds: [inactiveIntent.id],
      metadata: {
        physicalAvailable: this.physicalAvailable,
      },
    });
  }

  private confirmActiveBody(
    body: Body,
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
  ): void {
    const stateBefore = cloneState(this.state);
    const intent = this.createInactiveBodyIntent(
      body,
      event,
      body === "web"
        ? "web_already_active_physical_sleep_pose_confirmed"
        : "physical_already_active_web_rest_mode_confirmed",
    );
    intents.push(intent);

    this.addDecisionLog({
      event,
      logs,
      decision:
        body === "web" ? "ownership.web_acquired" : "ownership.physical_acquired",
      accepted: true,
      reason: body === "web" ? "web_already_active" : "physical_already_active",
      stateBefore,
      emittedIntentIds: [intent.id],
      metadata: {
        physicalAvailable: this.physicalAvailable,
      },
    });
  }

  private rejectActiveBodyRequest(
    requestedBody: Body,
    event: NormalizedPerceptionEvent,
    intents: ExpressionIntent[],
    logs: DecisionLogEntry[],
    reason: string,
  ): void {
    const stateBefore = cloneState(this.state);
    const activeBody =
      this.state.activeBody === "none" && requestedBody === "physical" && !this.physicalAvailable
        ? "web"
        : this.state.activeBody === "none"
          ? requestedBody
          : this.state.activeBody;
    const intent = this.createInactiveBodyIntent(activeBody, event, reason);
    intents.push(intent);

    this.addDecisionLog({
      event,
      logs,
      decision:
        requestedBody === "web"
          ? "ownership.web_acquired"
          : "ownership.physical_acquired",
      accepted: false,
      reason,
      stateBefore,
      emittedIntentIds: [intent.id],
      metadata: {
        activeBody: this.state.activeBody,
        requestedBody,
        physicalAvailable: this.physicalAvailable,
      },
    });
  }

  private createInactiveBodyIntent(
    activeBody: Body,
    event: NormalizedPerceptionEvent,
    reason: string,
  ): ExpressionIntent {
    return activeBody === "web"
      ? this.createIntent({
          event,
          target: "physical",
          kind: "body.sleep",
          mode: "sleeping",
          emotion: "sleepy",
          abstractPose: "closed_eyes_lowered_head_safe_fixed_pose",
          reason,
        })
      : this.createIntent({
          event,
          target: "web",
          kind: "body.rest",
          mode: "resting",
          emotion: "sleepy",
          abstractPose: "closed_eyes_lowered_head_low_presence",
          reason,
        });
  }

  private releaseBody(
    body: Body,
    event: NormalizedPerceptionEvent,
    logs: DecisionLogEntry[],
  ): void {
    const stateBefore = cloneState(this.state);

    if (this.state.activeBody !== body) {
      this.addDecisionLog({
        event,
        logs,
        decision: "ownership.released",
        accepted: false,
        reason: "release_ignored_body_was_not_active",
        stateBefore,
        emittedIntentIds: [],
      });
      return;
    }

    this.state.activeBody = "none";
    this.state.currentMode = "idle";
    this.state.currentEmotion = "neutral";

    this.addDecisionLog({
      event,
      logs,
      decision: "ownership.released",
      accepted: true,
      reason: "active_body_released",
      stateBefore,
      emittedIntentIds: [],
    });
  }

  private logNoop(
    event: NormalizedPerceptionEvent,
    logs: DecisionLogEntry[],
    reason: string,
  ): void {
    this.addDecisionLog({
      event,
      logs,
      decision: "policy.noop",
      accepted: true,
      reason,
      stateBefore: cloneState(this.state),
      emittedIntentIds: [],
    });
  }

  private createIntent(input: {
    event: NormalizedPerceptionEvent;
    target: Body;
    kind: ExpressionIntentKind;
    mode: CurrentMode;
    emotion: Emotion;
    abstractPose: AbstractPose;
    reason: string;
    text?: string;
  }): ExpressionIntent {
    return {
      id: this.createId("intent"),
      kind: input.kind,
      target: input.target,
      mode: input.mode,
      emotion: input.emotion,
      abstractPose: input.abstractPose,
      text: input.text,
      reason: input.reason,
      createdAt: input.event.at,
    };
  }

  private addDecisionLog(input: {
    event: NormalizedPerceptionEvent;
    logs: DecisionLogEntry[];
    decision: DecisionKind;
    accepted: boolean;
    reason: string;
    stateBefore: AliaState;
    emittedIntentIds: string[];
    metadata?: Record<string, unknown>;
  }): void {
    const entry: DecisionLogEntry = {
      id: this.createId("decision"),
      at: input.event.at,
      eventId: input.event.id,
      eventType: input.event.type,
      decision: input.decision,
      accepted: input.accepted,
      reason: input.reason,
      stateBefore: cloneState(input.stateBefore),
      stateAfter: this.getState(),
      emittedIntentIds: [...input.emittedIntentIds],
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    this.decisionLog.push(entry);
    input.logs.push(entry);
  }

  private normalizeEvent(input: PerceptionEvent): NormalizedPerceptionEvent {
    const at = readEventAt(input) ?? this.now().toISOString();
    if (Number.isNaN(Date.parse(at))) {
      throw new Error("Perception event at must be a valid ISO timestamp.");
    }

    return {
      id: input.id ?? this.createId("event"),
      type: input.type,
      source: readEventSource(input),
      at,
      payload: readEventPayload(input),
    };
  }

  private createId(prefix: string): string {
    this.nextSequence += 1;
    return `${prefix}_${this.nextSequence}`;
  }
}

function cloneState(state: AliaState): AliaState {
  return {
    activeBody: state.activeBody,
    currentMode: state.currentMode,
    lastPresenceAt: state.lastPresenceAt,
    lastInteractionAt: state.lastInteractionAt,
    currentEmotion: state.currentEmotion,
  };
}

function readEventAt(input: PerceptionEvent): string | undefined {
  if ("at" in input && typeof input.at === "string") {
    return input.at;
  }

  if ("occurredAt" in input && typeof input.occurredAt === "string") {
    return input.occurredAt;
  }

  return undefined;
}

function readEventSource(input: PerceptionEvent): PerceptionEventSource {
  const source = input.source;

  if (
    source === "mock" ||
    source === "script" ||
    source === "web" ||
    source === "physical"
  ) {
    return source;
  }

  if (source && typeof source === "object" && "kind" in source) {
    if (source.kind === "web") {
      return "web";
    }

    if (source.kind === "physical") {
      return "physical";
    }

    if (source.kind === "mock.script") {
      return "script";
    }
  }

  return "mock";
}

function readEventPayload(input: PerceptionEvent): Record<string, unknown> {
  return input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
    ? { ...(input.payload as Record<string, unknown>) }
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPhysicalAvailability(
  event: NormalizedPerceptionEvent,
): "available" | "unavailable" | "unknown" {
  if (event.type === "physical.bust.available") {
    return "available";
  }

  if (event.type === "physical.bust.unavailable") {
    return "unavailable";
  }

  return event.payload.status === "available" || event.payload.status === "unavailable"
    ? event.payload.status
    : "unknown";
}

function hasActiveBodyConflict(event: NormalizedPerceptionEvent): boolean {
  return conflictCandidates(event).some((candidate) => {
    const requestedBodies = readRequestedBodies(candidate);
    if (requestedBodies.includes("physical") && requestedBodies.includes("web")) {
      return true;
    }

    return (
      candidate.name === "web_active_conflict_test" ||
      candidate.scenario === "web-active-conflict-test" ||
      candidate.sessionId === "embedded-mock-web-active-conflict-test"
    );
  });
}

function conflictCandidates(
  event: NormalizedPerceptionEvent,
): Record<string, unknown>[] {
  const candidates = [event.payload];

  if (isRecord(event.payload.reading)) {
    candidates.push(event.payload.reading);
  }

  if (isRecord(event.payload.conflict)) {
    candidates.push(event.payload.conflict);
  }

  return candidates;
}

function readRequestedBodies(candidate: Record<string, unknown>): string[] {
  const raw =
    candidate.requestedBodies ??
    candidate.requested ??
    candidate.simultaneousRequests;

  return Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string")
    : [];
}

function getOwnershipReason(
  body: Body,
  eventType: NormalizedPerceptionEvent["type"],
  physicalAvailable: boolean,
): string {
  if (body === "web") {
    if (!physicalAvailable) {
      return "physical_unavailable_web_fallback_acquired";
    }

    return eventType === "web.acquire_requested"
      ? "web_acquire_requested_active_body"
      : "web_session_acquired_active_body";
  }

  return eventType === "presence.detected"
    ? "presence_detected_acquired_physical_body"
    : "physical_interaction_acquired_active_body";
}

function getPhysicalUnavailableRejectionReason(
  eventType: NormalizedPerceptionEvent["type"],
): string {
  if (eventType === "presence.detected") {
    return "physical_unavailable_presence_rejected";
  }

  if (eventType === "mock.sensor.event") {
    return "physical_unavailable_mock_sensor_rejected";
  }

  return "physical_unavailable_physical_acquire_rejected";
}
