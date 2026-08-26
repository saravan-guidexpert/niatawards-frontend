const rawApiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Local Vite uses the local backend so new routes (promo-links, utm hit) work before deploy. */
export const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : rawApiUrl && !rawApiUrl.includes("localhost")
    ? rawApiUrl
    : "https://niatawards-backend.vercel.app";
