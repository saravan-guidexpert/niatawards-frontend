const API_URL = (import.meta.env.VITE_API_URL ?? "https://niatawards-backend.vercel.app").replace(/\/$/, "");
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? "niat_admin_2026_secret";

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || "Request failed", data.code);
  }
  return data as T;
}

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

export const createNomination = (payload: Record<string, unknown>) =>
  request("/api/nominations", { method: "POST", body: JSON.stringify(payload) });

export const getNominations = (status = "shortlisted,winner") =>
  request<any[]>(`/api/nominations?status=${encodeURIComponent(status)}`);

export const getVotes = (voterPhone?: string) => {
  const q = voterPhone ? `?voter_phone=${encodeURIComponent(voterPhone)}` : "";
  return request<any[]>(`/api/votes${q}`);
};

export const createVote = (nomination_id: string, voter_phone: string) =>
  request("/api/votes", {
    method: "POST",
    body: JSON.stringify({ nomination_id, voter_phone }),
  });

export const adminGetNominations = () =>
  request<any[]>("/api/admin/nominations", { headers: adminHeaders() });

export const adminGetVotes = () =>
  request<any[]>("/api/admin/votes", { headers: adminHeaders() });

export const adminUpdateNomination = (id: string, payload: Record<string, unknown>) =>
  request(`/api/admin/nominations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
