import { namedIdents, placeFixes, placeTrack } from "./place-fixes";

const BOXER_OFFSHORE = { latitude: 42.716667, longitude: -126.18 };

const BOXER_AUSTRALIA = { latitude: -22.105142, longitude: 146.313753 };

describe("placeFixes", () => {
  it("places points from their own text and named fixes from the directory", () => {
    const candidates = new Map([["NIPPI", [{ latitude: 49.71, longitude: 159.346657 }]]]);

    expect(placeFixes(["52N140W", "NIPPI"], candidates)).toEqual({
      fixes: [
        { ident: "52N140W", latitude: 52, longitude: -140 },
        { ident: "NIPPI", latitude: 49.71, longitude: 159.346657 },
      ],
      unresolvedFixes: [],
    });
  });

  it("takes the one beside the track when a name exists in two places", () => {
    const candidates = new Map([["BOXER", [BOXER_AUSTRALIA, BOXER_OFFSHORE]]]);

    expect(placeFixes(["BOXER", "52N140W"], candidates).fixes[0]).toEqual({ ident: "BOXER", ...BOXER_OFFSHORE });
  });

  it("settles neighbouring duplicates from each other", () => {
    const candidates = new Map([
      ["BOXER", [BOXER_AUSTRALIA, BOXER_OFFSHORE]],
      [
        "FULMR",
        [
          { latitude: -30, longitude: 150 },
          { latitude: 44.5, longitude: -130 },
        ],
      ],
      ["FASEL", [{ latitude: 47.5, longitude: -134 }]],
    ]);

    expect(placeFixes(["BOXER", "FULMR", "FASEL"], candidates).fixes).toEqual([
      { ident: "BOXER", ...BOXER_OFFSHORE },
      { ident: "FULMR", latitude: 44.5, longitude: -130 },
      { ident: "FASEL", latitude: 47.5, longitude: -134 },
    ]);
  });

  it("reports a fix nobody can place instead of guessing it", () => {
    expect(placeFixes(["58N170W", "ECOMI", "NATES"], new Map([["NATES", [{ latitude: 56, longitude: 175 }]]]))).toEqual(
      {
        fixes: [
          { ident: "58N170W", latitude: 58, longitude: -170 },
          { ident: "NATES", latitude: 56, longitude: 175 },
        ],
        unresolvedFixes: ["ECOMI"],
      },
    );
  });

  it("leaves a duplicate unplaced when nothing on the track anchors it", () => {
    expect(placeFixes(["BOXER"], new Map([["BOXER", [BOXER_AUSTRALIA, BOXER_OFFSHORE]]]))).toEqual({
      fixes: [],
      unresolvedFixes: ["BOXER"],
    });
  });

  it("skips airways and reports tokens it cannot read", () => {
    expect(placeFixes(["52N140W", "R591", "RTS/KSFO"], new Map())).toEqual({
      fixes: [{ ident: "52N140W", latitude: 52, longitude: -140 }],
      unresolvedFixes: ["RTS/KSFO"],
    });
  });
});

describe("namedIdents", () => {
  it("lists only the fixes the directory has to place", () => {
    expect(namedIdents(["BOXER", "52N140W", "R591", "SYA"])).toEqual(["BOXER", "SYA"]);
  });
});

describe("placeTrack", () => {
  it("turns a published track into one with its fixes placed", () => {
    const published = {
      system: "pacots" as const,
      identifier: "A",
      direction: "west" as const,
      levels: [],
      issuingAuthority: "KZAK",
      notamNumber: "A5313/26",
      validFrom: "2026-11-03T19:00:00.000Z",
      validTo: "2026-11-04T08:00:00.000Z",
      route: ["PUPPI", "23N170W", "TONIK"],
      remarks: "TRK B NOT AVAILABLE",
      message: "(TDM TRK A ...)",
    };

    expect(placeTrack(published, new Map([["PUPPI", [{ latitude: 21.921383, longitude: -161.679633 }]]]))).toEqual({
      system: "pacots",
      identifier: "A",
      direction: "west",
      issuingAuthority: "KZAK",
      notamNumber: "A5313/26",
      validFrom: "2026-11-03T19:00:00.000Z",
      validTo: "2026-11-04T08:00:00.000Z",
      route: "PUPPI 23N170W TONIK",
      levels: [],
      fixes: [
        { ident: "PUPPI", latitude: 21.921383, longitude: -161.679633 },
        { ident: "23N170W", latitude: 23, longitude: -170 },
      ],
      unresolvedFixes: ["TONIK"],
      remarks: "TRK B NOT AVAILABLE",
      message: "(TDM TRK A ...)",
    });
  });

  it("keeps a North Atlantic track's levels and places its points", () => {
    const published = {
      system: "nat" as const,
      identifier: "B",
      direction: "west" as const,
      levels: [340, 350, 360],
      issuingAuthority: "EGGX",
      notamNumber: "EGGX1112/26",
      validFrom: "2026-11-12T11:30:00.000Z",
      validTo: "2026-11-12T19:00:00.000Z",
      route: ["NEBIN", "5430/20", "5530/30", "MELDI"],
      remarks: "1. TMI IS 316.",
      message: "NAT-1/2 TRACKS ...",
    };

    expect(placeTrack(published, new Map([["NEBIN", [{ latitude: 53.5, longitude: -15 }]]]))).toMatchObject({
      system: "nat",
      levels: [340, 350, 360],
      route: "NEBIN 5430/20 5530/30 MELDI",
      fixes: [
        { ident: "NEBIN", latitude: 53.5, longitude: -15 },
        { ident: "5430/20", latitude: 54.5, longitude: -20 },
        { ident: "5530/30", latitude: 55.5, longitude: -30 },
      ],
      unresolvedFixes: ["MELDI"],
    });
  });
});
