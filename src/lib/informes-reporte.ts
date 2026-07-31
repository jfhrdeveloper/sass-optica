import type { DesgloseCategoria, DesgloseMetodo } from "@/lib/informes";

/* Reporte exportable de Ingresos vs Egresos por período personalizado —
   distinto del dashboard visual de "Análisis" (ticket promedio/top
   productos/comparativa): esto es un documento formal para descargar o
   archivar, con desglose por categoría de gasto y por método de pago.
   Mismos dos patrones ya validados en el proyecto: Excel con diseño real
   vía `exceljs` (import dinámico, ver lib/caja-excel.ts) y PDF vía
   impresión del navegador con HTML autocontenido (ver lib/constancia-caja.ts). */

export interface DatosReporteIngresosEgresos {
  negocioNombre: string;
  desde: string;
  hasta: string;
  ingresosTotal: number;
  egresosTotal: number;
  porMetodo: DesgloseMetodo[];
  porCategoria: DesgloseCategoria[];
}

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function generarExcelReporteIngresosEgresos(d: DatosReporteIngresosEgresos): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = d.negocioNombre;
  wb.created = new Date();

  const ws = wb.addWorksheet("Reporte");
  ws.columns = [{ key: "concepto", width: 28 }, { key: "monto", width: 16 }];

  function tituloFila(texto: string) {
    const row = ws.addRow([texto]);
    ws.mergeCells(row.number, 1, row.number, 2);
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    row.getCell(1).alignment = { vertical: "middle" };
    row.height = 20;
  }
  function filaMonto(concepto: string, monto: number, negrita = false) {
    const row = ws.addRow({ concepto, monto });
    row.getCell(2).numFmt = '"S/" #,##0.00';
    if (negrita) { row.getCell(1).font = { bold: true }; row.getCell(2).font = { bold: true }; }
  }

  tituloFila(`${d.negocioNombre} — Reporte de Ingresos y Egresos`);
  ws.addRow([`Período: ${d.desde} a ${d.hasta}`]);
  ws.addRow([]);

  tituloFila("Resumen");
  filaMonto("Ingresos totales", d.ingresosTotal, true);
  filaMonto("Egresos totales", d.egresosTotal, true);
  filaMonto("Balance", d.ingresosTotal - d.egresosTotal, true);
  ws.addRow([]);

  tituloFila("Ingresos por método de pago");
  if (d.porMetodo.length === 0) ws.addRow(["Sin ingresos en este período."]);
  for (const m of d.porMetodo) filaMonto(METODO_LABEL[m.metodo] ?? m.metodo, m.monto);
  ws.addRow([]);

  tituloFila("Egresos por categoría");
  if (d.porCategoria.length === 0) ws.addRow(["Sin egresos en este período."]);
  for (const c of d.porCategoria) filaMonto(c.categoria.charAt(0).toUpperCase() + c.categoria.slice(1), c.monto);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function construirHtmlReporteIngresosEgresos(d: DatosReporteIngresosEgresos): string {
  const balance = d.ingresosTotal - d.egresosTotal;
  const filas = (items: { label: string; monto: number }[]) =>
    items.length === 0
      ? `<tr><td colspan="2" class="vacio">Sin movimientos en este período.</td></tr>`
      : items.map((it) => `<tr><td>${escapeHtml(it.label)}</td><td class="num">S/ ${it.monto.toFixed(2)}</td></tr>`).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reporte de Ingresos y Egresos</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #64748b; margin: 0 0 16px; }
  h2 { font-size: 13px; margin: 18px 0 6px; padding: 4px 8px; background: #2563eb; color: #fff; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 5px 8px; border-bottom: 1px dashed #e2e8f0; }
  .num { text-align: right; }
  .vacio { color: #94a3b8; font-style: italic; }
  .total-final td { font-weight: 700; font-size: 14px; border-top: 1px solid #1e293b; border-bottom: none; padding-top: 8px; }
  footer { margin-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <h1>${escapeHtml(d.negocioNombre)}</h1>
  <p class="sub">Reporte de Ingresos y Egresos · ${d.desde} a ${d.hasta}</p>

  <h2>Resumen</h2>
  <table>
    <tr><td>Ingresos totales</td><td class="num">S/ ${d.ingresosTotal.toFixed(2)}</td></tr>
    <tr><td>Egresos totales</td><td class="num">S/ ${d.egresosTotal.toFixed(2)}</td></tr>
    <tr class="total-final"><td>Balance</td><td class="num">S/ ${balance.toFixed(2)}</td></tr>
  </table>

  <h2>Ingresos por método de pago</h2>
  <table>${filas(d.porMetodo.map((m) => ({ label: METODO_LABEL[m.metodo] ?? m.metodo, monto: m.monto })))}</table>

  <h2>Egresos por categoría</h2>
  <table>${filas(d.porCategoria.map((c) => ({ label: c.categoria.charAt(0).toUpperCase() + c.categoria.slice(1), monto: c.monto })))}</table>

  <footer>Reporte interno — no reemplaza contabilidad formal.</footer>
</body>
</html>`;
}
