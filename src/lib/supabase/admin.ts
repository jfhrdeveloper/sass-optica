import { createClient } from "@supabase/supabase-js";

/* ====== Cliente con SERVICE ROLE — SOLO server-side ======
   Salta RLS y habilita auth.admin (crear/invitar/eliminar usuarios, etc.).
   NUNCA importar desde un componente "use client": expondría la service key.
   Solo se consume en route handlers / server actions. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
