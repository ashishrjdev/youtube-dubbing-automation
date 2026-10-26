/**
 * Client-facing copy for backend failures (LEGAL-04).
 * Never surface the response body for 5xx — it must not include internals.
 */
export const BACKEND_SERVER_ERROR_MESSAGE = "Something went wrong, please try again";

/** True for gateway / server failures, including our Next proxy's 502. */
export function isBackendServerError(status: number): boolean {
  return status >= 500;
}

/**
 * Friendly message for a failed backend Response. For 5xx returns the shared
 * copy without reading the body. Returns undefined for non-5xx so callers can
 * handle 4xx themselves.
 */
export function messageForBackendFailure(response: Pick<Response, "status">): string | undefined {
  if (isBackendServerError(response.status)) return BACKEND_SERVER_ERROR_MESSAGE;
  return undefined;
}
