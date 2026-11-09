import { timingSafeEqual } from "node:crypto";
import { main } from "./function";
import { Logger } from "./shared/logger";

export type FunctionUrlEvent = {
  rawPath: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  requestContext: { http: { method: string } };
};

export type FunctionUrlResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type FunctionArgs = Record<string, string | undefined>;

const ROUTE = "/tracks";

const SECRET_HEADER = "x-require-whisk-auth";

const logger = new Logger("TracksLambda");

const invoke: (args: FunctionArgs) => ReturnType<typeof main> = main;

function errorResponse(status: number, code: string, message: string): FunctionUrlResult {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: { code, message, status } }),
  };
}

function authorised(provided: string | undefined): boolean {
  const secret = process.env.OCEANIC_TRACKS_FUNCTION_SECRET;

  if (!secret) {
    logger.warn("Refused a request: OCEANIC_TRACKS_FUNCTION_SECRET is not set.");

    return false;
  }

  if (provided === undefined) {
    return false;
  }

  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  if (!authorised(event.headers?.[SECRET_HEADER])) {
    return errorResponse(401, "UNAUTHORIZED", "The X-Require-Whisk-Auth header is missing or wrong.");
  }

  if (event.rawPath !== ROUTE) {
    return errorResponse(404, "NOT_FOUND", `The function answers on ${ROUTE} only.`);
  }

  const args: FunctionArgs = {
    ...event.queryStringParameters,
    __ow_method: event.requestContext.http.method.toLowerCase(),
  };
  const { statusCode, headers, body } = await invoke(args);

  return { statusCode, headers, body: typeof body === "string" ? body : JSON.stringify(body) };
}
