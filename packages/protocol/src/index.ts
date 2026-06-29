export const perceptionEventTypes = [
  "presence.detected",
  "presence.left",
  "presence.lost",
  "user.message",
  "web.session.started",
  "web.session.ended",
  "web.acquire_requested",
  "physical.acquire_requested",
  "physical.interaction.started",
  "physical.interaction.ended",
  "physical.bust.available",
  "physical.bust.unavailable",
  "physical.status",
  "mock.sensor.event",
] as const;

export const brainEventTypes = [
  "brain.state.updated",
  "brain.decision.logged",
  "brain.proactive_trigger.accepted",
  "brain.proactive_trigger.rejected",
] as const;

export const embodimentEventTypes = [
  "embodiment.active_body.changed",
  "embodiment.acquire_requested",
  "embodiment.release_requested",
] as const;

export const expressionEventTypes = [
  "expression.enter_active_mode",
  "expression.enter_rest_mode",
  "expression.enter_sleep_pose",
  "expression.look_at_user",
  "expression.speak",
  "expression.show_emotion",
  "expression.idle_motion",
] as const;

export const eventTypes = [
  ...perceptionEventTypes,
  ...brainEventTypes,
  ...embodimentEventTypes,
  ...expressionEventTypes,
] as const;

export const bodyTargets = ["physical", "web", "both", "none"] as const;
export const activeBodies = ["physical", "web", "none"] as const;
export const bodyModes = ["active", "rest", "sleep", "idle"] as const;
export const currentModes = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "resting",
  "sleeping",
] as const;
export const sourceKinds = [
  "brain",
  "web",
  "physical",
  "mock.hardware",
  "mock.script",
] as const;

export const ownershipReasonCodes = [
  "user_presence_detected",
  "user_presence_lost",
  "web_session_started",
  "web_session_ended",
  "physical_available",
  "physical_unavailable",
  "manual_request",
  "manual_release",
  "policy_decision",
  "conflict_resolved",
] as const;

export const emotions = [
  "neutral",
  "calm",
  "curious",
  "happy",
  "thinking",
  "concerned",
  "sleepy",
] as const;

export const physicalStatuses = ["available", "unavailable", "active", "sleeping"] as const;
export const expressionIntentKinds = ["greeting", "body.rest", "body.sleep"] as const;
export const abstractPoses = [
  "warm_presence_greeting",
  "closed_eyes_lowered_head_low_presence",
  "closed_eyes_lowered_head_safe_fixed_pose",
] as const;
export const physicalActions = [
  "enterActiveMode",
  "enterRestMode",
  "enterSleepPose",
  "lookAtUser",
  "showEmotion",
  "speak",
] as const;
export const streamEventTypes = [
  "state.updated",
  "expression.intent",
  "decision.logged",
] as const;
export const proactiveTriggerReasons = [
  "presence",
  "user_message",
  "mock_sensor",
  "ownership_change",
] as const;

export const BRAIN_LITE_ENDPOINTS = {
  sensorEvents: "/mock/events",
  embeddedMockConnect: "/api/v0/embedded-mock/connect",
  state: "/api/v0/state",
  stream: "/events",
  webAvatarRequestActive: "/api/v0/web-avatar/request-active",
  webAvatarRelease: "/api/v0/web-avatar/release",
} as const;

export const EMBEDDED_MOCK_ENDPOINTS = {
  health: "/health",
  ownership: "/ownership",
  expressionIntents: "/expression-intents",
} as const;

export const DEFAULT_BRAIN_LITE_URL = "http://127.0.0.1:3000";
export const DEFAULT_EMBEDDED_MOCK_HOST = "127.0.0.1";
export const DEFAULT_EMBEDDED_MOCK_PORT = 3101;

export const EXPRESSION_INTENT_KINDS = expressionIntentKinds;
export const PHYSICAL_ACTIONS = physicalActions;

export type PerceptionEventType = (typeof perceptionEventTypes)[number];
export type BrainEventType = (typeof brainEventTypes)[number];
export type EmbodimentEventType = (typeof embodimentEventTypes)[number];
export type ExpressionEventType = (typeof expressionEventTypes)[number];
export type EventType = (typeof eventTypes)[number];

