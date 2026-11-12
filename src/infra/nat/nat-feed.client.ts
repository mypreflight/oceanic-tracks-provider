import { NatFeedUnavailableError } from "../../application/errors";
import type { NatMessagePart, NatMessageSource } from "../../application/port/nat-message-source";
import { Logger } from "../../shared/logger";
import { fetchWithRetry } from "../http/fetch-with-retry";

const FEED_PATH = "/datanat/nat.json";

type FeedEntry = {
  notam_number_formatted?: unknown;
  icao_id?: unknown;
  part_no?: unknown;
  start_datetime?: unknown;
  end_datetime?: unknown;
  condition_message?: unknown;
};

export type NatFeedClientOptions = {
  host: string;
  userAgent: string;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toPart(entry: FeedEntry): NatMessagePart[] {
  const number = text(entry.notam_number_formatted);
  const location = text(entry.icao_id);
  const part = Number(entry.part_no ?? 1);
  const validFrom = text(entry.start_datetime);
  const validTo = text(entry.end_datetime);
  const message = text(entry.condition_message);

  if (!number || !location || !Number.isInteger(part) || !validFrom || !validTo || !message) {
    return [];
  }

  return [{ number, location, part, validFrom, validTo, text: message }];
}

export class NatFeedClient implements NatMessageSource {
  private readonly logger = new Logger(NatFeedClient.name);
  private readonly host: string;

  constructor(private readonly options: NatFeedClientOptions) {
    this.host = options.host.replace(/\/+$/, "");
  }

  async list(): Promise<NatMessagePart[]> {
    const response = await fetchWithRetry(
      `${this.host}${FEED_PATH}`,
      { headers: { Accept: "application/json", "User-Agent": this.options.userAgent } },
      this.logger,
      () => new NatFeedUnavailableError(),
    );
    const body = (await response.json().catch(() => null)) as unknown;

    if (!response.ok || !Array.isArray(body)) {
      this.logger.warn(`The North Atlantic track feed answered ${response.status} without a list of messages.`);

      throw new NatFeedUnavailableError();
    }

    const parts = (body as FeedEntry[]).flatMap(toPart);
    this.logger.debug(`Read ${parts.length} North Atlantic track message parts.`);

    return parts;
  }
}
