import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode, MOCK_ADMIN_COOKIE, MOCK_NOTAS_SOPORTE_COOKIE } from "@/lib/mock/mock-mode";
import { leerNotasSoporteMock, type NotaSoporteMock } from "@/lib/mock/mock-admin-overrides";

/* ================= AGREGAR NOTA INTERNA DE SOPORTE ================= */
/* Mismo patrón de autorización que /api/admin/negocios/toggle-activo: exige
   membresía en super_admins, no solo estar logueado — esta tabla es
   deny-all para cualquier negocio-tenant (ver notas_soporte en
   supabase-schema.sql). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const negocioId = String(body.negocioId ?? "").trim();
  const texto = String(body.texto ?? "").trim();
  if (!negocioId) return NextResponse.json({ error: "Falta el id del negocio." }, { status: 400 });
  if (!texto) return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });

  if (isMockMode()) {
    const c = await cookies();
    if (!c.get(MOCK_ADMIN_COOKIE)) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const notas = await leerNotasSoporteMock();
    const nueva: NotaSoporteMock = {
      id: crypto.randomUUID(), negocio_id: negocioId, autor: "Soporte",
      texto, created_at: new Date().toISOString(),
    };
    notas.push(nueva);
    const res = NextResponse.json({ ok: true, nota: nueva });
    res.cookies.set(MOCK_NOTAS_SOPORTE_COOKIE, encodeURIComponent(JSON.stringify(notas)), {
      path: "/", maxAge: 86400,
    });
    return res;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: superAdmin } = await admin
    .from("super_admins").select("id, nombre").eq("id", user.id).maybeSingle();
  if (!superAdmin) {
    return NextResponse.json({ error: "No tienes permiso para esta acción." }, { status: 403 });
  }

  const { data, error } = await admin
    .from("notas_soporte")
    .insert({ negocio_id: negocioId, autor_id: user.id, texto })
    .select("id, negocio_id, texto, created_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 400 });

  return NextResponse.json({ ok: true, nota: { ...data, autor: superAdmin.nombre || "Soporte" } });
}
