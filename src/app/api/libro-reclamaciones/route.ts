import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarReclamo, type DatosReclamo } from "@/lib/reclamos";
import { limiteExcedido, ipDelRequest } from "@/lib/rate-limit";

/* 3 reclamos cada 10 min por IP — un consumidor real no manda más de un par
   seguidos; corta el spam obvio sin estorbar el uso legítimo. Ver
   rate-limit.ts: best-effort hasta desplegar y configurar Vercel Firewall. */
const MAX_INTENTOS = 3;
const VENTANA_MS = 10 * 60 * 1000;

/* ================= LIBRO DE RECLAMACIONES (INDECOPI) ================= */
/* Alta pública, sin login — cualquier consumidor puede reclamar. Escribe
   SIEMPRE vía service_role (la tabla es deny-all para anon/authenticated,
   ver supabase-schema.sql): la validación y el rate limit de acá SON la
   única defensa contra abuso, no hay RLS de por medio. */
export async function POST(req: Request) {
  if (limiteExcedido(`libro-reclamaciones:${ipDelRequest(req)}`, MAX_INTENTOS, VENTANA_MS)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const datos: Partial<DatosReclamo> = {
    tipo: body.tipo,
    consumidorNombres: String(body.consumidorNombres ?? "").trim(),
    consumidorApellidos: String(body.consumidorApellidos ?? "").trim(),
    consumidorDocumentoTipo: String(body.consumidorDocumentoTipo ?? "").trim(),
    consumidorDocumentoNumero: String(body.consumidorDocumentoNumero ?? "").trim(),
    consumidorDomicilio: String(body.consumidorDomicilio ?? "").trim(),
    consumidorTelefono: body.consumidorTelefono ? String(body.consumidorTelefono).trim() : undefined,
    consumidorEmail: String(body.consumidorEmail ?? "").trim().toLowerCase(),
    esMenorEdad: Boolean(body.esMenorEdad),
    apoderadoNombre: body.apoderadoNombre ? String(body.apoderadoNombre).trim() : undefined,
    bienTipo: body.bienTipo,
    bienDescripcion: String(body.bienDescripcion ?? "").trim(),
    montoReclamado: body.montoReclamado != null && body.montoReclamado !== "" ? Number(body.montoReclamado) : undefined,
    detalle: String(body.detalle ?? "").trim(),
    pedido: String(body.pedido ?? "").trim(),
  };

  const error = validarReclamo(datos);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("libro_reclamaciones")
    .insert({
      tipo: datos.tipo,
      consumidor_nombres: datos.consumidorNombres,
      consumidor_apellidos: datos.consumidorApellidos,
      consumidor_documento_tipo: datos.consumidorDocumentoTipo,
      consumidor_documento_numero: datos.consumidorDocumentoNumero,
      consumidor_domicilio: datos.consumidorDomicilio,
      consumidor_telefono: datos.consumidorTelefono || null,
      consumidor_email: datos.consumidorEmail,
      es_menor_edad: datos.esMenorEdad,
      apoderado_nombre: datos.apoderadoNombre || null,
      bien_tipo: datos.bienTipo,
      bien_descripcion: datos.bienDescripcion,
      monto_reclamado: datos.montoReclamado ?? null,
      detalle: datos.detalle,
      pedido: datos.pedido,
    })
    .select("numero, created_at")
    .single();

  if (dbError || !data) {
    return NextResponse.json({ error: "No se pudo registrar tu reclamo. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ numero: data.numero, createdAt: data.created_at });
}
