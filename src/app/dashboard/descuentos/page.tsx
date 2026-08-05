"use client";

import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type Descuento } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { puedeEscribirModulo } from "@/lib/permisos";

// Sin `tipo` por default (antes "porcentaje") — porcentaje vs. monto fijo
// cambia el significado real del cupón (10 = 10% o S/10), no es un detalle
// menor para heredar en silencio. `aplicaA: "ambos"` sí queda: es la opción
// más permisiva/inclusiva, no una restricción escondida.
const VACIO: Partial<Descuento> = { valor: 0, aplicaA: "ambos", activo: true };
const APLICA_A_LABEL: Record<Descuento["aplicaA"], string> = {
  cotizaciones: "Solo cotizaciones",
  ventas: "Solo ventas",
  ambos: "Cotizaciones y ventas",
};

/* Cupones/descuentos (idea de UX #8 del research de competencia). Ruta con
   permiso granular delegable ('descuentos') además de administrador — entra
   con solo lectura, el formulario/toggle/eliminar se ocultan sin escritura
   (ver proxy.ts y descuentos_read/descuentos_write en supabase-schema.sql). */
export default function DescuentosPage() {
  const { descuentos, rolesPersonalizados, addDescuento, updateDescuento, deleteDescuento, ready } = useData();
  const { empleado } = useSession();
  const puedeEditar = puedeEscribirModulo(empleado, rolesPersonalizados, "descuentos");
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
    if (!form.codigo || !form.valor || !form.tipo) return;
    setGuardando(true);
    await addDescuento({ ...form, codigo: form.codigo.toUpperCase() });
    setGuardando(false);
    setAbierto(false);
    setForm(VACIO);
    toast("Cupón creado.");
  }

  async function eliminar(d: Descuento) {
    await deleteDescuento(d.id);
    toast(`Cupón ${d.codigo} eliminado.`, "info", { label: "Deshacer", onClick: () => { void addDescuento(d); } });
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Descuentos y cupones</h1>

      <div className="table-card mt-4">
        {puedeEditar && (
          <div className="table-filter-bar justify-end">
            <button onClick={nuevo} className="btn-primary h-11 gap-1.5 sm:h-auto">
              <Plus size={16} /> Nuevo cupón
            </button>
          </div>
        )}

        <Skeleton name="descuentos-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Código</th>
                <th className="table-head-cell">Valor</th>
                <th className="table-head-cell hidden md:table-cell">Aplica a</th>
                <th className="table-head-cell hidden lg:table-cell">Vigencia</th>
                <th className="table-head-cell hidden md:table-cell">Usos</th>
                <th className="table-head-cell">Estado</th>
                {puedeEditar && <th className="table-head-cell text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((d) => (
                <tr key={d.id} className="table-row">
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Tag size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{d.codigo}</span>
                    </div>
                  </td>
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">
                    {d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`}
                  </td>
                  <td className="table-body-cell hidden md:table-cell text-slate-500 dark:text-slate-400">{APLICA_A_LABEL[d.aplicaA]}</td>
                  <td className="table-body-cell hidden lg:table-cell text-slate-500 dark:text-slate-400">
                    {d.vigenciaDesde || d.vigenciaHasta
                      ? `${d.vigenciaDesde ? formatearFechaPE(d.vigenciaDesde) : "—"} → ${d.vigenciaHasta ? formatearFechaPE(d.vigenciaHasta) : "—"}`
                      : "Sin límite"}
                  </td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{d.usos}{d.limiteUsos ? ` / ${d.limiteUsos}` : ""}</td>
                  <td className="table-body-cell">
                    <label className={`inline-flex items-center gap-2 ${puedeEditar ? "cursor-pointer" : ""}`}>
                      <input
                        type="checkbox" role="switch" checked={d.activo} disabled={!puedeEditar}
                        onChange={() => updateDescuento(d.id, { activo: !d.activo })}
                        className="switch"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{d.activo ? "Activo" : "Inactivo"}</span>
                    </label>
                  </td>
                  {puedeEditar && (
                    <td className="table-body-cell text-right">
                      <button onClick={() => eliminar(d)} title="Eliminar" aria-label={`Eliminar cupón ${d.codigo}`} className="row-icon-btn row-icon-btn-danger">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {descuentos.length === 0 && (
                <tr>
                  <td colSpan={puedeEditar ? 7 : 6}>
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
        </Skeleton>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Nuevo cupón">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="form-label">Código <span className="text-red-500">*</span></label>
            <input placeholder="Ej. VERANO10" required value={form.codigo ?? ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="input h-11 w-full uppercase sm:h-auto" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">Tipo <span className="text-red-500">*</span></label>
              <select value={form.tipo ?? ""} onChange={(e) => setForm({ ...form, tipo: e.target.value as Descuento["tipo"] })} className="select h-11 w-full min-w-0 sm:h-auto">
                <option value="" disabled>Tipo…</option>
                <option value="porcentaje">% Porcentaje</option>
                <option value="monto">S/ Monto fijo</option>
              </select>
            </div>
            <div>
              <label className="form-label">Valor <span className="text-red-500">*</span></label>
              <input placeholder="Ej. 10" type="number" step="0.01" required value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} className="input h-11 w-full min-w-0 sm:h-auto" />
            </div>
          </div>
          <div>
            <label className="form-label">Aplica a</label>
            <select value={form.aplicaA ?? "ambos"} onChange={(e) => setForm({ ...form, aplicaA: e.target.value as Descuento["aplicaA"] })} className="select h-11 w-full sm:h-auto">
              <option value="ambos">Cotizaciones y ventas</option>
              <option value="cotizaciones">Solo cotizaciones</option>
              <option value="ventas">Solo ventas</option>
            </select>
          </div>
          <div>
            <label className="form-label">Vigencia del cupón</label>
            <DateRangePicker
              etiqueta="Vigencia del cupón"
              desde={form.vigenciaDesde ?? ""}
              hasta={form.vigenciaHasta ?? ""}
              onChange={(d, h) => setForm({ ...form, vigenciaDesde: d || undefined, vigenciaHasta: h || undefined })}
            />
          </div>
          <div>
            <label className="form-label">Límite de usos</label>
            <input placeholder="Ej. 50" type="number" value={form.limiteUsos ?? ""} onChange={(e) => setForm({ ...form, limiteUsos: e.target.value ? Number(e.target.value) : undefined })} className="input h-11 w-full sm:h-auto" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campos obligatorios</p>
          <button type="submit" disabled={guardando || !form.codigo || !form.valor || !form.tipo} className="btn-primary h-11 w-full sm:h-auto">
            {guardando ? "Guardando…" : "Crear cupón"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
