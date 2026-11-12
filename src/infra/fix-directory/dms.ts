const DMS = /^(\d{1,3})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)([NSEW])$/;

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function parseDms(value: string): number | null {
  const match = DMS.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, degrees, minutes, seconds, hemisphere] = match;
  const magnitude = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
  const limit = hemisphere === "N" || hemisphere === "S" ? 90 : 180;

  if (magnitude > limit || Number(minutes) >= 60 || Number(seconds) > 60) {
    return null;
  }

  return round(hemisphere === "S" || hemisphere === "W" ? -magnitude : magnitude);
}
