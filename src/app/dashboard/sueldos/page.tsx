"use client";

import { useState } from "react";
import { HandCoins, Trash2 } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type PagoSueldo, type TipoPeriodoPago } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { DatePicker } from "@/components/calendario/DatePicker";
import { puedeEscribirModulo } from "@/lib/permisos";

const TIPOS_PERIODO: TipoPeriodoPago[] = ["diario", "semanal", "quincenal", "mensual"];
const TIPO_PERIODO_LABEL: Record<TipoPeriodoPago, string> = {
  diario: "Diario", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual",
};
const METODOS_PAGO = ["efectivo", "tarjeta", "yape", "plin", "transferencia"] as const;
const METODO_PAGO_LABEL: Record<(typeof METODOS_PAGO)[number], string> = {
  efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia",
};

const VACIO: Partial<PagoSueldo> = { metodoPago: "efectivo" };

/* Sensible como Gastos (mismo criterio: SIN piso por defecto salvo
   administrador, ver 'sueldos' en lib/permisos.ts y pagos_sueldo_read/write
   en supabase-schema.sql) — ruta con permiso granular delegable, ver
   rutasConPermiso en src/proxy.ts. El formulario de alta y "Eliminar" se
   ocultan sin escritura, igual que en Gastos/Caja/Laboratorio. */
export default function SueldosPage() {
  const { pagosSueldo, empleados, rolesPersonalizados, addPagoSueldo, deletePagoSueldo, ready } = useData();
  const { empleado } = useSession();
  const puedeEditar = puedeEscribirModulo(empleado, rolesPersonalizados, "sueldos");
  const toast = useToast();
  const [form, setForm] = useState<Partial<PagoSueldo>>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  function elegirEmpleado(empleadoId: string) {
    const e = empleados.find((x) => x.id === empleadoId);
    setForm({
      ...form, empleadoId,
      tipoPeriodo: e?.tipoPago ?? form.tipoPeriodo,
      monto: e?.montoPagoBase ?? form.monto,
    });
  }

  function nombreEmpleado(id: string): string {
    const e = empleados.find((x) => x.id === id);
    return e ? `${e.nombres} ${e.apellidos}` : "—";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.empleadoId || !form.tipoPeriodo || !form.periodoDesde || !form.periodoHasta || !form.fechaPago || !form.monto) return;
    setGuardando(true);
    await addPagoSueldo(form);
    setGuardando(false);
    setForm(VACIO);
    toast("Pago de sueldo registrado.");
  }

  async function eliminar(p: PagoSueldo) {
    await deletePagoSueldo(p.id);
    toast("Pago eliminado (y su gasto asociado).", "info");
  }

  const ordenados = [...pagosSueldo]
    .filter((p) => !desde || p.fechaPago >= desde)
    .filter((p) => !hasta || p.fechaPago <= hasta)
    .sort((a, b) => b.fechaPago.localeCompare(a.fechaPago));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenados);

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Sueldos</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cada pago registrado acá crea automáticamente un Gasto (categoría &quot;Sueldos&quot;) — no hace falta registrarlo dos veces.
      </p>

      {puedeEditar && (
        <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          <div>
            <label className="form-label">Empleado <span className="text-red-500">*</span></label>
            <select value={form.empleadoId ?? ""} onChange={(e) => elegirEmpleado(e.target.value)} className="select h-11 w-full min-w-0 sm:h-auto">
              <option value="" disabled>Elegir empleado…</option>
              {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tipo de período <span className="text-red-500">*</span></label>
            <select value={form.tipoPeriodo ?? ""} onChange={(e) => setForm({ ...form, tipoPeriodo: e.target.value as TipoPeriodoPago })} className="select h-11 w-full min-w-0 sm:h-auto">
              <option value="" disabled>Elegir…</option>
              {TIPOS_PERIODO.map((t) => <option key={t} value={t}>{TIPO_PERIODO_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Monto (S/) <span className="text-red-500">*</span></label>
            <input placeholder="Ej. 1200.00" type="number" step="0.01" required value={form.monto ?? ""} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} className="input h-11 w-full min-w-0 sm:h-auto" />
          </div>
          <div>
            <label className="form-label">Método de pago</label>
            <select value={form.metodoPago ?? "efectivo"} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className="select h-11 w-full min-w-0 sm:h-auto">
              {METODOS_PAGO.map((m) => <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="form-label">Período que cubre <span className="text-red-500">*</span></label>
            <DateRangePicker
              desde={form.periodoDesde ?? ""} hasta={form.periodoHasta ?? ""}
              onChange={(d, h) => setForm({ ...form, periodoDesde: d || undefined, periodoHasta: h || undefined })}
            />
          </div>
          <div>
            <label className="form-label">Fecha de pago <span className="text-red-500">*</span></label>
            <DatePicker etiqueta="Fecha de pago" placeholder="Fecha" valor={form.fechaPago ?? ""} onChange={(v) => setForm({ ...form, fechaPago: v })} />
          </div>
          <div className="col-span-2">
            <label className="form-label">Notas</label>
            <input placeholder="Cualquier detalle adicional" value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input h-11 w-full min-w-0 sm:h-auto" />
          </div>
          <p className="col-span-full text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campos obligatorios</p>
          <button
            type="submit"
            disabled={guardando || !form.empleadoId || !form.tipoPeriodo || !form.periodoDesde || !form.periodoHasta || !form.fechaPago || !form.monto}
            className="btn-primary col-span-full h-11 sm:h-auto"
          >
            {guardando ? "Registrando…" : "Registrar pago"}
          </button>
        </form>
      )}

      <div className="table-card mt-4">
        <div className="table-filter-bar justify-end">
          <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>

        <Skeleton name="sueldos-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Empleado</th>
                <th className="table-head-cell hidden md:table-cell">Período</th>
                <th className="table-head-cell hidden md:table-cell">Rango</th>
                <th className="table-head-cell">Monto</th>
                <th className="table-head-cell hidden md:table-cell">Método</th>
                <th className="table-head-cell">Fecha de pago</th>
                {puedeEditar && <th className="table-head-cell text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><HandCoins size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreEmpleado(p.empleadoId)}</span>
                    </div>
                  </td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{TIPO_PERIODO_LABEL[p.tipoPeriodo]}</td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(p.periodoDesde)} – {formatearFechaPE(p.periodoHasta)}</td>
                  <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">S/ {p.monto.toFixed(2)}</td>
                  <td className="table-body-cell hidden md:table-cell capitalize text-slate-600 dark:text-slate-300">{p.metodoPago}</td>
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(p.fechaPago)}</td>
                  {puedeEditar && (
                    <td className="table-body-cell text-right">
                      <button onClick={() => eliminar(p)} title="Eliminar" aria-label={`Eliminar pago de ${nombreEmpleado(p.empleadoId)}`} className="row-icon-btn row-icon-btn-danger">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {ordenados.length === 0 && (
                <tr>
                  <td colSpan={puedeEditar ? 7 : 6}>
                    <div className="table-empty">
                      <HandCoins size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin pagos de sueldo registrados.
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
    </main>
  );
}
