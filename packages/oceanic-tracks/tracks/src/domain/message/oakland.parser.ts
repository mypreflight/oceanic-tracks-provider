import type { ParsedTrack } from "../track";

const HEADER = /^TDM TRK ([A-Z0-9]+) \d{12} \d{10} \d{10} (.+)$/;

const SECTION = /(?:^|\s)(RTS|RMK)\//;

function remarksOf(value: string | undefined): string | null {
  const remarks = value?.trim() ?? "";

  return remarks === "" || remarks === "0" ? null : remarks;
}

export function parseOaklandMessage(text: string): ParsedTrack[] {
  const message = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\(\s*/, "")
    .replace(/\s*\)$/, "");
  const header = HEADER.exec(message);

  if (!header) {
    return [];
  }

  const [, identifier, body] = header;
  const firstSection = body.search(SECTION);
  const route = (firstSection === -1 ? body : body.slice(0, firstSection)).trim();
  const remarks = /(?:^|\s)RMK\/(.*)$/.exec(body)?.[1];

  if (route === "") {
    return [];
  }

  return [{ identifier, route: route.split(" "), remarks: remarksOf(remarks) }];
}
