const rawApiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const API_URL =
  rawApiUrl && !rawApiUrl.includes("localhost")
    ? rawApiUrl
    : "https://niatawards-backend.vercel.app";
const ADMIN_SECRET =
  (import.meta.env.VITE_ADMIN_SECRET || "").trim() || "niat_admin_2026_secret";

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (!contentType.includes("application/json") || !res.ok) {
    throw new ApiError(
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
        (res.ok ? "Could not reach the server. Please try again." : `Request failed (${res.status})`),
      data && typeof data === "object" && "code" in data ? String(data.code) : undefined
    );
  }
  return data as T;
}

const asArray = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : []);

const adminHeaders = () => ({ "x-admin-secret": ADMIN_SECRET });

export const apiSendOtp = (phone: string) =>
  request<{ success: boolean }>("/api/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const apiVerifyOtp = (phone: string, otp: string) =>
  request<{ success: boolean }>("/api/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

export const createNomination = async (payload: Record<string, unknown>) => {
  const data = await request<Record<string, unknown>>("/api/nominations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data?.id) {
    throw new ApiError("Nomination was not saved. Please try again.");
  }
  return data;
};

export const getNominations = async (status = "shortlisted,winner") =>
  asArray(await request(`/api/nominations?status=${encodeURIComponent(status)}`));

export const getVotes = async (voterPhone?: string) => {
  const q = voterPhone ? `?voter_phone=${encodeURIComponent(voterPhone)}` : "";
  return asArray(await request(`/api/votes${q}`));
};

export const createVote = (nomination_id: string, voter_phone: string) =>
  request("/api/votes", {
    method: "POST",
    body: JSON.stringify({ nomination_id, voter_phone }),
  });

export const adminGetNominations = async () =>
  asArray(await request("/api/admin/nominations", { headers: adminHeaders() }));

export const adminGetVotes = async () =>
  asArray(await request("/api/admin/votes", { headers: adminHeaders() }));

export const adminUpdateNomination = (id: string, payload: Record<string, unknown>) =>
  request(`/api/admin/nominations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
