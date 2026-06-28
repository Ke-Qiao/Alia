import {
  PHYSICAL_ACTIONS,
  PHYSICAL_SLEEP_POSE,
  isPhysicalAction,
  type ActiveBody,
  type BodyTarget,
  type ExpressionEvent,
  type PhysicalAction,
} from "@alia/protocol";

export { PHYSICAL_ACTIONS, PHYSICAL_SLEEP_POSE, isPhysicalAction };
export type { PhysicalAction };

export type PhysicalMode = "active" | "rest" | "sleep";

export interface LegacyExpressionIntent {
  id: string;
  kind: string;
  target: BodyTarget;
  mode: string;
  emotion: string;
  abstractPose: string;
  text?: string;
  reason: string;
  createdAt: string;
}

export interface PhysicalMockState {
  mode: PhysicalMode;
  head: "neutral" | "lowered";
  eyes: "open" | "closed";
  safeServoFixedAngles: typeof PHYSICAL_SLEEP_POSE.safeServoFixedAngles | null;
  lastEmotion: string | null;
  lastSpokenText: string | null;
}

export interface PhysicalActionLogEntry {
  component: "embedded-mock";
  event: "physical.action";
  action: PhysicalAction;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface PhysicalMockRuntimeOptions {
  log?: (entry: PhysicalActionLogEntry) => void;
  now?: () => string;
}

export interface PhysicalActionRequest {
  name: PhysicalAction;
  payload?: Record<string, unknown>;
}

export class PhysicalMockRuntime {
  private readonly log: (entry: PhysicalActionLogEntry) => void;
  private readonly now: () => string;
  private state: PhysicalMockState = {
    mode: "rest",
    head: "lowered",
    eyes: "closed",
    safeServoFixedAngles: null,
    lastEmotion: null,
    lastSpokenText: null,
  };

  constructor(options: PhysicalMockRuntimeOptions = {}) {
    this.log =
      options.log ??
      ((entry) => {
        console.log(JSON.stringify(entry));
      });
    this.now = options.now ?? (() => new Date().toISOString());
  }

  getState(): PhysicalMockState {
    return {
      ...this.state,
      safeServoFixedAngles: this.state.safeServoFixedAngles
        ? { ...this.state.safeServoFixedAngles }
        : null,
    };
  }

  applyActiveBody(activeBody: ActiveBody, reason: string): PhysicalActionLogEntry[] {
    if (activeBody === "web") {
      return [this.applyPhysicalAction("enterSleepPose", { reason, activeBody })];
    }

    if (activeBody === "physical") {
      return [this.applyPhysicalAction("enterActiveMode", { reason, activeBody })];
    }

    return [this.applyPhysicalAction("enterRestMode", { reason, activeBody })];
  }

  applyExpressionEvent(event: ExpressionEvent): PhysicalActionLogEntry[] {
    if (!targetsPhysical(event.payload.target)) {
      return [];
    }

    switch (event.type) {
      case "expression.enter_active_mode":
        return [
          this.applyPhysicalAction("enterActiveMode", {
            eventId: event.id,
            reason: event.payload.reason,
          }),
        ];
      case "expression.enter_rest_mode":
        return [
          this.applyPhysicalAction("enterRestMode", {
            eventId: event.id,
            reason: event.payload.reason,
          }),
        ];
      case "expression.enter_sleep_pose":
        return [
          this.applyPhysicalAction("enterSleepPose", {
            eventId: event.id,
            reason: event.payload.reason,
            pose: event.payload.pose,
          }),
        ];
      case "expression.look_at_user":
        return [
          this.applyPhysicalAction("lookAtUser", {
            eventId: event.id,
            reason: event.payload.reason,
            intensity: event.payload.intensity,
          }),
        ];
      case "expression.speak":
        return [
          this.applyPhysicalAction("speak", {
            eventId: event.id,
            reason: event.payload.reason,
            text: event.payload.text,
          }),
        ];
      case "expression.show_emotion":
        return [
          this.applyPhysicalAction("showEmotion", {
            eventId: event.id,
            reason: event.payload.reason,
            emotion: event.payload.emotion,
            intensity: event.payload.intensity,
          }),
        ];
      case "expression.idle_motion":
        return [];
    }
  }

