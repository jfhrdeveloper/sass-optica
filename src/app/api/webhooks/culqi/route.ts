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
/* IMPORTANTE al conectar credenciales reales: verificar contra la doc de     */
/* Culqi el mecanismo de firma del webhook (si expone alguno) para confirmar  */
/* que la request viene realmente de Culqi y no de un tercero — hoy este      */
/* endpoint NO valida firma porque no hay credenciales reales para probarla.  */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const negocioId = body?.data?.metadata?.negocio_id ?? body?.metadata?.negocio_id;
  const tipoEvento = String(body?.type ?? body?.event ?? "");

  if (!negocioId) {
    /* Sin negocio_id no hay nada que actualizar — se responde 200 igual
       para que Culqi no reintente indefinidamente un evento que no aplica. */
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const eventosPagoOk = ["charge.succeeded", "order.succeeded"];
  if (!eventosPagoOk.includes(tipoEvento)) {
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
  const cargoData = body?.data ?? body;
  const montoCentimos = Number(cargoData?.amount ?? 0);
  if (montoCentimos > 0) {
    await admin.from("pagos_saas").insert({
      negocio_id: negocioId,
      monto: montoCentimos / 100,
      moneda: cargoData?.currency_code ?? "PEN",
      metodo_pago: cargoData?.source?.type === "yape" ? "yape" : "tarjeta",
      culqi_cargo_id: cargoData?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
