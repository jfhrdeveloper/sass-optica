"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData, type Gasto } from "@/components/providers/DataProvider";

const CATEGORIAS = ["alquiler", "sueldos", "insumos", "servicios", "proveedor", "otro"] as const;
const VACIO: Partial<Gasto> = { categoria: "otro", monto: 0, fecha: new Date().toISOString().slice(0, 10) };

/* Ruta protegida a nivel de proxy (src/proxy.ts: rutasSoloAdministrador) y de
   RLS (gastos_admin_all) — solo el administrador llega hasta aquí con datos. */
export default function GastosPage() {
  const { gastos, addGasto, deleteGasto } = useData();
  const [form, setForm] = useState<Partial<Gasto>>(VACIO);
  const [guardando, setGuardando] = useState(false);

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

  const ordenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gastos</h1>
        <Link href="/dashboard" className="text-sm underline">← Inicio</Link>
      </div>
      <p className="mt-1 text-sm text-neutral-600">Total este mes: S/ {totalMes.toFixed(2)}</p>

      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-2 gap-2 rounded border p-4 sm:grid-cols-4">
        <select value={form.categoria ?? "otro"} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded border px-2 py-1">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Descripción" value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="rounded border px-2 py-1" />
        <input placeholder="Monto (S/)" type="number" step="0.01" required value={form.monto ?? ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} className="rounded border px-2 py-1" />
        <input type="date" value={form.fecha ?? ""} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded border px-2 py-1" />
        <button type="submit" disabled={guardando} className="col-span-full rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Registrar gasto
        </button>
      </form>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2">Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th />
          </tr>
        </thead>
        <tbody>
          {ordenados.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="py-2">{g.fecha}</td>
              <td>{g.categoria}</td>
              <td>{g.descripcion ?? "—"}</td>
              <td>S/ {g.monto.toFixed(2)}</td>
              <td className="text-right"><button onClick={() => deleteGasto(g.id)} className="text-red-600 underline">Eliminar</button></td>
            </tr>
          ))}
          {ordenados.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-neutral-500">Sin gastos registrados.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
