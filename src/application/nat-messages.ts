import { parseNatMessage, publishedDirection } from "../domain/message/nat.parser";
import type { PublishedTrack, PublishedTracks, TrackDirection } from "../domain/track";
import { Logger } from "../shared/logger";
import type { NatMessagePart, NatMessageSource } from "./port/nat-message-source";

const ISSUER_DIRECTIONS: Record<string, TrackDirection> = {
  CZQX: "east",
  EGGX: "west",
};

function isoInstant(value: string): string | null {
  const instant = new Date(value);

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

function byMessage(parts: NatMessagePart[]): NatMessagePart[][] {
  const messages = new Map<string, Map<number, NatMessagePart>>();

  for (const part of parts) {
    const message = messages.get(part.number) ?? new Map<number, NatMessagePart>();
    message.set(part.part, part);
    messages.set(part.number, message);
  }

  return [...messages.values()].map((message) => [...message.values()].sort((a, b) => a.part - b.part));
}

export class NatMessages {
  private readonly logger = new Logger(NatMessages.name);

  constructor(private readonly source: NatMessageSource) {}

  async load(): Promise<PublishedTracks> {
    const tracks: PublishedTrack[] = [];
    const unreadableMessages: string[] = [];

    for (const parts of byMessage(await this.source.list())) {
      const [first] = parts;
      const message = parts.map((part) => part.text.replace(/\r\n|\r/g, "\n").trim()).join("\n");
      const parsed = parseNatMessage(message);
      const validFrom = isoInstant(first.validFrom);
      const validTo = isoInstant(first.validTo);
      const directed = parsed.flatMap((track) => {
        const direction = publishedDirection(track.levels) ?? ISSUER_DIRECTIONS[first.location];

        return direction === undefined ? [] : [{ track, direction }];
      });

      if (parsed.length === 0 || directed.length < parsed.length || validFrom === null || validTo === null) {
        this.logger.warn(`Could not read ${first.location} track message ${first.number}.`);
        unreadableMessages.push(first.number);
        continue;
      }

      for (const { track, direction } of directed) {
        tracks.push({
          identifier: track.identifier,
          route: track.route,
          remarks: track.remarks,
          system: "nat",
          direction,
          levels: track.levels[direction],
          issuingAuthority: first.location,
          notamNumber: first.number,
          validFrom,
          validTo,
          message,
        });
      }
    }

    return { tracks, unreadableMessages };
  }
}
