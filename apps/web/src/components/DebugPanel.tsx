import type { DeveloperPanelModel } from "../avatarModel.ts";
import { DemoControls } from "./DemoControls.tsx";
import { PanelBlock } from "./PanelBlock.tsx";

interface DebugPanelProps {
  developerPanel: DeveloperPanelModel;
  commandPending: boolean;
  commandMessage: string | null;
  onRequestWebActivation: () => void;
  onReleaseWebActivation: () => void;
}

export function DebugPanel(props: DebugPanelProps) {
  const { developerPanel } = props;

  return (
    <section className="dashboard-page debug-page" aria-label="Debug page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Debug</p>
          <h1>Brain-lite observability</h1>
        </div>
        <p>
          Read-only state from Brain-lite, plus manual demo ownership commands.
        </p>
      </div>

      <dl className="state-grid">
        <div>
          <dt>activeBody</dt>
          <dd>{developerPanel.activeBody}</dd>
        </div>
        <div>
          <dt>currentMode</dt>
          <dd>{developerPanel.currentMode}</dd>
        </div>
        <div>
          <dt>webMode</dt>
          <dd>{developerPanel.webMode}</dd>
        </div>
        <div>
          <dt>currentEmotion</dt>
          <dd>{developerPanel.currentEmotion}</dd>
        </div>
        <div>
          <dt>physicalMode</dt>
          <dd>{developerPanel.physicalMode}</dd>
        </div>
        {developerPanel.physicalAvailable !== null ? (
          <div>
            <dt>physicalAvailable</dt>
            <dd>{String(developerPanel.physicalAvailable)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="debug-grid">
        <PanelBlock title="latest decision log">
          {developerPanel.lastDecisionLog === null ? (
            <p className="muted">none</p>
          ) : (
            <div className="event-card">
              <strong>{developerPanel.lastDecisionLog.decision}</strong>
              <span>{developerPanel.lastDecisionLog.reason}</span>
              <small>{developerPanel.lastDecisionLog.eventType}</small>
            </div>
          )}
        </PanelBlock>

        <PanelBlock title="latest expression intent">
          {developerPanel.latestExpressionIntent === null ? (
            <p className="muted">none</p>
          ) : (
            <div className="event-card">
              <strong>
                {developerPanel.latestExpressionIntent.target} /{" "}
                {developerPanel.latestExpressionIntent.kind}
              </strong>
              <span>{developerPanel.latestExpressionIntent.abstractPose}</span>
              <small>{developerPanel.latestExpressionIntent.emotion}</small>
            </div>
          )}
        </PanelBlock>
      </div>

      <PanelBlock title="demo controls">
        <DemoControls
          commandPending={props.commandPending}
          commandMessage={props.commandMessage}
          onRequestWebActivation={props.onRequestWebActivation}
          onReleaseWebActivation={props.onReleaseWebActivation}
        />
      </PanelBlock>
    </section>
  );
}
