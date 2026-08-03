import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ================= WEBHOOK DE CULQI ================= */
/* Endpoint público (Culqi lo llama server-a-server, sin sesión de usuario).  */
/* Para el flujo de MVP (un solo cargo vía Checkout embebido), la vía         */
/* PRINCIPAL de confirmación es la respuesta síncrona de la API de Culqi en   */
/* /api/pagos/culqi/cargo — este webhook es un respaldo/best-effort para      */
/* eventos asíncronos futuros (reintentos, suscripciones recurrentes reales   */
/* de Culqi cuando se implementen — brief §8 fase posterior). Idempotente:    */
/* si el negocio ya está "activa", no rompe nada volver a marcarla.           */
/*                                                                            */
/* Culqi NO firma sus webhooks (confirmado contra docs.culqi.com — a          */
/* diferencia de Stripe, no expone HMAC ni secreto compartido ni header de    */
/* verificación). Por eso el body del POST se trata como NO confiable: en vez */
/* de activar la suscripción con lo que diga el payload, se vuelve a          */
/* consultar el cargo contra la API de Culqi (server-a-server, con la llave   */
/* secreta) y solo se actúa sobre lo que Culqi confirme — así un tercero no   */
/* puede fabricar un negocio_id + "charge.succeeded" falso para activar un    */
/* plan pago gratis.                                                         */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const tipoEvento = String(body?.type ?? body?.event ?? "");
  const eventosPagoOk = ["charge.succeeded", "order.succeeded"];
  if (!eventosPagoOk.includes(tipoEvento)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const cargoId = String(body?.data?.id ?? body?.id ?? "");
  const secretKey = process.env.CULQI_SECRET_KEY;
  if (!cargoId || !secretKey) {
    /* Sin llave secreta no hay forma de verificar nada contra Culqi — no se
       activa ningún plan a partir de un payload sin confirmar. */
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const culqiRes = await fetch(`https://api.culqi.com/v2/charges/${cargoId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  }).catch(() => null);
  if (!culqiRes || !culqiRes.ok) {
    /* Culqi no reconoce este cargo (o falló la consulta) — el payload no es
       confiable, se ignora sin tocar ninguna suscripción. */
    return NextResponse.json({ ok: true, ignorado: true });
  }
  const cargoVerificado = await culqiRes.json().catch(() => null);

  const negocioId = cargoVerificado?.metadata?.negocio_id;
  const montoCentimos = Number(cargoVerificado?.amount ?? 0);
  if (!negocioId || montoCentimos <= 0) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const admin = createAdminClient();
  const hoy = new Date();
  const proximoCobro = new Date(hoy);
  proximoCobro.setDate(proximoCobro.getDate() + 30);

  await admin.from("suscripciones").update({
    estado: "activa",
    fecha_pago_ultimo: hoy.toISOString().slice(0, 10),
    proximo_cobro: proximoCobro.toISOString().slice(0, 10),
  }).eq("negocio_id", negocioId);

  /* Registro para el panel admin (pagos_saas) — respaldo del insert que ya
     intenta /api/pagos/culqi/cargo (vía primaria). culqi_cargo_id es UNIQUE:
     si ese camino ya insertó este cargo, el conflicto se ignora sin duplicar. */
  await admin.from("pagos_saas").insert({
    negocio_id: negocioId,
    monto: montoCentimos / 100,
    moneda: cargoVerificado?.currency_code ?? "PEN",
    metodo_pago: cargoVerificado?.source?.type === "yape" ? "yape" : "tarjeta",
    culqi_cargo_id: cargoVerificado?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}
