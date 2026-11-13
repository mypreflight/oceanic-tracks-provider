import { classifyToken, distanceNm, type RouteToken } from "./coordinates";
import type { Coordinates, OceanicTrack, PublishedTrack, TrackFix } from "./track";

export type FixCandidates = Map<string, Coordinates[]>;

export type PlacedRoute = {
  fixes: TrackFix[];
  unresolvedFixes: string[];
};

type Waypoint = Exclude<RouteToken, { kind: "airway" }>;

function nearestPlaced(placed: (Coordinates | null)[], index: number): Coordinates | null {
  for (let offset = 1; offset < placed.length; offset++) {
    const before = placed[index - offset];
    const after = placed[index + offset];

    if (before) {
      return before;
    }

    if (after) {
      return after;
    }
  }

  return null;
}

function closestTo(anchor: Coordinates, options: Coordinates[]): Coordinates {
  return options.reduce((best, option) => (distanceNm(anchor, option) < distanceNm(anchor, best) ? option : best));
}

export function namedIdents(route: string[]): string[] {
  return route.map(classifyToken).flatMap((token) => (token.kind === "named" ? [token.ident] : []));
}

export function placeFixes(route: string[], candidates: FixCandidates): PlacedRoute {
  const waypoints = route.map(classifyToken).filter((token): token is Waypoint => token.kind !== "airway");
  const placed = waypoints.map((waypoint): Coordinates | null => {
    if (waypoint.kind === "point") {
      return waypoint.coordinates;
    }

    const options = waypoint.kind === "named" ? (candidates.get(waypoint.ident) ?? []) : [];

    return options.length === 1 ? options[0] : null;
  });

  let progressed = true;

  while (progressed) {
    progressed = false;

    waypoints.forEach((waypoint, index) => {
      const options = waypoint.kind === "named" ? (candidates.get(waypoint.ident) ?? []) : [];

      if (placed[index] || options.length < 2) {
        return;
      }

      const anchor = nearestPlaced(placed, index);

      if (anchor) {
        placed[index] = closestTo(anchor, options);
        progressed = true;
      }
    });
  }

  const fixes: TrackFix[] = [];
  const unresolvedFixes: string[] = [];

  waypoints.forEach((waypoint, index) => {
    const position = placed[index];

    if (position) {
      fixes.push({ ident: waypoint.ident, latitude: position.latitude, longitude: position.longitude });
    } else {
      unresolvedFixes.push(waypoint.ident);
    }
  });

  return { fixes, unresolvedFixes };
}

export function placeTrack(track: PublishedTrack, candidates: FixCandidates): OceanicTrack {
  const { fixes, unresolvedFixes } = placeFixes(track.route, candidates);

  return {
    system: track.system,
    identifier: track.identifier,
    direction: track.direction,
    issuingAuthority: track.issuingAuthority,
    notamNumber: track.notamNumber,
    validFrom: track.validFrom,
    validTo: track.validTo,
    route: track.route.join(" "),
    levels: track.levels,
    fixes,
    unresolvedFixes,
    remarks: track.remarks,
    message: track.message,
  };
}
