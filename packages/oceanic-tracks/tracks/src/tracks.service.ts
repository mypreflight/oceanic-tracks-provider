import type { FixDirectoryClient } from "./fix-directory.client";
import { Logger } from "./logger";
import type { PacotsSource } from "./pacots.source";
import { namedIdents, placeFixes } from "./place-fixes";
import type { OceanicTrack, TrackSet } from "./types";

const CACHE_TTL_MS = 300_000;

export class OceanicTracksService {
  private readonly logger = new Logger(OceanicTracksService.name);
  private cached: { value: TrackSet; expiresAt: number } | null = null;

  constructor(
    private readonly pacots: PacotsSource,
    private readonly fixDirectory: FixDirectoryClient,
  ) {}

  async current(): Promise<TrackSet> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      this.logger.debug("Serving the tracks from cache.");

      return this.cached.value;
    }

    const { tracks: drafts, unreadableMessages } = await this.pacots.load();
    const candidates = await this.fixDirectory.locate(drafts.flatMap((draft) => namedIdents(draft.route)));

    const tracks: OceanicTrack[] = drafts.map((draft) => {
      const { fixes, unresolvedFixes } = placeFixes(draft.route, candidates);

      return {
        system: draft.system,
        identifier: draft.identifier,
        direction: draft.direction,
        issuingAuthority: draft.issuingAuthority,
        notamNumber: draft.notamNumber,
        validFrom: draft.validFrom,
        validTo: draft.validTo,
        route: draft.route.join(" "),
        levels: [],
        fixes,
        unresolvedFixes,
        remarks: draft.remarks,
        message: draft.message,
      };
    });

    tracks.sort(
      (a, b) =>
        a.issuingAuthority.localeCompare(b.issuingAuthority) ||
        a.identifier.localeCompare(b.identifier, "en", { numeric: true }) ||
        a.validFrom.localeCompare(b.validFrom),
    );

    const value: TrackSet = { fetchedAt: new Date().toISOString(), tracks, unreadableMessages };
    this.cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };

    const unresolved = tracks.reduce((count, track) => count + track.unresolvedFixes.length, 0);
    this.logger.log(
      `Assembled ${tracks.length} tracks, ${unresolved} fixes unplaced, ${unreadableMessages.length} messages unreadable.`,
    );

    return value;
  }
}