export type BodyTarget = (typeof bodyTargets)[number];
export type ActiveBody = (typeof activeBodies)[number];
export type OwnedBody = Exclude<ActiveBody, "none">;
export type Body = OwnedBody;
export type BodyMode = (typeof bodyModes)[number];
export type CurrentMode = (typeof currentModes)[number];
export type EventSourceKind = (typeof sourceKinds)[number];
export type OwnershipReasonCode = (typeof ownershipReasonCodes)[number];
export type Emotion = (typeof emotions)[number];
export type PhysicalStatus = (typeof physicalStatuses)[number];
export type ExpressionIntentKind = (typeof expressionIntentKinds)[number];
export type AbstractPose = (typeof abstractPoses)[number];
export type PhysicalAction = (typeof physicalActions)[number];
export type StreamEventType = (typeof streamEventTypes)[number];
export type ProactiveTriggerReason = (typeof proactiveTriggerReasons)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface EventSource {
  kind: EventSourceKind;
  id?: string;
}

export interface OwnershipReason {
  code: OwnershipReasonCode;
  detail?: string;
}

export interface BaseEvent<TType extends EventType, TPayload> {
  id: string;
  type: TType;
  occurredAt: string;
  source: EventSource;
  correlationId?: string;
  payload: TPayload;
}

export interface AliaState {
  activeBody: ActiveBody;
  currentMode: CurrentMode;
  lastPresenceAt: string | null;
  lastInteractionAt: string | null;
  currentEmotion: Emotion;
}

export interface BodyModeAssignment {
  physical: BodyMode;
  web: BodyMode;
}

export interface ExpressionIntent {
  id: string;
  kind: ExpressionIntentKind;
  target: Body;
  mode: CurrentMode;
  emotion: Emotion;
  abstractPose: AbstractPose;
  text?: string;
  reason: string;
  createdAt: string;
}

export const decisionKinds = [
  "ownership.web_acquired",
  "ownership.physical_acquired",
  "ownership.released",
  "policy.presence_greeting",
  "policy.presence_left",
  "policy.noop",
] as const;
export type DecisionKind = (typeof decisionKinds)[number];

export interface DecisionLogEntry {
  id: string;
  at: string;
  eventId: string;
  eventType: PerceptionEventType;
  decision: DecisionKind;
  accepted: boolean;
  reason: string;
  stateBefore: AliaState;
  stateAfter: AliaState;
  emittedIntentIds: string[];
  metadata?: Record<string, unknown>;
}

export interface BrainLiteSnapshot {
  activeBody: ActiveBody;
  bodyModes: BodyModeAssignment;
  currentMode: BodyMode;
  currentEmotion: Emotion;
  lastDecisionLog: DecisionLogEntry | null;
  latestExpressionIntent: ExpressionIntent | null;
  updatedAt: string;
}

export type PresencePayload = {
  bodyTarget: BodyTarget;
  confidence?: number;
};

export type UserMessagePayload = {
  text: string;
  bodyTarget: BodyTarget;
};

export type WebSessionPayload = {
  sessionId: string;
  userId?: string;
};

export type PhysicalStatusPayload = {
  status: PhysicalStatus;
  isMock: boolean;
  detail?: string;
};

export type MockSensorEventPayload = {
  name: string;
  bodyTarget: BodyTarget;
  reading?: JsonValue;
};

export type BrainStateUpdatedPayload = {
  activeBody: ActiveBody;
  userPresent: boolean;
  physicalStatus?: PhysicalStatus;
  webSessionActive?: boolean;
};

export type BrainDecisionLoggedPayload = {
  decisionId: string;
  reason: string;
  activeBody: ActiveBody;
  target: BodyTarget;
  sourceEventId?: string;
};

export type ProactiveTriggerPayload = {
  triggerId: string;
  reason: ProactiveTriggerReason;
  target: BodyTarget;
  sourceEventId?: string;
};

