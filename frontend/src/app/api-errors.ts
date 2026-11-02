import { HttpErrorResponse } from '@angular/common/http';

interface ProblemDetailBody {
  detail?: unknown;
}

/** Best-effort human message from an RFC 7807 problem+json error response. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetailBody | null;
    if (body && typeof body.detail === 'string' && body.detail.length > 0) {
      return body.detail;
    }
  }
  return fallback;
}
