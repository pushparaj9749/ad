/* =========================================================
   ad. studio — app configuration
   ---------------------------------------------------------
   MODE 1 · LOCAL (default) — Simple
   Data lives in this browser (IndexedDB + localStorage).
   No setup. Sign up with any email/password.

   MODE 2 · MULTI-USER SAAS — Supabase Free
   1) Create a free project at https://supabase.com
   2) Run supabase/schema.sql in the Supabase SQL Editor
   3) Paste your Project URL + anon public key below, OR
      click "Connect cloud" inside the app and paste them
      there (stored in this browser, no file editing needed).
   ========================================================= */

window.ADSTUDIO_CONFIG = {
  supabaseUrl: "",     // e.g. "https://ab12cd34.supabase.co"
  supabaseAnonKey: "", // e.g. "eyJhbGciOiJIUzI1NiIs..." (anon / public key)
};
