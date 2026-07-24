import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarFormatoSlug } from "@/lib/slug";
import { isMockMode } from "@/lib/mock/mock-mode";

/* ================= DISPONIBILIDAD DE SUBDOMINIO (estilo Instagram) ================= */
/* Endpoint público de solo lectura: no expone datos del negocio, solo si el   */
/* subdominio está libre. RLS de `negocios` no deja leer filas ajenas al       */
/* anon/authenticated (solo tu propio negocio) — por eso este chequeo pasa    */
/* por el cliente admin, server-side, devolviendo únicamente un booleano.      */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim().toLowerCase() ?? "";

  const formato = validarFormatoSlug(slug);
  if (!formato.valido) {
    return NextResponse.json({ disponible: false, error: formato.error });
  }

  /* Modo mock (ver mock-mode.ts): sin Supabase real conectado, cualquier
     slug con formato válido queda "disponible" — solo para poder probar el
     paso 1 del registro (SlideOver/AuthPage) sin un proyecto real. */
  if (isMockMode()) {
    return NextResponse.json({ disponible: true });
  }

  const admin = createAdminClient();
  const { data } = await admin.from("negocios").select("id").eq("subdominio", slug).maybeSingle();

  return NextResponse.json({ disponible: !data });
}
