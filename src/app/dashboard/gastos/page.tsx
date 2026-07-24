"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData, type Gasto } from "@/components/providers/DataProvider";

const CATEGORIAS = ["alquiler", "sueldos", "insumos", "servicios", "proveedor", "otro"] as const;
const VACIO: Partial<Gasto> = { categoria: "otro", monto: 0, fecha: new Date().toISOString().slice(0, 10) };

/* Ruta protegida a nivel de proxy (src/proxy.ts: rutasSoloAdministrador) y de
   RLS (gastos_admin_all) — solo el administrador llega hasta aquí con datos. */
export default function GastosPage() {
  const { gastos, proveedores, addGasto, deleteGasto } = useData();
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
  }

  const ordenados = [...gastos]
    .filter((g) => filtroCategoria === "todas" || g.categoria === filtroCategoria)
    .filter((g) => !desde || g.fecha >= desde)
    .filter((g) => !hasta || g.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Gastos</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total este mes: S/ {totalMes.toFixed(2)}</p>

      <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <select value={form.categoria ?? "otro"} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="select text-sm">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Descripción" value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input text-sm" />
        <select value={form.proveedorId ?? ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })} className="select text-sm">
          <option value="">Sin proveedor</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input placeholder="Monto (S/)" type="number" step="0.01" required value={form.monto ?? ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} className="input text-sm" />
        <input type="date" value={form.fecha ?? ""} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="input text-sm" />
        <button type="submit" disabled={guardando} className="btn-primary col-span-full">
          Registrar gasto
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="select text-sm">
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input text-sm" aria-label="Desde" />
        <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input text-sm" aria-label="Hasta" />
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th />
          </tr>
        </thead>
        <tbody>
          {ordenados.map((g) => (
            <tr key={g.id} className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-2">{g.fecha}</td>
              <td>{g.categoria}</td>
              <td>{g.descripcion ?? "—"}</td>
              <td>S/ {g.monto.toFixed(2)}</td>
              <td className="text-right"><button onClick={() => deleteGasto(g.id)} className="link-danger">Eliminar</button></td>
            </tr>
          ))}
          {ordenados.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin gastos registrados.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
