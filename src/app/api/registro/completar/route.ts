import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarFormatoSlug } from "@/lib/slug";
import { esPlanIdValido, datosSuscripcionParaPlan } from "@/lib/precios";

/* ================= COMPLETAR REGISTRO (cuentas de Google) =================
   Contraparte de /api/registro para quien llegó por "Registrarse con
   Google" (ver AuthPage.tsx → /auth/callback/route.ts →
   /registro/completar/page.tsx). El auth.user YA existe — lo creó Supabase
   al autenticar con Google — y handle_new_user() ya insertó una fila
   `empleados` mínima con negocio_id NULL. Acá solo se crea el negocio +
   suscripción y se completa esa fila; nunca se crea un usuario de Auth ni
   se pide contraseña (a diferencia de /api/registro). Mismo criterio de
   atomicidad con rollback manual que ahí — ver docs/architecture.md. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tu sesión expiró. Vuelve a intentar con Google." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const nombreNegocio = String(body.nombreNegocio ?? "").trim();
  const subdominio    = String(body.subdominio ?? "").trim().toLowerCase();
  const planCandidato = String(body.plan ?? "");
  const planElegido   = esPlanIdValido(planCandidato) ? planCandidato : "gratis";

  if (!nombreNegocio) return NextResponse.json({ error: "El nombre del negocio es obligatorio." }, { status: 400 });
  const formato = validarFormatoSlug(subdominio);
  if (!formato.valido) {
    return NextResponse.json({ error: formato.error }, { status: 400 });
  }

  const admin = createAdminClient();

  /* Defensa en profundidad: la página server-side ya redirige a quien ya
     completó el alta antes de llegar aquí; esto cubre una llamada directa
     al endpoint (curl/replay) que le pisaría el negocio a su cuenta. */
  const { data: empleadoActual } = await admin
    .from("empleados").select("negocio_id").eq("id", user.id).maybeSingle();
  if (empleadoActual?.negocio_id) {
    return NextResponse.json({ error: "Tu cuenta ya pertenece a un negocio." }, { status: 409 });
  }

  const { data: existente } = await admin
    .from("negocios").select("id").eq("subdominio", subdominio).maybeSingle();
  if (existente) {
    return NextResponse.json({ error: "Ese subdominio ya está en uso.", campo: "subdominio" }, { status: 409 });
  }

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

  /* El nombre completo viene del perfil de Google (full_name/name) — mejor
     esfuerzo, nunca bloquea el alta si Google no lo entregó. */
  const nombreGoogle = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  const [nombres, ...resto] = nombreGoogle ? nombreGoogle.split(" ") : [""];
  const apellidos = resto.join(" ");

  const { error: empErr } = await admin
    .from("empleados")
    .update({
      negocio_id: negocio.id, rol: "administrador", activo: true,
      nombres: nombres || "Administrador", apellidos, email: user.email ?? null,
    })
    .eq("id", user.id);
  if (empErr) {
    await admin.from("negocios").delete().eq("id", negocio.id); // rollback
    return NextResponse.json({ error: "No se pudo completar tu perfil. Intenta de nuevo." }, { status: 500 });
  }

  const { error: subErr } = await admin
    .from("suscripciones")
    .insert({ negocio_id: negocio.id, ...datosSuscripcionParaPlan(planElegido) });
  if (subErr) {
    await admin.from("empleados").update({ negocio_id: null, rol: "trabajador" }).eq("id", user.id); // rollback
    await admin.from("negocios").delete().eq("id", negocio.id);
    return NextResponse.json({ error: "No se pudo activar tu plan. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ subdominio: negocio.subdominio });
}
