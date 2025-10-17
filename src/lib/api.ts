 export type JsonObject = { [k: string]: unknown };
 export type ApiError = { code: string; message: string };

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    credentials: 'include',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err: ApiError | undefined = data?.error;
    throw new Error(err ? `${err.code}: ${err.message}` : `HTTP ${res.status}`);
  }
  return data as T;
}
