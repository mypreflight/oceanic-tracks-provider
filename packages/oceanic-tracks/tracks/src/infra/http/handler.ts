import {
  type ApplicationError,
  FixDirectoryUnavailableError,
  TrackSourceNotConfiguredError,
  TrackSourceUnavailableError,
} from "../../application/errors";
import type { ListCurrentTracks } from "../../application/list-current-tracks";
import { describeError, Logger, stackOf } from "../../shared/logger";

export type HandlerResponse = {
  statusCode: number;
  body: unknown;
};

type ErrorResponse = {
  error: new () => ApplicationError;
  status: number;
  code: string;
  message: string;
};

const ERROR_RESPONSES: ErrorResponse[] = [
  {
    error: TrackSourceUnavailableError,
    status: 502,
    code: "NMS_UNAVAILABLE",
    message: "The FAA NOTAM service is unavailable.",
  },
  {
    error: FixDirectoryUnavailableError,
    status: 502,
    code: "FIX_DIRECTORY_UNAVAILABLE",
    message: "The FAA fix directory is unavailable.",
  },
  {
    error: TrackSourceNotConfiguredError,
    status: 500,
    code: "NMS_NOT_CONFIGURED",
    message: "The FAA NOTAM service credentials are not configured.",
  },
];

const logger = new Logger("TracksHandler");

function errorBody(status: number, code: string, message: string): HandlerResponse {
  return { statusCode: status, body: { error: { code, message, status } } };
}

export async function handleRequest(resolveUseCase: () => ListCurrentTracks): Promise<HandlerResponse> {
  const startedAt = Date.now();

  try {
    const tracks = await resolveUseCase().execute();
    logger.log(`Served ${tracks.tracks.length} tracks in ${Date.now() - startedAt}ms.`);

    return { statusCode: 200, body: tracks };
  } catch (error) {
    const known = ERROR_RESPONSES.find((response) => error instanceof response.error);

    if (known) {
      logger.warn(`Track lookup failed after ${Date.now() - startedAt}ms with ${known.status} ${known.code}.`);

      return errorBody(known.status, known.code, known.message);
    }

    logger.error(`Track lookup crashed after ${Date.now() - startedAt}ms: ${describeError(error)}`, stackOf(error));

    return errorBody(500, "INTERNAL_ERROR", "Oceanic track lookup failed.");
  }
}
