"use client";

import { useState } from "react";
import { Receipt, Trash2, Printer, ChevronDown } from "lucide-react";
import { Skeleton } from "boneyard-js/react";
import { useData, type Venta } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DatePicker } from "@/components/calendario/DatePicker";
import { construirHtmlRecibo } from "@/lib/recibo";
import { SettingsTabs, type TabDeAjustes } from "@/components/dashboard/SettingsTabs";

const TABS_VENTAS: TabDeAjustes[] = [
  { href: "/dashboard/ventas", label: "Nueva venta" },
  { href: "/dashboard/ventas/historial", label: "Ventas realizadas" },
];

/* Ver el mismo componente en cotizaciones/page.tsx: el placeholder/label
   nativo de un &lt;select&gt; desaparece al elegir un valor, así que sin esto no
   hay forma de recordar qué campo es cada uno una vez lleno. */
function Campo({ label, obligatorio, className, children }: { label: string; obligatorio?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="form-label">{label}{obligatorio && <> <span className="text-red-500">*</span></>}</label>
      {children}
    </div>
  );
}

export default function VentasHistorialPage() {
  const { ventas, ventaItems, clientes, negocio, sucursalFiltro, anularVenta, ready } = useData();
  const toast = useToast();
  const [confirmarAnular, setConfirmarAnular] = useState<Venta | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);

  /* Mobile: fila de la tabla de ventas expandida (ver Método de pago +
     acciones) — reemplaza el scroll horizontal por un desplegable, la
     tabla completa (con Método visible) sigue intacta en desktop. */
  const [filaExpandidaId, setFilaExpandidaId] = useState<string | null>(null);

  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  async function confirmarAnularAccion() {
    const v = confirmarAnular;
    if (!v) return;
    setConfirmarAnular(null);
    setAnulandoId(v.id);
    await anularVenta(v.id);
    setAnulandoId(null);
    toast("Venta anulada. El stock de sus productos fue devuelto.", "info");
  }

  const nombreCliente = (id?: string) => {
    if (!id) return "Sin cliente";
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  /* Descuento/recargo de una venta ya confirmada — mismo texto que arma
     confirmarVenta() en `notas` (único lugar donde queda persistido, ver
     ese comentario en ventas/page.tsx). Antes esta info solo se veía en la
     boleta impresa; el usuario pidió que la tabla/lista de ventas también
     la muestre. */
  const notasVenta = (v: Venta) => (v.notas ?? "").split(" · ").filter(Boolean);

  /* Ventana nueva con `document.write` + `print()` — patrón estándar para un
     recibo de una sola vez sin librería de PDF: el HTML ya trae su propio
     `<style>` (ver lib/recibo.ts), así que no depende de los estilos de la
     app ni se ve afectado por el dark mode del dashboard. */
  function imprimirRecibo(v: Venta) {
    const html = construirHtmlRecibo({
      negocioNombre: negocio?.nombre ?? "Óptica",
      negocioRuc: negocio?.ruc,
      clienteNombre: nombreCliente(v.clienteId),
      venta: v,
      items: ventaItems.filter((it) => it.ventaId === v.id),
    });
    const ventana = window.open("", "_blank", "width=400,height=600");
    if (!ventana) { toast("El navegador bloqueó la ventana de impresión.", "error"); return; }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  // Sin sede asignada = venta creada antes de tener multisedes (o negocio de
  // una sola sede): se sigue mostrando bajo cualquier filtro, nunca
  // "desaparece" — mismo criterio que el reparto de stock (ver Sucursales).
  const ordenadas = [...ventas]
    .filter((v) => !sucursalFiltro || !v.sucursalId || v.sucursalId === sucursalFiltro)
    .filter((v) => filtroMetodo === "todos" || v.metodoPago === filtroMetodo)
    .filter((v) => !desde || v.fecha.slice(0, 10) >= desde)
    .filter((v) => !hasta || v.fecha.slice(0, 10) <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(ordenadas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ventas</h1>
      <SettingsTabs tabs={TABS_VENTAS} gridMobile2 />

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          {/* "Todos los métodos" a ancho completo en su propia línea (mobile),
             y abajo Desde/Hasta como 2 campos propios en vez del selector de
             rango combinado (DateRangePicker) que usa el resto de la app —
             pedido explícito del usuario para Ventas en particular. El "*"
             en Desde es solo informativo (si vas a filtrar por fecha, hace
             falta un desde — Hasta se puede dejar vacío = hasta hoy), no
             bloquea nada: sin tocar el filtro se sigue viendo todo. */}
          <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)} className="select h-11 w-full sm:h-auto sm:w-auto">
            <option value="todos">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <div className="grid w-full grid-cols-2 gap-2 sm:contents">
            <Campo label="Desde" obligatorio>
              {/* Si se limpia Desde, Hasta se limpia con él — no solo se
                 deshabilita el botón, si no Hasta podía quedar con un valor
                 "fantasma" filtrando igual aunque ya no se viera editable. */}
              <DatePicker etiqueta="Desde" placeholder="Elegir fecha" valor={desde} onChange={(v) => { setDesde(v); if (!v) setHasta(""); }} />
            </Campo>
            <Campo label="Hasta">
              <DatePicker etiqueta="Hasta" placeholder="Elegir fecha" valor={hasta} onChange={setHasta} disabled={!desde} />
            </Campo>
          </div>
        </div>

        <Skeleton name="ventas-tabla" loading={!ready}>
        {/* Desktop: tabla completa sin cambios (Método ya visible acá). */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">Método</th>
                <th className="table-head-cell">Total</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((v) => (
                <tr key={v.id} className="table-row align-top">
                  <td className="table-body-cell text-slate-600 dark:text-slate-300" suppressHydrationWarning>
                    {new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><Receipt size={16} /></span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                    </div>
                  </td>
                  <td className="table-body-cell capitalize text-slate-600 dark:text-slate-300">{v.metodoPago}</td>
                  <td className="table-body-cell">
                    <span className="font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </div>
                    {notasVenta(v).map((linea) => (
                      <div key={linea} className={`text-xs ${linea.startsWith("Descuento") ? "text-accent" : "text-slate-500 dark:text-slate-500"}`}>
                        {linea}
                      </div>
                    ))}
                  </td>
                  <td className="table-body-cell">
                    <span className={`badge ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                      {v.estado === "anulada" ? "Anulada" : "Pagada"}
                    </span>
                  </td>
                  <td className="table-body-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => imprimirRecibo(v)}
                        title="Imprimir recibo"
                        aria-label={`Imprimir recibo de la venta a ${nombreCliente(v.clienteId)}`}
                        className="row-icon-btn"
                      >
                        <Printer size={15} />
                      </button>
                      {v.estado !== "anulada" && (
                        <button
                          onClick={() => setConfirmarAnular(v)}
                          disabled={anulandoId === v.id}
                          title="Anular venta"
                          aria-label="Anular venta"
                          className="row-icon-btn row-icon-btn-danger disabled:opacity-50"
                        >
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
                      <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin ventas todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: sin scroll horizontal — cada venta es una tarjeta
           colapsada (fecha/cliente/total/estado) y el chevron despliega lo
           que antes exigía scrollear: Método de pago + Imprimir/Anular. */}
        <div className="space-y-2 md:hidden">
          {visibles.map((v) => {
            const expandida = filaExpandidaId === v.id;
            return (
              <div key={v.id} className="card p-3 text-sm">
                <button
                  type="button"
                  onClick={() => setFilaExpandidaId(expandida ? null : v.id)}
                  aria-expanded={expandida}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="row-avatar shrink-0"><Receipt size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-slate-100">{nombreCliente(v.clienteId)}</span>
                      <span className="shrink-0 font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <span suppressHydrationWarning>{new Date(v.fecha).toLocaleString("es-PE", { timeZone: "America/Lima" })}</span>
                      <span className={`badge shrink-0 ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                        {v.estado === "anulada" ? "Anulada" : "Pagada"}
                      </span>
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${expandida ? "rotate-180" : ""}`} />
                </button>

                {expandida && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                    </p>
                    {notasVenta(v).map((linea) => (
                      <p key={linea} className={`text-xs ${linea.startsWith("Descuento") ? "text-accent" : "text-slate-500 dark:text-slate-500"}`}>
                        {linea}
                      </p>
                    ))}
                    <p className="text-xs capitalize text-slate-600 dark:text-slate-300">Método: {v.metodoPago}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => imprimirRecibo(v)}
                        className="btn-outline h-11 flex-1 gap-1.5 text-sm"
                      >
                        <Printer size={15} /> Imprimir
                      </button>
                      {v.estado !== "anulada" && (
                        <button
                          onClick={() => setConfirmarAnular(v)}
                          disabled={anulandoId === v.id}
                          className="btn-outline h-11 flex-1 gap-1.5 text-sm text-red-600 disabled:opacity-50 dark:text-red-400"
                        >
                          <Trash2 size={15} /> Anular
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {ordenadas.length === 0 && (
            <div className="table-empty">
              <Receipt size={28} className="text-slate-300 dark:text-slate-600" />
              Sin ventas todavía.
            </div>
          )}
        </div>
        </Skeleton>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <ConfirmDialog
        abierto={Boolean(confirmarAnular)}
        titulo="¿Anular venta?"
        mensaje="El stock de los productos vendidos se devolverá al inventario. Esta acción no se puede deshacer."
        confirmarTexto="Anular"
        onConfirmar={confirmarAnularAccion}
        onCancelar={() => setConfirmarAnular(null)}
      />
    </main>
  );
}
