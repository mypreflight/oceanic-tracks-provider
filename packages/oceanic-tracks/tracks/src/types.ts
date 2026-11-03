export type TrackSystem = "pacots";

export type TrackDirection = "east" | "west";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TrackFix = Coordinates & {
  ident: string;
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

export type NmsNotam = {
  number: string;
  type: string;
  validFrom: string;
  validTo: string;
  text: string;
};

export type ParsedTrack = {
  identifier: string;
  route: string[];
  remarks: string | null;
};
