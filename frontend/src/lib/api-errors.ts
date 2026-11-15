interface ProblemDetailBody {
  detail?: unknown;
}

/**
 * Best-effort human message from an RFC 7807 problem+json error response.
 *
 * The generated fetch client throws the parsed response body on a non-ok
 * status, so the body itself is the error value (see openapi-ts / ADR-0009).
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error !== null && typeof error === 'object' && 'detail' in error) {
    const body = error as ProblemDetailBody;
    if (typeof body.detail === 'string' && body.detail.length > 0) {
      return body.detail;
    }
  }
  return fallback;
}
