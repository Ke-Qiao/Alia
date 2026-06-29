import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import {
  BRAIN_LITE_ENDPOINTS,
  isPerceptionEventType,
  type ExpressionIntent,
  type StreamEventType,
} from "@alia/protocol";

import {
  BrainLite,
  isInternalServerEventSource,
  type BrainLiteResult,
  type InternalServerEventSource,
  type InternalServerInputEvent,
} from "./brainLite.ts";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

interface StreamClient {
  id: string;
  response: ServerResponse;
}

interface ServerEvent {
  id: string;
  type: StreamEventType;
  at: string;
  data: unknown;
}

interface EmbeddedMockRegistration {
  callbackUrl: string;
  registeredAt: string;
}

export function createBrainLiteHttpServer(brain = new BrainLite()) {
  const clients = new Map<string, StreamClient>();
  let nextStreamSequence = 0;
  let embeddedMockRegistration: EmbeddedMockRegistration | null = null;

  function publish(type: StreamEventType, data: unknown): void {
    const event: ServerEvent = {
      id: `stream_${++nextStreamSequence}`,
      type,
      at: new Date().toISOString(),
      data,
    };

    for (const client of clients.values()) {
      writeSse(client.response, event);
    }
  }

  async function publishResult(result: BrainLiteResult): Promise<void> {
    for (const log of result.logs) {
      publish("decision.logged", log);
    }

    for (const intent of result.intents) {
      publish("expression.intent", intent);
    }

    publish("state.updated", result.state);
    await dispatchToEmbeddedMock(result);
  }

  async function dispatchToEmbeddedMock(result: BrainLiteResult): Promise<void> {
    if (embeddedMockRegistration === null) {
      return;
    }

    const physicalIntents = result.intents.filter(targetsPhysical);

    if (physicalIntents.length > 0) {
      for (const intent of physicalIntents) {
        await postEmbeddedMockJson(embeddedMockRegistration.callbackUrl, {
          intent,
        });
      }
      return;
    }

    const shouldDispatchOwnership = result.logs.some(
      (log) => log.accepted && log.decision.startsWith("ownership."),
    );

    if (shouldDispatchOwnership) {
      await postEmbeddedMockJson(embeddedMockRegistration.callbackUrl, {
        activeBody: result.state.activeBody,
      });
    }
  }

  async function postEmbeddedMockJson(url: string, body: unknown): Promise<void> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Embedded mock returned ${response.status}: ${text}`);
      }

      logServerEvent("embedded.dispatch.sent", {
        callbackUrl: url,
        dispatch: summarizeDispatchBody(body),
      });
    } catch (error) {
      logServerEvent("embedded.dispatch.failed", {
        callbackUrl: url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const server = createServer(async (request, response) => {
    try {
      setCorsHeaders(response);

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, {
          ok: true,
          service: "alia-brain-lite",
          state: brain.getState(),
        });
        return;
      }

      if (
        request.method === "GET" &&
        (url.pathname === "/state" || url.pathname === BRAIN_LITE_ENDPOINTS.state)
      ) {
        sendJson(response, 200, brain.getState());
        return;
      }

      if (request.method === "GET" && url.pathname === "/logs") {
        sendJson(response, 200, { logs: brain.getDecisionLog() });
        return;
      }

      if (request.method === "GET" && url.pathname === "/events") {
        openEventStream(request, response, clients);
        writeSse(response, {
          id: `stream_${++nextStreamSequence}`,
          type: "state.updated",
          at: new Date().toISOString(),
          data: brain.getState(),
        });
        return;
      }

      if (
        (request.method === "GET" || request.method === "POST") &&
        url.pathname === "/mock/presence"
      ) {
        const body =
          request.method === "POST" ? await readOptionalJson(request) : {};
        const event = buildPresenceEvent(body, url);
        const result = brain.handleEvent(event);
        await publishResult(result);
        sendJson(response, 202, result);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === BRAIN_LITE_ENDPOINTS.webAvatarRequestActive
      ) {
        const body = await readOptionalJson(request);
        const result = brain.handleEvent({
          type: "web.session.started",
          source: "web",
          payload: getPayloadFromUnknown(body),
        });
        await publishResult(result);
        sendJson(response, 202, result);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === BRAIN_LITE_ENDPOINTS.webAvatarRelease
      ) {
        const body = await readOptionalJson(request);
        const result = brain.handleEvent({
          type: "web.session.ended",
          source: "web",
          payload: getPayloadFromUnknown(body),
        });
        await publishResult(result);
        sendJson(response, 202, result);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === BRAIN_LITE_ENDPOINTS.embeddedMockConnect
      ) {
        const body = await readOptionalJson(request);
        embeddedMockRegistration = readEmbeddedMockRegistration(body);
        if (embeddedMockRegistration !== null) {
          logServerEvent("embedded-mock.registered", {
            callbackUrl: embeddedMockRegistration.callbackUrl,
            registeredAt: embeddedMockRegistration.registeredAt,
          });
        }
        sendJson(response, 202, {
          ok: true,
          registered: embeddedMockRegistration !== null,
          runtime: "embedded-mock",
          received: isObject(body) ? body : {},
          state: brain.getState(),
        });
        return;
      }

      if (
        request.method === "POST" &&
        (url.pathname === "/mock/events" ||
          url.pathname === BRAIN_LITE_ENDPOINTS.sensorEvents ||
          url.pathname === "/api/v0/sensor-events")
      ) {
        const body = await readJson(request);
        const event = parsePerceptionEvent(body);
        const result = brain.handleEvent(event);
        await publishResult(result);
        sendJson(response, 202, result);
        return;
      }

      sendJson(response, 404, {
        error: "not_found",
        message: "Route not found.",
      });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : "Unexpected server error.";
      sendJson(response, status, {
        error: status === 500 ? "internal_error" : "bad_request",
        message,
      });
    }
  });

  return {
    brain,
    server,
  };
}

function targetsPhysical(intent: ExpressionIntent): boolean {
  return intent.target === "physical";
}

function readEmbeddedMockRegistration(body: unknown): EmbeddedMockRegistration | null {
  if (!isObject(body) || typeof body.callbackUrl !== "string") {
    return null;
  }

  try {
    const callbackUrl = new URL(body.callbackUrl);
    if (callbackUrl.protocol !== "http:" && callbackUrl.protocol !== "https:") {
      return null;
    }

    return {
      callbackUrl: callbackUrl.toString(),
      registeredAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function summarizeDispatchBody(body: unknown): Record<string, unknown> {
  if (!isObject(body)) {
    return { kind: "unknown" };
  }

  if (isObject(body.intent)) {
    return {
      kind: "expression.intent",
      intentId: body.intent.id,
      intentKind: body.intent.kind,
      target: body.intent.target,
    };
  }

  if (typeof body.activeBody === "string") {
    return {
      kind: "ownership.assignment",
      activeBody: body.activeBody,
    };
  }

  return { kind: "unknown" };
}

function buildPresenceEvent(body: unknown, url: URL): InternalServerInputEvent {
  const source = getSourceFromUnknown(body) ?? getSourceFromUrl(url) ?? "script";
  const payload = getPayloadFromUnknown(body);

  return {
    type: "presence.detected",
    source,
    payload,
  };
}

function parsePerceptionEvent(body: unknown): InternalServerInputEvent {
  if (!isObject(body)) {
    throw new RequestError(400, "Request body must be a JSON object.");
  }

  const type = body.type;
  if (typeof type !== "string" || !isPerceptionEventType(type)) {
    throw new RequestError(400, "Request body requires a supported event type.");
  }

  const source = readPerceptionSource(body.source);

  const at =
    typeof body.at === "string"
      ? body.at
      : typeof body.occurredAt === "string"
        ? body.occurredAt
        : undefined;
  if (at !== undefined && Number.isNaN(Date.parse(at))) {
    throw new RequestError(400, "Event at must be a valid ISO timestamp.");
  }

  return {
    id: typeof body.id === "string" ? body.id : undefined,
    type,
    source,
    at,
    payload: isObject(body.payload) ? body.payload : {},
  };
}

function readPerceptionSource(source: unknown): InternalServerEventSource {
  if (typeof source === "string" && isInternalServerEventSource(source)) {
    return source;
  }

  if (!isObject(source) || typeof source.kind !== "string") {
    return "script";
  }

  switch (source.kind) {
    case "web":
      return "web";
    case "physical":
      return "physical";
    case "mock.hardware":
      return "mock";
    case "mock.script":
      return "script";
    default:
      return "script";
  }
}

function getSourceFromUnknown(body: unknown): InternalServerEventSource | null {
  if (!isObject(body) || typeof body.source !== "string") {
    return null;
  }

  return isInternalServerEventSource(body.source) ? body.source : null;
}

function getSourceFromUrl(url: URL): InternalServerEventSource | null {
  const value = url.searchParams.get("source");
  return value !== null && isInternalServerEventSource(value) ? value : null;
}

function getPayloadFromUnknown(body: unknown): Record<string, unknown> {
  if (isObject(body) && isObject(body.payload)) {
    return body.payload;
  }

  return {};
}

function openEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  clients: Map<string, StreamClient>,
): void {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write(": connected\n\n");

  clients.set(clientId, {
    id: clientId,
    response,
  });

  request.on("close", () => {
    clients.delete(clientId);
  });
}

function writeSse(response: ServerResponse, event: ServerEvent): void {
  response.write(`id: ${event.id}\n`);
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function readOptionalJson(request: IncomingMessage): Promise<unknown> {
  if (request.headers["content-length"] === "0") {
    return {};
  }

  const raw = await readBody(request);
  if (raw.length === 0) {
    return {};
  }

  return parseJson(raw);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const raw = await readBody(request);
  if (raw.length === 0) {
    throw new RequestError(400, "Request body is required.");
  }

  return parseJson(raw);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new RequestError(413, "Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, "Request body must be valid JSON.");
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  if (response.headersSent) {
    return;
  }

  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function logServerEvent(event: string, details: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      component: "brain-lite",
      event,
      timestamp: new Date().toISOString(),
      details,
    }),
  );
}

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const { server } = createBrainLiteHttpServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`Alia Brain-lite server listening on http://127.0.0.1:${port}`);
  });
}
