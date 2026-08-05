"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "boneyard-js/react";
import { useData } from "@/components/providers/DataProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ticketPromedio, clienteMasFrecuente, topProductosVendidos, comparativaMensual } from "@/lib/informes";
import { descargarCSV } from "@/lib/csv";
import { Download } from "lucide-react";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_INFORMES: TabDeAjustes[] = [
  { href: "/dashboard/informes", label: "Ingresos y egresos" },
  { href: "/dashboard/informes/reportes", label: "Reportes" },
];

type Movimiento = { fecha: string; tipo: "ingreso" | "egreso"; concepto: string; monto: number };

/* Extraído del research de competencia (sistema de facturación SUNAT):
   libro combinado de Ventas + Gastos, ordenado por fecha, con saldo
   corriente — no reemplaza contabilidad formal, es una vista rápida para
   el dueño de la óptica. */
export default function InformesPage() {
  const { ventas, gastos, ventaItems, productos, clientes, ready } = useData();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [vista, setVista] = useState<"libro" | "analisis">("libro");

  const ticket = useMemo(() => ticketPromedio(ventas), [ventas]);
  const frecuente = useMemo(() => clienteMasFrecuente(ventas, clientes), [ventas, clientes]);
  const topProductos = useMemo(() => topProductosVendidos(ventas, ventaItems, productos), [ventas, ventaItems, productos]);
  const meses = useMemo(() => comparativaMensual(ventas, gastos), [ventas, gastos]);
  const maxMonto = Math.max(1, ...topProductos.map((p) => p.monto));
  const maxMovimientoMes = Math.max(1, ...meses.flatMap((m) => [m.ingresos, m.egresos]));

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

  function exportarCSV() {
    const filas = [
      ["Fecha", "Concepto", "Tipo", "Monto", "Saldo"],
      ...conSaldo.map((m) => [
        formatearFechaPE(m.fecha), m.concepto, m.tipo === "ingreso" ? "Ingreso" : "Egreso",
        m.monto.toFixed(2), m.saldo.toFixed(2),
      ]),
    ];
    descargarCSV(`ingresos-egresos_${desde}_${hasta}.csv`, filas);
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Informes</h1>
      <SettingsTabs tabs={TABS_INFORMES} />

      <div className="mt-4">
        <SegmentedControl
          aria-label="Vista de informes"
          variante="opciones"
          valor={vista}
          onChange={(v) => setVista(v as "libro" | "analisis")}
          opciones={[
            { valor: "libro", label: "Libro" },
            { valor: "analisis", label: "Análisis" },
          ]}
        />
      </div>

      {vista === "libro" ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
            <button onClick={exportarCSV} disabled={conSaldo.length === 0} className="btn-outline ml-auto h-11 gap-1.5 text-sm sm:h-auto">
              <Download size={15} /> Exportar CSV
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Ingresos</p>
              <p className="mt-1 text-2xl font-semibold text-accent">S/ {ingresosTotal.toFixed(2)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Egresos</p>
              <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">S/ {egresosTotal.toFixed(2)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Balance</p>
              <p className={`mt-1 text-2xl font-semibold ${balance >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-600 dark:text-red-400"}`}>
                S/ {balance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="table-card mt-6">
            <Skeleton name="informes-libro-tabla" loading={!ready}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-head-cell">Fecha</th>
                    <th className="table-head-cell">Concepto</th>
                    <th className="table-head-cell hidden md:table-cell">Tipo</th>
                    <th className="table-head-cell text-right">Monto</th>
                    <th className="table-head-cell text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((m, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(m.fecha)}</td>
                      <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{m.concepto}</td>
                      <td className="table-body-cell hidden md:table-cell">
                        <span className={`badge ${m.tipo === "ingreso" ? "badge-success" : "badge-danger"}`}>
                          {m.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className={`table-body-cell text-right ${m.tipo === "ingreso" ? "text-accent" : "text-red-600 dark:text-red-400"}`}>
                        {m.tipo === "ingreso" ? "+" : "−"} S/ {m.monto.toFixed(2)}
                      </td>
                      <td className="table-body-cell text-right font-medium text-slate-900 dark:text-slate-100">S/ {m.saldo.toFixed(2)}</td>
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
            </Skeleton>
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
          </div>
        </>
      ) : (
        <Skeleton name="informes-analisis" loading={!ready}>
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Ticket promedio</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {ticket != null ? `S/ ${ticket.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Cliente más frecuente</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {frecuente ? frecuente.nombre : "—"}
              </p>
              {frecuente && (
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {frecuente.cantidad} {frecuente.cantidad === 1 ? "compra" : "compras"}
                </p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Productos más vendidos</h2>
            {topProductos.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">Sin ventas con productos asociados todavía.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {topProductos.map((p) => (
                  <div key={p.productoId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{p.nombre}</span>
                      <span className="text-slate-500 dark:text-slate-400">S/ {p.monto.toFixed(2)} · {p.cantidad} und.</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(4, (p.monto / maxMonto) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comparativa mensual (últimos 6 meses)</h2>
            <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-1">
              {meses.map((m) => (
                <div key={m.mes} className="flex flex-1 min-w-[64px] flex-col items-center gap-1">
                  <div className="flex h-24 items-end gap-1">
                    <div
                      className="w-3 rounded-t bg-accent"
                      style={{ height: `${Math.max(2, (m.ingresos / maxMovimientoMes) * 96)}px` }}
                      title={`Ingresos: S/ ${m.ingresos.toFixed(2)}`}
                    />
                    <div
                      className="w-3 rounded-t bg-red-400 dark:bg-red-500"
                      style={{ height: `${Math.max(2, (m.egresos / maxMovimientoMes) * 96)}px` }}
                      title={`Egresos: S/ ${m.egresos.toFixed(2)}`}
                    />
                  </div>
                  <span className="text-[11px] capitalize text-slate-500 dark:text-slate-500">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400 dark:bg-red-500" /> Egresos</span>
            </div>
          </div>
        </div>
        </Skeleton>
      )}
    </main>
  );
}
