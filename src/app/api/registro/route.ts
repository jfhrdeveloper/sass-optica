import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarFormatoSlug } from "@/lib/slug";

/* ================= REGISTRO SELF-SERVICE ================= */
/* Flujo que NO es parte del patrón base de invitación: un visitante anónimo  */
/* crea su propio negocio, sin que un administrador exista de antemano. Debe  */
/* ser atómico — ver docs/architecture.md invariante "el registro self-service */
/* es atómico": si cualquier paso falla, no debe quedar un negocio huérfano    */
/* sin administrador ni un usuario de Auth sin perfil completo.                */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const nombreNegocio = String(body.nombreNegocio ?? "").trim();
  const subdominio    = String(body.subdominio ?? "").trim().toLowerCase();
  const nombres       = String(body.nombres ?? "").trim();
  const apellidos     = String(body.apellidos ?? "").trim();
  const email          = String(body.email ?? "").trim().toLowerCase();
  const password       = String(body.password ?? "");

  /* ====== 1. Validación server-side (NUNCA confiar solo en el frontend) ====== */
  if (!nombreNegocio) return NextResponse.json({ error: "El nombre del negocio es obligatorio." }, { status: 400 });
  if (!nombres)        return NextResponse.json({ error: "Tu nombre es obligatorio." }, { status: 400 });
  if (!email)          return NextResponse.json({ error: "El email es obligatorio." }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  const formato = validarFormatoSlug(subdominio);
  if (!formato.valido) {
    return NextResponse.json({ error: formato.error }, { status: 400 });
  }

  const admin = createAdminClient();

  /* ====== 2. Unicidad del subdominio (pre-check; el constraint UNIQUE de la
     tabla es la garantía real ante condiciones de carrera) ====== */
  const { data: existente } = await admin
    .from("negocios").select("id").eq("subdominio", subdominio).maybeSingle();
  if (existente) {
    return NextResponse.json(
      { error: "Ese subdominio ya está en uso.", campo: "subdominio" },
      { status: 409 },
    );
  }

  /* ====== 3. Crear el negocio (tenant) ====== */
  const { data: negocio, error: negocioErr } = await admin
    .from("negocios")
    .insert({ nombre: nombreNegocio, subdominio })
    .select("id, subdominio")
    .single();
  if (negocioErr || !negocio) {
    const duplicado = negocioErr?.code === "23505"; // unique_violation (carrera con otro registro)
    return NextResponse.json(
      { error: duplicado ? "Ese subdominio ya está en uso." : "No se pudo crear el negocio." },
      { status: duplicado ? 409 : 500 },
    );
  }

  /* ====== 4. Crear el usuario de Auth (self-service: password inmediata,
     sin flujo de invitación por email — email_confirm:true lo da por
     verificado). Dispara handle_new_user (fila `empleados` mínima). ====== */
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: nombres },
  });
  if (userErr || !created?.user) {
    await admin.from("negocios").delete().eq("id", negocio.id); // rollback
    const msg = userErr?.message ?? "";
    const friendly = /already|registered|exists/i.test(msg)
      ? "Ya existe una cuenta con ese email."
      : "No se pudo crear tu cuenta. Intenta de nuevo.";
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
  const userId = created.user.id;

  /* ====== 5. Completar el perfil como administrador de este negocio ====== */
  const { error: empErr } = await admin
    .from("empleados")
    .upsert(
      { id: userId, negocio_id: negocio.id, nombres, apellidos, email, rol: "administrador", activo: true },
      { onConflict: "id" },
    );
  if (empErr) {
    await admin.auth.admin.deleteUser(userId); // rollback (cascada limpia empleados)
    await admin.from("negocios").delete().eq("id", negocio.id);
    return NextResponse.json({ error: "No se pudo completar tu perfil. Intenta de nuevo." }, { status: 500 });
  }

  /* ====== 6. Suscripción en trial (30 días — defaults de la tabla) ====== */
  const { error: subErr } = await admin.from("suscripciones").insert({ negocio_id: negocio.id });
  if (subErr) {
    await admin.auth.admin.deleteUser(userId); // rollback total
    await admin.from("negocios").delete().eq("id", negocio.id);
    return NextResponse.json({ error: "No se pudo activar tu prueba gratuita. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ subdominio: negocio.subdominio });
}
