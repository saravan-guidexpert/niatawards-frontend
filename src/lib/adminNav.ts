import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Megaphone,
  MessageCircle,
  Shield,
  Target,
  Users,
} from "lucide-react";
import type { PanelPermission } from "./adminSession";

export type AdminTab = PanelPermission | "access" | "teachers" | "teacher-images" | "videos" | "offline";

export const isTabAllowed = (tab: AdminTab, allowed: Array<PanelPermission | "access">) => {
  if (tab === "teachers" || tab === "videos" || tab === "teacher-images") return allowed.includes("nominations");
  if (tab === "offline") return allowed.includes("nominations") || allowed.includes("campaigns");
  return allowed.includes(tab);
};

export type AdminNavItem = {
  id: AdminTab;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "reviews",
    label: "Reviews",
    items: [
      { id: "nominations", label: "Nominations", hint: "All leads and submissions", icon: Users },
      { id: "teachers", label: "Unique Teachers", hint: "One row per teacher phone", icon: GraduationCap },
      { id: "teacher-images", label: "Teacher Images", hint: "Generate finalized teacher portraits", icon: ImageIcon },
      { id: "videos", label: "Teacher Video Review", hint: "Approve generated videos", icon: Clapperboard },
    ],
  },
  {
    id: "field",
    label: "Field & campaigns",
    items: [
      { id: "offline", label: "Offline Team", hint: "State-wise UTM tracking", icon: MapPin },
      { id: "campaigns", label: "Influencer Tracking", hint: "Creator promo links", icon: Megaphone },
      { id: "digital", label: "Digital Marketing", hint: "Paid and organic ads", icon: Target },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { id: "whatsapp", label: "WhatsApp", hint: "Delivery and retries", icon: MessageCircle },
      { id: "access", label: "Access", hint: "Staff accounts", icon: Shield },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export const adminTabLabel = (tab: AdminTab) =>
  ADMIN_NAV_ITEMS.find((item) => item.id === tab)?.label || "Admin";
