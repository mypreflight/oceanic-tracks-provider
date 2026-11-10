import { TrackSourceNotConfiguredError } from "./application/errors";
import type { TrackSet } from "./domain/track";
import { handleRequest } from "./infra/http/handler";
import { type FunctionUrlEvent, handler, resetUseCase } from "./lambda";

jest.mock("./infra/http/handler", () => ({ handleRequest: jest.fn() }));

const SECRET = "the-function-secret";

const trackSet: TrackSet = {
  fetchedAt: "2026-11-03T22:40:00.000Z",
  tracks: [],
  unreadableMessages: [],
};

const handleRequestMock = jest.mocked(handleRequest);

function event(overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent {
  return {
    rawPath: "/tracks",
    headers: { authorization: `Bearer ${SECRET}` },
    requestContext: { http: { method: "GET" } },
    ...overrides,
  };
}

function unauthorised() {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" },
    body: JSON.stringify({
      error: { code: "UNAUTHORIZED", message: "The Authorization header is missing or wrong.", status: 401 },
    }),
  };
}

describe("handler", () => {
  const configured = {
    secret: process.env.OCEANIC_TRACKS_FUNCTION_SECRET,
    clientId: process.env.NMS_CLIENT_ID,
    clientSecret: process.env.NMS_CLIENT_SECRET,
  };

  beforeEach(() => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = SECRET;
    resetUseCase();
    handleRequestMock.mockReset();
    handleRequestMock.mockResolvedValue({ statusCode: 200, body: trackSet });
  });

  afterAll(() => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = configured.secret;
    process.env.NMS_CLIENT_ID = configured.clientId;
    process.env.NMS_CLIENT_SECRET = configured.clientSecret;
  });

  it("serves the handler's answer with its body as JSON", async () => {
    const response = await handler(event());

    expect(response).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trackSet),
    });
  });

  it("keeps the handler's status for an error", async () => {
    const body = { error: { code: "NMS_UNAVAILABLE", message: "The FAA NOTAM service is unavailable.", status: 502 } };
    handleRequestMock.mockResolvedValue({ statusCode: 502, body });

    const response = await handler(event());

    expect(response).toEqual({
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it.each(["GET", "POST"])("serves a %s request the same way", async (method) => {
    const response = await handler(event({ requestContext: { http: { method } } }));

    expect(response.statusCode).toBe(200);
    expect(handleRequestMock).toHaveBeenCalledTimes(1);
  });

  it("composes the use case from the environment, once", async () => {
    process.env.NMS_CLIENT_ID = "client-id";
    process.env.NMS_CLIENT_SECRET = "client-secret";

    await handler(event());
    await handler(event());

    const [first] = handleRequestMock.mock.calls[0];
    const [second] = handleRequestMock.mock.calls[1];

    expect(first()).toBe(second());
  });

  it("reports missing NMS credentials through the handler", async () => {
    delete process.env.NMS_CLIENT_ID;

    await handler(event());

    const [resolveUseCase] = handleRequestMock.mock.calls[0];

    expect(() => resolveUseCase()).toThrow(TrackSourceNotConfiguredError);
  });

  it.each([
    ["the header is missing", {}],
    ["the header is empty", { authorization: "" }],
    ["the scheme is missing", { authorization: SECRET }],
    ["the scheme is another one", { authorization: `Basic ${SECRET}` }],
    ["the token is empty", { authorization: "Bearer " }],
    ["the token is wrong", { authorization: "Bearer the-function-secreT" }],
    ["the token is longer than the secret", { authorization: `Bearer ${SECRET}-and-more` }],
    ["the token is a prefix of the secret", { authorization: `Bearer ${SECRET.slice(0, 8)}` }],
  ])("refuses the request when %s", async (_, headers) => {
    const response = await handler(event({ headers }));

    expect(response).toEqual(unauthorised());
    expect(handleRequestMock).not.toHaveBeenCalled();
  });

  it("accepts the scheme in any case", async () => {
    const response = await handler(event({ headers: { authorization: `bearer ${SECRET}` } }));

    expect(response.statusCode).toBe(200);
  });

  it("refuses a request without any headers", async () => {
    const response = await handler(event({ headers: undefined }));

    expect(response).toEqual(unauthorised());
    expect(handleRequestMock).not.toHaveBeenCalled();
  });

  it("refuses every request while the secret is not set", async () => {
    delete process.env.OCEANIC_TRACKS_FUNCTION_SECRET;

    const response = await handler(event());

    expect(response).toEqual(unauthorised());
    expect(handleRequestMock).not.toHaveBeenCalled();
  });

  it("refuses every request while the secret is empty, even one with an empty token", async () => {
    process.env.OCEANIC_TRACKS_FUNCTION_SECRET = "";

    const response = await handler(event({ headers: { authorization: "Bearer " } }));

    expect(response).toEqual(unauthorised());
    expect(handleRequestMock).not.toHaveBeenCalled();
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
    expect(handleRequestMock).not.toHaveBeenCalled();
  });
});
