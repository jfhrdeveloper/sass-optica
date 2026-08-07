"use client";

import { useState } from "react";
import { FileText, ArrowRightCircle, Trash2 } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type Cotizacion } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_COTIZACIONES: TabDeAjustes[] = [
  { href: "/dashboard/cotizaciones", label: "Nueva cotización" },
  { href: "/dashboard/cotizaciones/historial", label: "Cotizaciones realizadas" },
];

const ESTADO_BADGE: Record<Cotizacion["estado"], string> = {
  pendiente: "badge-neutral",
  aceptada: "badge-success",
  rechazada: "badge-danger",
  vencida: "badge-neutral",
};
const ESTADO_LABEL: Record<Cotizacion["estado"], string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export default function CotizacionesHistorialPage() {
  const { cotizaciones, cotizacionItems, clientes, updateCotizacion, deleteCotizacion, convertirCotizacionAVenta, ready } = useData();
  const toast = useToast();
  const [convirtiendoId, setConvirtiendoId] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Cotizacion | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todos" | Cotizacion["estado"]>("todos");

  async function convertir(id: string) {
    setConvirtiendoId(id);
    const { ok, error } = await convertirCotizacionAVenta(id);
    setConvirtiendoId(null);
    if (!ok) {
      toast(error ?? "No se pudo convertir la cotización en venta.", "error");
      return;
    }
    toast("Cotización convertida en venta.");
  }

  async function rechazar(id: string) {
    await updateCotizacion(id, { estado: "rechazada" });
    toast("Cotización rechazada.", "info");
  }

  async function confirmarEliminarAccion() {
    const c = confirmarEliminar;
    if (!c) return;
    setConfirmarEliminar(null);
    await deleteCotizacion(c.id);
    toast("Cotización eliminada.", "info");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  const ordenadas = [...cotizaciones]
    .filter((c) => filtroEstado === "todos" || c.estado === filtroEstado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenadas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cotizaciones</h1>
      <SettingsTabs tabs={TABS_COTIZACIONES} />

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className="select h-11 sm:h-auto">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>

        <Skeleton name="cotizaciones-tabla" loading={!ready}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell hidden md:table-cell">Vigencia</th>
                <th className="table-head-cell">Total</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id} className="table-row align-top">
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(c.fecha)}</td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><FileText size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(c.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-body-cell hidden md:table-cell text-slate-500 dark:text-slate-400">{c.vigenciaHasta ? formatearFechaPE(c.vigenciaHasta) : "—"}</td>
                  <td className="table-body-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {c.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {cotizacionItems.filter((it) => it.cotizacionId === c.id).map((it) => it.descripcion).join(", ")}
                    </div>
                  </td>
                  <td className="table-body-cell">
                    {/* Ningún estado se revierte una vez que sale de "pendiente"
                        (pedido explícito del usuario) — antes "rechazada" tenía
                        un botón "Volver a pendiente", se quitó a propósito. */}
                    {c.estado === "pendiente" ? (
                      <button onClick={() => rechazar(c.id)} className="badge badge-neutral cursor-pointer hover:opacity-75">
                        Rechazar
                      </button>
                    ) : (
                      <span className={`badge ${ESTADO_BADGE[c.estado]}`}>{ESTADO_LABEL[c.estado]}</span>
                    )}
                  </td>
                  <td className="table-body-cell text-right">
                    <div className="flex justify-end gap-1">
                      {c.estado === "pendiente" && (
                        <button
                          onClick={() => convertir(c.id)}
                          disabled={convirtiendoId === c.id}
                          title="Convertir a venta"
                          aria-label="Convertir a venta"
                          className="row-icon-btn disabled:opacity-50"
                        >
                          <ArrowRightCircle size={16} />
                        </button>
                      )}
                      {c.estado === "aceptada" && c.ventaId ? (
                        <span className="text-xs text-slate-500 dark:text-slate-500">Ya es venta</span>
                      ) : (
                        <button onClick={() => setConfirmarEliminar(c)} title="Eliminar" aria-label="Eliminar cotización" className="row-icon-btn row-icon-btn-danger">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <FileText size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin cotizaciones todavía.
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

      <ConfirmDialog
        abierto={Boolean(confirmarEliminar)}
        titulo="¿Eliminar cotización?"
        mensaje="Esta acción no se puede deshacer."
        confirmarTexto="Eliminar"
        onConfirmar={confirmarEliminarAccion}
        onCancelar={() => setConfirmarEliminar(null)}
      />
    </main>
  );
}
