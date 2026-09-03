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

export type PortraitStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "READY"
  | "NEEDS_REVIEW"
  | "FAILED"
  | "NOT_PROVIDED";

export type PortraitReportSummary = {
  validation_status: string | null;
  background_removed: boolean | null;
  alpha_valid: boolean | null;
  halo_detected: boolean | null;
  composition_valid: boolean | null;
  source_appearance_preserved: boolean | null;
};

export type VideoReviewItem = {
  nomination_id: string;
  teacher_name: string | null;
  teacher_phone: string | null;
  portrait_phone: string | null;
  portrait_mapping: "MATCH" | "MISMATCH" | "NO_PORTRAIT";
  portrait_mapping_reason: string | null;
  teacher_photo_url: string | null;
  teacher_photo_provided: boolean;
  has_source_photo: boolean;
  video_category: "with_photo" | "without_photo";
  rendered_video_category: "with_photo" | "without_photo" | null;
  photo_used: boolean;
  category_mismatch: boolean;
  student_name: string | null;
  nominator_name: string | null;
  nominator_phone: string | null;
  nomination_type: string;
  nomination_kind?: "student" | "teacher" | "colleague";
  photo_state?: "with_photo" | "without_photo";
  student_class: string | null;
  created_at: string | null;
  eligible: boolean;
  generation_status: string;
  review_status: string;
  video_url: string | null;
  video_render_id: string | null;
  category_icon_id: string | null;
  category_icon_filename: string | null;
  audio_filename: string | null;
  generated_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  ready_for_message: boolean;
  regenerate_available: boolean;
  portrait_status: PortraitStatus;
  portrait_url: string | null;
  portrait_preview_url: string | null;
  portrait_report: PortraitReportSummary | null;
};

export type VideoReviewCounts = {
  total: number;
  with_photo: number;
  without_photo: number;
  needs_with_photo_regen?: number;
  ready_for_review: number;
  approved: number;
  rejected: number;
  failed: number;
  student_with_photo?: number;
  student_without_photo?: number;
  teacher_with_photo?: number;
  teacher_without_photo?: number;
  colleague_with_photo?: number;
  colleague_without_photo?: number;
};

export const adminGetVideoReviews = () =>
  adminRequest<{ items: VideoReviewItem[]; counts: VideoReviewCounts }>("/api/admin/video-reviews");

export const adminReviewVideo = (nominationId: string, action: "approve" | "reject", reason?: string) =>
  adminRequest<VideoReviewItem>(`/api/admin/video-reviews/${encodeURIComponent(nominationId)}`, {
    method: "PATCH",
    body: JSON.stringify(action === "reject" ? { action, reason } : { action }),
  });

export type PortraitAdminStatus =
  | "NOT_GENERATED"
  | "GENERATING"
  | "GENERATED"
  | "NEEDS_REVIEW"
  | "FAILED"
  | "NO_PHOTO";

export type TeacherPortraitCategorySummary = {
  id: string;
  kind: "student" | "teacher" | "colleague";
  photo: "with_photo" | "without_photo";
  group: string;
  photoLabel: string;
  unique_teachers: number;
  nominations?: number;
  status: Record<PortraitAdminStatus, number>;
  videos?: {
    generated: number;
    pending: number;
    processing: number;
    failed: number;
    total: number;
    not_generated?: number;
    teachers?: {
      generated: number;
      not_generated: number;
      processing: number;
      failed: number;
    };
  };
  images_finalized?: number;
  images_pending?: number;
};

export type TeacherPortraitKindSummary = {
  kind: "student" | "teacher" | "colleague";
  group: string;
  nominations: number;
  unique_teachers: number;
};

export type TeacherPortraitCandidate = {
  id: string;
  teacher_name: string;
  photo_url: string;
  created_at: string | null;
};

export type TeacherVideoCounts = {
  generated: number;
  pending: number;
  processing: number;
  failed: number;
  total: number;
};

export type TeacherPortraitListItem = {
  phone: string;
  name: string;
  kind: "student" | "teacher" | "colleague";
  photo: "with_photo" | "without_photo";
  nomination_count: number;
  nomination_ids?: string[];
  portrait_status: PortraitAdminStatus;
  cropped_cloudinary_url: string | null;
  source_nomination_id: string | null;
  source_photo_url: string | null;
  portrait_error: string | null;
  generated_at: string | null;
  finalized_at: string | null;
  crop_version: string | null;
  candidates: TeacherPortraitCandidate[];
  videos?: TeacherVideoCounts;
  preview_nomination_id?: string | null;
  can_generate_image?: boolean;
  can_generate_videos?: boolean;
};

export type TeacherPortraitGenerateResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  phone: string;
  cropped_cloudinary_url?: string;
  source_nomination_id?: string;
  needs_review?: boolean;
  candidates?: TeacherPortraitCandidate[];
  error?: string;
};

export const adminGetTeacherPortraitSummary = () =>
  adminRequest<{ categories: TeacherPortraitCategorySummary[]; kinds: TeacherPortraitKindSummary[] }>(
    "/api/admin/teacher-portraits/summary"
  );

export const adminGetTeacherPortraits = (opts: {
  kind: string;
  photo: string;
  status?: string;
  video_status?: string;
  q?: string;
  page?: number;
  pageSize?: number | "all";
}) => {
  const params = new URLSearchParams();
  params.set("kind", opts.kind);
  params.set("photo", opts.photo);
  if (opts.status) params.set("status", opts.status);
  if (opts.video_status) params.set("video_status", opts.video_status);
  if (opts.q) params.set("q", opts.q);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("pageSize", String(opts.pageSize));
  return adminRequest<{
    items: TeacherPortraitListItem[];
    total: number;
    page: number;
    pageSize: number;
    kind: string;
    photo: string;
  }>(`/api/admin/teacher-portraits?${params.toString()}`);
};

