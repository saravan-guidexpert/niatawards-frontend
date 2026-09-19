import { request } from "./apiClient";

export interface FdpInitiatePayload {
  full_name: string;
  phone: string;
  utm?: Record<string, string>;
}

export interface FdpVerifyPayload {
  phone: string;
  otp: string;
}

export interface FdpCompletePayload {
  phone: string;
  teaching_subject: string;
  institution_name: string;
  city: string;
  experience_years: string;
  receive_updates: boolean;
}

export interface FdpRegistrationResult {
  registration_id: string;
  full_name: string;
  phone: string;
  teaching_subject: string;
  institution_name: string;
  city: string;
  experience_years: string;
  receive_updates: boolean;
  created_at: string;
}

export const initiateFdpRegistration = (payload: FdpInitiatePayload) =>
  request<{ success: boolean; message: string; phone: string; registration_id: string }>(
    "/api/fdp/initiate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

export const verifyFdpOtp = (payload: FdpVerifyPayload) =>
  request<{ success: boolean; message: string; phone_verified: boolean; registration_id?: string }>(
    "/api/fdp/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

export const resendFdpOtp = (phone: string) =>
  request<{ success: boolean; message: string }>("/api/fdp/resend-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const completeFdpRegistration = (payload: FdpCompletePayload) =>
  request<{ success: boolean; message: string; registration: FdpRegistrationResult }>(
    "/api/fdp/complete",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
