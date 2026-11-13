import { namedIdents, placeTrack } from "../domain/place-fixes";
import { compareTracks, type PublishedTracks, type TrackSet } from "../domain/track";
import { describeError, Logger } from "../shared/logger";
import type { NatMessages } from "./nat-messages";
import type { PacotsMessages } from "./pacots-messages";
import type { FixDirectory } from "./port/fix-directory";

const CACHE_TTL_MS = 300_000;

export class ListCurrentTracks {
  private readonly logger = new Logger(ListCurrentTracks.name);
  private cached: { value: TrackSet; expiresAt: number } | null = null;

  constructor(
    private readonly pacots: PacotsMessages,
    private readonly nat: NatMessages,
    private readonly fixDirectory: FixDirectory,
  ) {}

  async execute(): Promise<TrackSet> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      this.logger.debug("Serving the tracks from cache.");

      return this.cached.value;
    }

    const [pacots, nat] = await Promise.all([this.pacots.load(), this.loadNat()]);
    const published = [...pacots.tracks, ...(nat?.tracks ?? [])];
    const unreadableMessages = [...pacots.unreadableMessages, ...(nat?.unreadableMessages ?? [])];
    const candidates = await this.fixDirectory.locate(published.flatMap((track) => namedIdents(track.route)));
    const tracks = published.map((track) => placeTrack(track, candidates)).sort(compareTracks);

    const value: TrackSet = { fetchedAt: new Date().toISOString(), tracks, unreadableMessages };

    if (nat !== null) {
      this.cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    }

    const unresolved = tracks.reduce((count, track) => count + track.unresolvedFixes.length, 0);
    this.logger.log(
      `Assembled ${tracks.length} tracks, ${unresolved} fixes unplaced, ${unreadableMessages.length} messages unreadable.`,
    );

    return value;
  }

  private async loadNat(): Promise<PublishedTracks | null> {
    try {
      return await this.nat.load();
    } catch (error) {
      this.logger.warn(`Serving the Pacific tracks without the North Atlantic ones: ${describeError(error)}`);

      return null;
    }
  }
}
