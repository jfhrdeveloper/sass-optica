"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useData, type Descuento } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/SlideOver";
import { Pagination } from "@/components/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/date";

const VACIO: Partial<Descuento> = { tipo: "porcentaje", valor: 0, activo: true };

/* Cupones/descuentos (idea de UX #8 del research de competencia). Ruta con
   permiso granular delegable ('descuentos') además de administrador — ver
   proxy.ts y la RLS descuentos_write en supabase-schema.sql. */
export default function DescuentosPage() {
  const { descuentos, addDescuento, updateDescuento, deleteDescuento } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Descuento>>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(descuentos);

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
    toast("Cupón creado.");
  }

  async function eliminar(d: Descuento) {
    await deleteDescuento(d.id);
    toast(`Cupón ${d.codigo} eliminado.`, "info");
  }

  return (
    <main>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm font-medium link">← Inicio</Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Descuentos y cupones</h1>
      </div>

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <button onClick={nuevo} className="btn-primary gap-1.5">
            <Plus size={16} /> Nuevo cupón
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Código</th>
                <th className="table-head-cell">Valor</th>
                <th className="table-head-cell">Vigencia</th>
                <th className="table-head-cell">Usos</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((d) => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Tag size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{d.codigo}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">
                    {d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">
                    {d.vigenciaDesde || d.vigenciaHasta
                      ? `${d.vigenciaDesde ? formatearFechaPE(d.vigenciaDesde) : "—"} → ${d.vigenciaHasta ? formatearFechaPE(d.vigenciaHasta) : "—"}`
                      : "Sin límite"}
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{d.usos}{d.limiteUsos ? ` / ${d.limiteUsos}` : ""}</td>
                  <td className="table-cell">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox" role="switch" checked={d.activo}
                        onChange={() => updateDescuento(d.id, { activo: !d.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{d.activo ? "Activo" : "Inactivo"}</span>
                    </label>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => eliminar(d)} title="Eliminar" className="row-icon-btn row-icon-btn-danger">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {descuentos.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <Tag size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin cupones todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

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
