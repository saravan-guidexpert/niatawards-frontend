import { getUtmParams } from "./utm";
import { API_URL } from "./apiBase";
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
    body: JSON.stringify({ ...payload, ...getUtmParams() }),
  });
  if (!data?.id) {
    throw new ApiError("Nomination was not saved. Please try again.");
  }
  return data;
};

export const uploadNominationPhoto = async (file: File) => {
  const body = new FormData();
  body.append("photo", file);
  const res = await fetch(`${API_URL}/api/uploads/photo`, {
    method: "POST",
    body,
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};
  if (!contentType.includes("application/json") || !res.ok) {
    throw new ApiError(
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
        (res.ok ? "Could not upload the photo. Please try again." : `Request failed (${res.status})`)
    );
  }
  const photoUrl =
    data && typeof data === "object" && "photo_url" in data ? String(data.photo_url) : "";
  if (!photoUrl) {
    throw new ApiError("Photo upload did not return a URL. Please try again.");
  }
  return photoUrl;
};

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

export type PromoLink = {
  id: string;
  created_at: string;
  influencer_name: string;
  influencer_slug: string;
  platform: string;
  campaign: string;
  destination: string;
  views: number;
  last_click_at: string | null;
};

export const adminGetPromoLinks = async () =>
  asArray<PromoLink>(await request("/api/admin/promo-links", { headers: adminHeaders() }));

export const adminCreatePromoLink = (payload: {
  influencer_name: string;
  platform: string;
  campaign: string;
  destination: string;
}) =>
  request<PromoLink>("/api/admin/promo-links", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
