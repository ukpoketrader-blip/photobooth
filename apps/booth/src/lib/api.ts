/** Empty = same-origin; Next.js rewrites /api/* to the Hono server (see next.config.ts). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function getApiBaseForDisplay(): string {
  return API_URL || "(proxied via Next.js → http://localhost:3002)";
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const res = await fetch(getApiUrl(path), { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}
