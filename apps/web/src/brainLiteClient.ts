import type {
  AliaState,
  DecisionLogEntry,
  ExpressionIntent,
  StreamEventType,
} from "@alia/protocol";

export type ConnectionState = "connecting" | "connected" | "offline";

export interface CommandState {
  pending: boolean;
  message: string | null;
}

export interface StreamEvent<TData> {
  id: string;
  type: StreamEventType;
  at: string;
  data: TData;
}

export interface BrainLiteResultPayload {
  state: AliaState;
  intents: ExpressionIntent[];
  logs: DecisionLogEntry[];
}

export function parseStreamEvent<TData>(
  event: Event,
): StreamEvent<TData> | null {
  const messageEvent = event as MessageEvent<string>;

  try {
    return JSON.parse(messageEvent.data) as StreamEvent<TData>;
  } catch {
    return null;
  }
}
