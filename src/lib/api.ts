import { getUtmParams } from "./utm";
import { API_URL } from "./apiBase";
import { clearAdminSession, getAdminToken, type AdminRole, type PanelPermission } from "./adminSession";

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
  if (res.status === 401 && path.startsWith("/api/admin") && path !== "/api/admin/login") {
    clearAdminSession();
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

const asArray = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : []);

const adminHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export type FunnelStage = {
  id: "otp_requested" | "otp_verified" | "form_step1" | "submitted" | "shortlisted" | "winners";
  label: string;
  hint: string;
  count: number;
};

export type FunnelStats = {
  stages: FunnelStage[];
  extras: {
    withPhoto: number;
    pending: number;
    rejected: number;
    students: number;
    teachers: number;
    submitted: number;
  };
};

export const adminGetFunnel = (date?: string) =>
  request<FunnelStats>(
    `/api/admin/funnel${date ? `?date=${encodeURIComponent(date)}` : ""}`,
    { headers: adminHeaders() }
  );

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

export type DigitalCampaignLink = {
  id: string;
  created_at: string;
  standard: string;
  channel: string;
  state: string;
  language: string;
  audience: string;
  landing_diff: string;
  creative_type: string;
  creative: string;
  ad_format: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  destination: string;
  views: number;
  last_click_at: string | null;
};

export const adminGetDigitalCampaignLinks = async () =>
  asArray<DigitalCampaignLink>(
    await request("/api/admin/digital-campaign-links", { headers: adminHeaders() })
  );

export const adminCreateDigitalCampaignLink = (payload: {
  channel: string;
  state: string;
  language: string;
  audience?: string;
  landing_diff?: string;
  creative_type: string;
  creative?: string;
  utm_medium: string;
}) =>
  request<DigitalCampaignLink>("/api/admin/digital-campaign-links", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });

export type AdminAccount = {
  id: string;
  created_at: string;
  username: string;
  name: string;
  role: AdminRole;
  permissions: PanelPermission[];
  active: boolean;
};

export const adminLogin = (username: string, password: string) =>
  request<{
    token: string;
    user: {
      id: string;
      username: string;
      name: string;
      role: AdminRole;
      permissions: PanelPermission[];
    };
  }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const adminLogoutApi = () =>
  request<{ success: boolean }>("/api/admin/logout", {
    method: "POST",
    headers: adminHeaders(),
  });

export const adminGetMe = () =>
  request<{
    user: {
      id: string;
      username: string;
      name: string;
      role: AdminRole;
      permissions: PanelPermission[];
    };
  }>("/api/admin/me", { headers: adminHeaders() });

export const adminGetUsers = async () =>
  asArray<AdminAccount>(await request("/api/admin/users", { headers: adminHeaders() }));

export const adminCreateUser = (payload: {
  username: string;
  password: string;
  name?: string;
  permissions: PanelPermission[];
}) =>
  request<AdminAccount>("/api/admin/users", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });

export const adminUpdateUser = (
  id: string,
  payload: {
    name?: string;
    password?: string;
    permissions?: PanelPermission[];
    active?: boolean;
  }
) =>
  request<AdminAccount>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });

export const adminDeleteUser = (id: string) =>
  request<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
