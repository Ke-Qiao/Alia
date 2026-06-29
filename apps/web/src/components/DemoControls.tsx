interface DemoControlsProps {
  commandPending: boolean;
  commandMessage: string | null;
  onRequestWebActivation: () => void;
  onReleaseWebActivation: () => void;
}

export function DemoControls(props: DemoControlsProps) {
  return (
    <section className="demo-controls" aria-label="Demo controls">
      <div className="panel-actions">
        <button
          type="button"
          onClick={props.onRequestWebActivation}
          disabled={props.commandPending}
        >
          Request Web body activation
        </button>
        <button
          type="button"
          className="secondary"
          onClick={props.onReleaseWebActivation}
          disabled={props.commandPending}
        >
          Release Web body activation
        </button>
      </div>

      {props.commandMessage !== null ? (
        <p className="command-message">{props.commandMessage}</p>
      ) : null}
    </section>
  );
}
