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

export const apiSendOtp = (phone: string, resend = false) =>
  request<{ success: boolean; message?: string }>("/api/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone, ...(resend ? { resend: true } : {}) }),
  });

export const apiVerifyOtp = (phone: string, otp: string, draftToken?: string) =>
  request<{ success: boolean; message?: string; verified?: boolean }>("/api/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      phone,
      otp,
      ...(draftToken ? { draft_token: draftToken } : {}),
    }),
  });

export type NominationDraft = Record<string, unknown> & {
  id: string;
  draft_token?: string;
};

export const createNominationDraft = async (payload: Record<string, unknown>) => {
  const data = await request<NominationDraft>("/api/nominations/draft", {
    method: "POST",
    body: JSON.stringify({ ...payload, ...getUtmParams() }),
  });
  if (!data?.id || !data.draft_token) {
    throw new ApiError("Could not start the nomination. Please try again.");
  }
  return data;
};

export const updateNominationDraft = async (payload: Record<string, unknown>) => {
  const data = await request<NominationDraft>("/api/nominations/draft", {
    method: "PATCH",
    body: JSON.stringify({ ...payload, ...getUtmParams() }),
  });
  if (!data?.id) {
    throw new ApiError("Could not save your details. Please try again.");
  }
  return data;
};

export const getNominationDraft = async (draftToken: string) => {
  const token = encodeURIComponent(draftToken.trim());
  const data = await request<NominationDraft>(`/api/nominations/draft?draft_token=${token}`);
  if (!data?.id) {
    throw new ApiError("Could not load your saved details. Please try again.");
  }
  return data;
};

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

export const adminDeleteNomination = (id: string) =>
  request<{ success: boolean; id: string }>(`/api/admin/nominations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(),
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

export type WhatsAppOpsMeta = {
  enabled: boolean;
  apiKeyConfigured: boolean;
  sourceConfigured: boolean;
  srcNameConfigured: boolean;
  webhookSecretConfigured: boolean;
  cronSecretConfigured: boolean;
  templateEnvKeys: string[];
  envHints: { key: string; configured: boolean }[];
  webhookUrl: string;
  cronEndpoint: string;
  optOuts: number;
  openGroups: number;
};

export type WhatsAppAttemptStage = {
  attemptNumber: number;
  title: string;
  subtitle: string;
  targeted: number;
  submitted: number;
  delivered: number;
  read: number;
  failed: number;
  inFlight: number;
  excluded: number;
  successRate: number;
};

export type WhatsAppDayTotals = {
  recipients: number;
  accepted: number;
  delivered: number;
  read: number;
  permanentFailed: number;
  transientFailed: number;
  excluded: number;
  undelivered: number;
  exhausted: number;
  inFlight: number;
};

export type WhatsAppOpsOverview = {
  date: string;
  byAttempt: WhatsAppAttemptStage[];
  totals: WhatsAppDayTotals;
  failureBuckets: { reason: string; count: number }[];
  trend: { date: string; recipients: number; delivered: number; permanent: number; transient: number }[];
  nextPromotionDueAt: string | null;
  kinds: string[];
  syncedAt: string;
};

export type WhatsAppOpsMessage = {
  id: string;
  retryGroupId: string | null;
  phone: string;
  messageKind: string;
  attemptNumber: number;
  status: string;
  source: string;
  retrySource: string;
  retryEligible: boolean;
  retryExclusionReason: string | null;
  terminalFailureKind: string | null;
  errorMessage: string | null;
  webhookErrorCode: string | null;
  templateIdEnvKey: string | null;
  templateId: string | null;
  params: string[];
  gupshupMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
};

export const adminGetWhatsAppMeta = () =>
  request<WhatsAppOpsMeta>("/api/admin/whatsapp-ops/meta", { headers: adminHeaders() });

export const adminGetWhatsAppOverview = (date?: string, kind?: string) => {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (kind) params.set("kind", kind);
  const q = params.toString();
  return request<WhatsAppOpsOverview>(
    `/api/admin/whatsapp-ops/overview${q ? `?${q}` : ""}`,
    { headers: adminHeaders() }
  );
};

export const adminGetWhatsAppMessages = (opts: {
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  status?: string;
  kind?: string;
  attemptNumber?: string;
  phone?: string;
  failed?: boolean;
}) => {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.status) params.set("status", opts.status);
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.attemptNumber) params.set("attemptNumber", opts.attemptNumber);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.failed) params.set("failed", "1");
  const q = params.toString();
  return request<{ date: string; from?: string; to?: string; page: number; limit: number; total: number; items: WhatsAppOpsMessage[] }>(
    `/api/admin/whatsapp-ops/messages${q ? `?${q}` : ""}`,
    { headers: adminHeaders() }
  );
};

export type WhatsAppRetryGroupRow = {
  id: string;
  messageKind: string;
  status: string;
  trigger: string;
  nextPromotionDueAt: string | null;
  attempt2TriggeredAt: string | null;
  attempt3TriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppWebhookRow = {
  id: string;
  type: string;
  eventStage: string | null;
  gsId: string | null;
  providerId: string | null;
  destination: string | null;
  sourcePhone: string | null;
  inboundText: string | null;
  matchedMessageEventId: string | null;
  payloadSnippet: string | null;
  createdAt: string;
};

export const adminGetWhatsAppRetryGroups = (opts: { date?: string; page?: number; status?: string }) => {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.status) params.set("status", opts.status);
  const q = params.toString();
  return request<{ total: number; page: number; items: WhatsAppRetryGroupRow[] }>(
    `/api/admin/whatsapp-ops/retry-groups${q ? `?${q}` : ""}`,
    { headers: adminHeaders() }
  );
};

export const adminGetWhatsAppWebhooks = (opts: { date?: string; page?: number; type?: string }) => {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.type) params.set("type", opts.type);
  const q = params.toString();
  return request<{ total: number; page: number; items: WhatsAppWebhookRow[] }>(
    `/api/admin/whatsapp-ops/webhooks${q ? `?${q}` : ""}`,
    { headers: adminHeaders() }
  );
};

export const adminGetWhatsAppCron = () =>
  request<{
    cronSecretConfigured: boolean;
    endpoint: string;
    openGroups: number;
    dueNow: number;
    exhaustedToday: number;
    nextPromotionDueAt: string | null;
  }>("/api/admin/whatsapp-ops/cron", { headers: adminHeaders() });

export const adminWhatsAppTestSend = (payload: { phone: string; kind?: string; params?: string[] }) =>
  request<{ success: boolean; eventId: string | null; status: string; error?: string }>(
    "/api/admin/whatsapp-ops/actions/test-send",
    {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    }
  );

export const adminWhatsAppResend = (id: string) =>
  request<{ success: boolean; eventId: string | null; status: string; error?: string }>(
    "/api/admin/whatsapp-ops/actions/resend",
    {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ id }),
    }
  );
