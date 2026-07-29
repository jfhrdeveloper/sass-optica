import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { montoCentimosSegunCiclo, type CicloFacturacion } from "@/lib/precios";

/* ================= CONFIRMAR CARGO DE CULQI ================= */
/* Recibe el token que entregó el Checkout embebido (ver CulqiCheckoutButton) */
/* y crea el cargo real contra la API de Culqi con la llave SECRETA — esto    */
/* SIEMPRE es server-side, el token nunca autoriza un cobro por sí solo sin   */
/* pasar por aquí. Si el cargo se aprueba, activa el plan/ciclo elegido en    */
/* la suscripción del negocio del administrador que hace la request.         */
/* NOTA: el shape exacto de la respuesta de Culqi (`outcome.type`, etc.) hay  */
/* que confirmarlo contra la documentación oficial al conectar credenciales   */
/* reales — esto es la mejor forma conocida al momento de escribir esto. */
export async function POST(req: Request) {
  const secretKey = process.env.CULQI_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Culqi no está configurado en el servidor." }, { status: 503 });
  }

  /* ====== 1. Autorización: solo administrador paga la suscripción de SU negocio ====== */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { data: actor } = await supabase
    .from("empleados").select("rol, negocio_id, email").eq("id", user.id).single();
  if (actor?.rol !== "administrador" || !actor.negocio_id) {
    return NextResponse.json({ error: "Solo el administrador puede pagar la suscripción." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const planId = String(body.planId ?? "");
  const ciclo = body.ciclo === "anual" ? "anual" : "mensual";
  if (!token) return NextResponse.json({ error: "Falta el token de pago." }, { status: 400 });

  /* El monto NUNCA se recibe del cliente: se recalcula acá a partir del
     `planId` (Básico/Premium) usando la misma fuente de precios que la
     landing (lib/precios.ts) — así un cliente manipulado no puede pagar
     S/1 por el plan Premium. */
  const montoCentimos = montoCentimosSegunCiclo(planId, ciclo as CicloFacturacion);
  if (montoCentimos == null) {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }

  /* ====== 2. Crear el cargo contra la API de Culqi ====== */
  const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      amount: montoCentimos,
      currency_code: "PEN",
      email: actor.email,
      source_id: token,
      metadata: { negocio_id: actor.negocio_id },
    }),
  }).catch(() => null);

  if (!culqiRes || !culqiRes.ok) {
    const detalle = culqiRes ? await culqiRes.json().catch(() => null) : null;
    return NextResponse.json(
      { error: detalle?.user_message ?? "El pago no pudo procesarse. Verifica los datos de tu tarjeta." },
      { status: 400 },
    );
  }
  const cargo = await culqiRes.json().catch(() => null);

  /* ====== 3. Reactivar la suscripción (service_role — nunca desde el cliente) ====== */
  const admin = createAdminClient();
  const hoy = new Date();
  const proximoCobro = new Date(hoy);
  proximoCobro.setDate(proximoCobro.getDate() + (ciclo === "anual" ? 365 : 30));

  const { error: subErr } = await admin
    .from("suscripciones")
    .update({
      estado: "activa",
      plan: planId,
      fecha_pago_ultimo: hoy.toISOString().slice(0, 10),
      proximo_cobro: proximoCobro.toISOString().slice(0, 10),
    })
    .eq("negocio_id", actor.negocio_id);

  if (subErr) {
    /* El cargo SÍ se realizó — esto es un problema operativo a resolver
       manualmente, no un rechazo de pago. Se informa distinto al usuario. */
    return NextResponse.json(
      { error: "El pago se realizó, pero hubo un problema activando tu cuenta. Contáctanos." },
      { status: 207 },
    );
  }

  /* ====== 4. Registrar el cobro para el panel admin (pagos_saas) ======
     Vía primaria de registro — el webhook es solo respaldo async. NOTA: el
     campo que indica el método real (tarjeta vs. Yape) hay que confirmarlo
     contra la doc de Culqi con credenciales reales; `source?.type` es la
     mejor lectura disponible hoy. culqi_cargo_id es UNIQUE — si el webhook
     llega después para el mismo cargo, el conflicto lo ignora sin duplicar. */
  await admin.from("pagos_saas").insert({
    negocio_id: actor.negocio_id,
    monto: montoCentimos / 100,
    metodo_pago: cargo?.source?.type === "yape" ? "yape" : "tarjeta",
    culqi_cargo_id: cargo?.id ?? null,
  });
  /* Un error acá (p. ej. culqi_cargo_id duplicado si el webhook ya insertó
     este mismo cargo) no debe bloquear la respuesta al usuario — el pago
     y la reactivación ya se confirmaron arriba. */

  return NextResponse.json({ ok: true });
}