  applyLegacyExpressionIntent(intent: LegacyExpressionIntent): PhysicalActionLogEntry[] {
    if (!targetsPhysical(intent.target)) {
      return [];
    }

    if (
      intent.kind === "body.sleep" ||
      intent.mode === "sleeping" ||
      intent.abstractPose === "closed_eyes_lowered_head_safe_fixed_pose"
    ) {
      return [
        this.applyPhysicalAction("enterSleepPose", {
          intentId: intent.id,
          reason: intent.reason,
          abstractPose: intent.abstractPose,
        }),
      ];
    }

    if (
      intent.kind === "body.rest" ||
      intent.mode === "resting" ||
      intent.abstractPose === "closed_eyes_lowered_head_low_presence"
    ) {
      return [
        this.applyPhysicalAction("enterRestMode", {
          intentId: intent.id,
          reason: intent.reason,
          abstractPose: intent.abstractPose,
        }),
      ];
    }

    const entries: PhysicalActionLogEntry[] = [
      this.applyPhysicalAction("enterActiveMode", {
        intentId: intent.id,
        reason: intent.reason,
      }),
      this.applyPhysicalAction("lookAtUser", {
        intentId: intent.id,
        source: "legacy.expression.intent",
      }),
      this.applyPhysicalAction("showEmotion", {
        intentId: intent.id,
        emotion: intent.emotion,
      }),
    ];

    if (intent.text) {
      entries.push(
        this.applyPhysicalAction("speak", {
          intentId: intent.id,
          text: intent.text,
        }),
      );
    }

    return entries;
  }

  applyPhysicalActions(actions: PhysicalActionRequest[]): PhysicalActionLogEntry[] {
    return actions.map((action) => this.applyPhysicalAction(action.name, action.payload));
  }

  applyPhysicalAction(
    action: PhysicalAction,
    payload: Record<string, unknown> = {},
  ): PhysicalActionLogEntry {
    const details = this.applyStateTransition(action, payload);
    const entry: PhysicalActionLogEntry = {
      component: "embedded-mock",
      event: "physical.action",
      action,
      timestamp: this.now(),
      details,
    };

    this.log(entry);
    return entry;
  }

  private applyStateTransition(
    action: PhysicalAction,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    switch (action) {
      case "enterActiveMode":
        this.state = {
          ...this.state,
          mode: "active",
          head: "neutral",
          eyes: "open",
          safeServoFixedAngles: null,
        };
        return {
          ...payload,
          mode: "active",
          hardwareControl: "not-implemented",
        };

      case "enterRestMode":
        this.state = {
          ...this.state,
          mode: "rest",
          head: "lowered",
          eyes: "closed",
          safeServoFixedAngles: null,
        };
        return {
          ...payload,
          mode: "rest",
          head: "lowered",
          eyes: "closed",
          hardwareControl: "not-implemented",
        };

      case "enterSleepPose":
        this.state = {
          ...this.state,
          mode: "sleep",
          head: "lowered",
          eyes: "closed",
          safeServoFixedAngles: PHYSICAL_SLEEP_POSE.safeServoFixedAngles,
        };
        return {
          ...payload,
          mode: "sleep",
          head: PHYSICAL_SLEEP_POSE.head,
          eyes: PHYSICAL_SLEEP_POSE.eyes,
          safeServoFixedAngles: PHYSICAL_SLEEP_POSE.safeServoFixedAngles,
          hardwareControl: "not-implemented",
          servoControl: PHYSICAL_SLEEP_POSE.servoControl,
        };

      case "lookAtUser":
        return {
          ...payload,
          cameraControl: "not-implemented",
          hardwareControl: "not-implemented",
        };

      case "speak": {
        const text = typeof payload.text === "string" ? payload.text : "";
        this.state = {
          ...this.state,
          lastSpokenText: text,
        };
        return {
          ...payload,
          text,
          tts: "not-implemented",
          audioOutput: "log-only",
        };
      }

      case "showEmotion": {
        const emotion = typeof payload.emotion === "string" ? payload.emotion : "neutral";
        this.state = {
          ...this.state,
          lastEmotion: emotion,
        };
        return {
          ...payload,
          emotion,
          displayOutput: "mock-only",
        };
      }
    }
  }
}

function targetsPhysical(target: BodyTarget): boolean {
  return target === "physical" || target === "both";
}
