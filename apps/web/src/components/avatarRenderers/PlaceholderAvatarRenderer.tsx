import type { AliaState, BodyMode } from "@alia/protocol";

import { getPlaceholderMouthForEmotion } from "../../avatarModel.ts";

interface PlaceholderAvatarRendererProps {
  state: AliaState;
  webMode: BodyMode;
}

export function PlaceholderAvatarRenderer(props: PlaceholderAvatarRendererProps) {
  const { state, webMode } = props;

  return (
    <div className={`avatar avatar-${webMode} emotion-${state.currentEmotion}`}>
      <div className="presence-ring" />
      <div className="body-shadow" />
      <div className="torso">
        <div className="torso-core" />
        <div className="shoulder shoulder-left" />
        <div className="shoulder shoulder-right" />
      </div>
      <div className="neck" />
      <div className="head-wrap">
        <div className="head">
          <div className="hair-cap" />
          <div className="face">
            <div className="eye eye-left">
              <span className="lid" />
              <span className="pupil" />
            </div>
            <div className="eye eye-right">
              <span className="lid" />
              <span className="pupil" />
            </div>
            <div className="nose" />
            <div
              className={`mouth mouth-${getPlaceholderMouthForEmotion(
                state.currentEmotion,
              )}`}
            />
          </div>
        </div>
      </div>
      <div className="expression-tag">
        <span>{state.currentEmotion}</span>
      </div>
    </div>
  );
}
