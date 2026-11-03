export type TrackSystem = "pacots";

export type TrackDirection = "east" | "west";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TrackFix = Coordinates & {
  ident: string;
};

export type ParsedTrack = {
  identifier: string;
  route: string[];
  remarks: string | null;
};

export type PublishedTrack = ParsedTrack & {
  system: TrackSystem;
  direction: TrackDirection;
  issuingAuthority: string;
  notamNumber: string;
  validFrom: string;
  validTo: string;
  message: string;
};

export type OceanicTrack = {
  system: TrackSystem;
  identifier: string;
  direction: TrackDirection;
  issuingAuthority: string;
  notamNumber: string;
  validFrom: string;
  validTo: string;
  route: string;
  levels: number[];
  fixes: TrackFix[];
  unresolvedFixes: string[];
  remarks: string | null;
  message: string;
};

export type TrackSet = {
  fetchedAt: string;
  tracks: OceanicTrack[];
  unreadableMessages: string[];
};

export function compareTracks(a: OceanicTrack, b: OceanicTrack): number {
  return (
    a.issuingAuthority.localeCompare(b.issuingAuthority) ||
    a.identifier.localeCompare(b.identifier, "en", { numeric: true }) ||
    a.validFrom.localeCompare(b.validFrom)
  );
}
