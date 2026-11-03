import { Logger } from "./logger";
import type { NmsClient } from "./nms.client";
import { parseFukuokaMessage } from "./parser/fukuoka.parser";
import { parseOaklandMessage } from "./parser/oakland.parser";
import type { ParsedTrack, TrackDirection, TrackSystem } from "./types";

const CANCELLATION = "C";

type Issuer = {
  location: string;
  freeText: string;
  direction: TrackDirection;
  parse: (text: string) => ParsedTrack[];
};

const ISSUERS: Issuer[] = [
  { location: "KZAK", freeText: "TDM TRK", direction: "west", parse: parseOaklandMessage },
  { location: "RJJJ", freeText: "PACOTS", direction: "east", parse: parseFukuokaMessage },
];

export type TrackDraft = ParsedTrack & {
  system: TrackSystem;
  direction: TrackDirection;
  issuingAuthority: string;
  notamNumber: string;
  validFrom: string;
  validTo: string;
  message: string;
};

export type SourcedTracks = {
  tracks: TrackDraft[];
  unreadableMessages: string[];
};

function isoInstant(value: string): string | null {
  const instant = new Date(value);

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

export class PacotsSource {
  private readonly logger = new Logger(PacotsSource.name);

  constructor(private readonly nms: NmsClient) {}

  async load(): Promise<SourcedTracks> {
    const tracks: TrackDraft[] = [];
    const unreadableMessages: string[] = [];

    for (const issuer of ISSUERS) {
      const notams = await this.nms.findNotams(issuer.location, issuer.freeText);
      const seen = new Set<string>();

      for (const notam of notams) {
        if (notam.type === CANCELLATION || seen.has(notam.number)) {
          continue;
        }

        seen.add(notam.number);

        const parsed = issuer.parse(notam.text);
        const validFrom = isoInstant(notam.validFrom);
        const validTo = isoInstant(notam.validTo);

        if (parsed.length === 0 || validFrom === null || validTo === null) {
          this.logger.warn(`Could not read ${issuer.location} track message ${notam.number}.`);
          unreadableMessages.push(notam.number);
          continue;
        }

        for (const track of parsed) {
          tracks.push({
            ...track,
            system: "pacots",
            direction: issuer.direction,
            issuingAuthority: issuer.location,
            notamNumber: notam.number,
            validFrom,
            validTo,
            message: notam.text,
          });
        }
      }
    }

    return { tracks, unreadableMessages };
  }
}
