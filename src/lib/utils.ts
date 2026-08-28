import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const last10Digits = (value: string) => value.replace(/\D/g, "").slice(-10);

export const TEACHER_PHONE_SAME_AS_STUDENT_MSG =
  "Please enter your nominating teacher's number";

export function teacherPhoneMatchesStudent(teacherPhone: string, studentPhone: string) {
  const teacher = last10Digits(teacherPhone);
  const student = last10Digits(studentPhone);
  return teacher.length === 10 && student.length === 10 && teacher === student;
}
