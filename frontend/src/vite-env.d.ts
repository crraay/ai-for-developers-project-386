/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API, baked in at build time by the Vite mode (ADR-0009). */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
