import {
  BRAIN_LITE_ENDPOINTS,
  type AliaState,
  type BodyMode,
  type DecisionLogEntry,
  type Emotion,
  type ExpressionIntent,
} from "@alia/protocol";

export const WEB_AVATAR_REQUEST_ACTIVE_PATH =
  BRAIN_LITE_ENDPOINTS.webAvatarRequestActive;
export const WEB_AVATAR_RELEASE_PATH = BRAIN_LITE_ENDPOINTS.webAvatarRelease;

export interface DeveloperPanelModel {
  activeBody: AliaState["activeBody"];
  currentMode: AliaState["currentMode"];
  currentEmotion: AliaState["currentEmotion"];
  webMode: BodyMode;
  physicalMode: BodyMode;
  physicalAvailable: boolean | null;
  lastDecisionLog: DecisionLogEntry | null;
  latestExpressionIntent: ExpressionIntent | null;
}

export interface WebActivationFeedbackInput {
  state: AliaState;
  logs: DecisionLogEntry[];
}

export function getWebBodyMode(state: AliaState): BodyMode {
  if (state.activeBody === "physical") {
    return "rest";
  }

  if (state.activeBody === "web") {
    return "active";
  }

  if (state.currentMode === "sleeping") {
    return "sleep";
  }

  if (state.currentMode === "resting") {
    return "rest";
  }

  return "idle";
}

export function getPhysicalBodyMode(state: AliaState): BodyMode {
  if (state.activeBody === "web") {
    return "sleep";
  }

  if (state.activeBody === "physical") {
    return "active";
  }

  return "idle";
}

export function getDeveloperPanelModel(
  state: AliaState,
  lastDecisionLog: DecisionLogEntry | null,
  latestExpressionIntent: ExpressionIntent | null,
): DeveloperPanelModel {
  return {
    activeBody: state.activeBody,
    currentMode: state.currentMode,
    currentEmotion: state.currentEmotion,
    webMode: getWebBodyMode(state),
    physicalMode: getPhysicalBodyMode(state),
    physicalAvailable: getPhysicalAvailabilityFromDecisionLog(lastDecisionLog),
    lastDecisionLog,
    latestExpressionIntent,
  };
}

export function getPhysicalAvailabilityFromDecisionLog(
  decisionLog: DecisionLogEntry | null,
): boolean | null {
  const physicalAvailable = decisionLog?.metadata?.physicalAvailable;

  return typeof physicalAvailable === "boolean" ? physicalAvailable : null;
}

export function getAvatarSubtitleText(
  latestExpressionIntent: ExpressionIntent | null,
): string {
  const explicitText = latestExpressionIntent?.text?.trim();

  if (explicitText) {
    return explicitText;
  }

  if (latestExpressionIntent === null) {
    return "Quiet presence.";
  }

  if (latestExpressionIntent.kind === "greeting") {
    return "I noticed you nearby.";
  }

  if (latestExpressionIntent.target === "web") {
    return "Resting while the physical body owns presence.";
  }

  return "Physical bust is held in safe sleep pose.";
}

export function getWebActivationFeedback(
  result: WebActivationFeedbackInput,
): string {
  if (result.state.activeBody === "web") {
    return "Web activation granted.";
  }

  const latestWebRejection = [...result.logs]
    .reverse()
    .find((log) => log.decision === "ownership.web_acquire_rejected");

  if (latestWebRejection?.reason.includes("physical_currently_active")) {
    return "Web activation rejected: physical body is active.";
  }

  if (latestWebRejection) {
    return "Web activation rejected: request accepted but ownership was not granted.";
  }

  return "Web activation request accepted, but ownership was not granted.";
}

export function getPlaceholderMouthForEmotion(
  emotion: Emotion,
): "smile" | "soft" | "flat" {
  if (emotion === "happy" || emotion === "curious") {
    return "smile";
  }

  if (emotion === "sleepy" || emotion === "neutral") {
    return "soft";
  }

  return "flat";
}