export const adminGetTeacherPortraitPhones = (opts: {
  kind: string;
  photo: string;
  status?: string;
  video_status?: string;
  q?: string;
}) => {
  const params = new URLSearchParams();
  params.set("kind", opts.kind);
  params.set("photo", opts.photo);
  params.set("ids_only", "1");
  if (opts.status) params.set("status", opts.status);
  if (opts.video_status) params.set("video_status", opts.video_status);
  if (opts.q) params.set("q", opts.q);
  return adminRequest<{
    phones: string[];
    teachers: { phone: string; name: string }[];
    total: number;
  }>(`/api/admin/teacher-portraits?${params.toString()}`);
};

// gpt-image-2 takes ~2 minutes per portrait and the server retries transient failures twice.
const GENERATE_TIMEOUT_MS = 10 * 60 * 1000;

export const adminGenerateTeacherPortrait = (payload: {
  phone: string;
  regenerate?: boolean;
  source_nomination_id?: string;
}) =>
  adminRequest<TeacherPortraitGenerateResult>("/api/admin/teacher-portraits/generate", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  });

export const adminRegenerateTeacherPortrait = (phone: string, source_nomination_id?: string) =>
  adminRequest<TeacherPortraitGenerateResult>(
    `/api/admin/teacher-portraits/${encodeURIComponent(phone)}/regenerate`,
    {
      method: "POST",
      body: JSON.stringify(source_nomination_id ? { source_nomination_id } : {}),
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    }
  );

export type GenerationReadiness = {
  video_ready: boolean;
  video_error: string | null;
  portrait_ready: boolean;
  portrait_error: string | null;
};

export const adminGetGenerationReadiness = () =>
  adminRequest<GenerationReadiness>("/api/admin/video-generation/readiness");

export type VideoGenerationJobView = {
  job_id: string;
  job_number: number;
  status: "running" | "completed" | "cancelled";
  mode: "generate" | "regenerate" | "retry";
  category_id: string | null;
  kind: string | null;
  photo: string | null;
  teacher_count: number;
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  progress_pct: number;
  avg_ms: number;
  eta_seconds: number | null;
  current: {
    nomination_id: string;
    teacher_name: string;
    teacher_phone: string;
    category_id: string;
    category_icon_filename: string | null;
  } | null;
  recent: Array<{
    nomination_id: string;
    teacher_name: string;
    teacher_phone: string;
    status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
    error: string | null;
    failure_stage: string | null;
  }>;
  cancel_requested: boolean;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
};

export type VideoGenerationJobItem = {
  id: string;
  job_id: string;
  nomination_id: string;
  teacher_name: string;
  teacher_phone: string;
  category_id: string;
  photo_used: boolean;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  failure_stage: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  render_id: string | null;
  video_url: string | null;
  category_icon_id: string | null;
  category_icon_filename: string | null;
  audio_filename: string | null;
};

export type VideoGenerationEstimate = {
  teachers: number;
  eligible_nominations: number;
  already_generated: number;
  blocked_missing_portrait: number;
  to_generate: number;
  regenerate: boolean;
  audio: string;
  audio_attached: boolean;
};

export const adminEstimateVideoGeneration = (payload: {
  phones: string[];
  kind: string;
  photo: string;
  regenerate?: boolean;
}) =>
  adminRequest<VideoGenerationEstimate>("/api/admin/video-generation/estimate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const adminStartVideoGeneration = (payload: {
  phones: string[];
  kind: string;
  photo: string;
  regenerate?: boolean;
}) =>
  adminRequest<{ job: VideoGenerationJobView; queued_videos: number; teachers: number }>(
    "/api/admin/video-generation/jobs",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

export const adminGetVideoGenerationJobs = () =>
  adminRequest<{ jobs: VideoGenerationJobView[] }>("/api/admin/video-generation/jobs");

export const adminGetVideoGenerationJob = (jobId: string, opts?: { items?: boolean; status?: string; page?: number }) => {
  const params = new URLSearchParams();
  if (opts?.items) params.set("items", "1");
  if (opts?.status) params.set("status", opts.status);
  if (opts?.page) params.set("page", String(opts.page));
  const q = params.toString();
  return adminRequest<{
    job: VideoGenerationJobView;
    items: VideoGenerationJobItem[];
    items_total: number;
    page: number;
    pageSize: number;
  }>(`/api/admin/video-generation/jobs/${encodeURIComponent(jobId)}${q ? `?${q}` : ""}`);
};

export const adminCancelVideoGenerationJob = (jobId: string) =>
  adminRequest<{ job: VideoGenerationJobView }>(
    `/api/admin/video-generation/jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: "POST" }
  );

export const adminRetryFailedVideoGeneration = (jobId: string) =>
  adminRequest<{ job: VideoGenerationJobView }>(
    `/api/admin/video-generation/jobs/${encodeURIComponent(jobId)}/retry-failed`,
    { method: "POST" }
  );

export const adminGetTeacherVideoPreview = (opts: { phone: string; kind: string; photo: string }) => {
  const params = new URLSearchParams(opts);
  return adminRequest<{
    phone: string;
    nomination_id: string;
    photo: string;
    image_url: string | null;
    template_preview_url: string;
    category_icon_id: string;
    category_icon_filename: string;
    category_icon_label: string;
    audio_filename: string;
  }>(`/api/admin/video-generation/preview?${params.toString()}`);
};
