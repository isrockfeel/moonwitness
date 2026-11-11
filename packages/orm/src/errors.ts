export class ConflictError extends Error {
  readonly code = "CONFLICT_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
