import { describe, expect, it } from "vitest";
import { copyColumns, nominationSheet, nominationsToTsv } from "@/pages/AdminPage";

const nomination = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "student",
  created_at: "2026-08-01T10:00:00.000Z",
  student_name: "Asha",
  student_class: "School – Class 9 to 10",
  class_group: "school",
  school_name: "St Marys",
  board: "CBSE",
  phone: "9876543210",
  teacher_name: "Ravi Kumar",
  full_name: null,
  award_category: "Teaching Innovation Award",
  special_thing: "Explains with real\nexamples",
  subject: "Physics",
  impact_story: "Helped me\tpass",
  teacher_social: "@ravi",
  care_rating: 5,
  clarity_rating: 4,
  motivation_rating: 5,
  support_rating: 4,
  experience: null,
  photo_url: "https://res.cloudinary.com/demo/a.jpg",
  utm_source: "facebook",
  utm_medium: "cpc",
  utm_campaign: "aug-push",
  utm_term: "teacher",
  utm_content: "banner-1",
  nominator_name: "Asha",
  nominator_phone: "9000000001",
  phone_verified: true,
  form_step: "submitted",
  status: "pending",
  whatsapp_status: "delivered",
  whatsapp_attempt: 1,
  whatsapp_error: null,
  ...over,
});

describe("nominationSheet", () => {
  it("keeps every row, however long the list is", () => {
    const rows = Array.from({ length: 237 }, (_, i) => nomination({ id: `n${i}` }));
    const sheet = nominationSheet(rows);
    expect(sheet).toHaveLength(238);
    expect(sheet[1][0]).toBe("n0");
    expect(sheet[237][0]).toBe("n236");
    expect(nominationsToTsv(rows).split("\n")).toHaveLength(238);
  });

  it("emits a column for every field the API returns", () => {
    const row = nomination();
    const mapped = new Set(copyColumns([row]).map((c) => c.key).filter(Boolean));
    for (const key of Object.keys(row)) {
      expect(mapped.has(key), `missing column for ${key}`).toBe(true);
    }
  });

  it("appends unknown fields so new backend data is never dropped", () => {
    const header = nominationSheet([nomination({ referral_code: "ABC123" })])[0];
    expect(header).toContain("Referral Code");
  });

  it("gives every row the same width as the header", () => {
    const sheet = nominationSheet([nomination(), nomination({ referral_code: "X" })]);
    for (const row of sheet) expect(row).toHaveLength(sheet[0].length);
  });

  it("flattens tabs and newlines so cells cannot split a TSV row", () => {
    const lines = nominationsToTsv([nomination()]).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1].split("\t")).toHaveLength(lines[0].split("\t").length);
  });

  it("writes blanks, not the word null, for empty fields", () => {
    const [header, row] = nominationSheet([nomination()]);
    expect(row[(header as string[]).indexOf("Applicant Full Name")]).toBe("");
    expect(row[(header as string[]).indexOf("WhatsApp Error")]).toBe("");
  });
});
