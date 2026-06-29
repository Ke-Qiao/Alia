import type { AvatarAssetStatus } from "../avatarAssets.ts";
import type { ConnectionState } from "../brainLiteClient.ts";
import { PanelBlock } from "./PanelBlock.tsx";

interface SettingsPanelProps {
  avatarAssetStatus: AvatarAssetStatus;
  brainLiteUrl: string;
  connectionState: ConnectionState;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { avatarAssetStatus, brainLiteUrl, connectionState } = props;

  return (
    <section className="dashboard-page settings-page" aria-label="Settings page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Web Avatar runtime</h1>
        </div>
        <p>
          Runtime configuration currently shown for inspection only. Brain-lite
          remains the source of truth.
        </p>
      </div>

      <div className="settings-grid">
        <PanelBlock title="server">
          <dl className="asset-status-list">
            <div>
              <dt>server URL</dt>
              <dd>{brainLiteUrl}</dd>
            </div>
            <div>
              <dt>connection status</dt>
              <dd>{connectionState}</dd>
            </div>
          </dl>
        </PanelBlock>

        <PanelBlock title="avatar asset status">
          <dl className="asset-status-list">
            <div>
              <dt>asset status</dt>
              <dd>{avatarAssetStatus.currentRenderer} renderer active</dd>
            </div>
            <div>
              <dt>configured avatar model URL</dt>
              <dd>{avatarAssetStatus.configuredModelUrl ?? "not configured"}</dd>
            </div>
            <div>
              <dt>renderer type</dt>
              <dd>{avatarAssetStatus.currentRenderer}</dd>
            </div>
            <div>
              <dt>future model format</dt>
              <dd>{avatarAssetStatus.expectedFutureModelFormat}</dd>
            </div>
            <div>
              <dt>fallback status</dt>
              <dd>{avatarAssetStatus.fallbackStatus}</dd>
            </div>
          </dl>
        </PanelBlock>
      </div>

      <div className="asset-warning" role="note">
        Paid or local Avatar assets in apps/web/public/avatar are intentionally
        not committed to Git.
      </div>
    </section>
  );
}
