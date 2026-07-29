"use client";

import { useMemo, useState } from "react";
import { Receipt, Trash2 } from "lucide-react";
import { useData, type Gasto } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { DatePicker } from "@/components/calendario/DatePicker";

const CATEGORIAS = ["alquiler", "sueldos", "insumos", "servicios", "proveedor", "otro"] as const;
const VACIO: Partial<Gasto> = { categoria: "otro", monto: 0, fecha: new Date().toISOString().slice(0, 10) };

/* Ruta protegida a nivel de proxy (src/proxy.ts: rutasSoloAdministrador) y de
   RLS (gastos_admin_all) — solo el administrador llega hasta aquí con datos. */
export default function GastosPage() {
  const { gastos, proveedores, addGasto, deleteGasto } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Gasto>>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const totalMes = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return gastos.filter((g) => g.fecha.startsWith(mesActual)).reduce((acc, g) => acc + g.monto, 0);
  }, [gastos]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto) return;
    setGuardando(true);
    await addGasto(form);
    setGuardando(false);
    setForm(VACIO);
    toast("Gasto registrado.");
  }

  async function eliminar(g: Gasto) {
    await deleteGasto(g.id);
    toast("Gasto eliminado.", "info");
  }

  const ordenados = [...gastos]
    .filter((g) => filtroCategoria === "todas" || g.categoria === filtroCategoria)
    .filter((g) => !desde || g.fecha >= desde)
    .filter((g) => !hasta || g.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenados);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Gastos</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total este mes: S/ {totalMes.toFixed(2)}</p>

      <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <select value={form.categoria ?? "otro"} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="select text-sm">
          {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <input placeholder="Descripción" value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input text-sm" />
        <select value={form.proveedorId ?? ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })} className="select text-sm">
          <option value="">Sin proveedor</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input placeholder="Monto (S/)" type="number" step="0.01" required value={form.monto ?? ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} className="input text-sm" />
        <DatePicker etiqueta="Fecha del gasto" placeholder="Fecha" valor={form.fecha ?? ""} onChange={(v) => setForm({ ...form, fecha: v })} />
        <button type="submit" disabled={guardando} className="btn-primary col-span-full">
          Registrar gasto
        </button>
      </form>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="select text-sm">
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Categoría</th>
                <th className="table-head-cell">Descripción</th>
                <th className="table-head-cell">Monto</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((g) => (
                <tr key={g.id} className="table-row">
                  <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(g.fecha)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Receipt size={16} /></span>
                      <span className="font-medium capitalize text-slate-900 dark:text-slate-100">{g.categoria}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{g.descripcion ?? "—"}</td>
                  <td className="table-cell font-medium text-slate-900 dark:text-slate-100">S/ {g.monto.toFixed(2)}</td>
                  <td className="table-cell text-right">
                    <button onClick={() => eliminar(g)} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {ordenados.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin gastos registrados.
                    </div>
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
