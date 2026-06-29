#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  type ActiveBody,
  type ExpressionEvent,
  type JsonValue,
  type PerceptionEvent,
  BRAIN_LITE_ENDPOINTS,
  DEFAULT_BRAIN_LITE_URL,
  DEFAULT_EMBEDDED_MOCK_HOST,
  DEFAULT_EMBEDDED_MOCK_PORT,
  EMBEDDED_MOCK_ENDPOINTS,
  EXPRESSION_INTENT_KINDS,
  assertAliaEvent,
  expressionEventTypes,
  isPerceptionEventType,
} from "@alia/protocol";
import {
  PHYSICAL_ACTIONS,
  PHYSICAL_SLEEP_POSE,
  PhysicalMockRuntime,
  isPhysicalAction,
  type LegacyExpressionIntent,
  type PhysicalAction,
  type PhysicalActionRequest,
} from "./runtime.ts";

type SensorCommand =
  | "presence"
  | "presence-lost"
  | "mock-event"
  | "web-active-conflict-test"
  | "physical-available"
  | "physical-unavailable";

interface CliOptions {
  brainUrl: string;
  sensorPath: string;
  connectPath: string;
  host: string;
  port: number;
  callbackUrl: string | null;
  dryRun: boolean;
  payload: Record<string, unknown>;
}

interface ParsedCli {
  command: string;
  options: CliOptions;
}

const DEFAULT_OPTIONS: CliOptions = {
  brainUrl: process.env.BRAIN_LITE_URL ?? DEFAULT_BRAIN_LITE_URL,
  sensorPath: process.env.BRAIN_LITE_SENSOR_EVENTS_PATH ?? BRAIN_LITE_ENDPOINTS.sensorEvents,
  connectPath:
    process.env.BRAIN_LITE_EMBEDDED_CONNECT_PATH ?? BRAIN_LITE_ENDPOINTS.embeddedMockConnect,
  host: process.env.EMBEDDED_MOCK_HOST ?? DEFAULT_EMBEDDED_MOCK_HOST,
  port: Number(process.env.EMBEDDED_MOCK_PORT ?? DEFAULT_EMBEDDED_MOCK_PORT),
  callbackUrl: process.env.EMBEDDED_MOCK_CALLBACK_URL ?? null,
  dryRun: false,
  payload: {},
};

async function main(rawArgs: string[]): Promise<void> {
  const { command, options } = parseCli(rawArgs);

  switch (command) {
    case "presence":
    case "presence-lost":
    case "mock-event":
    case "web-active-conflict-test":
    case "physical-available":
    case "physical-unavailable":
      await emitSensorCommand(command, options);
      return;

    case "run":
      await runReceiver(options);
      return;

    case "self-test":
      runSelfTest();
      return;

    case "help":
    case "--help":
    case "-h":
      printUsage();
      return;

    default:
      printUsage();
      throw new Error(`Unknown embedded mock command: ${command}`);
  }
}

async function emitSensorCommand(command: SensorCommand, options: CliOptions): Promise<void> {
  const runtime = new PhysicalMockRuntime();
  const event = createOutboundEvent(command, options.payload);
  const response = await postJson(joinUrl(options.brainUrl, options.sensorPath), event, options.dryRun);
  const appliedCount = applyInboundBrainLiteMessage(response, runtime);

  if (command === "web-active-conflict-test" && options.dryRun && appliedCount === 0) {
    runtime.applyActiveBody("web", "dry-run web-active-conflict-test ownership sample");
  }
}

