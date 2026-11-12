import { parseNatMessage, publishedDirection } from "./nat.parser";

const SHANWICK = [
  "NAT-1/2 TRACKS FLS 340/400 INCLUSIVE",
  "NOV 12/1130Z TO NOV 12/1900Z",
  "PART ONE OF TWO PARTS-",
  "A DOGAL 55/20 56/30 56/40 55/50 LOMSI",
  "EAST LVLS NIL",
  "WEST LVLS 340 350 360 370 380 390 400",
  "EUR RTS WEST NIL",
  "NAR N670A N672A-",
  "B NEBIN 5430/20 5530/30 5530/40 5430/50 MELDI",
  "EAST LVLS NIL",
  "WEST LVLS 340 350 360 370 380 390 400",
  "EUR RTS WEST NIL",
  "NAR N644E N648A-",
  "END OF PART ONE OF TWO PARTS",
  "NAT-2/2 TRACKS FLS 340/400 INCLUSIVE",
  "NOV 12/1130Z TO NOV 12/1900Z",
  "PART TWO OF TWO PARTS-",
  "G DINIM 52/20 53/30 53/40 52/50 TUDEP",
  "EAST LVLS NIL",
  "WEST LVLS 340 350 360 370 380 390 400",
  "EUR RTS WEST NIL",
  "NAR N520C N532A-",
  "REMARKS.",
  "1. TMI IS 316.",
  "2. SEND RCL 90 TO 30 MINUTES PRIOR TO OCEANIC ENTRY POINT.",
  "INCLUDE MAX LEVEL IN RCL.",
  "3. PBCS OTS LEVELS 340 TO 400. PBCS TRACKS AS FOLLOWS",
  "TRACK A",
  "TRACK B",
  "END OF PBCS OTS.",
  "4. SLOP SHOULD BE USED IN NAT AIRSPACE. LEFT SLOP PROHIBITED.-",
  "END OF PART TWO OF TWO PARTS",
].join("\r\n");

const GANDER = [
  "NAT-1/1 TRACKS FLS 340/400 INCLUSIVE",
  "NOV 13/0100Z TO NOV 13/0800Z",
  "PART ONE OF ONE PART-",
  "Y JOBOC 41/60 42/50 42/40",
  "EAST LVLS 350 370",
  "WEST LVLS NIL",
  "EUR RTS EAST NIL",
  "NAR NIL-",
  "REMARKS:",
  "1.TMI IS 317.",
  "4.SLOP SHOULD BE USED IN ALL OCEANIC AIRSPACE. LEFT SLOP IS",
  " PROHIBITED.",
  "5.10 MINUTES AFTER PASSING OEP SQUAWK 2000 UNLESS OTHERWISE",
  " INSTRUCTED-",
  "END OF PART ONE OF ONE PART",
].join("\r\n");

describe("parseNatMessage", () => {
  it("reads every track across the parts of a message, in order", () => {
    const tracks = parseNatMessage(SHANWICK);

    expect(tracks.map((track) => track.identifier)).toEqual(["A", "B", "G"]);
    expect(tracks[0].route).toEqual(["DOGAL", "55/20", "56/30", "56/40", "55/50", "LOMSI"]);
    expect(tracks[1].route).toEqual(["NEBIN", "5430/20", "5530/30", "5530/40", "5430/50", "MELDI"]);
  });

  it("keeps the levels of each direction", () => {
    const [westbound] = parseNatMessage(SHANWICK);
    const [eastbound] = parseNatMessage(GANDER);

    expect(westbound.levels).toEqual({ east: [], west: [340, 350, 360, 370, 380, 390, 400] });
    expect(eastbound.levels).toEqual({ east: [350, 370], west: [] });
  });

  it("gives every track the message's remarks, one item per line", () => {
    const tracks = parseNatMessage(SHANWICK);

    expect(tracks[2].remarks).toBe(
      [
        "1. TMI IS 316.",
        "2. SEND RCL 90 TO 30 MINUTES PRIOR TO OCEANIC ENTRY POINT. INCLUDE MAX LEVEL IN RCL.",
        "3. PBCS OTS LEVELS 340 TO 400. PBCS TRACKS AS FOLLOWS TRACK A TRACK B END OF PBCS OTS.",
        "4. SLOP SHOULD BE USED IN NAT AIRSPACE. LEFT SLOP PROHIBITED.",
      ].join("\n"),
    );
    expect(tracks[0].remarks).toBe(tracks[2].remarks);
  });

  it("joins a remark's wrapped lines and drops the closing dash", () => {
    const [track] = parseNatMessage(GANDER);

    expect(track.remarks).toBe(
      [
        "1.TMI IS 317.",
        "4.SLOP SHOULD BE USED IN ALL OCEANIC AIRSPACE. LEFT SLOP IS PROHIBITED.",
        "5.10 MINUTES AFTER PASSING OEP SQUAWK 2000 UNLESS OTHERWISE INSTRUCTED",
      ].join("\n"),
    );
  });

  it("leaves the remarks empty when the part that carries them is missing", () => {
    const firstPart = SHANWICK.split("\r\n").slice(0, 14).join("\n");

    expect(parseNatMessage(firstPart).map((track) => [track.identifier, track.remarks])).toEqual([
      ["A", null],
      ["B", null],
    ]);
  });

  it("finds no track in text that is not a track message", () => {
    expect(parseNatMessage("NAT TRACKS WILL BE PUBLISHED LATER")).toEqual([]);
    expect(parseNatMessage("")).toEqual([]);
  });
});

describe("publishedDirection", () => {
  it("takes the direction that has levels", () => {
    expect(publishedDirection({ east: [], west: [340] })).toBe("west");
    expect(publishedDirection({ east: [350, 370], west: [] })).toBe("east");
  });

  it("cannot tell when both or neither have levels", () => {
    expect(publishedDirection({ east: [340], west: [350] })).toBeNull();
    expect(publishedDirection({ east: [], west: [] })).toBeNull();
  });
});
