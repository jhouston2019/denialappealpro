export class ApiError extends Error {
  response: { status: number; data: unknown };
  constructor(message: string, response: { status: number; data: unknown }) {
    super(message);
    this.name = "ApiError";
    this.response = response;
  }
}
