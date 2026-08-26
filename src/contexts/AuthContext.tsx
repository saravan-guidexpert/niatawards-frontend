import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiSendOtp, apiVerifyOtp } from "@/lib/api";
import { trackFunnel } from "@/lib/funnel";

interface User {
  phone: string;
  role: "student" | "teacher" | "admin";
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  sendOtp: (phone: string, resend?: boolean) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string, name?: string, draftToken?: string) => Promise<{ success: boolean; error?: string }>;
  setUserRole: (role: User["role"]) => void;
  setUserName: (name: string) => void;
  logout: () => void;
  pendingPhone: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("niat_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  useEffect(() => {
    if (user) localStorage.setItem("niat_user", JSON.stringify(user));
    else localStorage.removeItem("niat_user");
  }, [user]);

  const sendOtp = async (phone: string, resend = false): Promise<{ success: boolean; error?: string }> => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) return { success: false, error: "Please enter a valid 10-digit number" };

    try {
      await apiSendOtp(cleaned, resend);
      setPendingPhone(cleaned);
      trackFunnel("otp_requested", cleaned);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      return { success: false, error: message === "Failed to fetch" ? "Network error. Please try again." : message };
    }
  };

  const verifyOtp = async (otp: string, name?: string, draftToken?: string): Promise<{ success: boolean; error?: string }> => {
    if (!pendingPhone) return { success: false, error: "Please request an OTP first" };

    try {
      await apiVerifyOtp(pendingPhone, otp, draftToken);
      setUser({ phone: pendingPhone, role: "student", name: name?.trim() || undefined });
      trackFunnel("otp_verified", pendingPhone);
      setPendingPhone(null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      return { success: false, error: message === "Failed to fetch" ? "Network error. Please try again." : message };
    }
  };

  const setUserRole = (role: User["role"]) => {
    if (user) setUser(prev => prev ? { ...prev, role } : prev);
  };
  const setUserName = (name: string) => {
    if (user) setUser(prev => prev ? { ...prev, name: name.trim() } : prev);
  };

  const logout = () => { setUser(null); setPendingPhone(null); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, sendOtp, verifyOtp, setUserRole, setUserName, logout, pendingPhone }}>
      {children}
    </AuthContext.Provider>
  );
};
