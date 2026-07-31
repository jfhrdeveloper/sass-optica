import type { Caja } from "@/components/providers/DataProvider";

/* Constancia de cierre de caja imprimible — mismo patrón que
   construirHtmlRecibo() en lib/recibo.ts (función pura + testable, quien
   llama abre la ventana e imprime), pero archivo propio: la interfaz de
   `recibo.ts` está acoplada a Venta/VentaItem, forzarla acá mezclaría dos
   dominios distintos. */
export interface DatosConstanciaCaja {
  negocioNombre: string;
  empleadoAperturaNombre?: string;
  empleadoCierreNombre?: string;
  caja: Caja;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function construirHtmlConstanciaCierre({ negocioNombre, empleadoAperturaNombre, empleadoCierreNombre, caja }: DatosConstanciaCaja): string {
  const apertura = new Date(caja.fechaApertura).toLocaleString("es-PE", { timeZone: "America/Lima" });
  const cierre = caja.fechaCierre ? new Date(caja.fechaCierre).toLocaleString("es-PE", { timeZone: "America/Lima" }) : "—";
  const diferencia = caja.diferencia ?? 0;
  const totalVentas = caja.totalEfectivo + caja.totalTarjeta + caja.totalYape + caja.totalPlin + caja.totalTransferencia;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Constancia de cierre de caja</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 340px; margin: 0 auto; padding: 16px; color: #1e293b; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #64748b; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  td { padding: 4px 2px; border-bottom: 1px dashed #e2e8f0; }
  .num { text-align: right; }
  .total-final { font-weight: 700; font-size: 15px; border-top: 1px solid #1e293b; margin-top: 4px; padding-top: 6px !important; }
  .diferencia { font-weight: 700; }
  footer { margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(negocioNombre)}</h1>
  <p class="sub">Constancia de cierre de caja</p>
  <table>
    <tr><td>Apertura</td><td class="num">${apertura}</td></tr>
    <tr><td>Cierre</td><td class="num">${cierre}</td></tr>
    ${empleadoAperturaNombre ? `<tr><td>Abierta por</td><td class="num">${escapeHtml(empleadoAperturaNombre)}</td></tr>` : ""}
    ${empleadoCierreNombre ? `<tr><td>Cerrada por</td><td class="num">${escapeHtml(empleadoCierreNombre)}</td></tr>` : ""}
  </table>
  <table>
    <tr><td>Monto inicial</td><td class="num">S/ ${caja.montoInicial.toFixed(2)}</td></tr>
    <tr><td>Ventas en efectivo</td><td class="num">S/ ${caja.totalEfectivo.toFixed(2)}</td></tr>
    <tr><td>Ventas con tarjeta</td><td class="num">S/ ${caja.totalTarjeta.toFixed(2)}</td></tr>
    <tr><td>Ventas por Yape</td><td class="num">S/ ${caja.totalYape.toFixed(2)}</td></tr>
    <tr><td>Ventas por Plin</td><td class="num">S/ ${caja.totalPlin.toFixed(2)}</td></tr>
    <tr><td>Ventas por transferencia</td><td class="num">S/ ${caja.totalTransferencia.toFixed(2)}</td></tr>
    <tr class="total-final"><td>Total ventas del turno</td><td class="num">S/ ${totalVentas.toFixed(2)}</td></tr>
  </table>
  <table>
    <tr><td>Efectivo esperado</td><td class="num">S/ ${caja.montoEfectivoEsperado.toFixed(2)}</td></tr>
    <tr><td>Efectivo contado</td><td class="num">S/ ${(caja.montoEfectivoContado ?? 0).toFixed(2)}</td></tr>
    <tr class="diferencia"><td>Diferencia</td><td class="num">${diferencia >= 0 ? "+" : ""}S/ ${diferencia.toFixed(2)}</td></tr>
  </table>
  <footer>Constancia interna — no es comprobante de pago electrónico.</footer>
</body>
</html>`;
}

/* PDF vía impresión del navegador del HISTORIAL COMPLETO de cierres (no un
   solo cierre) — mismo patrón HTML-autocontenido que construirHtmlConstanciaCierre
   de arriba, en una tabla ancha en vez de un ticket angosto. Evita sumar
   jspdf/pdfmake como dependencia nueva solo para esto. */
export function construirHtmlListadoCaja(negocioNombre: string, historial: Caja[]): string {
  const filas = historial.map((c) => {
    const totalVentas = c.totalEfectivo + c.totalTarjeta + c.totalYape + c.totalPlin + c.totalTransferencia;
    const diferencia = c.diferencia ?? 0;
    const cierre = c.fechaCierre ? new Date(c.fechaCierre).toLocaleString("es-PE", { timeZone: "America/Lima" }) : "—";
    return `<tr>
      <td>${cierre}</td>
      <td class="num">S/ ${c.montoInicial.toFixed(2)}</td>
      <td class="num">S/ ${c.totalEfectivo.toFixed(2)}</td>
      <td class="num">S/ ${c.totalTarjeta.toFixed(2)}</td>
      <td class="num">S/ ${c.totalYape.toFixed(2)}</td>
      <td class="num">S/ ${c.totalPlin.toFixed(2)}</td>
      <td class="num">S/ ${c.totalTransferencia.toFixed(2)}</td>
      <td class="num">S/ ${totalVentas.toFixed(2)}</td>
      <td class="num">S/ ${c.montoEfectivoEsperado.toFixed(2)}</td>
      <td class="num">S/ ${(c.montoEfectivoContado ?? 0).toFixed(2)}</td>
      <td class="num ${diferencia === 0 ? "" : "diferencia"}">${diferencia >= 0 ? "+" : ""}S/ ${diferencia.toFixed(2)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Historial de caja</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #64748b; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead th { text-align: left; background: #2563eb; color: #fff; padding: 6px 8px; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  tbody tr:nth-child(even) { background: #f1f5f9; }
  .num { text-align: right; }
  .diferencia { font-weight: 700; color: #dc2626; }
  footer { margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } thead th { background: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <h1>${escapeHtml(negocioNombre)}</h1>
  <p class="sub">Historial de cierres de caja — ${historial.length} ${historial.length === 1 ? "registro" : "registros"}</p>
  <table>
    <thead>
      <tr>
        <th>Cierre</th><th>Monto inicial</th><th>Efectivo</th><th>Tarjeta</th><th>Yape</th><th>Plin</th>
        <th>Transferencia</th><th>Total ventas</th><th>Esperado</th><th>Contado</th><th>Diferencia</th>
      </tr>
    </thead>
    <tbody>${filas || `<tr><td colspan="11">Sin cierres registrados.</td></tr>`}</tbody>
  </table>
  <footer>Constancia interna — no es comprobante de pago electrónico.</footer>
</body>
</html>`;
}
