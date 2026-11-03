import type { PublishedTrack } from "../domain/track";
import { TrackSourceUnavailableError } from "./errors";
import { ListCurrentTracks } from "./list-current-tracks";
import type { PacotsMessages, PublishedTracks } from "./pacots-messages";
import type { FixDirectory } from "./port/fix-directory";

function published(identifier: string, issuingAuthority: string, route: string[]): PublishedTrack {
  return {
    identifier,
    route,
    remarks: null,
    system: "pacots",
    direction: issuingAuthority === "KZAK" ? "west" : "east",
    issuingAuthority,
    notamNumber: `${identifier}/26`,
    validFrom: "2026-11-03T19:00:00.000Z",
    validTo: "2026-11-04T08:00:00.000Z",
    message: identifier,
  };
}

function pacotsLoading(load: jest.Mock): PacotsMessages {
  return { load } as unknown as PacotsMessages;
}

function directoryKnowing(entries: [string, number, number][]): FixDirectory & { locate: jest.Mock } {
  return {
    locate: jest.fn(() =>
      Promise.resolve(new Map(entries.map(([ident, latitude, longitude]) => [ident, [{ latitude, longitude }]]))),
    ),
  };
}

const TODAY: PublishedTracks = {
  tracks: [
    published("14", "RJJJ", ["EMRON", "39N160E"]),
    published("C", "KZAK", ["KATCH", "58N160W"]),
    published("2", "RJJJ", ["KALNA", "41N160E"]),
  ],
  unreadableMessages: ["A5399/26"],
};

describe("ListCurrentTracks", () => {
  it("places every track's fixes and orders the tracks by issuer, then by name", async () => {
    const directory = directoryKnowing([
      ["EMRON", 38.1, 150],
      ["KATCH", 54, -136],
      ["KALNA", 39.15, 149.83],
    ]);

    const result = await new ListCurrentTracks(pacotsLoading(jest.fn().mockResolvedValue(TODAY)), directory).execute();

    expect(directory.locate).toHaveBeenCalledWith(["EMRON", "KATCH", "KALNA"]);
    expect(result.tracks.map((track) => track.identifier)).toEqual(["C", "2", "14"]);
    expect(result.tracks[0].fixes).toEqual([
      { ident: "KATCH", latitude: 54, longitude: -136 },
      { ident: "58N160W", latitude: 58, longitude: -160 },
    ]);
    expect(result.unreadableMessages).toEqual(["A5399/26"]);
  });

  it("serves the assembled tracks from cache on the next call", async () => {
    const load = jest.fn().mockResolvedValue(TODAY);
    const useCase = new ListCurrentTracks(pacotsLoading(load), directoryKnowing([]));

    const first = await useCase.execute();
    const second = await useCase.execute();

    expect(load).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("caches nothing when the source fails", async () => {
    const load = jest.fn().mockRejectedValueOnce(new TrackSourceUnavailableError()).mockResolvedValue(TODAY);
    const useCase = new ListCurrentTracks(pacotsLoading(load), directoryKnowing([]));

    await expect(useCase.execute()).rejects.toBeInstanceOf(TrackSourceUnavailableError);
    await useCase.execute();

    expect(load).toHaveBeenCalledTimes(2);
  });
});
