import { describe, expect, it } from "vitest";
import {
  OFFLINE_REGIONS,
  OFFLINE_TEAM,
  memberForNomination,
  scoreOfflineTeam,
  uniqueTeachersFrom,
} from "@/lib/offlineTeamRoster";

const nom = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "student",
  teacher_name: "Ravi Kumar",
  phone: "9876543210",
  school_name: "St Marys",
  status: "pending",
  created_at: "2026-08-01T10:00:00.000Z",
  utm_source: "whatsapp",
  utm_medium: "mayur_ka",
  utm_campaign: "guru_ratna_2026",
  ...over,
});

describe("offline team roster", () => {
  it("loads every field-team link once, with a unique UTM medium", () => {
    expect(OFFLINE_TEAM).toHaveLength(116);
    const media = OFFLINE_TEAM.map((m) => m.utm_medium);
    expect(new Set(media).size).toBe(116);
  });

  it("splits the roster into the five states", () => {
    const counts = Object.fromEntries(OFFLINE_REGIONS.map((region) => [region, 0]));
    for (const member of OFFLINE_TEAM) counts[member.region] += 1;
    expect(counts).toEqual({ KA: 34, TS: 12, AP: 14, Kerala: 21, North: 35 });
  });

  it("matches a nomination only on the exact UTM medium", () => {
    expect(memberForNomination({ utm_medium: "mayur_ka" })?.name).toBe("Mayur - KA");
    expect(memberForNomination({ utm_medium: "MAYUR_KA" })?.name).toBe("Mayur - KA");
    expect(memberForNomination({ utm_medium: "ka" })?.name).toBe("KA");
    expect(memberForNomination({ utm_medium: "facebook" })).toBeUndefined();
  });

  it("does not let the generic KA medium steal other Karnataka members", () => {
    const scored = scoreOfflineTeam([
      nom({ id: "1", utm_medium: "ka", phone: "9000000001" }),
      nom({ id: "2", utm_medium: "mayur_ka", phone: "9000000002" }),
    ]);
    const generic = scored.find((row) => row.id === "ka");
    const mayur = scored.find((row) => row.id === "mayur_ka");
    expect(generic?.teachers).toHaveLength(1);
    expect(mayur?.teachers).toHaveLength(1);
    expect(generic?.teachers[0].phone).toBe("9000000001");
  });

  it("counts unique teachers per member and de-duplicates across a region", () => {
    const scored = scoreOfflineTeam([
      nom({ id: "a", utm_medium: "mayur_ka", phone: "9000000001", teacher_name: "Asha" }),
      nom({ id: "b", utm_medium: "mayur_ka", phone: "9000000001", teacher_name: "Asha" }),
      nom({ id: "c", utm_medium: "praveen_ka", phone: "9000000001", teacher_name: "Asha" }),
      nom({ id: "d", utm_medium: "pittala_raju_ts", phone: "9000000002", teacher_name: "Teja" }),
    ]);
    const mayur = scored.find((row) => row.id === "mayur_ka");
    const ka = scored.filter((row) => row.region === "KA");
    expect(mayur?.nominations).toHaveLength(2);
    expect(mayur?.teachers).toHaveLength(1);
    expect(uniqueTeachersFrom(ka)).toHaveLength(1);
    expect(uniqueTeachersFrom(scored)).toHaveLength(2);
  });

  it("keeps Nagaraju's two AP links as separate trackers", () => {
    const scored = scoreOfflineTeam([
      nom({ id: "z", utm_medium: "nagaraju_ap_zm", phone: "9000000011" }),
      nom({ id: "m", utm_medium: "nagaraju_zonal_manager_ap", phone: "9000000012" }),
    ]);
    expect(scored.find((row) => row.id === "nagaraju_ap_zm")?.teachers).toHaveLength(1);
    expect(scored.find((row) => row.id === "nagaraju_zonal_manager_ap")?.teachers).toHaveLength(1);
  });
});
