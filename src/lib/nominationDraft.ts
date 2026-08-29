const STORAGE_KEY = "niat_draft";

export type NominationFormRole = "student" | "teacher" | "teacher_other";
export type NominationApiType = "student" | "teacher";

export const apiTypeFromRole = (role: NominationFormRole): NominationApiType =>
  role === "teacher" ? "teacher" : "student";

export type DraftSession = {
  id: string;
  token: string;
  type: NominationFormRole;
  phone: string;
};

const safeGet = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeSet = (value: string) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // private mode
  }
};

export const saveDraftSession = (session: DraftSession) => {
  safeSet(JSON.stringify(session));
};

export const getDraftSession = (): DraftSession | null => {
  const raw = safeGet();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftSession;
    if (!parsed?.token || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearDraftSession = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private mode
  }
};