export type ActiveBodyChangedPayload = {
  previous: ActiveBody;
  next: ActiveBody;
  reason: OwnershipReason;
  requestEventId?: string;
  conflict?: {
    requested: OwnedBody[];
    resolvedTo: ActiveBody;
    rule: "physical_priority" | "availability" | "manual";
  };
};

export type AcquireRequestedPayload = {
  requestedBody: OwnedBody;
  reason: OwnershipReason;
};

export type ReleaseRequestedPayload = {
  body: OwnedBody;
  reason: OwnershipReason;
};

export type TargetedExpressionPayload = {
  target: BodyTarget;
  reason?: string;
};

export type EnterActiveModePayload = {
  target: OwnedBody;
  reason?: string;
};

export type EnterSleepPosePayload = TargetedExpressionPayload & {
  pose: "fixed_safe_sleep";
};

export type LookAtUserPayload = TargetedExpressionPayload & {
  intensity?: "low" | "medium" | "high";
};

export type SpeakPayload = TargetedExpressionPayload & {
  text: string;
};

export type ShowEmotionPayload = TargetedExpressionPayload & {
  emotion: Emotion;
  intensity?: "low" | "medium" | "high";
};

export type IdleMotionPayload = TargetedExpressionPayload & {
  motion: "breathing" | "micro_shift" | "none";
};

export type PerceptionEvent =
  | BaseEvent<"presence.detected", PresencePayload>
  | BaseEvent<"presence.left", PresencePayload>
  | BaseEvent<"presence.lost", PresencePayload>
  | BaseEvent<"user.message", UserMessagePayload>
  | BaseEvent<"web.session.started", WebSessionPayload>
  | BaseEvent<"web.session.ended", WebSessionPayload>
  | BaseEvent<"web.acquire_requested", AcquireRequestedPayload>
  | BaseEvent<"physical.acquire_requested", AcquireRequestedPayload>
  | BaseEvent<"physical.interaction.started", PhysicalStatusPayload>
  | BaseEvent<"physical.interaction.ended", PhysicalStatusPayload>
  | BaseEvent<"physical.bust.available", PhysicalStatusPayload>
  | BaseEvent<"physical.bust.unavailable", PhysicalStatusPayload>
  | BaseEvent<"physical.status", PhysicalStatusPayload>
  | BaseEvent<"mock.sensor.event", MockSensorEventPayload>;

export type BrainEvent =
  | BaseEvent<"brain.state.updated", BrainStateUpdatedPayload>
  | BaseEvent<"brain.decision.logged", BrainDecisionLoggedPayload>
  | BaseEvent<"brain.proactive_trigger.accepted", ProactiveTriggerPayload>
  | BaseEvent<"brain.proactive_trigger.rejected", ProactiveTriggerPayload>;

export type EmbodimentEvent =
  | BaseEvent<"embodiment.active_body.changed", ActiveBodyChangedPayload>
  | BaseEvent<"embodiment.acquire_requested", AcquireRequestedPayload>
  | BaseEvent<"embodiment.release_requested", ReleaseRequestedPayload>;

export type ExpressionEvent =
  | BaseEvent<"expression.enter_active_mode", EnterActiveModePayload>
  | BaseEvent<"expression.enter_rest_mode", TargetedExpressionPayload>
  | BaseEvent<"expression.enter_sleep_pose", EnterSleepPosePayload>
  | BaseEvent<"expression.look_at_user", LookAtUserPayload>
  | BaseEvent<"expression.speak", SpeakPayload>
  | BaseEvent<"expression.show_emotion", ShowEmotionPayload>
  | BaseEvent<"expression.idle_motion", IdleMotionPayload>;

export type AliaEvent = PerceptionEvent | BrainEvent | EmbodimentEvent | ExpressionEvent;

export type ValidationResult =
  | { ok: true; event: AliaEvent }
  | { ok: false; errors: string[] };

type PayloadValidator = (payload: unknown) => string[];

