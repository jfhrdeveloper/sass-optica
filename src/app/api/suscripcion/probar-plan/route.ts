import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esPlanIdValido, datosSuscripcionParaPlan } from "@/lib/precios";
import { limiteExcedido, ipDelRequest } from "@/lib/rate-limit";

const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000;

/* ================= PROBAR UN PLAN PAGO SIN PAGAR ================= */
/* Contraparte "sin Culqi" de /api/pagos/culqi/cargo: arranca un trial de 30
   días de Básico/Premium con todo desbloqueado, sin tarjeta — mismo patrón
   de autorización (solo administrador de SU negocio) y mismos datos de
   trial que ya usa /api/registro (datosSuscripcionParaPlan, lib/precios.ts).
   Solo se puede pedir desde el plan Gratis: un negocio que ya está pagando
   o ya está en un trial usa el checkout real para cambiar de plan, no este
   endpoint — evita reiniciar el trial a voluntad. Nunca toca Culqi ni
   pagos_saas: esto no es un cobro. */
export async function POST(req: Request) {
  if (limiteExcedido(`probar-plan:${ipDelRequest(req)}`, MAX_INTENTOS, VENTANA_MS)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { data: actor } = await supabase
    .from("empleados").select("rol, negocio_id").eq("id", user.id).single();
  if (actor?.rol !== "administrador" || !actor.negocio_id) {
    return NextResponse.json({ error: "Solo el administrador puede cambiar el plan." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = String(body.planId ?? "");
  if (!esPlanIdValido(planId) || planId === "gratis") {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: actual } = await admin
    .from("suscripciones").select("plan").eq("negocio_id", actor.negocio_id).maybeSingle();
  if (actual?.plan !== "gratis") {
    return NextResponse.json(
      { error: "Ya tienes un plan activo o en prueba — actívalo o espera a que termine antes de probar otro." },
      { status: 409 },
    );
  }

  const { error: subErr } = await admin
    .from("suscripciones")
    .update(datosSuscripcionParaPlan(planId))
    .eq("negocio_id", actor.negocio_id);
  if (subErr) {
    return NextResponse.json({ error: "No se pudo activar la prueba. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
