import { useEffect, useMemo, useState } from "react";

import type {
  AliaState,
  DecisionLogEntry,
  ExpressionIntent,
} from "@alia/protocol";
import { getAvatarAssetStatus } from "./avatarAssets.ts";
import {
  WEB_AVATAR_RELEASE_PATH,
  WEB_AVATAR_REQUEST_ACTIVE_PATH,
  getAvatarSubtitleText,
  getDeveloperPanelModel,
  getWebActivationFeedback,
  getWebBodyMode,
} from "./avatarModel.ts";
import {
  type BrainLiteResultPayload,
  type CommandState,
  type ConnectionState,
  parseStreamEvent,
} from "./brainLiteClient.ts";
import { AvatarView } from "./components/AvatarView.tsx";
import { DebugPanel } from "./components/DebugPanel.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";

type AppSection = "avatar" | "debug" | "settings";

const navigationItems: { id: AppSection; label: string; description: string }[] = [
  {
    id: "avatar",
    label: "Avatar",
    description: "Digital body",
  },
  {
    id: "debug",
    label: "Debug",
    description: "Brain-lite state",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Runtime status",
  },
];

const futureNavigationItems = [
  {
    label: "Voice",
    description: "future",
  },
  {
    label: "Memory",
    description: "future",
  },
];

const brainLiteUrl = (
  import.meta.env.VITE_BRAIN_LITE_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

const configuredAvatarModelUrl = import.meta.env.VITE_AVATAR_MODEL_URL;

const initialState: AliaState = {
  activeBody: "none",
  currentMode: "idle",
  lastPresenceAt: null,
  lastInteractionAt: null,
  currentEmotion: "neutral",
};

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("avatar");
  const [state, setState] = useState<AliaState>(initialState);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [lastDecisionLog, setLastDecisionLog] =
    useState<DecisionLogEntry | null>(null);
  const [latestExpressionIntent, setLatestExpressionIntent] =
    useState<ExpressionIntent | null>(null);
  const [commandState, setCommandState] = useState<CommandState>({
    pending: false,
    message: null,
  });

  const webMode = useMemo(() => getWebBodyMode(state), [state]);
  const developerPanel = useMemo(
    () => getDeveloperPanelModel(state, lastDecisionLog, latestExpressionIntent),
    [state, lastDecisionLog, latestExpressionIntent],
  );
  const avatarAssetStatus = useMemo(
    () => getAvatarAssetStatus(configuredAvatarModelUrl, "failed"),
    [],
  );
  const avatarSubtitleText = useMemo(
    () => getAvatarSubtitleText(latestExpressionIntent),
    [latestExpressionIntent],
  );
  const activeNavigationItem = navigationItems.find(
    (item) => item.id === activeSection,
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
    <div className={`app-shell mode-${webMode}`}>
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <div>
            <strong>Alia</strong>
            <span>Web Body</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Web app sections">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-item"
              aria-current={item.id === activeSection ? "page" : undefined}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}

          {futureNavigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="nav-item nav-item-disabled"
              disabled
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">v0.2 shell / mock-first runtime</div>
      </aside>

      <div className="app-workspace">
        <header className="top-bar">
          <div>
            <p>{activeNavigationItem?.description ?? "Web Avatar"}</p>
            <h1>{activeNavigationItem?.label ?? "Avatar"}</h1>
          </div>

          <div className="top-status-cluster" aria-label="Current status">
            <span className="top-status-chip">
              <span className={`status-dot status-${connectionState}`} />
              {connectionState}
            </span>
            <span className="top-status-chip">activeBody: {state.activeBody}</span>
            <span className="top-status-chip">webMode: {webMode}</span>
          </div>
        </header>

        <main className="app-content">
          {activeSection === "avatar" ? (
            <AvatarView
              state={state}
              webMode={webMode}
              connectionState={connectionState}
              commandPending={commandState.pending}
              commandMessage={commandState.message}
              subtitleText={avatarSubtitleText}
            />
          ) : null}

          {activeSection === "debug" ? (
            <DebugPanel
              developerPanel={developerPanel}
              commandPending={commandState.pending}
              commandMessage={commandState.message}
              onRequestWebActivation={() => void requestWebActivation()}
              onReleaseWebActivation={() => void releaseWebActivation()}
            />
          ) : null}

          {activeSection === "settings" ? (
            <SettingsPanel
              avatarAssetStatus={avatarAssetStatus}
              brainLiteUrl={brainLiteUrl}
              connectionState={connectionState}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
