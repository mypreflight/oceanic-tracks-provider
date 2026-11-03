import { parseFukuokaMessage } from "../domain/message/fukuoka.parser";
import { parseOaklandMessage } from "../domain/message/oakland.parser";
import type { ParsedTrack, PublishedTrack, TrackDirection } from "../domain/track";
import { Logger } from "../shared/logger";
import type { TrackMessageSource } from "./port/track-message-source";

const CANCELLATION = "C";

type Issuer = {
  location: string;
  keyword: string;
  direction: TrackDirection;
  parse: (text: string) => ParsedTrack[];
};

const ISSUERS: Issuer[] = [
  { location: "KZAK", keyword: "TDM TRK", direction: "west", parse: parseOaklandMessage },
  { location: "RJJJ", keyword: "PACOTS", direction: "east", parse: parseFukuokaMessage },
];

export type PublishedTracks = {
  tracks: PublishedTrack[];
  unreadableMessages: string[];
};

function isoInstant(value: string): string | null {
  const instant = new Date(value);

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

export class PacotsMessages {
  private readonly logger = new Logger(PacotsMessages.name);

  constructor(private readonly source: TrackMessageSource) {}

  async load(): Promise<PublishedTracks> {
    const tracks: PublishedTrack[] = [];
    const unreadableMessages: string[] = [];

    for (const issuer of ISSUERS) {
      const messages = await this.source.find(issuer.location, issuer.keyword);
      const seen = new Set<string>();

      for (const message of messages) {
        if (message.type === CANCELLATION || seen.has(message.number)) {
          continue;
        }

        seen.add(message.number);

        const parsed = issuer.parse(message.text);
        const validFrom = isoInstant(message.validFrom);
        const validTo = isoInstant(message.validTo);

        if (parsed.length === 0 || validFrom === null || validTo === null) {
          this.logger.warn(`Could not read ${issuer.location} track message ${message.number}.`);
          unreadableMessages.push(message.number);
          continue;
        }

        for (const track of parsed) {
          tracks.push({
            ...track,
            system: "pacots",
            direction: issuer.direction,
            issuingAuthority: issuer.location,
            notamNumber: message.number,
            validFrom,
            validTo,
            message: message.text,
          });
        }
      }
    }

    return { tracks, unreadableMessages };
  }
}
