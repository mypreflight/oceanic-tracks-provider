import { After, AfterAll, Before, Given, Then } from "@cucumber/cucumber";
import expect from "expect";
import { resetUseCase } from "../../src/function";
import { callsTo, requestsTo, reset, restoreFixtures, expect as stub } from "../_helper/mockserver";
import {
  fixture,
  ISSUERS,
  type IssuerName,
  LAYERS,
  type LayerName,
  NOTAMS_PATH,
  notamsResponse,
  TOKEN,
  TOKEN_PATH,
  withoutIdents,
} from "../_helper/upstream.fixture";

const CREDENTIALS = ["NMS_CLIENT_ID", "NMS_CLIENT_SECRET"] as const;

let savedCredentials: Partial<Record<(typeof CREDENTIALS)[number], string>> = {};

Before(async () => {
  await reset();
  resetUseCase();
  savedCredentials = Object.fromEntries(CREDENTIALS.map((name) => [name, process.env[name]]));
});

After(() => {
  for (const name of CREDENTIALS) {
    process.env[name] = savedCredentials[name];
  }
});

const OVERRIDE = 10;

async function stubLayer(name: LayerName, body: unknown, status = 200, priority = 0): Promise<void> {
  await stub({ method: "GET", path: LAYERS[name].path, status, body, priority });
}

async function stubIssuer(name: IssuerName, body: unknown, status = 200): Promise<void> {
  const issuer = ISSUERS[name];

  await stub({
    method: "GET",
    path: NOTAMS_PATH,
    query: { location: issuer.location, freeText: issuer.freeText },
    status,
    body,
  });
}

Given("the NOTAM service issues tokens", async () => {
  await stub({ method: "POST", path: TOKEN_PATH, status: 200, body: TOKEN });
});

Given("the NOTAM service refuses the credentials", async () => {
  await stub({
    method: "POST",
    path: TOKEN_PATH,
    status: 401,
    body: { ErrorCode: "invalid_client", Error: "ClientId is Invalid" },
  });
});

Given("the NMS credentials are not configured", () => {
  for (const name of CREDENTIALS) {
    delete process.env[name];
  }
});

Given("{word} publishes today's track messages", async (issuer: IssuerName) => {
  await stubIssuer(issuer, fixture(ISSUERS[issuer].fixture));
});

Given("{word} publishes no track messages", async (issuer: IssuerName) => {
  await stubIssuer(issuer, notamsResponse([]));
});

Given("{word} publishes the track message {string}:", async (issuer: IssuerName, number: string, text: string) => {
  await stubIssuer(issuer, notamsResponse([{ number, text }]));
});

Given("{word} publishes the cancellation {string}:", async (issuer: IssuerName, number: string, text: string) => {
  await stubIssuer(issuer, notamsResponse([{ number, text, type: "C" }]));
});

Given("the NOTAM service answers {int} for {word}", async (status: number, issuer: IssuerName) => {
  await stubIssuer(issuer, { status: "Failure" }, status);
});

Given("the NOTAM service finds no data for {word}", async (issuer: IssuerName) => {
  await stubIssuer(
    issuer,
    { status: "Failure", errors: [{ code: "4.1", message: "No data found for provided location." }] },
    400,
  );
});

Given("the fix directory knows today's fixes", async () => {
  for (const name of Object.keys(LAYERS) as LayerName[]) {
    await stubLayer(name, fixture(LAYERS[name].fixture));
  }
});

Given("the fix directory knows today's fixes except {string}", async (idents: string) => {
  const missing = idents.split(",").map((ident) => ident.trim());

  for (const name of Object.keys(LAYERS) as LayerName[]) {
    await stubLayer(name, withoutIdents(LAYERS[name].fixture, missing), 200, OVERRIDE);
  }
});

Given("the fix directory layer of {string} is unavailable", async (name: LayerName) => {
  await stubLayer(name, "boom", 500, OVERRIDE);
});

Given("the fix directory layer of {string} answers with an error", async (name: LayerName) => {
  await stubLayer(name, { error: { code: 400, message: "Invalid query" } }, 200, OVERRIDE);
});

Then("the NOTAM service should have been asked for {word} {int} time(s)", async (issuer: IssuerName, count: number) => {
  const { location, freeText } = ISSUERS[issuer];

  expect(await callsTo({ method: "GET", path: NOTAMS_PATH, query: { location, freeText } })).toBe(count);
});

Then("the NOTAM service should have issued {int} token(s)", async (count: number) => {
  expect(await callsTo({ method: "POST", path: TOKEN_PATH })).toBe(count);
});

Then("every NOTAM request should carry the token and ask for GeoJSON", async () => {
  const requests = await requestsTo({ method: "GET", path: NOTAMS_PATH });

  expect(requests.length).toBeGreaterThan(0);
  for (const { headers } of requests) {
    const header = (name: string) =>
      Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

    expect(header("Authorization")).toEqual([`Bearer ${TOKEN.access_token}`]);
    expect(header("nmsResponseFormat")).toEqual(["GEOJSON"]);
  }
});

AfterAll(async () => {
  await restoreFixtures();
});
