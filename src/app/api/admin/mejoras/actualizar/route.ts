import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode, MOCK_ADMIN_COOKIE, MOCK_MEJORAS_ESTADO_COOKIE } from "@/lib/mock/mock-mode";
import { leerOverridesMejoras } from "@/lib/mock/mock-admin-overrides";

const ESTADOS_VALIDOS = ["pendiente", "planificado", "en_progreso", "completado", "rechazado"];

/* ================= CAMBIAR ESTADO DE UNA MEJORA SUGERIDA ================= */
/* Mismo patrón de autorización que /api/admin/reclamos/actualizar: exige
   membresía en super_admins. El negocio que propuso la mejora NUNCA puede
   cambiar su propio estado (sin policy de update en mejoras_sugeridas, ver
   supabase-schema.sql) — es exclusivamente una decisión del dueño del SaaS. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const estado = String(body.estado ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta el id de la mejora." }, { status: 400 });
  if (!ESTADOS_VALIDOS.includes(estado)) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });

  if (isMockMode()) {
    const c = await cookies();
    if (!c.get(MOCK_ADMIN_COOKIE)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const overrides = await leerOverridesMejoras();
    overrides[id] = estado;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(MOCK_MEJORAS_ESTADO_COOKIE, encodeURIComponent(JSON.stringify(overrides)), {
      path: "/", maxAge: 86400,
    });
    return res;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: esSuperAdmin } = await admin
    .from("super_admins").select("id").eq("id", user.id).maybeSingle();
  if (!esSuperAdmin) {
    return NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });
  }

  const { error } = await admin.from("mejoras_sugeridas").update({ estado }).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la mejora." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
