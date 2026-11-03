import { ProviderError } from "./errors";
import { describeError, Logger, stackOf } from "./logger";
import type { OceanicTracksService } from "./tracks.service";

export type HandlerResponse = {
  statusCode: number;
  body: unknown;
};

const logger = new Logger("TracksHandler");

export async function handleRequest(resolveService: () => OceanicTracksService): Promise<HandlerResponse> {
  const startedAt = Date.now();

  try {
    const tracks = await resolveService().current();
    logger.log(`Served ${tracks.tracks.length} tracks in ${Date.now() - startedAt}ms.`);

    return { statusCode: 200, body: tracks };
  } catch (error) {
    if (error instanceof ProviderError) {
      logger.warn(`Track lookup failed after ${Date.now() - startedAt}ms with ${error.status} ${error.code}.`);

      return {
        statusCode: error.status,
        body: { error: { code: error.code, message: error.message, status: error.status } },
      };
    }

    logger.error(`Track lookup crashed after ${Date.now() - startedAt}ms: ${describeError(error)}`, stackOf(error));

    return {
      statusCode: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "Oceanic track lookup failed.", status: 500 } },
    };
  }
}
