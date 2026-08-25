// Shared nomination constants — used by both student and teacher forms
export const AWARD_CATEGORIES = [
  "Student Transformation Award",
  "Teaching Innovation Award",
  "Beyond Classroom Impact Award",
  "Future Readiness Award",
] as const;

export type AwardCategory = typeof AWARD_CATEGORIES[number];

export const CATEGORY_GUIDE = [
  { title: "Student Transformation Award",  icon: "⭐", desc: "Teacher who changed a student's life through deep mentorship, care, and personal attention.",         bg: "bg-primary/5",   border: "border-primary/20",   color: "text-primary"   },
  { title: "Teaching Innovation Award",     icon: "💡", desc: "Teacher who uses creative, tech-driven, or fresh methods that make learning exciting.",               bg: "bg-secondary/5", border: "border-secondary/20", color: "text-secondary" },
  { title: "Beyond Classroom Impact Award", icon: "🌍", desc: "Teacher who goes beyond the syllabus — community work, life skills, emotional support.",              bg: "bg-primary/5",   border: "border-primary/20",   color: "text-primary"   },
  { title: "Future Readiness Award",        icon: "🚀", desc: "Teacher who prepares students for tomorrow's careers with practical, future-focused education.",       bg: "bg-secondary/5", border: "border-secondary/20", color: "text-secondary" },
] as const;
