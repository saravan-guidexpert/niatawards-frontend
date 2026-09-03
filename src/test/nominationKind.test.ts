import { describe, expect, it } from "vitest";
import { nominationKind, photoStateOf } from "@/lib/nominationKind";

describe("nominationKind", () => {
  it("treats type=teacher as self-nomination", () => {
    expect(nominationKind({ type: "teacher", student_class: "Teacher / Colleague" })).toBe("teacher");
  });

  it("treats Teacher / Colleague education as colleague without adding a DB type", () => {
    expect(nominationKind({ type: "student", student_class: "Teacher / Colleague" })).toBe("colleague");
  });

  it("treats other student rows as student nominations", () => {
    expect(nominationKind({ type: "student", student_class: "School – Class 9 to 10" })).toBe("student");
  });
});

describe("photoStateOf", () => {
  it("uses photo_url only", () => {
    expect(photoStateOf("https://res.cloudinary.com/demo/image/upload/a.jpg")).toBe("with_photo");
    expect(photoStateOf("")).toBe("without_photo");
    expect(photoStateOf("not-a-url")).toBe("without_photo");
  });
});
