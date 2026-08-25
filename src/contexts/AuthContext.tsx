import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiSendOtp, apiVerifyOtp } from "@/lib/api";

interface User {
  phone: string;
  role: "student" | "teacher" | "admin";
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string, name?: string) => Promise<boolean>;
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

  const MASTER_PHONE = "9123456789";
  const MASTER_OTP   = "000000";

  const sendOtp = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) return { success: false, error: "Please enter a valid 10-digit number" };

    // Master number — skip SMS API entirely, go straight to OTP step
    if (cleaned === MASTER_PHONE) {
      setPendingPhone(cleaned);
      return { success: true };
    }

    try {
      await apiSendOtp(cleaned);
      setPendingPhone(cleaned);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      return { success: false, error: message === "Failed to fetch" ? "Network error. Please try again." : message };
    }
  };

  const verifyOtp = async (otp: string, name?: string): Promise<boolean> => {
    if (!pendingPhone) return false;

    // Master OTP — bypass API verification
    if (otp === MASTER_OTP) {
      setUser({ phone: pendingPhone, role: "student", name: name?.trim() || undefined });
      setPendingPhone(null);
      return true;
    }

    try {
      await apiVerifyOtp(pendingPhone, otp);
      setUser({ phone: pendingPhone, role: "student", name: name?.trim() || undefined });
      setPendingPhone(null);
      return true;
    } catch {
      return false;
    }
  };

  const setUserRole = (role: User["role"]) => {
    if (user) setUser(prev => prev ? { ...prev, role } : prev);
  };
  const setUserName = (name: string) => {
    if (user) setUser(prev => prev ? { ...prev, name: name.trim() } : prev);
  };

  // FIX: combined setter used by LoginDialog to avoid React batching issues
  // where setUserRole + setUserName sequential calls overwrite each other
  const logout = () => { setUser(null); setPendingPhone(null); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, sendOtp, verifyOtp, setUserRole, setUserName, logout, pendingPhone }}>
      {children}
    </AuthContext.Provider>
  );
};
