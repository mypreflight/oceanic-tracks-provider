import { classifyToken, distanceNm, parseLatLonPoint } from "./coordinates";

describe("parseLatLonPoint", () => {
  it("reads whole degrees on both sides of the date line", () => {
    expect(parseLatLonPoint("52N140W")).toEqual({ latitude: 52, longitude: -140 });
    expect(parseLatLonPoint("25N180E")).toEqual({ latitude: 25, longitude: 180 });
    expect(parseLatLonPoint("31N150E")).toEqual({ latitude: 31, longitude: 150 });
  });

  it("reads degrees and minutes", () => {
    expect(parseLatLonPoint("5230N14015W")).toEqual({ latitude: 52.5, longitude: -140.25 });
  });

  it("reads the southern hemisphere", () => {
    expect(parseLatLonPoint("10S170E")).toEqual({ latitude: -10, longitude: 170 });
  });

  it("refuses anything that is not a point", () => {
    expect(parseLatLonPoint("BOXER")).toBeNull();
    expect(parseLatLonPoint("95N140W")).toBeNull();
    expect(parseLatLonPoint("52N190W")).toBeNull();
    expect(parseLatLonPoint("5275N14000W")).toBeNull();
  });
});

describe("classifyToken", () => {
  it("tells points, named fixes and airways apart", () => {
    expect(classifyToken("23N170W")).toEqual({
      kind: "point",
      ident: "23N170W",
      coordinates: { latitude: 23, longitude: -170 },
    });
    expect(classifyToken("NIPPI")).toEqual({ kind: "named", ident: "NIPPI" });
    expect(classifyToken("SYA")).toEqual({ kind: "named", ident: "SYA" });
    expect(classifyToken("R591")).toEqual({ kind: "airway", ident: "R591" });
    expect(classifyToken("OTR15")).toEqual({ kind: "airway", ident: "OTR15" });
    expect(classifyToken("RTS/KSFO")).toEqual({ kind: "unknown", ident: "RTS/KSFO" });
  });
});

describe("distanceNm", () => {
  it("measures a degree of latitude as sixty nautical miles", () => {
    expect(distanceNm({ latitude: 50, longitude: -140 }, { latitude: 51, longitude: -140 })).toBeCloseTo(60, 0);
  });

  it("measures across the date line the short way", () => {
    expect(distanceNm({ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 })).toBeCloseTo(120, 0);
  });
});
