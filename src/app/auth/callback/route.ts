import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ================= CALLBACK OAuth (Google, flujo PKCE) =================
   Destino de `signInWithOAuth` (ver AuthPage.tsx) — Supabase redirige acá
   con `?code=...` después de que el usuario autoriza en Google. El cliente
   browser que inició el flujo dejó el `code_verifier` en una cookie; este
   cliente server SÍ puede leerla (misma request) y completar el intercambio
   PKCE, dejando la sesión en cookies compartidas con los subdominios (ver
   cookie-domain.ts) — mismo objetivo que /auth/confirm, pero para el flujo
   `code` en vez de `token_hash` (ese es para enlaces de invitación/reset,
   que no tienen code_verifier porque los genera el servidor, no este
   navegador).

   `handle_new_user()` (trigger en supabase-schema.sql) ya insertó una fila
   `empleados` mínima (negocio_id NULL) apenas Supabase creó el auth.user de
   Google — si sigue en NULL, es una cuenta de Google nueva sin negocio
   todavía: la mandamos a completar el alta en vez de al destino pedido. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: empleado } = await supabase
        .from("empleados").select("negocio_id").eq("id", data.user.id).maybeSingle();
      if (!empleado?.negocio_id) {
        return NextResponse.redirect(new URL("/registro/completar", origin));
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/login", origin));
}
