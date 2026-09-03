import { describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, adminTabLabel, isTabAllowed } from "@/lib/adminNav";

describe("admin nav", () => {
  it("keeps every tab in exactly one group", () => {
    const ids = ADMIN_NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("offline");
    expect(ids).toContain("teacher-images");
    expect(ADMIN_NAV_GROUPS).toHaveLength(3);
  });

  it("lets nomination staff open the review and offline views", () => {
    expect(isTabAllowed("teachers", ["nominations"])).toBe(true);
    expect(isTabAllowed("teacher-images", ["nominations"])).toBe(true);
    expect(isTabAllowed("offline", ["nominations"])).toBe(true);
    expect(isTabAllowed("whatsapp", ["nominations"])).toBe(false);
  });

  it("lets campaign staff open offline team without nominations access", () => {
    expect(isTabAllowed("offline", ["campaigns"])).toBe(true);
    expect(isTabAllowed("teachers", ["campaigns"])).toBe(false);
  });

  it("labels the current page for the top bar", () => {
    expect(adminTabLabel("offline")).toBe("Offline Team");
    expect(adminTabLabel("campaigns")).toBe("Influencer Tracking");
  });
});
