import { useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  AliaState,
  DecisionLogEntry,
  Emotion,
  ExpressionIntent,
  StreamEventType,
} from "@alia/protocol";
import {
  WEB_AVATAR_RELEASE_PATH,
  WEB_AVATAR_REQUEST_ACTIVE_PATH,
  getDeveloperPanelModel,
  getWebActivationFeedback,
  getWebBodyMode,
} from "./avatarModel.ts";

const brainLiteUrl = (
  import.meta.env.VITE_BRAIN_LITE_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

type ConnectionState = "connecting" | "connected" | "offline";

interface StreamEvent<TData> {
  id: string;
  type: StreamEventType;
  at: string;
  data: TData;
}

interface BrainLiteResultPayload {
  state: AliaState;
  intents: ExpressionIntent[];
  logs: DecisionLogEntry[];
}

const initialState: AliaState = {
  activeBody: "none",
  currentMode: "idle",
  lastPresenceAt: null,
  lastInteractionAt: null,
  currentEmotion: "neutral",
};

export function App() {
  const [state, setState] = useState<AliaState>(initialState);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [lastDecisionLog, setLastDecisionLog] =
    useState<DecisionLogEntry | null>(null);
  const [latestExpressionIntent, setLatestExpressionIntent] =
    useState<ExpressionIntent | null>(null);
  const [commandState, setCommandState] = useState<{
    pending: boolean;
    message: string | null;
  }>({
    pending: false,
    message: null,
  });

  const webMode = useMemo(() => getWebBodyMode(state), [state]);
  const developerPanel = useMemo(
    () => getDeveloperPanelModel(state, lastDecisionLog, latestExpressionIntent),
    [state, lastDecisionLog, latestExpressionIntent],
  );

  useEffect(() => {
    const eventSource = new EventSource(`${brainLiteUrl}/events`);

    eventSource.onopen = () => {
      setConnectionState("connected");
      setCommandState((current) => ({
        ...current,
        message: null,
      }));
    };

    eventSource.onerror = () => {
      setConnectionState("offline");
    };

    eventSource.addEventListener("state.updated", (event) => {
      const streamEvent = parseStreamEvent<AliaState>(event);
      if (streamEvent === null) {
        return;
      }

      setState(streamEvent.data);
    });

    eventSource.addEventListener("decision.logged", (event) => {
      const streamEvent = parseStreamEvent<DecisionLogEntry>(event);
      if (streamEvent === null) {
        return;
      }

      setLastDecisionLog(streamEvent.data);
    });

    eventSource.addEventListener("expression.intent", (event) => {
      const streamEvent = parseStreamEvent<ExpressionIntent>(event);
      if (streamEvent === null) {
        return;
      }

      setLatestExpressionIntent(streamEvent.data);
    });

    return () => {
      eventSource.close();
    };
  }, []);

  async function requestWebActivation(): Promise<void> {
    await postBrainLiteCommand(
      WEB_AVATAR_REQUEST_ACTIVE_PATH,
      getWebActivationFeedback,
    );
  }

  async function releaseWebActivation(): Promise<void> {
    await postBrainLiteCommand(
      WEB_AVATAR_RELEASE_PATH,
      () => "Web release request accepted.",
    );
  }

  async function postBrainLiteCommand(
    path: string,
    getSuccessMessage: (result: BrainLiteResultPayload) => string,
  ): Promise<void> {
    setCommandState({
      pending: true,
      message: null,
    });

    try {
      const response = await fetch(`${brainLiteUrl}${path}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Brain-lite returned ${response.status}`);
      }

      const result = (await response.json()) as BrainLiteResultPayload;
      setState(result.state);
      setLastDecisionLog((current) => result.logs.at(-1) ?? current);
      setLatestExpressionIntent((current) => result.intents.at(-1) ?? current);
      setCommandState({
        pending: false,
        message: getSuccessMessage(result),
      });
    } catch (error) {
      setCommandState({
        pending: false,
        message: error instanceof Error ? error.message : "Command failed",
      });
    }
  }

  return (
    <main className={`avatar-shell mode-${webMode}`}>
      <section className="avatar-stage" aria-label="Alia Web Avatar body">
        <div className="connection-strip">
          <span className={`status-dot status-${connectionState}`} />
          <span>{connectionState}</span>
        </div>

        <div
          className={`avatar avatar-${webMode} emotion-${state.currentEmotion}`}
        >
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
                <div className={`mouth mouth-${mouthFor(state.currentEmotion)}`} />
              </div>
            </div>
          </div>
          <div className="expression-tag">
            <span>{state.currentEmotion}</span>
          </div>
        </div>
      </section>

      <aside className="developer-panel" aria-label="Developer panel">
        <div className="panel-header">
          <h1>Alia Web Avatar</h1>
          <p>Brain-lite digital body shell</p>
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
        </dl>

        <div className="panel-actions">
          <button
            type="button"
            onClick={() => void requestWebActivation()}
            disabled={commandState.pending}
          >
            Request Web body activation
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void releaseWebActivation()}
            disabled={commandState.pending}
          >
            Release Web body activation
          </button>
        </div>

        {commandState.message !== null ? (
          <p className="command-message">{commandState.message}</p>
        ) : null}

        <PanelBlock title="last decision log">
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
      </aside>
    </main>
  );
}

function PanelBlock(props: { title: string; children: ReactNode }) {
  return (
    <section className="panel-block">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function parseStreamEvent<TData>(event: Event): StreamEvent<TData> | null {
  const messageEvent = event as MessageEvent<string>;

  try {
    return JSON.parse(messageEvent.data) as StreamEvent<TData>;
  } catch {
    return null;
  }
}

function mouthFor(emotion: Emotion): "smile" | "soft" | "flat" {
  if (emotion === "happy" || emotion === "curious") {
    return "smile";
  }

  if (emotion === "sleepy" || emotion === "neutral") {
    return "soft";
  }

  return "flat";
}