const eventTypeSet = new Set<string>(eventTypes);
const bodyTargetSet = new Set<string>(bodyTargets);
const activeBodySet = new Set<string>(activeBodies);
const ownedBodySet = new Set<string>(["physical", "web"]);
const sourceKindSet = new Set<string>(sourceKinds);
const reasonCodeSet = new Set<string>(ownershipReasonCodes);
const emotionSet = new Set<string>(emotions);
const physicalStatusSet = new Set<string>(physicalStatuses);
const proactiveTriggerReasonSet = new Set<string>(proactiveTriggerReasons);
const intensitySet = new Set<string>(["low", "medium", "high"]);
const idleMotionSet = new Set<string>(["breathing", "micro_shift", "none"]);
const conflictRuleSet = new Set<string>(["physical_priority", "availability", "manual"]);

const payloadValidators: Record<EventType, PayloadValidator> = {
  "presence.detected": validatePresencePayload,
  "presence.left": validatePresencePayload,
  "presence.lost": validatePresencePayload,
  "user.message": validateUserMessagePayload,
  "web.session.started": validateWebSessionPayload,
  "web.session.ended": validateWebSessionPayload,
  "web.acquire_requested": validateAcquireRequestedPayload,
  "physical.acquire_requested": validateAcquireRequestedPayload,
  "physical.interaction.started": validatePhysicalStatusPayload,
  "physical.interaction.ended": validatePhysicalStatusPayload,
  "physical.bust.available": validatePhysicalStatusPayload,
  "physical.bust.unavailable": validatePhysicalStatusPayload,
  "physical.status": validatePhysicalStatusPayload,
  "mock.sensor.event": validateMockSensorEventPayload,
  "brain.state.updated": validateBrainStateUpdatedPayload,
  "brain.decision.logged": validateBrainDecisionLoggedPayload,
  "brain.proactive_trigger.accepted": validateProactiveTriggerPayload,
  "brain.proactive_trigger.rejected": validateProactiveTriggerPayload,
  "embodiment.active_body.changed": validateActiveBodyChangedPayload,
  "embodiment.acquire_requested": validateAcquireRequestedPayload,
  "embodiment.release_requested": validateReleaseRequestedPayload,
  "expression.enter_active_mode": validateEnterActiveModePayload,
  "expression.enter_rest_mode": validateTargetedExpressionPayload,
  "expression.enter_sleep_pose": validateEnterSleepPosePayload,
  "expression.look_at_user": validateLookAtUserPayload,
  "expression.speak": validateSpeakPayload,
  "expression.show_emotion": validateShowEmotionPayload,
  "expression.idle_motion": validateIdleMotionPayload,
};

export function validateAliaEvent(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ["event must be an object"] };
  }

  requireString(value, "id", errors);
  requireString(value, "occurredAt", errors);
  validateSource(value.source, errors);

  if (!isNonEmptyString(value.type)) {
    errors.push("type must be a non-empty string");
  } else if (!eventTypeSet.has(value.type)) {
    errors.push(`type '${value.type}' is not part of the v0.1 protocol`);
  }

  if ("correlationId" in value && !isOptionalString(value.correlationId)) {
    errors.push("correlationId must be a string when present");
  }

  if (!isRecord(value.payload)) {
    errors.push("payload must be an object");
  }

  if (isNonEmptyString(value.type) && eventTypeSet.has(value.type)) {
    const type = value.type as EventType;
    errors.push(...payloadValidators[type](value.payload));
  }

  return errors.length === 0
    ? { ok: true, event: value as unknown as AliaEvent }
    : { ok: false, errors };
}

export function isAliaEvent(value: unknown): value is AliaEvent {
  return validateAliaEvent(value).ok;
}

export function assertAliaEvent(value: unknown): asserts value is AliaEvent {
  const result = validateAliaEvent(value);

  if (!result.ok) {
    throw new Error(`Invalid Alia event: ${result.errors.join("; ")}`);
  }
}

export function isPerceptionEventType(value: string): value is PerceptionEventType {
  return perceptionEventTypes.includes(value as PerceptionEventType);
}

export function isPhysicalAction(value: string): value is PhysicalAction {
  return physicalActions.includes(value as PhysicalAction);
}

function validatePresencePayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateBodyTarget(payload.bodyTarget, "payload.bodyTarget", errors);
  validateOptionalConfidence(payload.confidence, errors);
  return errors;
}

function validateUserMessagePayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  requireString(payload, "text", errors);
  validateBodyTarget(payload.bodyTarget, "payload.bodyTarget", errors);
  return errors;
}

function validateWebSessionPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  requireString(payload, "sessionId", errors);
  validateOptionalStringField(payload, "userId", errors);
  return errors;
}

function validatePhysicalStatusPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  if (!isStringInSet(payload.status, physicalStatusSet)) {
    errors.push("payload.status must be one of: available, unavailable, active, sleeping");
  }

  if (typeof payload.isMock !== "boolean") {
    errors.push("payload.isMock must be a boolean");
  }

  validateOptionalStringField(payload, "detail", errors);
  return errors;
}

function validateMockSensorEventPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  requireString(payload, "name", errors);
  validateBodyTarget(payload.bodyTarget, "payload.bodyTarget", errors);

  if ("reading" in payload && !isJsonValue(payload.reading)) {
    errors.push("payload.reading must be JSON-serializable when present");
  }

  return errors;
}

function validateBrainStateUpdatedPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateActiveBody(payload.activeBody, "payload.activeBody", errors);

  if (typeof payload.userPresent !== "boolean") {
    errors.push("payload.userPresent must be a boolean");
  }

  if ("physicalStatus" in payload && !isStringInSet(payload.physicalStatus, physicalStatusSet)) {
    errors.push("payload.physicalStatus must be a physical status when present");
  }

  if ("webSessionActive" in payload && typeof payload.webSessionActive !== "boolean") {
    errors.push("payload.webSessionActive must be a boolean when present");
  }

  return errors;
}

function validateBrainDecisionLoggedPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  requireString(payload, "decisionId", errors);
  requireString(payload, "reason", errors);
  validateActiveBody(payload.activeBody, "payload.activeBody", errors);
  validateBodyTarget(payload.target, "payload.target", errors);
  validateOptionalStringField(payload, "sourceEventId", errors);
  return errors;
}

function validateProactiveTriggerPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  requireString(payload, "triggerId", errors);

  if (!isStringInSet(payload.reason, proactiveTriggerReasonSet)) {
    errors.push("payload.reason must be a proactive trigger reason");
  }

  validateBodyTarget(payload.target, "payload.target", errors);
  validateOptionalStringField(payload, "sourceEventId", errors);
  return errors;
}

function validateActiveBodyChangedPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateActiveBody(payload.previous, "payload.previous", errors);
  validateActiveBody(payload.next, "payload.next", errors);
  validateOwnershipReason(payload.reason, "payload.reason", errors);
  validateOptionalStringField(payload, "requestEventId", errors);

  if ("conflict" in payload) {
    validateConflict(payload.conflict, errors);
  }

  return errors;
}

function validateAcquireRequestedPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateOwnedBody(payload.requestedBody, "payload.requestedBody", errors);
  validateOwnershipReason(payload.reason, "payload.reason", errors);
  return errors;
}

function validateReleaseRequestedPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateOwnedBody(payload.body, "payload.body", errors);
  validateOwnershipReason(payload.reason, "payload.reason", errors);
  return errors;
}

function validateTargetedExpressionPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateBodyTarget(payload.target, "payload.target", errors);
  validateOptionalStringField(payload, "reason", errors);
  return errors;
}

function validateEnterActiveModePayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push("payload must be an object");
    return errors;
  }

  validateOwnedBody(payload.target, "payload.target", errors);
  validateOptionalStringField(payload, "reason", errors);
  return errors;
}

function validateEnterSleepPosePayload(payload: unknown): string[] {
  const errors = validateTargetedExpressionPayload(payload);
  if (errors.length > 0 || !isRecord(payload)) return errors;

  if (payload.pose !== "fixed_safe_sleep") {
    errors.push("payload.pose must be fixed_safe_sleep");
  }

  return errors;
}

