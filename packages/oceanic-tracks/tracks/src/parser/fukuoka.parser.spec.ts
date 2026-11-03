import { parseFukuokaMessage } from "./fukuoka.parser";

const NORTH_AMERICA = [
  "EASTBOUND PACOTS TRACKS BETWEEN JAPAN AND NORTH AMERICA,",
  "TRACK 1.",
  " FLEX ROUTE : ADGOR AGEDI AKISU ASPIN LYYLE 50N180E 51N170W 51N160W",
  "              50N150W 49N140W ROUKE",
  "JAPAN ROUTE : ADNAP R591 ADGOR",
  "  NAR ROUTE : ACFT LDG KSEA/KPDX--ROUKE DOLFF TOU KSEA/KPDX",
  "        RMK : ACFT LDG CYVR--50N150W 50N140W PRETY GOVAD CYVR",
  "              ACFT LDG OTHER DEST--ROUKE DOLFF TOU UPR TO DEST",
  "TRACK 2.",
  " FLEX ROUTE : KALNA 41N160E 43N170E 45N180E 46N170W 46N160W 45N150W",
  "              43N140W 41N130W TRYSH",
  "JAPAN ROUTE : ADNAP OTR5 KALNA",
  "  NAR ROUTE : ACFT LDG KSFO--TRYSH AMAKR BGGLO KSFO",
  "              ACFT LDG KLAX--TRYSH ENI OAK BURGL IRNMN KLAX",
].join("\n");

const HAWAII = [
  "EASTBOUND PACOTS TRACKS BETWEEN JAPAN AND HAWAII,",
  "TRACK 11.",
  " FLEX ROUTE : LEPKI 38N160E 38N170E 36N180E 32N170W THOMA",
  "JAPAN ROUTE : AVBET OTR11 LEPKI",
  " PHNL ROUTE : THOMA BOOKE PHNL",
  "        RMK : TRK 12 NOT AVAILABLE",
  "              ATM CENTER TEL:81-92-608-8870",
].join("\r\n");

const SOUTHEAST_ASIA = [
  "EASTBOUND PACOTS TRACKS BETWEEN SOUTHEAST ASIA AND NORTH AMERICA,",
  "TRACK 14.",
  "     FLEX ROUTE : EMRON 39N160E 41N170E 43N180E 44N170W 44N160W",
  "                  43N150W 41N140W 38N130W ALLBE",
  "RCTP/VHHH ROUTE : MOLKA M750 MUKEP Y891 OVSUN Y893 IGMIS Y57 POROT",
  "                  OTR11 AVBET OTR9 EMRON",
  "      NAR ROUTE : ACFT LDG KSFO--ALLBE PIRAT OSI KSFO",
].join("\n");

describe("parseFukuokaMessage", () => {
  it("reads every track in a message, joining routes broken over lines", () => {
    expect(parseFukuokaMessage(NORTH_AMERICA)).toEqual([
      {
        identifier: "1",
        route: [
          "ADGOR",
          "AGEDI",
          "AKISU",
          "ASPIN",
          "LYYLE",
          "50N180E",
          "51N170W",
          "51N160W",
          "50N150W",
          "49N140W",
          "ROUKE",
        ],
        remarks: "ACFT LDG CYVR--50N150W 50N140W PRETY GOVAD CYVR\nACFT LDG OTHER DEST--ROUKE DOLFF TOU UPR TO DEST",
      },
      {
        identifier: "2",
        route: [
          "KALNA",
          "41N160E",
          "43N170E",
          "45N180E",
          "46N170W",
          "46N160W",
          "45N150W",
          "43N140W",
          "41N130W",
          "TRYSH",
        ],
        remarks: null,
      },
    ]);
  });

  it("keeps a remark line that carries its own colon", () => {
    expect(parseFukuokaMessage(HAWAII)).toEqual([
      {
        identifier: "11",
        route: ["LEPKI", "38N160E", "38N170E", "36N180E", "32N170W", "THOMA"],
        remarks: "TRK 12 NOT AVAILABLE\nATM CENTER TEL:81-92-608-8870",
      },
    ]);
  });

  it("does not take a connecting route for the track", () => {
    expect(parseFukuokaMessage(SOUTHEAST_ASIA)[0].route).toEqual([
      "EMRON",
      "39N160E",
      "41N170E",
      "43N180E",
      "44N170W",
      "44N160W",
      "43N150W",
      "41N140W",
      "38N130W",
      "ALLBE",
    ]);
  });

  it("refuses a message with no tracks", () => {
    expect(parseFukuokaMessage("FUKUOKA ATMC PACOTS TRACK GENERATION SYSTEM MAINT")).toEqual([]);
  });

  it("refuses the whole message when one of its tracks has no route", () => {
    expect(parseFukuokaMessage(`${HAWAII}\nTRACK 12.\nJAPAN ROUTE : AVBET OTR11 LEPKI`)).toEqual([]);
  });
});
