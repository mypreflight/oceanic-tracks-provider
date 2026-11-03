export abstract class ProviderError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NmsUnavailableError extends ProviderError {
  readonly status = 502;
  readonly code = "NMS_UNAVAILABLE";

  constructor() {
    super("The FAA NOTAM service is unavailable.");
  }
}

export class FixDirectoryUnavailableError extends ProviderError {
  readonly status = 502;
  readonly code = "FIX_DIRECTORY_UNAVAILABLE";

  constructor() {
    super("The FAA fix directory is unavailable.");
  }
}

export class NmsNotConfiguredError extends ProviderError {
  readonly status = 500;
  readonly code = "NMS_NOT_CONFIGURED";

  constructor() {
    super("The FAA NOTAM service credentials are not configured.");
  }
}
