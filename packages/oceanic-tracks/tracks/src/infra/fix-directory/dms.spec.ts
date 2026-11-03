import { parseDms } from "./dms";

describe("parseDms", () => {
  it("reads the FAA degrees, minutes and seconds format", () => {
    expect(parseDms("21-55-16.980N")).toBeCloseTo(21.921383, 5);
    expect(parseDms("161-40-46.680W")).toBeCloseTo(-161.6796333, 5);
    expect(parseDms("180-00-00.000E")).toBe(180);
  });

  it("reads the archive's unpadded seconds", () => {
    expect(parseDms("149-39-2.560E")).toBeCloseTo(149.6507111, 5);
    expect(parseDms("44-10-0.000N")).toBeCloseTo(44.1666667, 5);
  });

  it("refuses malformed values", () => {
    expect(parseDms("")).toBeNull();
    expect(parseDms("21.92N")).toBeNull();
    expect(parseDms("91-00-00.000N")).toBeNull();
  });
});
