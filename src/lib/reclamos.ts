import { RAZON_SOCIAL, RUC, ATENCION_100_VIRTUAL } from "@/lib/contacto";

/* ================= LIBRO DE RECLAMACIONES (INDECOPI) =================
   D.S. 011-2011-PCE exige que cualquier proveedor tenga un Libro de
   Reclamaciones accesible sin depender de un formulario o archivo externo
   (ver docs/pending-task.md). Este módulo separa la validación pura (para
   /api/libro-reclamaciones) de la constancia imprimible que la ley exige
   entregarle al consumidor — mismo criterio que lib/recibo.ts. */

export type TipoReclamo = "reclamo" | "queja";
export type TipoBien = "producto" | "servicio";

export interface DatosReclamo {
  tipo: TipoReclamo;
  consumidorNombres: string;
  consumidorApellidos: string;
  consumidorDocumentoTipo: string;
  consumidorDocumentoNumero: string;
  consumidorDomicilio: string;
  consumidorTelefono?: string;
  consumidorEmail: string;
  esMenorEdad: boolean;
  /** Obligatorio si `esMenorEdad` — la hoja oficial de INDECOPI lo exige. */
  apoderadoNombre?: string;
  bienTipo: TipoBien;
  bienDescripcion: string;
  montoReclamado?: number;
  detalle: string;
  pedido: string;
}

/** Validación server-side (nunca confiar solo en el formulario) — devuelve
 *  el primer campo obligatorio faltante, o `null` si todo está completo. */
export function validarReclamo(d: Partial<DatosReclamo>): string | null {
  if (d.tipo !== "reclamo" && d.tipo !== "queja") return "Indica si es un reclamo o una queja.";
  if (!d.consumidorNombres?.trim()) return "Tus nombres son obligatorios.";
  if (!d.consumidorApellidos?.trim()) return "Tus apellidos son obligatorios.";
  if (!d.consumidorDocumentoTipo?.trim()) return "El tipo de documento es obligatorio.";
  if (!d.consumidorDocumentoNumero?.trim()) return "El número de documento es obligatorio.";
  if (!d.consumidorDomicilio?.trim()) return "Tu domicilio es obligatorio.";
  if (!d.consumidorEmail?.trim()) return "Tu email es obligatorio.";
  if (d.esMenorEdad && !d.apoderadoNombre?.trim()) return "El nombre del padre, madre o apoderado es obligatorio para un reclamante menor de edad.";
  if (d.bienTipo !== "producto" && d.bienTipo !== "servicio") return "Indica si reclamas por un producto o un servicio.";
  if (!d.bienDescripcion?.trim()) return "Describe el producto o servicio contratado.";
  if (!d.detalle?.trim()) return "Detalla tu reclamo o queja.";
  if (!d.pedido?.trim()) return "Indica qué pides como solución.";
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Constancia imprimible de un reclamo ya registrado — se genera en el
 *  propio navegador (window.print()), nunca depende de un servicio externo. */
export function construirHtmlConstanciaReclamo(numero: string, d: DatosReclamo, fecha: Date = new Date()): string {
  const fechaTexto = fecha.toLocaleString("es-PE", { timeZone: "America/Lima" });
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Constancia de reclamo ${escapeHtml(numero)}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 20px; color: #1e293b; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .numero { font-size: 13px; color: #64748b; margin: 0 0 16px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: #64748b; margin: 16px 0 4px; }
  p { font-size: 13px; margin: 2px 0; }
  footer { margin-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Constancia de ${d.tipo === "reclamo" ? "Reclamo" : "Queja"} — Libro de Reclamaciones</h1>
  <p class="numero">N° ${escapeHtml(numero)} · ${fechaTexto}</p>

  <h2>Datos del proveedor</h2>
  <p>${escapeHtml(RAZON_SOCIAL)} — RUC ${escapeHtml(RUC)}</p>
  <p>${escapeHtml(ATENCION_100_VIRTUAL)}</p>

  <h2>Datos del consumidor</h2>
  <p>${escapeHtml(d.consumidorNombres)} ${escapeHtml(d.consumidorApellidos)}</p>
  <p>${escapeHtml(d.consumidorDocumentoTipo)} ${escapeHtml(d.consumidorDocumentoNumero)}</p>
  <p>${escapeHtml(d.consumidorDomicilio)}</p>
  <p>${escapeHtml(d.consumidorEmail)}${d.consumidorTelefono ? ` · ${escapeHtml(d.consumidorTelefono)}` : ""}</p>
  ${d.esMenorEdad && d.apoderadoNombre ? `<p>Padre/madre/apoderado: ${escapeHtml(d.apoderadoNombre)}</p>` : ""}

  <h2>Bien contratado</h2>
  <p>${d.bienTipo === "producto" ? "Producto" : "Servicio"}: ${escapeHtml(d.bienDescripcion)}</p>
  ${d.montoReclamado != null ? `<p>Monto reclamado: S/ ${d.montoReclamado.toFixed(2)}</p>` : ""}

  <h2>Detalle</h2>
  <p>${escapeHtml(d.detalle)}</p>

  <h2>Pedido del consumidor</h2>
  <p>${escapeHtml(d.pedido)}</p>

  <footer>El proveedor debe responder en un plazo no mayor a quince (15) días hábiles, improrrogable.</footer>
</body>
</html>`;
}
