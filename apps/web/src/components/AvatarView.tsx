import type { AliaState, BodyMode } from "@alia/protocol";

import {
  type AvatarModelLoadState,
  type AvatarRendererSelection,
  getAvatarRendererSelection,
} from "../avatarAssets.ts";
import type { ConnectionState } from "../brainLiteClient.ts";
import { PlaceholderAvatarRenderer } from "./avatarRenderers/PlaceholderAvatarRenderer.tsx";
import { VrmAvatarRenderer } from "./avatarRenderers/VrmAvatarRenderer.tsx";

interface AvatarViewProps {
  state: AliaState;
  webMode: BodyMode;
  avatarModelUrl: string;
  avatarModelLoadState: AvatarModelLoadState;
  onAvatarModelLoadStateChange: (loadState: AvatarModelLoadState) => void;
  connectionState: ConnectionState;
  commandPending: boolean;
  commandMessage: string | null;
  subtitleText: string;
}

export function AvatarView(props: AvatarViewProps) {
  const {
    state,
    webMode,
    avatarModelUrl,
    avatarModelLoadState,
    onAvatarModelLoadStateChange,
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
  const rendererSelection = getAvatarRendererSelection(
    avatarModelUrl,
    avatarModelLoadState,
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

      <AvatarRenderer
        state={state}
        webMode={webMode}
        avatarModelLoadState={avatarModelLoadState}
        rendererSelection={rendererSelection}
        onAvatarModelLoadStateChange={onAvatarModelLoadStateChange}
      />

      <div className="avatar-dialogue" aria-live="polite">
        <p>{subtitleText}</p>
        <span>{activationFeedback}</span>
      </div>
    </section>
  );
}

interface AvatarRendererProps {
  state: AliaState;
  webMode: BodyMode;
  avatarModelLoadState: AvatarModelLoadState;
  rendererSelection: AvatarRendererSelection;
  onAvatarModelLoadStateChange: (loadState: AvatarModelLoadState) => void;
}

function AvatarRenderer(props: AvatarRendererProps) {
  const {
    state,
    webMode,
    avatarModelLoadState,
    rendererSelection,
    onAvatarModelLoadStateChange,
  } = props;

  if (rendererSelection.renderer === "vrm") {
    return (
      <div className="avatar-renderer-stack">
        {avatarModelLoadState === "loading" ? (
          <PlaceholderAvatarRenderer
            key="loading-placeholder"
            state={state}
            webMode={webMode}
          />
        ) : null}
        <VrmAvatarRenderer
          key="vrm"
          modelUrl={rendererSelection.modelUrl}
          webMode={webMode}
          emotion={state.currentEmotion}
          currentMode={state.currentMode}
          onLoadStateChange={onAvatarModelLoadStateChange}
        />
      </div>
    );
  }

  return (
    <div className="avatar-renderer-stack">
      <PlaceholderAvatarRenderer state={state} webMode={webMode} />
    </div>
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
