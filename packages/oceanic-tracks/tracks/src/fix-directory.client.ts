import { FixDirectoryUnavailableError } from "./errors";
import { fetchWithRetry } from "./http";
import { Logger } from "./logger";
import { distanceNm, parseDms } from "./parser/coordinates";
import type { FixCandidates } from "./place-fixes";
import type { Coordinates } from "./types";

const CACHE_TTL_MS = 86_400_000;

const IDENTS_PER_QUERY = 100;

const SAME_FIX_WITHIN_NM = 5;

const IDENT = /^[A-Z0-9]{2,5}$/;

type Layer = {
  service: string;
  ident: string;
  latitude: string;
  longitude: string;
};

const LAYERS: Layer[] = [
  { service: "DesignatedPoints", ident: "IDENT", latitude: "LATITUDE", longitude: "LONGITUDE" },
  { service: "NavaidComponents", ident: "IDENT", latitude: "LATITUDE", longitude: "LONGITUDE" },
  { service: "DesignatedPoint", ident: "IDENT_TXT", latitude: "LAT_TXT", longitude: "LONG_TXT" },
];

type QueryResponse = {
  error?: unknown;
  features?: { attributes?: Record<string, unknown> }[];
};

export type FixDirectoryClientOptions = {
  host: string;
  userAgent: string;
};

export class FixDirectoryClient {
  private readonly logger = new Logger(FixDirectoryClient.name);
  private readonly host: string;
  private readonly cache = new Map<string, { candidates: Coordinates[]; expiresAt: number }>();

  constructor(private readonly options: FixDirectoryClientOptions) {
    this.host = options.host.replace(/\/+$/, "");
  }

  async locate(idents: string[]): Promise<FixCandidates> {
    const wanted = [...new Set(idents)].filter((ident) => IDENT.test(ident));
    const missing = wanted.filter((ident) => (this.cache.get(ident)?.expiresAt ?? 0) <= Date.now());

    if (missing.length > 0) {
      const found = new Map<string, Coordinates[]>(missing.map((ident) => [ident, []]));

      for (const layer of LAYERS) {
        for (const [ident, position] of await this.query(layer, missing)) {
          const known = found.get(ident) ?? [];

          if (!known.some((candidate) => distanceNm(candidate, position) < SAME_FIX_WITHIN_NM)) {
            found.set(ident, [...known, position]);
          }
        }
      }

      const expiresAt = Date.now() + CACHE_TTL_MS;
      found.forEach((candidates, ident) => {
        this.cache.set(ident, { candidates, expiresAt });
      });

      this.logger.debug(
        `Looked up ${missing.length} fixes, placed ${[...found.values()].filter((c) => c.length).length}.`,
      );
    }

    return new Map(wanted.map((ident) => [ident, this.cache.get(ident)?.candidates ?? []]));
  }

  private async query(layer: Layer, idents: string[]): Promise<[string, Coordinates][]> {
    const positions: [string, Coordinates][] = [];

    for (let start = 0; start < idents.length; start += IDENTS_PER_QUERY) {
      const batch = idents.slice(start, start + IDENTS_PER_QUERY);
      const query = new URLSearchParams({
        where: `${layer.ident} IN (${batch.map((ident) => `'${ident}'`).join(",")})`,
        outFields: [layer.ident, layer.latitude, layer.longitude].join(","),
        returnGeometry: "false",
        f: "json",
      });
      const response = await fetchWithRetry(
        `${this.host}/${layer.service}/FeatureServer/0/query?${query}`,
        { headers: { Accept: "application/json", "User-Agent": this.options.userAgent } },
        this.logger,
        () => new FixDirectoryUnavailableError(),
      );
      const body = (await response.json().catch(() => null)) as QueryResponse | null;

      if (!response.ok || body === null || body.error !== undefined || !Array.isArray(body.features)) {
        this.logger.warn(`The fix directory layer ${layer.service} answered ${response.status} without features.`);

        throw new FixDirectoryUnavailableError();
      }

      for (const feature of body.features) {
        const attributes = feature.attributes ?? {};
        const ident = attributes[layer.ident];
        const latitude = parseDms(String(attributes[layer.latitude] ?? ""));
        const longitude = parseDms(String(attributes[layer.longitude] ?? ""));

        if (typeof ident === "string" && batch.includes(ident) && latitude !== null && longitude !== null) {
          positions.push([ident, { latitude, longitude }]);
        }
      }
    }

    return positions;
  }
}
