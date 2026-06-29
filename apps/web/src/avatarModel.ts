import {
  BRAIN_LITE_ENDPOINTS,
  type AliaState,
  type BodyMode,
  type DecisionLogEntry,
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
  lastDecisionLog: DecisionLogEntry | null;
  latestExpressionIntent: ExpressionIntent | null;
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
    lastDecisionLog,
    latestExpressionIntent,
  };
}
