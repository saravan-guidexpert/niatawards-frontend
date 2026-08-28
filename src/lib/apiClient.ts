import { API_URL } from "./apiBase";

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export type ApiRequestOptions = RequestInit & {
  onUnauthorized?: () => void;
};

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { onUnauthorized, headers, ...init } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (res.status === 401) {
    onUnauthorized?.();
  }
  if (!contentType.includes("application/json") || !res.ok) {
    throw new ApiError(
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
        (res.ok ? "Could not reach the server. Please try again." : `Request failed (${res.status})`),
      data && typeof data === "object" && "code" in data ? String(data.code) : undefined
    );
  }
  return data as T;
}
