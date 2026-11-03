import type { ParsedTrack } from "../types";

const TRACK_HEADER = /^TRACK\s+([A-Z0-9]+)\.?$/;

const LABELLED_LINE = /^((?:[A-Z0-9/]+\s)?ROUTE|RMK)\s*:\s*(.*)$/;

const TRACK_ROUTE = "FLEX ROUTE";

const REMARKS = "RMK";

type TrackDraft = {
  identifier: string;
  sections: Map<string, string[]>;
  label: string | null;
};

function toTrack(draft: TrackDraft): ParsedTrack | null {
  const route = (draft.sections.get(TRACK_ROUTE) ?? []).join(" ").split(/\s+/).filter(Boolean);

  if (route.length === 0) {
    return null;
  }

  const remarks = (draft.sections.get(REMARKS) ?? []).filter(Boolean).join("\n");

  return { identifier: draft.identifier, route, remarks: remarks === "" ? null : remarks };
}

export function parseFukuokaMessage(text: string): ParsedTrack[] {
  const drafts: TrackDraft[] = [];

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();

    if (line === "") {
      continue;
    }

    const header = TRACK_HEADER.exec(line);

    if (header) {
      drafts.push({ identifier: header[1], sections: new Map(), label: null });
      continue;
    }

    const draft = drafts.at(-1);

    if (!draft) {
      continue;
    }

    const labelled = LABELLED_LINE.exec(line);
    const label = labelled ? labelled[1].replace(/\s+/g, " ") : draft.label;
    const content = labelled ? labelled[2].trim() : line;

    if (label === null) {
      continue;
    }

    draft.label = label;
    draft.sections.set(label, [...(draft.sections.get(label) ?? []), content]);
  }

  const tracks = drafts.map(toTrack);

  return tracks.every((track) => track !== null) ? tracks : [];
}
