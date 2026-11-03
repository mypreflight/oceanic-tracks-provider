import { NmsUnavailableError } from "./errors";
import { delay, fetchWithRetry } from "./http";
import { describeError, Logger } from "./logger";
import type { NmsNotam } from "./types";

const REQUEST_SPACING_MS = 1_100;

const TOKEN_RENEWAL_MARGIN_MS = 60_000;

const DEFAULT_TOKEN_LIFETIME_S = 1_799;

export type NmsClientOptions = {
  host: string;
  clientId: string;
  clientSecret: string;
  userAgent: string;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: string | number;
};

type NmsFeature = {
  properties?: {
    coreNOTAMData?: {
      notam?: {
        number?: string;
        type?: string;
        effectiveStart?: string;
        effectiveEnd?: string;
        text?: string;
      };
    };
  };
};

type NotamsResponse = {
  status?: string;
  errors?: { code?: string; message?: string }[];
  data?: { geojson?: NmsFeature[] };
};

export class NmsClient {
  private readonly logger = new Logger(NmsClient.name);
  private readonly host: string;
  private token: { value: string; expiresAt: number } | null = null;
  private lastRequestAt = 0;

  constructor(private readonly options: NmsClientOptions) {
    this.host = options.host.replace(/\/+$/, "");
  }

  async findNotams(location: string, freeText: string): Promise<NmsNotam[]> {
    const query = new URLSearchParams({ location, freeText }).toString();
    const url = `${this.host}/nmsapi/v1/notams?${query}`;
    let response = await this.requestNotams(url, await this.accessToken());

    if (response.status === 401) {
      this.logger.warn(`The NOTAM service refused the access token for ${location}. Renewing it once.`);
      this.token = null;
      response = await this.requestNotams(url, await this.accessToken());
    }

    const body = (await response.json().catch(() => null)) as NotamsResponse | null;

    if (response.status === 400 && body?.errors?.some((error) => error.message?.startsWith("No data found"))) {
      return [];
    }

    if (!response.ok || body === null) {
      const reason = response.status === 429 ? "rate limited the request" : `answered ${response.status}`;
      this.logger.warn(`The NOTAM service ${reason} for ${location}.`);

      throw new NmsUnavailableError();
    }

    const notams = (body.data?.geojson ?? []).flatMap((feature) => {
      const notam = feature.properties?.coreNOTAMData?.notam;

      if (!notam?.number || !notam.text || !notam.effectiveStart || !notam.effectiveEnd) {
        return [];
      }

      return [
        {
          number: notam.number,
          type: notam.type ?? "N",
          validFrom: notam.effectiveStart,
          validTo: notam.effectiveEnd,
          text: notam.text,
        },
      ];
    });

    this.logger.debug(`Read ${notams.length} NOTAMs for ${location} matching "${freeText}".`);

    return notams;
  }

  private async requestNotams(url: string, accessToken: string): Promise<Response> {
    await delay(Math.max(0, this.lastRequestAt + REQUEST_SPACING_MS - Date.now()));
    this.lastRequestAt = Date.now();

    return fetchWithRetry(
      url,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          nmsResponseFormat: "GEOJSON",
          "User-Agent": this.options.userAgent,
        },
      },
      this.logger,
      () => new NmsUnavailableError(),
    );
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }

    const credentials = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64");
    const response = await fetchWithRetry(
      `${this.host}/v1/auth/token`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.options.userAgent,
        },
        body: "grant_type=client_credentials",
      },
      this.logger,
      () => new NmsUnavailableError(),
    );
    const body = (await response.json().catch((error: unknown) => {
      this.logger.warn(`Could not read the token response: ${describeError(error)}`);

      return null;
    })) as (TokenResponse & { ErrorCode?: string }) | null;

    if (!response.ok || !body?.access_token) {
      this.logger.warn(`The NOTAM service refused a token with ${response.status} ${body?.ErrorCode ?? "unknown"}.`);

      throw new NmsUnavailableError();
    }

    const lifetimeS = Number(body.expires_in ?? DEFAULT_TOKEN_LIFETIME_S);
    const lifetimeMs = (Number.isFinite(lifetimeS) ? lifetimeS : DEFAULT_TOKEN_LIFETIME_S) * 1000;

    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + Math.max(0, lifetimeMs - TOKEN_RENEWAL_MARGIN_MS),
    };

    return this.token.value;
  }
}
