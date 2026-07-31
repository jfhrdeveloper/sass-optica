import type { Caja } from "@/components/providers/DataProvider";

/* Excel con diseño real (encabezado con color, anchos de columna, formato de
   moneda/fecha por celda) — a diferencia de `lib/csv.ts` (CSV plano, se abre
   en Excel pero sin ningún estilo). `exceljs` se importa de forma dinámica
   (mismo criterio que `react-day-picker` en DatePicker.tsx, ver
   docs/pending-task.md sesión 2026-07-29): es una librería pesada que solo
   hace falta al hacer clic en "Exportar Excel", no en el JS inicial de
   /dashboard/caja. */
export async function generarExcelHistorialCaja(negocioNombre: string, historial: Caja[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = negocioNombre;
  wb.created = new Date();

  const ws = wb.addWorksheet("Historial de caja");
  ws.columns = [
    { header: "Apertura", key: "apertura", width: 19 },
    { header: "Cierre", key: "cierre", width: 19 },
    { header: "Monto inicial", key: "montoInicial", width: 14 },
    { header: "Efectivo", key: "efectivo", width: 13 },
    { header: "Tarjeta", key: "tarjeta", width: 13 },
    { header: "Yape", key: "yape", width: 13 },
    { header: "Plin", key: "plin", width: 13 },
    { header: "Transferencia", key: "transferencia", width: 15 },
    { header: "Efectivo esperado", key: "esperado", width: 16 },
    { header: "Efectivo contado", key: "contado", width: 16 },
    { header: "Diferencia", key: "diferencia", width: 13 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 20;

  const columnasMoneda = ["montoInicial", "efectivo", "tarjeta", "yape", "plin", "transferencia", "esperado", "contado", "diferencia"];

  for (const c of historial) {
    ws.addRow({
      apertura: new Date(c.fechaApertura),
      cierre: c.fechaCierre ? new Date(c.fechaCierre) : null,
      montoInicial: c.montoInicial,
      efectivo: c.totalEfectivo,
      tarjeta: c.totalTarjeta,
      yape: c.totalYape,
      plin: c.totalPlin,
      transferencia: c.totalTransferencia,
      esperado: c.montoEfectivoEsperado,
      contado: c.montoEfectivoContado ?? 0,
      diferencia: c.diferencia ?? 0,
    });
  }

  for (const key of columnasMoneda) {
    ws.getColumn(key).numFmt = '"S/" #,##0.00';
  }
  ws.getColumn("apertura").numFmt = "dd/mm/yyyy hh:mm";
  ws.getColumn("cierre").numFmt = "dd/mm/yyyy hh:mm";

  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { vertical: "middle" };
    /* Fila alterna (zebra) — la misma lectura rápida que ya tienen las
       tablas del dashboard con `hover:bg-slate-50`, aplicada acá porque un
       Excel no tiene hover. */
    if (i % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
