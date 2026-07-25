"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/providers/DataProvider";
import { Pagination } from "@/components/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/date";
import { DateRangePicker } from "@/components/DateRangePicker";

type Movimiento = { fecha: string; tipo: "ingreso" | "egreso"; concepto: string; monto: number };

/* Extraído del research de competencia (sistema de facturación SUNAT):
   libro combinado de Ventas + Gastos, ordenado por fecha, con saldo
   corriente — no reemplaza contabilidad formal, es una vista rápida para
   el dueño de la óptica. */
export default function InformesPage() {
  const { ventas, gastos } = useData();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);

  const movimientos: Movimiento[] = useMemo(() => {
    const ingresos: Movimiento[] = ventas.map((v) => ({
      fecha: v.fecha.slice(0, 10), tipo: "ingreso", concepto: `Venta (${v.metodoPago})`, monto: v.total,
    }));
    const egresos: Movimiento[] = gastos.map((g) => ({
      fecha: g.fecha.slice(0, 10), tipo: "egreso", concepto: g.descripcion || g.categoria, monto: g.monto,
    }));
    return [...ingresos, ...egresos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [ventas, gastos]);

  const filtrados = useMemo(
    () => movimientos.filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)),
    [movimientos, desde, hasta],
  );

  const conSaldo = useMemo(() => {
    return filtrados.reduce<Array<Movimiento & { saldo: number }>>((acc, m) => {
      const saldoPrevio = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
      const saldo = saldoPrevio + (m.tipo === "ingreso" ? m.monto : -m.monto);
      acc.push({ ...m, saldo });
      return acc;
    }, []);
  }, [filtrados]);

  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(conSaldo);

  const ingresosTotal = filtrados.filter((m) => m.tipo === "ingreso").reduce((acc, m) => acc + m.monto, 0);
  const egresosTotal = filtrados.filter((m) => m.tipo === "egreso").reduce((acc, m) => acc + m.monto, 0);
  const balance = ingresosTotal - egresosTotal;

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ingresos y Egresos</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
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

      <div className="table-card mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Concepto</th>
                <th className="table-head-cell">Tipo</th>
                <th className="table-head-cell text-right">Monto</th>
                <th className="table-head-cell text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(m.fecha)}</td>
                  <td className="table-cell font-medium text-slate-900 dark:text-slate-100">{m.concepto}</td>
                  <td className="table-cell">
                    <span className={`badge ${m.tipo === "ingreso" ? "badge-success" : "badge-danger"}`}>
                      {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                    </span>
                  </td>
                  <td className={`table-cell text-right ${m.tipo === "ingreso" ? "text-accent" : "text-red-600 dark:text-red-400"}`}>
                    {m.tipo === "ingreso" ? "+" : "−"} S/ {m.monto.toFixed(2)}
                  </td>
                  <td className="table-cell text-right font-medium text-slate-900 dark:text-slate-100">S/ {m.saldo.toFixed(2)}</td>
                </tr>
              ))}
              {conSaldo.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">Sin movimientos en este rango.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </main>
  );
}
