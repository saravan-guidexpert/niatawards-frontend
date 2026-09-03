/** Presentation classification for nominations. Does not change Nomination.type. */

export const TEACHER_COLLEAGUE_EDUCATION = "Teacher / Colleague";

export const NOMINATION_KINDS = ["student", "teacher", "colleague"] as const;
export type NominationKind = (typeof NOMINATION_KINDS)[number];

export const PHOTO_STATES = ["with_photo", "without_photo"] as const;
export type PhotoState = (typeof PHOTO_STATES)[number];

export const PORTRAIT_ADMIN_STATUSES = [
  "NOT_GENERATED",
  "GENERATING",
  "GENERATED",
  "NEEDS_REVIEW",
  "FAILED",
  "NO_PHOTO",
] as const;
export type PortraitAdminStatus = (typeof PORTRAIT_ADMIN_STATUSES)[number];

export const IMAGE_MANAGEMENT_CATEGORIES = [
  { id: "student_with_photo", kind: "student", photo: "with_photo", group: "Student nominated teacher", photoLabel: "With photo" },
  { id: "student_without_photo", kind: "student", photo: "without_photo", group: "Student nominated teacher", photoLabel: "Without photo" },
  { id: "teacher_with_photo", kind: "teacher", photo: "with_photo", group: "Teacher nominated teacher", photoLabel: "With photo" },
  { id: "teacher_without_photo", kind: "teacher", photo: "without_photo", group: "Teacher nominated teacher", photoLabel: "Without photo" },
  { id: "colleague_with_photo", kind: "colleague", photo: "with_photo", group: "Teacher nominated other teacher", photoLabel: "With photo" },
  { id: "colleague_without_photo", kind: "colleague", photo: "without_photo", group: "Teacher nominated other teacher", photoLabel: "Without photo" },
] as const;

export type ImageManagementCategoryId = (typeof IMAGE_MANAGEMENT_CATEGORIES)[number]["id"];

const text = (value: unknown) => String(value ?? "").trim();

export const phone10 = (value: unknown) => String(value ?? "").replace(/\D/g, "").slice(-10);

export const hasSourcePhoto = (photoUrl: unknown): boolean => {
  const value = String(photoUrl ?? "").trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const nominationKind = (n: { type?: unknown; student_class?: unknown }): NominationKind => {
  if (String(n.type || "") === "teacher") return "teacher";
  if (text(n.student_class) === TEACHER_COLLEAGUE_EDUCATION) return "colleague";
  return "student";
};

export const photoStateOf = (photoUrl: unknown): PhotoState =>
  hasSourcePhoto(photoUrl) ? "with_photo" : "without_photo";

export const KIND_GROUP_LABEL: Record<NominationKind, string> = {
  student: "Student nominated teacher",
  teacher: "Teacher nominated teacher",
  colleague: "Teacher nominated other teacher",
};

export const categoryIdOf = (kind: NominationKind, photo: PhotoState): ImageManagementCategoryId =>
  `${kind}_${photo}` as ImageManagementCategoryId;

export const exactCategoryOf = (kind: NominationKind, photo: PhotoState) =>
  `${KIND_GROUP_LABEL[kind]} · ${photo === "with_photo" ? "With photo" : "Without photo"}`;

/** Student nominations keep the student-nominated renderer. Teacher-self and colleague share one template. */
export const STUDENT_VIDEO_TEMPLATE = "student-nominated" as const;
export const TEACHER_NOMINATION_TEMPLATE = "teacher-nominated-teacher" as const;
export const VIDEO_TEMPLATES = [STUDENT_VIDEO_TEMPLATE, TEACHER_NOMINATION_TEMPLATE] as const;
export type VideoTemplateVariant = (typeof VIDEO_TEMPLATES)[number];

export const videoTemplateOf = (
  input: NominationKind | { type?: unknown; student_class?: unknown }
): VideoTemplateVariant => {
  const kind = typeof input === "string" ? input : nominationKind(input);
  return kind === "student" ? STUDENT_VIDEO_TEMPLATE : TEACHER_NOMINATION_TEMPLATE;
};

export const templatePlacesCategoryIcon = (variant: VideoTemplateVariant) =>
  variant === STUDENT_VIDEO_TEMPLATE;
