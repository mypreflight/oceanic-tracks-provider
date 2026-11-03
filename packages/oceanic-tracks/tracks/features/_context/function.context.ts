import { Then, When } from "@cucumber/cucumber";
import expect from "expect";
import { main } from "../../src/function";
import type { OceanicTrack, TrackSet } from "../../src/types";
import { deepCompare } from "../_helper/deep-compare";

let statusCode: number;
let body: unknown;

function trackSet(): TrackSet {
  return body as TrackSet;
}

function track(identifier: string): OceanicTrack {
  const found = trackSet().tracks.find((candidate) => candidate.identifier === identifier);

  if (!found) {
    throw new Error(
      `No track ${identifier} among ${trackSet()
        .tracks.map((t) => t.identifier)
        .join(", ")}.`,
    );
  }

  return found;
}

When("I invoke the function", async () => {
  const result = await main();

  statusCode = result.statusCode;
  body = result.body;
});

Then("the response status should be {int}", (expected: number) => {
  expect(statusCode).toBe(expected);
});

Then("the response body should contain:", (docString: string) => {
  deepCompare(body, JSON.parse(docString));
});

function list(value: string): string[] {
  return value.trim() === "" ? [] : value.split(",").map((entry) => entry.trim());
}

Then("the response body should have the property {string}", (property: string) => {
  expect(body).toHaveProperty(property);
});

Then("the response should list the tracks {string}", (identifiers: string) => {
  expect(trackSet().tracks.map((candidate) => candidate.identifier)).toEqual(list(identifiers));
});

Then("the track {string} should contain:", (identifier: string, docString: string) => {
  deepCompare(track(identifier), JSON.parse(docString));
});

Then("the track {string} should pass through {string}", (identifier: string, idents: string) => {
  expect(track(identifier).fixes.map((fix) => fix.ident)).toEqual(idents.split(" "));
});

Then("the track {string} should leave {string} unplaced", (identifier: string, idents: string) => {
  expect(track(identifier).unresolvedFixes).toEqual(list(idents));
});

Then("every track should be placed in full", () => {
  for (const candidate of trackSet().tracks) {
    expect({ identifier: candidate.identifier, unresolvedFixes: candidate.unresolvedFixes }).toEqual({
      identifier: candidate.identifier,
      unresolvedFixes: [],
    });
  }
});

Then("the unreadable messages should be {string}", (numbers: string) => {
  expect(trackSet().unreadableMessages).toEqual(list(numbers));
});

Then("I dump response", () => {
  console.log(JSON.stringify(body, null, 2));
});
