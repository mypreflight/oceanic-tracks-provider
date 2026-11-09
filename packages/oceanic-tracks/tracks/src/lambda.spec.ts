import type { TrackSet } from "./domain/track";
import { main } from "./function";
import { type FunctionUrlEvent, handler } from "./lambda";

jest.mock("./function", () => ({ main: jest.fn() }));

const SECRET = "the-function-secret";

const trackSet: TrackSet = {
  fetchedAt: "2026-11-03T22:40:00.000Z",
  tracks: [],
  unreadableMessages: [],
};

const mainMock = jest.mocked(main as (args: Record<string, string | undefined>) => ReturnType<typeof main>);

function event(overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent {
  return {
    rawPath: "/tracks",
    headers: { "x-require-whisk-auth": SECRET },
    requestContext: { http: { method: "GET" } },
    ...overrides,
  };
}

function unauthorised() {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error: { code: "UNAUTHORIZED", message: "The X-Require-Whisk-Auth header is missing or wrong.", status: 401 },
    }),
  };
}

describe("handler", () => {
  const configuredSecret = process.env.OCEANIC_TRACKS_FUNCTION_SECRET;

  beforeEach(() => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = SECRET;
    mainMock.mockReset();
    mainMock.mockResolvedValue({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: trackSet });
  });

  afterAll(() => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = configuredSecret;
  });

  it("serves the function's answer with its body as JSON", async () => {
    const response = await handler(event());

    expect(response).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trackSet),
    });
  });

  it("passes a body that is already a string through untouched", async () => {
    mainMock.mockResolvedValue({ statusCode: 502, headers: { "Content-Type": "text/plain" }, body: "upstream down" });

    const response = await handler(event());

    expect(response).toEqual({ statusCode: 502, headers: { "Content-Type": "text/plain" }, body: "upstream down" });
  });

  it("forwards the query parameters and the lowercased method as the function's arguments", async () => {
    await handler(
      event({ queryStringParameters: { region: "pacific" }, requestContext: { http: { method: "POST" } } }),
    );

    expect(mainMock).toHaveBeenCalledWith({ region: "pacific", __ow_method: "post" });
  });

  it("forwards only the method when the request has no query", async () => {
    await handler(event());

    expect(mainMock).toHaveBeenCalledWith({ __ow_method: "get" });
  });

  it.each([
    ["the header is missing", {}],
    ["the header is empty", { "x-require-whisk-auth": "" }],
    ["the header is wrong", { "x-require-whisk-auth": "the-function-secreT" }],
    ["the header is longer than the secret", { "x-require-whisk-auth": `${SECRET}-and-more` }],
  ])("refuses the request when %s", async (_, headers) => {
    const response = await handler(event({ headers }));

    expect(response).toEqual(unauthorised());
    expect(mainMock).not.toHaveBeenCalled();
  });

  it("refuses a request without any headers", async () => {
    const response = await handler(event({ headers: undefined }));

    expect(response).toEqual(unauthorised());
    expect(mainMock).not.toHaveBeenCalled();
  });

  it("refuses every request while the secret is not set", async () => {
    delete process.env.OCEANIC_TRACKS_FUNCTION_SECRET;

    const response = await handler(event());

    expect(response).toEqual(unauthorised());
    expect(mainMock).not.toHaveBeenCalled();
  });

  it("refuses every request while the secret is empty, even one with an empty header", async () => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = "";

    const response = await handler(event({ headers: { "x-require-whisk-auth": "" } }));

    expect(response).toEqual(unauthorised());
    expect(mainMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthorised request before looking at the path", async () => {
    const response = await handler(event({ rawPath: "/elsewhere", headers: {} }));

    expect(response).toEqual(unauthorised());
  });

  it.each(["/", "/tracks/", "/track", "/oceanic-tracks/tracks"])("answers 404 on %s", async (rawPath) => {
    const response = await handler(event({ rawPath }));

    expect(response).toEqual({
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: { code: "NOT_FOUND", message: "The function answers on /tracks only.", status: 404 },
      }),
    });
    expect(mainMock).not.toHaveBeenCalled();
  });
});
