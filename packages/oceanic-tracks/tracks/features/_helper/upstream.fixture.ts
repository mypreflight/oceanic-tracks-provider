import { readFileSync } from "node:fs";
import { join } from "node:path";

export const NOTAMS_PATH = "/nmsapi/v1/notams";

export const TOKEN_PATH = "/v1/auth/token";

export const LAYERS = {
  "designated points": { path: "/arcgis/DesignatedPoints/FeatureServer/0/query", fixture: "designated-points.json" },
  navaids: { path: "/arcgis/NavaidComponents/FeatureServer/0/query", fixture: "navaid-components.json" },
  "archived designated points": {
    path: "/arcgis/DesignatedPoint/FeatureServer/0/query",
    fixture: "designated-point-archive.json",
  },
} as const;

export type LayerName = keyof typeof LAYERS;

export const ISSUERS = {
  Oakland: { location: "KZAK", freeText: "TDM TRK", fixture: "nms-oakland.json" },
  Fukuoka: { location: "RJJJ", freeText: "PACOTS", fixture: "nms-fukuoka.json" },
} as const;

export type IssuerName = keyof typeof ISSUERS;

type Feature = { attributes: Record<string, string> };

export function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(__dirname, "..", "_fixture", name), "utf-8")) as T;
}

export function withoutIdents(name: string, idents: string[]): { features: Feature[] } {
  const { features } = fixture<{ features: Feature[] }>(name);

  return {
    features: features.filter(
      (feature) => !idents.includes(feature.attributes.IDENT ?? feature.attributes.IDENT_TXT ?? ""),
    ),
  };
}

export function notamsResponse(notams: { number: string; text: string; type?: string }[]): unknown {
  return {
    status: "Success",
    data: {
      geojson: notams.map((notam) => ({
        type: "Feature",
        properties: {
          coreNOTAMData: {
            notam: {
              number: notam.number,
              type: notam.type ?? "N",
              effectiveStart: "2026-11-03T19:00:00Z",
              effectiveEnd: "2026-11-04T08:00:00Z",
              text: notam.text,
            },
          },
        },
      })),
    },
  };
}

export const TOKEN = {
  status: "approved",
  token_type: "BearerToken",
  access_token: "local-access-token",
  expires_in: "1799",
};
