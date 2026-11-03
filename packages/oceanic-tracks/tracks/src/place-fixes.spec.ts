import { namedIdents, placeFixes } from "./place-fixes";

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
