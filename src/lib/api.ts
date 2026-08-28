import { getUtmParams } from "./utm";
import { API_URL } from "./apiBase";
import { ApiError, request } from "./apiClient";

export { ApiError } from "./apiClient";

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
