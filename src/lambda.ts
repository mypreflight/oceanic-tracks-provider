import { timingSafeEqual } from "node:crypto";
import { TrackSourceNotConfiguredError } from "./application/errors";
import { ListCurrentTracks } from "./application/list-current-tracks";
import { NatMessages } from "./application/nat-messages";
import { PacotsMessages } from "./application/pacots-messages";
import { FixDirectoryClient } from "./infra/fix-directory/fix-directory.client";
import { handleRequest } from "./infra/http/handler";
import { NatFeedClient } from "./infra/nat/nat-feed.client";
import { NmsClient } from "./infra/nms/nms.client";
import { Logger } from "./shared/logger";

export type FunctionUrlEvent = {
  rawPath: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  requestContext: { http: { method: string } };
};

export type FunctionUrlResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const ROUTE = "/tracks";

const BEARER = /^Bearer +(.+)$/i;

const JSON_HEADERS = { "Content-Type": "application/json" };

const DEFAULT_NMS_HOST = "https://api-nms.aim.faa.gov";

const DEFAULT_NAT_FEED_HOST = "https://nms.aim.faa.gov";

const DEFAULT_FIX_DIRECTORY_HOST = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const logger = new Logger("TracksLambda");

let useCase: ListCurrentTracks | undefined;

function resolveUseCase(): ListCurrentTracks {
  if (!useCase) {
    const clientId = process.env.NMS_CLIENT_ID;
    const clientSecret = process.env.NMS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new TrackSourceNotConfiguredError();
    }

    const nmsHost = process.env.NMS_API_HOST || DEFAULT_NMS_HOST;
    const natFeedHost = process.env.NAT_FEED_HOST || DEFAULT_NAT_FEED_HOST;
    const fixDirectoryHost = process.env.FIX_DIRECTORY_HOST || DEFAULT_FIX_DIRECTORY_HOST;
    const userAgent = process.env.OCEANIC_TRACKS_USER_AGENT || DEFAULT_USER_AGENT;

    useCase = new ListCurrentTracks(
      new PacotsMessages(new NmsClient({ host: nmsHost, clientId, clientSecret, userAgent })),
      new NatMessages(new NatFeedClient({ host: natFeedHost, userAgent })),
      new FixDirectoryClient({ host: fixDirectoryHost, userAgent }),
    );

    logger.log(
      `Cold start. Reading NOTAMs from ${nmsHost}, North Atlantic tracks from ${natFeedHost} and fixes from ${fixDirectoryHost}.`,
    );
  }

  return useCase;
}

export function resetUseCase(): void {
  useCase = undefined;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): FunctionUrlResult {
  return {
    statusCode: status,
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify({ error: { code, message, status } }),
  };
}

function authorised(authorization: string | undefined): boolean {
  const secret = process.env.OCEANIC_TRACKS_FUNCTION_SECRET;

  if (!secret) {
    logger.warn("Refused a request: OCEANIC_TRACKS_FUNCTION_SECRET is not set.");

    return false;
  }

  const token = authorization === undefined ? undefined : BEARER.exec(authorization)?.[1];

  if (token === undefined) {
    return false;
  }

  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  if (!authorised(event.headers?.authorization)) {
    return errorResponse(401, "UNAUTHORIZED", "The Authorization header is missing or wrong.", {
      "WWW-Authenticate": "Bearer",
    });
  }

  if (event.rawPath !== ROUTE) {
    return errorResponse(404, "NOT_FOUND", `The function answers on ${ROUTE} only.`);
  }

  const { statusCode, body } = await handleRequest(resolveUseCase);

  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
