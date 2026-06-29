import type { AliaState, BodyMode } from "@alia/protocol";

import type { ConnectionState } from "../brainLiteClient.ts";
import { PlaceholderAvatarRenderer } from "./avatarRenderers/PlaceholderAvatarRenderer.tsx";

interface AvatarViewProps {
  state: AliaState;
  webMode: BodyMode;
  connectionState: ConnectionState;
  commandPending: boolean;
  commandMessage: string | null;
  subtitleText: string;
}

export function AvatarView(props: AvatarViewProps) {
  const {
    state,
    webMode,
    connectionState,
    commandPending,
    commandMessage,
    subtitleText,
  } = props;
  const activationFeedback = getActivationFeedbackLabel(
    state,
    commandPending,
    commandMessage,
  );

  return (
    <section className="avatar-stage" aria-label="Alia Web Avatar body">
      <div className="avatar-status-overlay">
        <div className="status-pill">
          <span className={`status-dot status-${connectionState}`} />
          <span>{connectionState}</span>
        </div>
        <div className="status-pill">
          <span>web</span>
          <strong>{webMode}</strong>
        </div>
        <div className="status-pill">
          <span>owner</span>
          <strong>{state.activeBody}</strong>
        </div>
      </div>

      <PlaceholderAvatarRenderer state={state} webMode={webMode} />

      <div className="avatar-dialogue" aria-live="polite">
        <p>{subtitleText}</p>
        <span>{activationFeedback}</span>
      </div>
    </section>
  );
}

function getActivationFeedbackLabel(
  state: AliaState,
  commandPending: boolean,
  commandMessage: string | null,
): string {
  if (commandPending) {
    return "Web activation command pending.";
  }

  if (commandMessage !== null) {
    return commandMessage;
  }

  if (state.activeBody === "web") {
    return "Web body active; physical bust is sleeping.";
  }

  if (state.activeBody === "physical") {
    return "Physical body active; Web Avatar is resting.";
  }

  return "Web body idle; Brain-lite owns activation.";
}
