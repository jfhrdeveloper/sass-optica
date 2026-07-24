import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ================= INVITAR EMPLEADO ================= */
/* Crea el usuario en Supabase Auth (envía email para fijar su contraseña) y  */
/* completa su fila en `empleados`. El trigger handle_new_user solo inserta   */
/* id/email/nombres; aquí (service role) se completa el resto (negocio_id,    */
/* rol). Solo el `administrador` de un negocio puede invitar — ver brief §5.  */
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
    return NextResponse.json({ error: "No tienes permiso para invitar empleados." }, { status: 403 });
  }

  /* ====== 2. Payload ====== */
  const body = await req.json().catch(() => ({}));
  const email     = String(body.email ?? "").trim().toLowerCase();
  const nombres   = String(body.nombres ?? "").trim();
  const apellidos = String(body.apellidos ?? "").trim();
  if (!email)   return NextResponse.json({ error: "El email es obligatorio." }, { status: 400 });
  if (!nombres) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });

  /* Rol opcional en el payload: solo se acepta encargado/trabajador — nunca
     se puede dar de alta a otro administrador desde aquí (invariante 7). */
  const rolPedido = String(body.rol ?? "trabajador");
  const rol = rolPedido === "encargado" ? "encargado" : "trabajador";

  const admin = createAdminClient();

  /* ====== 3. Invitar: crea auth.users + dispara handle_new_user ======
     El trigger inserta empleados(id, email, nombres) con `nombres` desde
     metadata. redirectTo apunta SIEMPRE al dominio raíz (ahí vive el login). */
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? new URL(req.url).hostname;
  const protocol = new URL(req.url).protocol;
  const redirectTo = `${protocol}//${rootDomain}/login/nueva-clave`;

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre: nombres },
    redirectTo,
  });
  if (inviteErr || !invited?.user) {
    const msg = inviteErr?.message ?? "No se pudo enviar la invitación.";
    const friendly = /already|registered|exists/i.test(msg)
      ? "Ya existe un usuario con ese email."
      : /invalid format|valid email|email address/i.test(msg)
      ? "El email no tiene un formato válido."
      : /rate limit|too many/i.test(msg)
      ? "Se enviaron demasiadas invitaciones. Espera un momento e inténtalo de nuevo."
      : "No se pudo enviar la invitación. Verifica el email e inténtalo de nuevo.";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
  const newId = invited.user.id;

  /* ====== 4. Completar el resto del perfil ======
     Upsert (no update) por si el trigger aún no insertó la fila. Siempre
     dentro del negocio del actor — nunca se elige otro negocio desde aquí. */
  const { error: updErr } = await admin.from("empleados").upsert(
    { id: newId, nombres, apellidos, email, negocio_id: actor.negocio_id, rol, activo: true },
    { onConflict: "id" },
  );
  if (updErr) {
    return NextResponse.json(
      { id: newId, error: `Empleado invitado, pero el perfil quedó incompleto: ${updErr.message}` },
      { status: 207 },
    );
  }

  return NextResponse.json({ id: newId });
}
