import type { ParsedTrack, TrackDirection } from "../track";

const WAYPOINT = String.raw`(?:[A-Z]{2,5}|\d{2,4}/\d{2,3})`;

const TRACK_LINE = new RegExp(`^([A-Z]) (${WAYPOINT}(?: ${WAYPOINT})+)$`);

const LEVELS_LINE = /^(EAST|WEST) LVLS\b(.*)$/;

const REMARKS_HEADER = /^REMARKS\s*[.:]?$/;

const REMARK_ITEM = /^\d+\s*\./;

const PART_END = /^END OF PART\b/;

const LEVEL = /^\d{3}$/;

export type NatLevels = Record<TrackDirection, number[]>;

export type ParsedNatTrack = ParsedTrack & {
  levels: NatLevels;
};

type TrackDraft = {
  identifier: string;
  route: string[];
  levels: NatLevels;
};

function levelsOf(value: string): number[] {
  return value
    .trim()
    .split(/\s+/)
    .filter((token) => LEVEL.test(token))
    .map(Number);
}

function remarksOf(lines: string[]): string | null {
  const items: string[] = [];

  for (const line of lines) {
    const text = line.replace(/-$/, "").trim();

    if (text === "") {
      continue;
    }

    if (REMARK_ITEM.test(text) || items.length === 0) {
      items.push(text);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${text}`;
    }
  }

  return items.length === 0 ? null : items.join("\n");
}

export function publishedDirection(levels: NatLevels): TrackDirection | null {
  if (levels.east.length > 0 && levels.west.length === 0) {
    return "east";
  }

  if (levels.west.length > 0 && levels.east.length === 0) {
    return "west";
  }

  return null;
}

export function parseNatMessage(text: string): ParsedNatTrack[] {
  const drafts: TrackDraft[] = [];
  const remarkLines: string[] = [];
  let inRemarks = false;

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();

    if (line === "" || PART_END.test(line)) {
      continue;
    }

    if (REMARKS_HEADER.test(line)) {
      inRemarks = true;
      continue;
    }

    if (inRemarks) {
      remarkLines.push(line);
      continue;
    }

    const track = TRACK_LINE.exec(line);

    if (track) {
      drafts.push({ identifier: track[1], route: track[2].split(" "), levels: { east: [], west: [] } });
      continue;
    }

    const levels = LEVELS_LINE.exec(line);
    const draft = drafts.at(-1);

    if (levels && draft) {
      draft.levels[levels[1] === "EAST" ? "east" : "west"] = levelsOf(levels[2]);
    }
  }

  const remarks = remarksOf(remarkLines);

  return drafts.map(({ identifier, route, levels }) => ({ identifier, route, remarks, levels }));
}
