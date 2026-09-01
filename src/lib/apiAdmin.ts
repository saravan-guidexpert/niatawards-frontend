import { clearAdminSession, getAdminToken, type AdminRole, type PanelPermission } from "./adminSession";
import { request } from "./apiClient";

const asArray = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : []);

const adminHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const adminRequest = <T>(path: string, options: RequestInit = {}) =>
  request<T>(path, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.headers ?? {}),
    },
    onUnauthorized: clearAdminSession,
  });

export const adminGetNominations = async () =>
  asArray(await adminRequest("/api/admin/nominations"));

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
  adminRequest<FunnelStats>(
    `/api/admin/funnel${date ? `?date=${encodeURIComponent(date)}` : ""}`
  );

export const adminUpdateNomination = (id: string, payload: Record<string, unknown>) =>
  adminRequest(`/api/admin/nominations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const adminDeleteNomination = (id: string) =>
  adminRequest<{ success: boolean; id: string }>(`/api/admin/nominations/${encodeURIComponent(id)}`, {
    method: "DELETE",
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
  asArray<PromoLink>(await adminRequest("/api/admin/promo-links"));

export const adminCreatePromoLink = (payload: {
  influencer_name: string;
  platform: string;
  campaign: string;
  destination: string;
}) =>
  adminRequest<PromoLink>("/api/admin/promo-links", {
    method: "POST",
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
    await adminRequest("/api/admin/digital-campaign-links")
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
  adminRequest<DigitalCampaignLink>("/api/admin/digital-campaign-links", {
    method: "POST",
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
  adminRequest<{ success: boolean }>("/api/admin/logout", {
    method: "POST",
  });

export const adminGetMe = () =>
  adminRequest<{
    user: {
      id: string;
      username: string;
      name: string;
      role: AdminRole;
      permissions: PanelPermission[];
    };
  }>("/api/admin/me");

export const adminGetUsers = async () =>
  asArray<AdminAccount>(await adminRequest("/api/admin/users"));

export const adminCreateUser = (payload: {
  username: string;
  password: string;
  name?: string;
  permissions: PanelPermission[];
}) =>
  adminRequest<AdminAccount>("/api/admin/users", {
    method: "POST",
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
  adminRequest<AdminAccount>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const adminDeleteUser = (id: string) =>
  adminRequest<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
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
  adminRequest<WhatsAppOpsMeta>("/api/admin/whatsapp-ops/meta");

export const adminGetWhatsAppOverview = (date?: string, kind?: string) => {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (kind) params.set("kind", kind);
  const q = params.toString();
  return adminRequest<WhatsAppOpsOverview>(
    `/api/admin/whatsapp-ops/overview${q ? `?${q}` : ""}`
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
  return adminRequest<{ date: string; from?: string; to?: string; page: number; limit: number; total: number; items: WhatsAppOpsMessage[] }>(
    `/api/admin/whatsapp-ops/messages${q ? `?${q}` : ""}`
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
  return adminRequest<{ total: number; page: number; items: WhatsAppRetryGroupRow[] }>(
    `/api/admin/whatsapp-ops/retry-groups${q ? `?${q}` : ""}`
  );
};

export const adminGetWhatsAppWebhooks = (opts: { date?: string; page?: number; type?: string }) => {
  const params = new URLSearchParams();
  if (opts.date) params.set("date", opts.date);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.type) params.set("type", opts.type);
  const q = params.toString();
  return adminRequest<{ total: number; page: number; items: WhatsAppWebhookRow[] }>(
    `/api/admin/whatsapp-ops/webhooks${q ? `?${q}` : ""}`
  );
};

export const adminGetWhatsAppCron = () =>
  adminRequest<{
    cronSecretConfigured: boolean;
    endpoint: string;
    openGroups: number;
    dueNow: number;
    exhaustedToday: number;
    nextPromotionDueAt: string | null;
  }>("/api/admin/whatsapp-ops/cron");

export const adminWhatsAppTestSend = (payload: { phone: string; kind?: string; params?: string[] }) =>
  adminRequest<{ success: boolean; eventId: string | null; status: string; error?: string }>(
    "/api/admin/whatsapp-ops/actions/test-send",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

export const adminWhatsAppResend = (id: string) =>
  adminRequest<{ success: boolean; eventId: string | null; status: string; error?: string }>(
    "/api/admin/whatsapp-ops/actions/resend",
    {
      method: "POST",
      body: JSON.stringify({ id }),
    }
  );

export const adminWhatsAppRunRetries = () =>
  adminRequest<{
    ok: boolean;
    scanned: number;
    processed: number;
    sent: number;
    elapsedMs: number;
  }>("/api/admin/whatsapp-ops/actions/run-retries", { method: "POST" });

export type VideoReviewItem = {
  nomination_id: string;
  teacher_name: string | null;
  teacher_phone: string | null;
  teacher_photo_url: string | null;
  teacher_photo_provided: boolean;
  student_name: string | null;
  nominator_name: string | null;
  nominator_phone: string | null;
  nomination_type: string;
  student_class: string | null;
  created_at: string | null;
  eligible: boolean;
  generation_status: string;
  review_status: string;
  video_url: string | null;
  generated_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  ready_for_message: boolean;
  regenerate_available: boolean;
};

export type VideoReviewCounts = {
  total: number;
  with_photo: number;
  without_photo: number;
  ready_for_review: number;
  approved: number;
  rejected: number;
  failed: number;
};

export const adminGetVideoReviews = () =>
  adminRequest<{ items: VideoReviewItem[]; counts: VideoReviewCounts }>("/api/admin/video-reviews");

export const adminReviewVideo = (nominationId: string, action: "approve" | "reject", reason?: string) =>
  adminRequest<VideoReviewItem>(`/api/admin/video-reviews/${encodeURIComponent(nominationId)}`, {
    method: "PATCH",
    body: JSON.stringify(action === "reject" ? { action, reason } : { action }),
  });
