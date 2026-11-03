import { NmsNotConfiguredError } from "./errors";
import { FixDirectoryClient } from "./fix-directory.client";
import { handleRequest } from "./handler";
import { Logger } from "./logger";
import { NmsClient } from "./nms.client";
import { PacotsSource } from "./pacots.source";
import { OceanicTracksService } from "./tracks.service";

const DEFAULT_NMS_HOST = "https://api-nms.aim.faa.gov";

const DEFAULT_FIX_DIRECTORY_HOST = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const logger = new Logger("TracksFunction");

let service: OceanicTracksService | undefined;

function resolveService(): OceanicTracksService {
  if (!service) {
    const clientId = process.env.NMS_CLIENT_ID;
    const clientSecret = process.env.NMS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new NmsNotConfiguredError();
    }

    const nmsHost = process.env.NMS_API_HOST || DEFAULT_NMS_HOST;
    const fixDirectoryHost = process.env.FIX_DIRECTORY_HOST || DEFAULT_FIX_DIRECTORY_HOST;
    const userAgent = process.env.OCEANIC_TRACKS_USER_AGENT || DEFAULT_USER_AGENT;

    service = new OceanicTracksService(
      new PacotsSource(new NmsClient({ host: nmsHost, clientId, clientSecret, userAgent })),
      new FixDirectoryClient({ host: fixDirectoryHost, userAgent }),
    );

    logger.log(`Cold start. Reading NOTAMs from ${nmsHost} and fixes from ${fixDirectoryHost}.`);
  }

  return service;
}

export function resetService(): void {
  service = undefined;
}

export async function main(): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const { statusCode, body } = await handleRequest(resolveService);

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body,
  };
}
