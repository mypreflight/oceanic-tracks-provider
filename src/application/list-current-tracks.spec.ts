import type { PublishedTrack, PublishedTracks } from "../domain/track";
import { NatFeedUnavailableError, TrackSourceUnavailableError } from "./errors";
import { ListCurrentTracks } from "./list-current-tracks";
import type { NatMessages } from "./nat-messages";
import type { PacotsMessages } from "./pacots-messages";
import type { FixDirectory } from "./port/fix-directory";

function published(identifier: string, issuingAuthority: string, route: string[]): PublishedTrack {
  const nat = issuingAuthority === "CZQX" || issuingAuthority === "EGGX";

  return {
    identifier,
    route,
    remarks: null,
    system: nat ? "nat" : "pacots",
    direction: issuingAuthority === "KZAK" || issuingAuthority === "EGGX" ? "west" : "east",
    levels: nat ? [340, 350] : [],
    issuingAuthority,
    notamNumber: `${identifier}/26`,
    validFrom: "2026-11-03T19:00:00.000Z",
    validTo: "2026-11-04T08:00:00.000Z",
    message: identifier,
  };
}

function loading<T extends PacotsMessages | NatMessages>(load: jest.Mock): T {
  return { load } as unknown as T;
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

const NORTH_ATLANTIC: PublishedTracks = {
  tracks: [published("A", "EGGX", ["DOGAL", "55/20"]), published("S", "CZQX", ["NICSO", "48/50"])],
  unreadableMessages: [],
};

const NO_TRACKS: PublishedTracks = { tracks: [], unreadableMessages: [] };

function useCase(pacots: jest.Mock, nat: jest.Mock, directory: FixDirectory = directoryKnowing([])) {
  return new ListCurrentTracks(loading<PacotsMessages>(pacots), loading<NatMessages>(nat), directory);
}

describe("ListCurrentTracks", () => {
  it("places every track's fixes and orders the tracks by issuer, then by name", async () => {
    const directory = directoryKnowing([
      ["EMRON", 38.1, 150],
      ["KATCH", 54, -136],
      ["KALNA", 39.15, 149.83],
    ]);

    const result = await useCase(
      jest.fn().mockResolvedValue(TODAY),
      jest.fn().mockResolvedValue(NO_TRACKS),
      directory,
    ).execute();

    expect(directory.locate).toHaveBeenCalledWith(["EMRON", "KATCH", "KALNA"]);
    expect(result.tracks.map((track) => track.identifier)).toEqual(["C", "2", "14"]);
    expect(result.tracks[0].fixes).toEqual([
      { ident: "KATCH", latitude: 54, longitude: -136 },
      { ident: "58N160W", latitude: 58, longitude: -160 },
    ]);
    expect(result.unreadableMessages).toEqual(["A5399/26"]);
  });

  it("lists the North Atlantic tracks beside the Pacific ones, with their levels", async () => {
    const directory = directoryKnowing([
      ["DOGAL", 54, -15],
      ["NICSO", 47.5, -52],
    ]);

    const result = await useCase(
      jest.fn().mockResolvedValue(TODAY),
      jest.fn().mockResolvedValue({ ...NORTH_ATLANTIC, unreadableMessages: ["EGGX1112/26"] }),
      directory,
    ).execute();

    expect(result.tracks.map((track) => `${track.issuingAuthority} ${track.identifier}`)).toEqual([
      "CZQX S",
      "EGGX A",
      "KZAK C",
      "RJJJ 2",
      "RJJJ 14",
    ]);
    expect(result.tracks[1]).toMatchObject({
      system: "nat",
      levels: [340, 350],
      fixes: [
        { ident: "DOGAL", latitude: 54, longitude: -15 },
        { ident: "55/20", latitude: 55, longitude: -20 },
      ],
    });
    expect(result.unreadableMessages).toEqual(["A5399/26", "EGGX1112/26"]);
  });

  it("serves the assembled tracks from cache on the next call", async () => {
    const pacots = jest.fn().mockResolvedValue(TODAY);
    const nat = jest.fn().mockResolvedValue(NORTH_ATLANTIC);
    const tracks = useCase(pacots, nat);

    const first = await tracks.execute();
    const second = await tracks.execute();

    expect(pacots).toHaveBeenCalledTimes(1);
    expect(nat).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("caches nothing when the Pacific source fails", async () => {
    const pacots = jest.fn().mockRejectedValueOnce(new TrackSourceUnavailableError()).mockResolvedValue(TODAY);
    const tracks = useCase(pacots, jest.fn().mockResolvedValue(NO_TRACKS));

    await expect(tracks.execute()).rejects.toBeInstanceOf(TrackSourceUnavailableError);
    await tracks.execute();

    expect(pacots).toHaveBeenCalledTimes(2);
  });

  it("still serves the Pacific tracks when the North Atlantic feed fails, and asks again next time", async () => {
    const pacots = jest.fn().mockResolvedValue(TODAY);
    const nat = jest.fn().mockRejectedValueOnce(new NatFeedUnavailableError()).mockResolvedValue(NORTH_ATLANTIC);
    const tracks = useCase(pacots, nat);

    const first = await tracks.execute();
    const second = await tracks.execute();

    expect(first.tracks.map((track) => track.identifier)).toEqual(["C", "2", "14"]);
    expect(second.tracks.map((track) => track.identifier)).toEqual(["S", "A", "C", "2", "14"]);
    expect(nat).toHaveBeenCalledTimes(2);
  });
});
