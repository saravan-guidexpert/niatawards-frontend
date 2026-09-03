import { describe, expect, it } from "vitest";
import {
  exactCategoryOf,
  nominationKind,
  photoStateOf,
  TEACHER_NOMINATION_TEMPLATE,
  STUDENT_VIDEO_TEMPLATE,
  templatePlacesCategoryIcon,
  videoTemplateOf,
} from "@/lib/nominationKind";

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

describe("videoTemplateOf", () => {
  it("uses the student template only for student nominations", () => {
    expect(videoTemplateOf({ type: "student", student_class: "School – Class 9 to 10" })).toBe(
      STUDENT_VIDEO_TEMPLATE
    );
    expect(templatePlacesCategoryIcon(STUDENT_VIDEO_TEMPLATE)).toBe(true);
  });

  it("shares the teacher-nomination template for teacher-self and colleague", () => {
    expect(videoTemplateOf({ type: "teacher" })).toBe(TEACHER_NOMINATION_TEMPLATE);
    expect(videoTemplateOf({ type: "student", student_class: "Teacher / Colleague" })).toBe(
      TEACHER_NOMINATION_TEMPLATE
    );
    expect(videoTemplateOf("teacher")).toBe(videoTemplateOf("colleague"));
    expect(templatePlacesCategoryIcon(TEACHER_NOMINATION_TEMPLATE)).toBe(false);
  });
});

describe("exactCategoryOf", () => {
  it("keeps teacher-other as its own category even when the template is shared", () => {
    expect(exactCategoryOf("colleague", "without_photo")).toBe(
      "Teacher nominated other teacher · Without photo"
    );
    expect(exactCategoryOf("teacher", "without_photo")).not.toBe(
      exactCategoryOf("colleague", "without_photo")
    );
  });
});

