/**
 * Shared helper for API routes: builds a JSON Response with Content-Type header.
 * Used by /api/generations and /api/generations/[id] for consistent response format.
 */
export function json(body: unknown, status: number, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
}
