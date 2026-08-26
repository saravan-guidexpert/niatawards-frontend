export const PANEL_PERMISSIONS = ["nominations", "campaigns", "digital"] as const;

export type PanelPermission = (typeof PANEL_PERMISSIONS)[number];
export type AdminRole = "super_admin" | "staff";

export type AdminUser = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  permissions: PanelPermission[];
};

export type AdminSession = {
  token: string;
  user: AdminUser;
};

const SESSION_KEY = "niat_admin_session";

export const PANEL_LABELS: Record<PanelPermission, string> = {
  nominations: "Nominations",
  campaigns: "Influencer Tracking",
  digital: "Digital Marketing",
};

const isPanelPermission = (value: unknown): value is PanelPermission =>
  typeof value === "string" && (PANEL_PERMISSIONS as readonly string[]).includes(value);

const parseSession = (raw: string | null): AdminSession | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed?.token || !parsed.user?.id || !parsed.user.username) return null;
    const role: AdminRole = parsed.user.role === "super_admin" ? "super_admin" : "staff";
    const permissions = Array.isArray(parsed.user.permissions)
      ? parsed.user.permissions.filter(isPanelPermission)
      : [];
    return {
      token: parsed.token,
      user: {
        id: parsed.user.id,
        username: parsed.user.username,
        name: parsed.user.name || "",
        role,
        permissions: role === "super_admin" ? [...PANEL_PERMISSIONS] : permissions,
      },
    };
  } catch {
    return null;
  }
};

export const getAdminSession = (): AdminSession | null => {
  if (typeof window === "undefined") return null;
  return parseSession(sessionStorage.getItem(SESSION_KEY));
};

export const getAdminToken = () => getAdminSession()?.token || "";

export const getAdminUser = () => getAdminSession()?.user || null;

export const isAdminLoggedIn = () => Boolean(getAdminSession());

export const isSuperAdmin = () => getAdminUser()?.role === "super_admin";

export const hasAdminPermission = (permission: PanelPermission) => {
  const user = getAdminUser();
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.permissions.includes(permission);
};

export const setAdminSession = (session: AdminSession) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("niat_admin_session");
};

export const allowedAdminTabs = (user: AdminUser | null): Array<PanelPermission | "access"> => {
  if (!user) return [];
  if (user.role === "super_admin") return [...PANEL_PERMISSIONS, "access"];
  return PANEL_PERMISSIONS.filter((permission) => user.permissions.includes(permission));
};

export const firstAllowedTab = (user: AdminUser | null): PanelPermission | "access" =>
  allowedAdminTabs(user)[0] || "nominations";
