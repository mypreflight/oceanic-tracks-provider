import { NatMessages } from "./nat-messages";
import type { NatMessagePart, NatMessageSource } from "./port/nat-message-source";

function part(overrides: Partial<NatMessagePart> & Pick<NatMessagePart, "text">): NatMessagePart {
  return {
    number: "EGGX1112/26",
    location: "EGGX",
    part: 1,
    validFrom: "2026-11-12T11:30:00Z",
    validTo: "2026-11-12T19:00:00Z",
    ...overrides,
  };
}

const SHANWICK_ONE = part({
  text: "NAT-1/2 TRACKS FLS 340/400 INCLUSIVE\r\nA DOGAL 55/20 56/30 LOMSI\r\nEAST LVLS NIL\r\nWEST LVLS 340 350\r\nNAR N670A-\r\nEND OF PART ONE OF TWO PARTS",
});

const SHANWICK_TWO = part({
  part: 2,
  text: "NAT-2/2 TRACKS FLS 340/400 INCLUSIVE\r\nG DINIM 52/20 TUDEP\r\nEAST LVLS NIL\r\nWEST LVLS 360\r\nNAR N520C-\r\nREMARKS.\r\n1. TMI IS 316.-\r\nEND OF PART TWO OF TWO PARTS",
});

const GANDER = part({
  number: "CZQX1113/26",
  location: "CZQX",
  validFrom: "2026-11-13T01:00:00Z",
  validTo: "2026-11-13T08:00:00Z",
  text: "NAT-1/1 TRACKS FLS 340/400 INCLUSIVE\r\nZ SOORY 43/50 45/40\r\nEAST LVLS 360 380\r\nWEST LVLS NIL\r\nREMARKS:\r\n1.TMI IS 317.-",
});

function sourceWith(parts: NatMessagePart[]): NatMessageSource {
  return { list: () => Promise.resolve(parts) };
}

describe("NatMessages", () => {
  it("joins a message's parts in order and publishes each track with its levels and the message's validity", async () => {
    const { tracks, unreadableMessages } = await new NatMessages(sourceWith([SHANWICK_TWO, SHANWICK_ONE])).load();

    expect(unreadableMessages).toEqual([]);
    expect(tracks.map((track) => track.identifier)).toEqual(["A", "G"]);
    expect(tracks[0]).toEqual({
      identifier: "A",
      route: ["DOGAL", "55/20", "56/30", "LOMSI"],
      remarks: "1. TMI IS 316.",
      system: "nat",
      direction: "west",
      levels: [340, 350],
      issuingAuthority: "EGGX",
      notamNumber: "EGGX1112/26",
      validFrom: "2026-11-12T11:30:00.000Z",
      validTo: "2026-11-12T19:00:00.000Z",
      message: [SHANWICK_ONE.text, SHANWICK_TWO.text].join("\n").replace(/\r\n/g, "\n"),
    });
    expect(tracks[1]).toMatchObject({ identifier: "G", levels: [360], remarks: "1. TMI IS 316." });
  });

  it("keeps Gander's and Shanwick's messages apart", async () => {
    const { tracks } = await new NatMessages(sourceWith([SHANWICK_ONE, GANDER])).load();

    expect(tracks.map((track) => [track.issuingAuthority, track.identifier, track.direction, track.levels])).toEqual([
      ["EGGX", "A", "west", [340, 350]],
      ["CZQX", "Z", "east", [360, 380]],
    ]);
  });

  it("takes the issuer's usual direction when the levels do not tell", async () => {
    const both = part({ text: "B NEBIN 5430/20 MELDI\nEAST LVLS 310\nWEST LVLS 340" });

    const { tracks } = await new NatMessages(sourceWith([both])).load();

    expect(tracks[0]).toMatchObject({ direction: "west", levels: [340] });
  });

  it("reads a part listed twice once", async () => {
    const { tracks } = await new NatMessages(sourceWith([SHANWICK_ONE, SHANWICK_ONE])).load();

    expect(tracks.map((track) => track.identifier)).toEqual(["A"]);
  });

  it("lists a message it cannot read instead of dropping it silently", async () => {
    const { tracks, unreadableMessages } = await new NatMessages(
      sourceWith([
        part({ number: "EGGX1199/26", text: "NAT TRACKS WILL BE PUBLISHED LATER" }),
        part({ number: "EGGX1198/26", validTo: "soon", text: SHANWICK_ONE.text }),
        part({
          number: "KZNY1112/26",
          location: "KZNY",
          text: "C JOBOC 41/60\nEAST LVLS NIL\nWEST LVLS NIL",
        }),
      ]),
    ).load();

    expect(tracks).toEqual([]);
    expect(unreadableMessages).toEqual(["EGGX1199/26", "EGGX1198/26", "KZNY1112/26"]);
  });
});
