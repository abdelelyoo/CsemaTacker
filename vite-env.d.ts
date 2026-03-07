/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_CLOUD_SYNC: string;
  readonly VITE_ENABLE_AI_INSIGHTS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
