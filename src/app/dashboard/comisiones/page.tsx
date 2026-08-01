"use client";

import { useMemo, useState } from "react";
import { Download, Percent } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { calcularComisiones } from "@/lib/comisiones";
import { descargarCSV } from "@/lib/csv";

/* Comisión = % fijo por empleado (empleados.comision_pct) sobre sus propias
   ventas pagadas del período — ver lib/comisiones.ts. Editar el % es
   admin-only (mismo criterio que cualquier otro campo de `empleados`, la
   RLS ya lo exige sin nada extra acá). */
export default function ComisionesPage() {
  const { ventas, empleados, updateEmpleado } = useData();
  const { empleado: yo } = useSession();
  const esAdmin = yo?.rol === "administrador";

  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);

  const ventasDelPeriodo = useMemo(
    () => ventas.filter((v) => {
      const f = v.fecha.slice(0, 10);
      return (!desde || f >= desde) && (!hasta || f <= hasta);
    }),
    [ventas, desde, hasta],
  );
  const comisiones = useMemo(() => calcularComisiones(ventasDelPeriodo, empleados), [ventasDelPeriodo, empleados]);
  const totalComision = comisiones.reduce((acc, c) => acc + c.comision, 0);

  function exportarCSV() {
    descargarCSV("comisiones", [
      ["Empleado", "% comisión", "Total vendido", "Comisión"],
      ...comisiones.map((c) => [c.nombre, `${c.comisionPct}%`, c.totalVendido.toFixed(2), c.comision.toFixed(2)]),
    ]);
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Comisiones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        % de comisión por vendedor sobre sus propias ventas pagadas del período.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <button onClick={exportarCSV} disabled={comisiones.length === 0} className="btn-outline ml-auto gap-1.5 text-sm">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div className="table-card mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Empleado</th>
                <th className="table-head-cell">% comisión</th>
                <th className="table-head-cell">Total vendido</th>
                <th className="table-head-cell">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {comisiones.map((c) => (
                <tr key={c.empleadoId} className="table-row">
                  <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{c.nombre}</td>
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">
                    {esAdmin ? (
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="number" min={0} max={100} step="0.1" defaultValue={c.comisionPct}
                          onBlur={(e) => {
                            const valor = Number(e.target.value);
                            if (!Number.isNaN(valor) && valor !== c.comisionPct) updateEmpleado(c.empleadoId, { comisionPct: valor });
                          }}
                          className="input w-16 text-sm"
                        />
                        <Percent size={12} className="text-slate-400" />
                      </label>
                    ) : (
                      `${c.comisionPct}%`
                    )}
                  </td>
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">S/ {c.totalVendido.toFixed(2)}</td>
                  <td className="table-body-cell font-semibold text-primary">S/ {c.comision.toFixed(2)}</td>
                </tr>
              ))}
              {comisiones.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">Sin ventas atribuidas a un vendedor en este período.</div>
                  </td>
                </tr>
              )}
            </tbody>
            {comisiones.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-100 font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  <td className="table-body-cell" colSpan={3}>Total a pagar</td>
                  <td className="table-body-cell text-primary">S/ {totalComision.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
