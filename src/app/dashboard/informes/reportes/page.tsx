"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";
import { desgloseEgresosPorCategoria, desgloseIngresosPorMetodo } from "@/lib/informes";
import { generarExcelReporteIngresosEgresos, construirHtmlReporteIngresosEgresos, type DatosReporteIngresosEgresos } from "@/lib/informes-reporte";
import { descargarBlob } from "@/lib/archivo";
import { useToast } from "@/components/providers/ToastProvider";

const TABS_INFORMES: TabDeAjustes[] = [
  { href: "/dashboard/informes", label: "Ingresos y egresos" },
  { href: "/dashboard/informes/reportes", label: "Reportes" },
];

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia",
};

/* Reportes exportables (PDF/Excel) de Ingresos vs Egresos por período —
   distinto del dashboard visual de "Ingresos y egresos" (ese es para mirar
   en pantalla; esto es para descargar/archivar/entregar). Reusa la misma
   aritmética pura de lib/informes.ts, solo agrega el desglose por
   categoría/método y la exportación con diseño. */
export default function ReportesPage() {
  const { negocio, ventas, gastos } = useData();
  const toast = useToast();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [generando, setGenerando] = useState<"excel" | null>(null);

  const ventasFiltradas = useMemo(
    () => ventas.filter((v) => v.estado !== "anulada" && v.fecha.slice(0, 10) >= desde && v.fecha.slice(0, 10) <= hasta),
    [ventas, desde, hasta],
  );
  const gastosFiltrados = useMemo(
    () => gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta),
    [gastos, desde, hasta],
  );

  const porMetodo = useMemo(() => desgloseIngresosPorMetodo(ventasFiltradas), [ventasFiltradas]);
  const porCategoria = useMemo(() => desgloseEgresosPorCategoria(gastosFiltrados), [gastosFiltrados]);
  const ingresosTotal = porMetodo.reduce((acc, m) => acc + m.monto, 0);
  const egresosTotal = porCategoria.reduce((acc, c) => acc + c.monto, 0);
  const balance = ingresosTotal - egresosTotal;

  function datosReporte(): DatosReporteIngresosEgresos {
    return {
      negocioNombre: negocio?.nombre ?? "Óptica",
      desde, hasta, ingresosTotal, egresosTotal, porMetodo, porCategoria,
    };
  }

  async function exportarExcel() {
    setGenerando("excel");
    const blob = await generarExcelReporteIngresosEgresos(datosReporte());
    setGenerando(null);
    descargarBlob(`reporte-ingresos-egresos_${desde}_${hasta}.xlsx`, blob);
  }

  function imprimirPdf() {
    const html = construirHtmlReporteIngresosEgresos(datosReporte());
    const ventana = window.open("", "_blank");
    if (!ventana) { toast("El navegador bloqueó la ventana de impresión.", "error"); return; }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Informes</h1>
      <SettingsTabs tabs={TABS_INFORMES} />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Reporte de Ingresos y Egresos por período, listo para descargar o imprimir.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <div className="ml-auto flex gap-2">
          <button onClick={exportarExcel} disabled={generando === "excel"} className="btn-outline gap-1.5 text-sm">
            <Download size={15} /> {generando === "excel" ? "Generando…" : "Excel"}
          </button>
          <button onClick={imprimirPdf} className="btn-outline gap-1.5 text-sm">
            <Printer size={15} /> PDF
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Ingresos</p>
          <p className="mt-1 text-2xl font-semibold text-accent">S/ {ingresosTotal.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Egresos</p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">S/ {egresosTotal.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Balance</p>
          <p className={`mt-1 text-2xl font-semibold ${balance >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-600 dark:text-red-400"}`}>
            S/ {balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ingresos por método de pago</h2>
          {porMetodo.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Sin ingresos en este período.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {porMetodo.map((m) => (
                <li key={m.metodo} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{METODO_LABEL[m.metodo] ?? m.metodo}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">S/ {m.monto.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Egresos por categoría</h2>
          {porCategoria.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Sin egresos en este período.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {porCategoria.map((c) => (
                <li key={c.categoria} className="flex items-center justify-between">
                  <span className="capitalize text-slate-600 dark:text-slate-300">{c.categoria}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">S/ {c.monto.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
