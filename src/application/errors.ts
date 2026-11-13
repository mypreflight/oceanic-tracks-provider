export abstract class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class TrackSourceUnavailableError extends ApplicationError {
  constructor() {
    super("The track message source is unavailable.");
  }
}

export class FixDirectoryUnavailableError extends ApplicationError {
  constructor() {
    super("The fix directory is unavailable.");
  }
}

export class TrackSourceNotConfiguredError extends ApplicationError {
  constructor() {
    super("The track message source is not configured.");
  }
}

export class NatFeedUnavailableError extends ApplicationError {
  constructor() {
    super("The North Atlantic track feed is unavailable.");
  }
}
