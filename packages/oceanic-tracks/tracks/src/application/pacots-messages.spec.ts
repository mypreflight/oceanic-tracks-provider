import { PacotsMessages } from "./pacots-messages";
import type { TrackMessage, TrackMessageSource } from "./port/track-message-source";

const OAKLAND: TrackMessage = {
  number: "A5313/26",
  type: "N",
  validFrom: "2026-11-03T19:00:00Z",
  validTo: "2026-11-04T08:00:00Z",
  text: "(TDM TRK A 261103190001 2611031900 2611040800 PUPPI CRESP 23N170W TONIK RTS/PHNL KEOLA RMK/0)",
};

const FUKUOKA: TrackMessage = {
  number: "Q2635/26",
  type: "N",
  validFrom: "2026-11-04T10:00:00Z",
  validTo: "2026-11-04T21:00:00Z",
  text: "EASTBOUND PACOTS TRACKS BETWEEN JAPAN AND HAWAII,\nTRACK 11.\n FLEX ROUTE : LEPKI 38N160E THOMA",
};

function sourceWith(byLocation: Record<string, TrackMessage[]>): TrackMessageSource & { find: jest.Mock } {
  return { find: jest.fn((location: string) => Promise.resolve(byLocation[location] ?? [])) };
}

describe("PacotsMessages", () => {
  it("asks Oakland and Fukuoka for their track messages", async () => {
    const source = sourceWith({});

    await new PacotsMessages(source).load();

    expect(source.find.mock.calls).toEqual([
      ["KZAK", "TDM TRK"],
      ["RJJJ", "PACOTS"],
    ]);
  });

  it("publishes Oakland's tracks westbound and Fukuoka's eastbound", async () => {
    const { tracks } = await new PacotsMessages(sourceWith({ KZAK: [OAKLAND], RJJJ: [FUKUOKA] })).load();

    expect(tracks).toEqual([
      {
        identifier: "A",
        route: ["PUPPI", "CRESP", "23N170W", "TONIK"],
        remarks: null,
        system: "pacots",
        direction: "west",
        issuingAuthority: "KZAK",
        notamNumber: "A5313/26",
        validFrom: "2026-11-03T19:00:00.000Z",
        validTo: "2026-11-04T08:00:00.000Z",
        message: OAKLAND.text,
      },
      {
        identifier: "11",
        route: ["LEPKI", "38N160E", "THOMA"],
        remarks: null,
        system: "pacots",
        direction: "east",
        issuingAuthority: "RJJJ",
        notamNumber: "Q2635/26",
        validFrom: "2026-11-04T10:00:00.000Z",
        validTo: "2026-11-04T21:00:00.000Z",
        message: FUKUOKA.text,
      },
    ]);
  });

  it("skips cancellations and repeats of the same message", async () => {
    const { tracks } = await new PacotsMessages(
      sourceWith({ KZAK: [{ ...OAKLAND, number: "A5320/26", type: "C" }, OAKLAND, OAKLAND] }),
    ).load();

    expect(tracks.map((track) => track.notamNumber)).toEqual(["A5313/26"]);
  });

  it("lists a message it cannot read, or whose validity is not a date", async () => {
    const result = await new PacotsMessages(
      sourceWith({
        KZAK: [{ ...OAKLAND, number: "A5399/26", text: "TDM TRK Q WILL BE PUBLISHED LATER" }],
        RJJJ: [{ ...FUKUOKA, validTo: "PERM" }],
      }),
    ).load();

    expect(result).toEqual({ tracks: [], unreadableMessages: ["A5399/26", "Q2635/26"] });
  });
});
