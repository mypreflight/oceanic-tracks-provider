import { parseOaklandMessage } from "./oakland.parser";

const TRACK_E =
  "(TDM TRK E 261103190001 2611031900 2611040800 BOXER FULMR FASEL 52N140W 55N150W 56N160W 56N170W ALDOZ AMOND SYA " +
  "AAMYY ASPIN AKISU AGEDI ADGOR RTS/KSFO GNNRR STINS AMAKR BOXER KLAX MCKEY LIBBO BRINY BOARS BOXER ADGOR R591 " +
  "ADNAP RMK/0)";

const TRACK_A =
  "(TDM TRK A 261103190001 2611031900 2611040800 PUPPI CRESP 23N170W 25N180E 27N170E 28N160E 31N150E TONIK " +
  "RTS/PHNL KEOLA PUPPI TONIK G223 BEGAD RMK/TRK B NOT AVAILABLE )";

describe("parseOaklandMessage", () => {
  it("reads the track up to its connecting routes", () => {
    expect(parseOaklandMessage(TRACK_E)).toEqual([
      {
        identifier: "E",
        route: [
          "BOXER",
          "FULMR",
          "FASEL",
          "52N140W",
          "55N150W",
          "56N160W",
          "56N170W",
          "ALDOZ",
          "AMOND",
          "SYA",
          "AAMYY",
          "ASPIN",
          "AKISU",
          "AGEDI",
          "ADGOR",
        ],
        remarks: null,
      },
    ]);
  });

  it("keeps a remark that says something", () => {
    expect(parseOaklandMessage(TRACK_A)[0]).toMatchObject({ identifier: "A", remarks: "TRK B NOT AVAILABLE" });
  });

  it("reads a message broken over several lines", () => {
    const broken = TRACK_A.replace(" 23N170W", "\n23N170W").replace(" RTS/", "\r\nRTS/");

    expect(parseOaklandMessage(broken)).toEqual(parseOaklandMessage(TRACK_A));
  });

  it("reads a track published without connecting routes or remarks", () => {
    expect(parseOaklandMessage("(TDM TRK K 261103190001 2611031900 2611040800 BOXER 52N140W NIPPI)")).toEqual([
      { identifier: "K", route: ["BOXER", "52N140W", "NIPPI"], remarks: null },
    ]);
  });

  it("refuses text that is not a track message", () => {
    expect(parseOaklandMessage("OAKLAND OCEANIC CPDLC OUT OF SERVICE")).toEqual([]);
    expect(parseOaklandMessage("(TDM TRK E 261103190001 2611031900 2611040800 RTS/KSFO GNNRR)")).toEqual([]);
  });
});
