import "server-only";
import { unstable_rethrow } from "next/navigation";

// Errors use the same shape as the Anthropic API ({ type: "error", error: { type, message } }),
// so the extension handles every failure the same way.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  unstable_rethrow(err); // let Next.js's own control-flow signals through
  if (err instanceof HttpError) {
    return Response.json({ type: "error", error: { type: err.code, message: err.message } }, { status: err.status });
  }
  console.error(err);
  return Response.json({ type: "error", error: { type: "api_error", message: "Something went wrong. Please try again." } }, { status: 500 });
}

// Wraps a route handler so thrown HttpErrors become JSON responses.
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_request_error", "The request body must be JSON.");
  }
}

export function str(value: unknown, max: number, field: string, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, "invalid_request_error", `${field} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new HttpError(400, "invalid_request_error", `${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new HttpError(400, "invalid_request_error", `${field} is required.`);
  return trimmed.slice(0, max);
}
