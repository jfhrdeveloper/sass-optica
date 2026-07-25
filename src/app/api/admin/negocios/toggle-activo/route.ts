import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode, MOCK_ADMIN_COOKIE, MOCK_NEGOCIOS_OVERRIDE_COOKIE } from "@/lib/mock/mock-mode";
import { leerOverridesActivo } from "@/lib/mock/mock-admin-overrides";

/* ================= SUSPENDER / REACTIVAR UN NEGOCIO ================= */
/* Mismo criterio que negocios.activo en el propio dashboard de la óptica
   ("Zona de peligro" en /dashboard/ajustes) — reversible, nunca un DELETE
   real. Acá lo hace el dueño del SaaS sobre CUALQUIER negocio, así que la
   autorización exige membresía en super_admins (no basta con estar
   logueado). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const activo = Boolean(body.activo);
  if (!id) return NextResponse.json({ error: "Falta el id del negocio." }, { status: 400 });

  if (isMockMode()) {
    /* Sin proxy real resolviendo admin.dominio ni tabla super_admins — ver
       mock-mode.ts. El estado se guarda en una cookie de overrides, no en
       el array mock en memoria: Turbopack no garantiza que este route
       handler y el Server Component que renderiza la página compartan la
       misma instancia de módulo en dev — ver mock-admin-overrides.ts. */
    const c = await cookies();
    if (!c.get(MOCK_ADMIN_COOKIE)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const overrides = await leerOverridesActivo();
    overrides[id] = activo;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(MOCK_NEGOCIOS_OVERRIDE_COOKIE, encodeURIComponent(JSON.stringify(overrides)), {
      path: "/", maxAge: 86400,
    });
    return res;
  }

  /* ====== Autorización real: sesión + membresía en super_admins ====== */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: esSuperAdmin } = await admin
    .from("super_admins").select("id").eq("id", user.id).maybeSingle();
  if (!esSuperAdmin) {
    return NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });
  }

  const { error } = await admin.from("negocios").update({ activo }).eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el negocio." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
