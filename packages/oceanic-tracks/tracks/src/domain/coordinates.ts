import type { Coordinates } from "./track";

const LAT_LON_POINT = /^(\d{2})(\d{2})?([NS])(\d{3})(\d{2})?([EW])$/;

const NAMED_FIX = /^[A-Z]{2,5}$/;

const AIRWAY = /^[A-Z]{1,3}\d{1,4}[A-Z]?$/;

const EARTH_RADIUS_NM = 3440.065;

export type RouteToken =
  | { kind: "point"; ident: string; coordinates: Coordinates }
  | { kind: "named"; ident: string }
  | { kind: "airway"; ident: string }
  | { kind: "unknown"; ident: string };

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function parseLatLonPoint(token: string): Coordinates | null {
  const match = LAT_LON_POINT.exec(token);

  if (!match) {
    return null;
  }

  const [, latDegrees, latMinutes = "0", north, lonDegrees, lonMinutes = "0", east] = match;
  const latitude = (Number(latDegrees) + Number(latMinutes) / 60) * (north === "S" ? -1 : 1);
  const longitude = (Number(lonDegrees) + Number(lonMinutes) / 60) * (east === "W" ? -1 : 1);

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || Number(latMinutes) >= 60 || Number(lonMinutes) >= 60) {
    return null;
  }

  return { latitude: round(latitude), longitude: round(longitude) };
}

export function classifyToken(token: string): RouteToken {
  const coordinates = parseLatLonPoint(token);

  if (coordinates) {
    return { kind: "point", ident: token, coordinates };
  }

  if (NAMED_FIX.test(token)) {
    return { kind: "named", ident: token };
  }

  if (AIRWAY.test(token)) {
    return { kind: "airway", ident: token };
  }

  return { kind: "unknown", ident: token };
}

export function distanceNm(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}
