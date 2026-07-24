"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useData, type Descuento } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/SlideOver";

const VACIO: Partial<Descuento> = { tipo: "porcentaje", valor: 0, activo: true };

/* Cupones/descuentos (idea de UX #8 del research de competencia). Ruta con
   permiso granular delegable ('descuentos') además de administrador — ver
   proxy.ts y la RLS descuentos_write en supabase-schema.sql. */
export default function DescuentosPage() {
  const { descuentos, addDescuento, updateDescuento, deleteDescuento } = useData();
  const [form, setForm] = useState<Partial<Descuento>>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function nuevo() {
    setForm(VACIO);
    setAbierto(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo || !form.valor) return;
    setGuardando(true);
    await addDescuento({ ...form, codigo: form.codigo.toUpperCase() });
    setGuardando(false);
    setAbierto(false);
    setForm(VACIO);
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Descuentos y cupones</h1>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={nuevo} className="btn-primary gap-1.5">
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Código</th><th>Valor</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th />
          </tr>
        </thead>
        <tbody>
          {descuentos.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-2 font-medium">{d.codigo}</td>
              <td>{d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}</td>
              <td className="text-slate-500 dark:text-slate-400">
                {d.vigenciaDesde || d.vigenciaHasta ? `${d.vigenciaDesde ?? "—"} → ${d.vigenciaHasta ?? "—"}` : "Sin límite"}
              </td>
              <td>{d.usos}{d.limiteUsos ? ` / ${d.limiteUsos}` : ""}</td>
              <td>
                <button
                  onClick={() => updateDescuento(d.id, { activo: !d.activo })}
                  className={`badge cursor-pointer transition-opacity hover:opacity-75 ${d.activo ? "badge-success" : "badge-neutral"}`}
                >
                  {d.activo ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="text-right">
                <button onClick={() => deleteDescuento(d.id)} className="link-danger">Eliminar</button>
              </td>
            </tr>
          ))}
          {descuentos.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin cupones todavía.</td></tr>
          )}
        </tbody>
      </table>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Nuevo cupón">
        <form onSubmit={onSubmit} className="space-y-3">
          <input placeholder="Código (ej. VERANO10)" required value={form.codigo ?? ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input w-full text-sm uppercase" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.tipo ?? "porcentaje"} onChange={(e) => setForm({ ...form, tipo: e.target.value as Descuento["tipo"] })} className="select text-sm">
              <option value="porcentaje">% Porcentaje</option>
              <option value="monto">S/ Monto fijo</option>
            </select>
            <input placeholder="Valor" type="number" step="0.01" required value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.vigenciaDesde ?? ""} onChange={(e) => setForm({ ...form, vigenciaDesde: e.target.value })} className="input text-sm" aria-label="Vigencia desde" />
            <input type="date" value={form.vigenciaHasta ?? ""} onChange={(e) => setForm({ ...form, vigenciaHasta: e.target.value })} className="input text-sm" aria-label="Vigencia hasta" />
          </div>
          <input placeholder="Límite de usos (opcional)" type="number" value={form.limiteUsos ?? ""} onChange={(e) => setForm({ ...form, limiteUsos: e.target.value ? Number(e.target.value) : undefined })} className="input w-full text-sm" />
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : "Crear cupón"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
