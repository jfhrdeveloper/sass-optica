import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ================= ELIMINAR EMPLEADO ================= */
/* Borra el usuario de Supabase Auth (auth.users). Como `empleados.id` es FK    */
/* `on delete cascade` de auth.users, la fila de empleados cae en cascada. NO   */
/* borrar solo de `empleados`: dejaría el email registrado en Auth → no se      */
/* podría reinvitar. Solo el `administrador` de un negocio puede eliminar.      */
export async function POST(req: Request) {
  /* ====== 1. Autorización: solo administrador ====== */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { data: actor } = await supabase
    .from("empleados").select("rol, negocio_id").eq("id", user.id).single();
  if (actor?.rol !== "administrador" || !actor.negocio_id) {
    return NextResponse.json({ error: "No tienes permiso para eliminar empleados." }, { status: 403 });
  }

  /* ====== 2. Payload ====== */
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Falta el id del empleado." }, { status: 400 });
  if (id === user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }

  const admin = createAdminClient();

  /* ====== 3. Reglas de dominio (defensa en servidor) ======
     Solo se eliminan empleados de encargado/trabajador (nunca otro
     administrador) y siempre dentro del propio negocio del actor. */
  const { data: objetivo, error: objErr } = await admin
    .from("empleados").select("rol, negocio_id").eq("id", id).single();
  if (objErr || !objetivo) {
    return NextResponse.json({ error: "El empleado ya no existe." }, { status: 404 });
  }
  if (objetivo.rol === "administrador") {
    return NextResponse.json({ error: "No se puede eliminar a un administrador desde aquí." }, { status: 403 });
  }
  if (objetivo.negocio_id !== actor.negocio_id) {
    return NextResponse.json({ error: "Solo puedes eliminar empleados de tu propio negocio." }, { status: 403 });
  }

  /* ====== 4. Borrar de Auth → cascada elimina empleados y sus registros ====== */
  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    return NextResponse.json({ error: `No se pudo eliminar: ${delErr.message}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
