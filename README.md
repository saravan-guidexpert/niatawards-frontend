# niatawards-frontend

Vite + React + TypeScript UI for NIAT Educator Awards 2026.

```bash
npm install
npm run dev
```

UI: http://localhost:8080

Copy `.env.example` to `.env` and set:

- `VITE_API_URL` — backend origin (default `http://localhost:5000`)
- `VITE_ADMIN_SECRET` — must match the backend `ADMIN_SECRET`
- `VITE_ADMIN_USER` / `VITE_ADMIN_PASS` — optional admin login overrides