function createOutboundEvent(
  command: SensorCommand,
  payload: Record<string, unknown>,
): PerceptionEvent {
  const base = {
    id: createId("sensor"),
    occurredAt: new Date().toISOString(),
    source: {
      kind: "mock.hardware" as const,
      id: "embedded-mock",
    },
  };

  if (command === "web-active-conflict-test") {
    return {
      ...base,
      type: "web.session.started",
      source: {
        kind: "mock.script" as const,
        id: "embedded-mock",
      },
      payload: {
        sessionId:
          typeof payload.sessionId === "string"
            ? payload.sessionId
            : "embedded-mock-web-active-conflict-test",
        userId: typeof payload.userId === "string" ? payload.userId : undefined,
      },
    };
  }

  if (command === "physical-available" || command === "physical-unavailable") {
    const status = command === "physical-available" ? "available" : "unavailable";

    return {
      ...base,
      type:
        command === "physical-available"
          ? "physical.bust.available"
          : "physical.bust.unavailable",
      source: {
        kind: "physical" as const,
        id: "embedded-mock",
      },
      payload: {
        status,
        isMock: true,
        detail:
          typeof payload.detail === "string"
            ? payload.detail
            : `Embedded mock physical bust is ${status}.`,
      },
    };
  }

  const type =
    command === "presence"
      ? "presence.detected"
      : command === "presence-lost"
        ? "presence.lost"
        : "mock.sensor.event";

  if (!isPerceptionEventType(type)) {
    throw new Error(`Unsupported mock sensor event type: ${type}`);
  }

  if (type === "presence.detected" || type === "presence.lost") {
    return {
      ...base,
      type,
      payload: {
        bodyTarget: "physical" as const,
        confidence: typeof payload.confidence === "number" ? payload.confidence : 1,
      },
    };
  }

  return {
    ...base,
    type: "mock.sensor.event",
    payload: {
      name: typeof payload.name === "string" ? payload.name : defaultMockSensorName(command),
      bodyTarget: "physical" as const,
      reading: toJsonValue({
        emittedBy: "embedded-mock",
        command,
        ...defaultPayloadForCommand(command),
        ...payload,
      }),
    },
  };
}

function defaultMockSensorName(command: SensorCommand): string {
  return command === "web-active-conflict-test" ? "web_active_conflict_test" : "manual";
}

function defaultPayloadForCommand(command: SensorCommand): Record<string, unknown> {
  switch (command) {
    case "presence":
      return { presence: true };
    case "presence-lost":
      return { presence: false, legacyEventName: "presence.lost" };
    case "mock-event":
      return { scenario: "manual" };
    case "web-active-conflict-test":
      return {
        scenario: "web-active-conflict-test",
        webAvatarActive: true,
        physicalBustAvailable: true,
        expectedPhysicalAction: "enterSleepPose",
        expectedPhysicalPose: PHYSICAL_SLEEP_POSE.pose,
      };
    case "physical-available":
      return { status: "available", isMock: true };
    case "physical-unavailable":
      return { status: "unavailable", isMock: true };
  }
}

