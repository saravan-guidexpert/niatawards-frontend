import { API_URL } from "./apiBase";

export type FunnelTrackStage = "otp_requested" | "otp_verified" | "form_step1";

const cleanPhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

export const trackFunnel = (
  stage: FunnelTrackStage,
  phone: string,
  role?: "student" | "teacher"
) => {
  const cleaned = cleanPhone(phone);
  if (cleaned.length !== 10) return;
  void fetch(`${API_URL}/api/funnel/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, phone: cleaned, role }),
  }).catch(() => undefined);
};
