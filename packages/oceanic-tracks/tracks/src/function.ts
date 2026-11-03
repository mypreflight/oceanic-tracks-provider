import { TrackSourceNotConfiguredError } from "./application/errors";
import { ListCurrentTracks } from "./application/list-current-tracks";
import { PacotsMessages } from "./application/pacots-messages";
import { FixDirectoryClient } from "./infra/fix-directory/fix-directory.client";
import { handleRequest } from "./infra/http/handler";
import { NmsClient } from "./infra/nms/nms.client";
import { Logger } from "./shared/logger";

const DEFAULT_NMS_HOST = "https://api-nms.aim.faa.gov";

const DEFAULT_FIX_DIRECTORY_HOST = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const logger = new Logger("TracksFunction");

let useCase: ListCurrentTracks | undefined;

function resolveUseCase(): ListCurrentTracks {
  if (!useCase) {
    const clientId = process.env.NMS_CLIENT_ID;
    const clientSecret = process.env.NMS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new TrackSourceNotConfiguredError();
    }

    const nmsHost = process.env.NMS_API_HOST || DEFAULT_NMS_HOST;
    const fixDirectoryHost = process.env.FIX_DIRECTORY_HOST || DEFAULT_FIX_DIRECTORY_HOST;
    const userAgent = process.env.OCEANIC_TRACKS_USER_AGENT || DEFAULT_USER_AGENT;

    useCase = new ListCurrentTracks(
      new PacotsMessages(new NmsClient({ host: nmsHost, clientId, clientSecret, userAgent })),
      new FixDirectoryClient({ host: fixDirectoryHost, userAgent }),
    );

    logger.log(`Cold start. Reading NOTAMs from ${nmsHost} and fixes from ${fixDirectoryHost}.`);
  }

  return useCase;
}

export function resetUseCase(): void {
  useCase = undefined;
}

export async function main(): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const { statusCode, body } = await handleRequest(resolveUseCase);

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body,
  };
}