async function runReceiver(options: CliOptions): Promise<void> {
  const runtime = new PhysicalMockRuntime();
  const callbackUrl =
    options.callbackUrl ??
    `http://${options.host}:${options.port}${EMBEDDED_MOCK_ENDPOINTS.expressionIntents}`;

  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, runtime);
    } catch (error) {
      writeJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, options.host, resolve);
  });

  logRuntimeEvent("receiver.started", {
    host: options.host,
    port: options.port,
    expressionIntentsPath: EMBEDDED_MOCK_ENDPOINTS.expressionIntents,
    ownershipPath: EMBEDDED_MOCK_ENDPOINTS.ownership,
  });

  await connectToBrainLite(options, callbackUrl);
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  runtime: PhysicalMockRuntime,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === EMBEDDED_MOCK_ENDPOINTS.health) {
    writeJson(response, 200, {
      ok: true,
      body: "physical",
      state: runtime.getState(),
      hardware: "mock-only",
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === EMBEDDED_MOCK_ENDPOINTS.ownership) {
    const body = await readJsonBody(request);
    const activeBody = readActiveBody(body);

    if (!activeBody) {
      writeJson(response, 400, { ok: false, error: "Expected activeBody physical|web|none" });
      return;
    }

    const entries = runtime.applyActiveBody(activeBody, "Brain-lite ownership assignment");
    writeJson(response, 200, { ok: true, applied: entries.length, state: runtime.getState() });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === EMBEDDED_MOCK_ENDPOINTS.expressionIntents) {
    const body = await readJsonBody(request);
    const applied = applyInboundBrainLiteMessage(body, runtime);

    if (applied === 0) {
      writeJson(response, 400, {
        ok: false,
        error: "No physical expression intent, ownership assignment, or physical action was applied",
      });
      return;
    }

    writeJson(response, 200, { ok: true, applied, state: runtime.getState() });
    return;
  }

  writeJson(response, 404, { ok: false, error: "Not found" });
}

async function connectToBrainLite(options: CliOptions, callbackUrl: string): Promise<void> {
  const registration = {
    body: "physical",
    runtime: "embedded-mock",
    callbackUrl,
    healthUrl: callbackUrl.replace(
      EMBEDDED_MOCK_ENDPOINTS.expressionIntents,
      EMBEDDED_MOCK_ENDPOINTS.health,
    ),
    supportedIntentKinds: EXPRESSION_INTENT_KINDS,
    supportedExpressionEvents: expressionEventTypes,
    supportedPhysicalActions: PHYSICAL_ACTIONS,
    sleepPose: PHYSICAL_SLEEP_POSE,
    hardware: {
      gpio: "not-implemented",
      serial: "not-implemented",
      camera: "not-implemented",
      microphone: "not-implemented",
      servoDriver: "not-implemented",
      tts: "not-implemented",
    },
  };

  try {
    await postJson(joinUrl(options.brainUrl, options.connectPath), registration, options.dryRun);
  } catch (error) {
    logRuntimeEvent("brain-lite.connection.failed", {
      brainUrl: options.brainUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function applyInboundBrainLiteMessage(value: unknown, runtime: PhysicalMockRuntime): number {
  if (!isRecord(value)) {
    return 0;
  }

  let applied = 0;
  const activeBody = readActiveBody(value) ?? readActiveBody(value.state);

  if (activeBody) {
    applied += runtime.applyActiveBody(activeBody, "Brain-lite active body state").length;
  }

  for (const candidate of collectIntentCandidates(value)) {
    const event = readExpressionEvent(candidate);

    if (event) {
      applied += runtime.applyExpressionEvent(event).length;
      continue;
    }

    const legacyIntent = readLegacyExpressionIntent(candidate);

    if (legacyIntent) {
      applied += runtime.applyLegacyExpressionIntent(legacyIntent).length;
      continue;
    }

    const physicalActions = readPhysicalActionRequests(candidate);

    if (physicalActions.length > 0) {
      applied += runtime.applyPhysicalActions(physicalActions).length;
    }
  }

  return applied;
}

function collectIntentCandidates(value: Record<string, unknown>): unknown[] {
  const candidates: unknown[] = [value];

  for (const key of ["event", "intent", "expressionIntent", "expressionEvent", "dispatch"]) {
    if (key in value) {
      candidates.push(value[key]);
    }
  }

  for (const key of ["events", "intents", "expressionIntents", "expressionEvents", "dispatches"]) {
    const maybeArray = value[key];

    if (Array.isArray(maybeArray)) {
      candidates.push(...maybeArray);
    }
  }

  return candidates;
}

function readExpressionEvent(value: unknown): ExpressionEvent | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  if (!isExpressionEventType(value.type) || !isRecord(value.payload)) {
    return null;
  }

  return value as unknown as ExpressionEvent;
}

function readLegacyExpressionIntent(value: unknown): LegacyExpressionIntent | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.target !== "string" ||
    typeof value.mode !== "string" ||
    typeof value.emotion !== "string" ||
    typeof value.abstractPose !== "string" ||
    typeof value.reason !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  if (!isBodyTarget(value.target)) {
    return null;
  }

  return value as unknown as LegacyExpressionIntent;
}

function readPhysicalActionRequests(value: unknown): PhysicalActionRequest[] {
  if (!isRecord(value)) {
    return [];
  }

  const target = typeof value.targetBody === "string" ? value.targetBody : value.target;

  if (target !== "physical" && target !== "both") {
    return [];
  }

  const actionValues = Array.isArray(value.actions)
    ? value.actions
    : value.action
      ? [value.action]
      : [];

  return actionValues.flatMap((actionValue) => {
    if (typeof actionValue === "string" && isPhysicalAction(actionValue)) {
      return [{ name: actionValue }];
    }

    if (!isRecord(actionValue) || typeof actionValue.name !== "string") {
      return [];
    }

    if (!isPhysicalAction(actionValue.name)) {
      return [];
    }

    return [
      {
        name: actionValue.name,
        payload: isRecord(actionValue.payload) ? actionValue.payload : {},
      },
    ];
  });
}

function readActiveBody(value: unknown): ActiveBody | null {
  if (!isRecord(value) || typeof value.activeBody !== "string") {
    return null;
  }

  if (value.activeBody === "physical" || value.activeBody === "web" || value.activeBody === "none") {
    return value.activeBody;
  }

  return null;
}

async function postJson(url: string, body: unknown, dryRun: boolean): Promise<unknown> {
  logRuntimeEvent(dryRun ? "http.post.dry-run" : "http.post", {
    url,
    body,
  });

  if (dryRun) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = parseJsonOrText(text);

  if (!response.ok) {
    throw new Error(`Brain-lite returned ${response.status}: ${text}`);
  }

  return data;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as unknown;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function parseCli(rawArgs: string[]): ParsedCli {
  const [maybeCommand, ...rest] = rawArgs;
  const command = maybeCommand && !maybeCommand.startsWith("--") ? maybeCommand : "help";
  const args = command === "help" ? rawArgs : rest;
  const options: CliOptions = { ...DEFAULT_OPTIONS };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--":
        break;
      case "--brain-url":
        options.brainUrl = readNextArg(args, ++index, arg);
        break;
      case "--sensor-path":
        options.sensorPath = readNextArg(args, ++index, arg);
        break;
      case "--connect-path":
        options.connectPath = readNextArg(args, ++index, arg);
        break;
      case "--host":
        options.host = readNextArg(args, ++index, arg);
        break;
      case "--port":
        options.port = Number(readNextArg(args, ++index, arg));
        break;
      case "--callback-url":
        options.callbackUrl = readNextArg(args, ++index, arg);
        break;
      case "--payload":
        options.payload = parseJsonObject(readNextArg(args, ++index, arg), arg);
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error(`Invalid --port value: ${options.port}`);
  }

  return { command, options };
}

function readNextArg(args: string[], index: number, flag: string): string {
  const value = args[index];

  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function parseJsonObject(raw: string, flag: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(`${flag} must be a JSON object`);
  }

  return parsed;
}

function parseJsonOrText(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isExpressionEventType(value: string): value is ExpressionEvent["type"] {
  return expressionEventTypes.includes(value as ExpressionEvent["type"]);
}

function isBodyTarget(value: unknown): value is LegacyExpressionIntent["target"] {
  return value === "physical" || value === "web" || value === "both" || value === "none";
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function logRuntimeEvent(event: string, details: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      component: "embedded-mock",
      event,
      timestamp: new Date().toISOString(),
      details,
    }),
  );
}

function runSelfTest(): void {
  const logs: unknown[] = [];
  const runtime = new PhysicalMockRuntime({
    now: () => "2026-01-01T00:00:00.000Z",
    log: (entry) => logs.push(entry),
  });

  assertOutboundEvent(createOutboundEvent("presence", {}), "presence.detected", {
    bodyTarget: "physical",
    confidence: 1,
  });
  assertOutboundEvent(createOutboundEvent("presence-lost", {}), "presence.lost", {
    bodyTarget: "physical",
    confidence: 1,
  });
  assertOutboundEvent(
    createOutboundEvent("mock-event", { name: "manual_button" }),
    "mock.sensor.event",
    {
      name: "manual_button",
      bodyTarget: "physical",
    },
  );
  assertOutboundEvent(createOutboundEvent("physical-available", {}), "physical.bust.available", {
    status: "available",
    isMock: true,
  });
  assertOutboundEvent(createOutboundEvent("physical-unavailable", {}), "physical.bust.unavailable", {
    status: "unavailable",
    isMock: true,
  });

  runtime.applyLegacyExpressionIntent({
    id: "intent_test_greeting",
    kind: "greeting",
    target: "physical",
    mode: "speaking",
    emotion: "happy",
    abstractPose: "warm_presence_greeting",
    text: "Hi, I noticed you arrived.",
    reason: "presence detected",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  runtime.applyActiveBody("web", "web avatar active");

  const actions = logs
    .filter(isRecord)
    .map((entry) => entry.action)
    .filter((action): action is PhysicalAction => typeof action === "string" && isPhysicalAction(action));

  assert.deepEqual(actions, [
    "enterActiveMode",
    "lookAtUser",
    "showEmotion",
    "speak",
    "enterSleepPose",
  ]);
  assert.equal(runtime.getState().mode, "sleep");
  assert.equal(runtime.getState().head, "lowered");
  assert.equal(runtime.getState().eyes, "closed");
  assert.deepEqual(
    runtime.getState().safeServoFixedAngles,
    PHYSICAL_SLEEP_POSE.safeServoFixedAngles,
  );

  const unknownActionCount = applyInboundBrainLiteMessage(
    { target: "physical", action: "unknownAction" },
    runtime,
  );
  assert.equal(unknownActionCount, 0);
  assert.throws(() => parseJsonObject("[]", "--payload"), /must be a JSON object/);

  console.log("@alia/embedded-mock: self-test passed");
}

function assertOutboundEvent(
  event: PerceptionEvent,
  expectedType: PerceptionEvent["type"],
  expectedPayload: Record<string, unknown>,
): void {
  assertAliaEvent(event);
  assert.equal(event.type, expectedType);

  for (const [key, value] of Object.entries(expectedPayload)) {
    assert.deepEqual(event.payload[key as keyof typeof event.payload], value);
  }
}

function printUsage(): void {
  console.log(`Usage:
  pnpm --filter @alia/embedded-mock mock:run
  pnpm --filter @alia/embedded-mock mock:presence -- --brain-url http://127.0.0.1:3000
  pnpm --filter @alia/embedded-mock mock:presence-lost
  pnpm --filter @alia/embedded-mock mock:event -- --payload '{"kind":"button.press"}'
  pnpm --filter @alia/embedded-mock mock:physical-available -- --dry-run
  pnpm --filter @alia/embedded-mock mock:physical-unavailable -- --dry-run
  pnpm --filter @alia/embedded-mock mock:web-active-conflict-test -- --dry-run

Options:
  --brain-url <url>       Brain-lite base URL. Defaults to BRAIN_LITE_URL or ${DEFAULT_BRAIN_LITE_URL}
  --sensor-path <path>    Sensor event POST path. Defaults to ${BRAIN_LITE_ENDPOINTS.sensorEvents}
  --connect-path <path>   Embedded registration POST path. Defaults to ${BRAIN_LITE_ENDPOINTS.embeddedMockConnect}
  --host <host>           Receiver host. Defaults to ${DEFAULT_EMBEDDED_MOCK_HOST}
  --port <port>           Receiver port. Defaults to ${DEFAULT_EMBEDDED_MOCK_PORT}
  --callback-url <url>    Public callback URL for Brain-lite dispatch registration.
  --payload <json>        Extra sensor event payload object.
  --dry-run               Log outgoing requests without sending them.`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(
    JSON.stringify({
      component: "embedded-mock",
      event: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
