import { describe, expect, it } from "vitest";
import { buildTeacherRows } from "@/components/admin/UniqueTeachersPanel";

const studentNom = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  type: "student",
  student_class: "School – Class 9 to 10",
  student_name: "Asha",
  nominator_phone: "9000000001",
  teacher_name: "Ravi Kumar",
  phone: "9876543210",
  school_name: "St Marys",
  status: "pending",
  created_at: "2026-08-01T10:00:00.000Z",
  ...over,
});

const selfNom = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  type: "teacher",
  full_name: "Ravi Kumar M",
  nominator_phone: "9876543210",
  phone: "9876543210",
  school_name: "St Marys High School",
  subject: "Physics",
  experience: "12",
  status: "shortlisted",
  created_at: "2026-08-05T10:00:00.000Z",
  ...over,
});

const peerNom = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  type: "student",
  student_class: "Teacher / Colleague",
  student_name: "Meera (colleague)",
  nominator_phone: "9000000002",
  teacher_name: "Ravi Kumar",
  phone: "9876543210",
  status: "pending",
  created_at: "2026-08-03T10:00:00.000Z",
  ...over,
});

describe("buildTeacherRows", () => {
  it("collapses all three nomination flows onto one teacher phone", () => {
    const rows = buildTeacherRows([studentNom(), selfNom(), peerNom()]);

    expect(rows).toHaveLength(1);
    expect(rows[0].phone).toBe("9876543210");
    expect(rows[0].counts).toEqual({ student: 1, self: 1, peer: 1 });
    expect(rows[0].sources).toEqual(["student", "self", "peer"]);
    expect(rows[0].nominations).toHaveLength(3);
  });

  it("prefers the self nomination for the teacher's own details", () => {
    const rows = buildTeacherRows([studentNom(), selfNom()]);

    expect(rows[0].name).toBe("Ravi Kumar M");
    expect(rows[0].school).toBe("St Marys High School");
    expect(rows[0].subject).toBe("Physics");
    expect(rows[0].altNames).toEqual(["Ravi Kumar"]);
  });

  it("falls back to the latest filled value when there is no self nomination", () => {
    const rows = buildTeacherRows([
      studentNom({ id: "old", school_name: "Old School", created_at: "2026-07-01T10:00:00.000Z" }),
      studentNom({ id: "new", school_name: "New School", created_at: "2026-08-09T10:00:00.000Z" }),
    ]);

    expect(rows[0].counts.student).toBe(2);
    expect(rows[0].school).toBe("New School");
    expect(rows[0].name).toBe("Ravi Kumar");
  });

  it("keeps the strongest status across a teacher's nominations", () => {
    const rows = buildTeacherRows([
      studentNom({ status: "rejected" }),
      selfNom({ status: "winner" }),
      peerNom({ status: "pending" }),
    ]);

    expect(rows[0].status).toBe("winner");
  });

  it("matches on the last 10 digits so +91 and 0-prefixed numbers merge", () => {
    const rows = buildTeacherRows([
      studentNom({ id: "a", phone: "+91 98765 43210" }),
      studentNom({ id: "b", phone: "09876543210" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].counts.student).toBe(2);
  });

  it("keeps different teachers apart and drops rows without a usable phone", () => {
    const rows = buildTeacherRows([
      studentNom(),
      studentNom({ id: "other", phone: "9123456780", teacher_name: "Latha" }),
      studentNom({ id: "bad", phone: "12345" }),
    ]);

    expect(rows.map((r) => r.phone).sort()).toEqual(["9123456780", "9876543210"]);
  });

  it("records first and last nomination dates", () => {
    const rows = buildTeacherRows([selfNom(), studentNom(), peerNom()]);

    expect(rows[0].firstAt).toBe("2026-08-01T10:00:00.000Z");
    expect(rows[0].lastAt).toBe("2026-08-05T10:00:00.000Z");
  });

  it("uses a stored photo_url so the Has photo filter can match", () => {
    const withPhoto = buildTeacherRows([
      studentNom(),
      selfNom({ photo_url: "https://res.cloudinary.com/demo/image/upload/teacher.jpg" }),
    ]);
    const withoutPhoto = buildTeacherRows([studentNom({ phone: "9123456780" })]);

    expect(withPhoto[0].photoUrl).toContain("cloudinary.com");
    expect(withoutPhoto[0].photoUrl).toBe("");
  });
});
