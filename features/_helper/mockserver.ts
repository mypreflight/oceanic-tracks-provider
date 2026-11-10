import { readFileSync } from "node:fs";
import { join } from "node:path";

const MOCKSERVER_URL = process.env.MOCKSERVER_URL ?? "http://upstream-mock:1080";

export type Expectation = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  status: number;
  body: unknown;
  priority?: number;
};

export type RequestFilter = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
};

function httpRequest(filter: RequestFilter): Record<string, unknown> {
  const queryStringParameters = filter.query
    ? Object.fromEntries(Object.entries(filter.query).map(([name, value]) => [name, [value]]))
    : undefined;

  return { method: filter.method, path: filter.path, ...(queryStringParameters ? { queryStringParameters } : {}) };
}

async function control(action: string, body: unknown, query = ""): Promise<Response> {
  return fetch(`${MOCKSERVER_URL}/mockserver/${action}${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function reset(): Promise<void> {
  await fetch(`${MOCKSERVER_URL}/mockserver/reset`, { method: "PUT" });
}

export async function expect(expectation: Expectation): Promise<void> {
  await control("expectation", {
    priority: expectation.priority ?? 0,
    httpRequest: httpRequest(expectation),
    httpResponse: {
      statusCode: expectation.status,
      headers: { "Content-Type": ["application/json"] },
      body: typeof expectation.body === "string" ? expectation.body : JSON.stringify(expectation.body),
    },
  });
}

export type RecordedRequest = {
  headers: Record<string, string[]>;
};

export async function requestsTo(filter: RequestFilter): Promise<RecordedRequest[]> {
  const response = await control("retrieve", httpRequest(filter), "?type=REQUESTS&format=JSON");

  return (await response.json()) as RecordedRequest[];
}

export async function callsTo(filter: RequestFilter): Promise<number> {
  return (await requestsTo(filter)).length;
}

export async function restoreFixtures(): Promise<void> {
  const file = join(__dirname, "..", "..", "docker", "mock", "upstream.json");
  const expectations = JSON.parse(readFileSync(file, "utf-8")) as unknown[];

  await reset();
  for (const expectation of expectations) {
    await control("expectation", expectation);
  }
}
