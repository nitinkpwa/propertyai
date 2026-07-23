/**
 * Client API fetch helper — never serve stale authenticated/API responses.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
    },
  });
}
