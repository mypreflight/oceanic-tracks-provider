import { describeError, type Logger } from "./logger";

const TIMEOUT_MS = 30_000;

const RETRIES = 1;

const BACKOFF_MS = 500;

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  logger: Logger,
  unreachable: () => Error,
): Promise<Response> {
  const target = url.split("?")[0];

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      if (attempt === RETRIES) {
        logger.error(`Could not reach ${target} in ${RETRIES + 1} attempts: ${describeError(error)}`);

        throw unreachable();
      }

      const backoff = BACKOFF_MS * 2 ** attempt;
      logger.warn(
        `Attempt ${attempt + 1} to reach ${target} failed: ${describeError(error)}. Retrying in ${backoff}ms.`,
      );

      await delay(backoff);
    }
  }

  throw unreachable();
}
