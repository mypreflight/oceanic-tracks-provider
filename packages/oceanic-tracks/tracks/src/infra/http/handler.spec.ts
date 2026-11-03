import {
  FixDirectoryUnavailableError,
  TrackSourceNotConfiguredError,
  TrackSourceUnavailableError,
} from "../../application/errors";
import type { ListCurrentTracks } from "../../application/list-current-tracks";
import type { TrackSet } from "../../domain/track";
import { handleRequest } from "./handler";

const trackSet: TrackSet = {
  fetchedAt: "2026-11-03T22:40:00.000Z",
  tracks: [],
  unreadableMessages: [],
};

function useCaseAnswering(execute: jest.Mock): () => ListCurrentTracks {
  return () => ({ execute }) as unknown as ListCurrentTracks;
}

describe("handleRequest", () => {
  it("serves the current tracks", async () => {
    const response = await handleRequest(useCaseAnswering(jest.fn().mockResolvedValue(trackSet)));

    expect(response).toEqual({ statusCode: 200, body: trackSet });
  });

  it.each([
    [new TrackSourceUnavailableError(), 502, "NMS_UNAVAILABLE", "The FAA NOTAM service is unavailable."],
    [new FixDirectoryUnavailableError(), 502, "FIX_DIRECTORY_UNAVAILABLE", "The FAA fix directory is unavailable."],
  ])("reports %p with its own status and code", async (error, status, code, message) => {
    const response = await handleRequest(useCaseAnswering(jest.fn().mockRejectedValue(error)));

    expect(response).toEqual({ statusCode: status, body: { error: { code, message, status } } });
  });

  it("reports missing credentials raised while composing the use case", async () => {
    const response = await handleRequest(() => {
      throw new TrackSourceNotConfiguredError();
    });

    expect(response).toEqual({
      statusCode: 500,
      body: {
        error: {
          code: "NMS_NOT_CONFIGURED",
          message: "The FAA NOTAM service credentials are not configured.",
          status: 500,
        },
      },
    });
  });

  it("hides an unexpected failure behind an internal error", async () => {
    const response = await handleRequest(useCaseAnswering(jest.fn().mockRejectedValue(new Error("boom"))));

    expect(response).toEqual({
      statusCode: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "Oceanic track lookup failed.", status: 500 } },
    });
  });
});
