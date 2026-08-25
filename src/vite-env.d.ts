/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_SECRET?: string;
  readonly VITE_ADMIN_USER?: string;
  readonly VITE_ADMIN_PASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