function validateLookAtUserPayload(payload: unknown): string[] {
  const errors = validateTargetedExpressionPayload(payload);
  if (errors.length > 0 || !isRecord(payload)) return errors;

  validateOptionalIntensity(payload.intensity, "payload.intensity", errors);
  return errors;
}

function validateSpeakPayload(payload: unknown): string[] {
  const errors = validateTargetedExpressionPayload(payload);
  if (errors.length > 0 || !isRecord(payload)) return errors;

  requireString(payload, "text", errors);
  return errors;
}

function validateShowEmotionPayload(payload: unknown): string[] {
  const errors = validateTargetedExpressionPayload(payload);
  if (errors.length > 0 || !isRecord(payload)) return errors;

  if (!isStringInSet(payload.emotion, emotionSet)) {
    errors.push("payload.emotion must be a supported emotion");
  }

  validateOptionalIntensity(payload.intensity, "payload.intensity", errors);
  return errors;
}

function validateIdleMotionPayload(payload: unknown): string[] {
  const errors = validateTargetedExpressionPayload(payload);
  if (errors.length > 0 || !isRecord(payload)) return errors;

  if (!isStringInSet(payload.motion, idleMotionSet)) {
    errors.push("payload.motion must be breathing, micro_shift, or none");
  }

  return errors;
}

function validateSource(source: unknown, errors: string[]): void {
  if (!isRecord(source)) {
    errors.push("source must be an object");
    return;
  }

  if (!isStringInSet(source.kind, sourceKindSet)) {
    errors.push("source.kind must be a supported source kind");
  }

  validateOptionalStringField(source, "id", errors, "source.id");
}

function validateOwnershipReason(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  if (!isStringInSet(value.code, reasonCodeSet)) {
    errors.push(`${path}.code must be an ownership reason code`);
  }

  validateOptionalStringField(value, "detail", errors, `${path}.detail`);
}

function validateConflict(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("payload.conflict must be an object");
    return;
  }

  if (!Array.isArray(value.requested) || value.requested.length === 0) {
    errors.push("payload.conflict.requested must be a non-empty array");
  } else {
    for (const requestedBody of value.requested) {
      validateOwnedBody(requestedBody, "payload.conflict.requested[]", errors);
    }
  }

  validateActiveBody(value.resolvedTo, "payload.conflict.resolvedTo", errors);

  if (!isStringInSet(value.rule, conflictRuleSet)) {
    errors.push("payload.conflict.rule must be physical_priority, availability, or manual");
  }
}

function validateBodyTarget(value: unknown, path: string, errors: string[]): void {
  if (!isStringInSet(value, bodyTargetSet)) {
    errors.push(`${path} must be physical, web, both, or none`);
  }
}

function validateActiveBody(value: unknown, path: string, errors: string[]): void {
  if (!isStringInSet(value, activeBodySet)) {
    errors.push(`${path} must be physical, web, or none`);
  }
}

function validateOwnedBody(value: unknown, path: string, errors: string[]): void {
  if (!isStringInSet(value, ownedBodySet)) {
    errors.push(`${path} must be physical or web`);
  }
}

function validateOptionalConfidence(value: unknown, errors: string[]): void {
  if (value === undefined) return;

  if (typeof value !== "number" || value < 0 || value > 1) {
    errors.push("payload.confidence must be a number from 0 to 1 when present");
  }
}

function validateOptionalIntensity(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) return;

  if (!isStringInSet(value, intensitySet)) {
    errors.push(`${path} must be low, medium, or high when present`);
  }
}

function validateOptionalStringField(
  record: Record<string, unknown>,
  key: string,
  errors: string[],
  path = `payload.${key}`,
): void {
  if (key in record && !isOptionalString(record[key])) {
    errors.push(`${path} must be a string when present`);
  }
}

function requireString(record: Record<string, unknown>, key: string, errors: string[]): void {
  if (!isNonEmptyString(record[key])) {
    errors.push(`${key} must be a non-empty string`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isStringInSet<T extends string>(value: unknown, set: ReadonlySet<T>): value is T {
  return typeof value === "string" && set.has(value as T);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}
