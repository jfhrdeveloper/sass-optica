import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode, MOCK_ADMIN_COOKIE, MOCK_RECLAMOS_OVERRIDE_COOKIE } from "@/lib/mock/mock-mode";
import { leerOverridesReclamos } from "@/lib/mock/mock-admin-overrides";

/* ================= MARCAR RECLAMO COMO ATENDIDO ================= */
/* Mismo patrón de autorización que /api/admin/negocios/toggle-activo:
   requiere membresía en super_admins, no solo estar logueado — este
   endpoint escribe sobre datos de un tercero (el consumidor reclamante). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const respuesta = String(body.respuesta ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta el id del reclamo." }, { status: 400 });
  if (!respuesta) return NextResponse.json({ error: "La respuesta no puede estar vacía." }, { status: 400 });

  if (isMockMode()) {
    const c = await cookies();
    if (!c.get(MOCK_ADMIN_COOKIE)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const overrides = await leerOverridesReclamos();
    overrides[id] = { estado: "atendido", respuesta };
    const res = NextResponse.json({ ok: true });
    res.cookies.set(MOCK_RECLAMOS_OVERRIDE_COOKIE, encodeURIComponent(JSON.stringify(overrides)), {
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

  const { error } = await admin
    .from("libro_reclamaciones")
    .update({ estado: "atendido", respuesta })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el reclamo." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
