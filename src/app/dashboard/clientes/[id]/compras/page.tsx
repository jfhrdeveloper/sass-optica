"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Trash2 } from "lucide-react";
import { useData, type Venta } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha } from "@/lib/formato/date";
import { construirHtmlRecibo } from "@/lib/recibo";

/* Pestaña "Compras" de la ficha de cliente — una venta no se "edita" ni se
   "elimina" (mismo criterio que ventas/page.tsx: alteraría stock/caja ya
   cerrados), se ANULA — revierte el stock y queda marcada, no desaparece
   del historial. */
export default function ClienteComprasPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { negocio, clientes, ventas, ventaItems, anularVenta } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const ventasDelCliente = cliente
    ? [...ventas].filter((v) => v.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const { pagina: paginaVentas, setPagina: setPaginaVentas, totalPaginas: totalPaginasVentas, visibles: ventasVisibles } =
    usePaginado(ventasDelCliente);

  /* Reimprimir el recibo de una compra pasada — mismo patrón que
     imprimirRecibo en ventas/page.tsx (ventana nueva + HTML con su propio
     `<style>`, no depende del dark mode del dashboard). */
  function imprimirRecibo(v: Venta) {
    const html = construirHtmlRecibo({
      negocioNombre: negocio?.nombre ?? "Óptica",
      negocioRuc: negocio?.ruc,
      clienteNombre: cliente ? `${cliente.nombres} ${cliente.apellidos}` : "—",
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

  const [confirmarAnular, setConfirmarAnular] = useState<Venta | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  async function confirmarAnularAccion() {
    const v = confirmarAnular;
    if (!v) return;
    setConfirmarAnular(null);
    setAnulandoId(v.id);
    await anularVenta(v.id);
    setAnulandoId(null);
    toast("Venta anulada. El stock de sus productos fue devuelto.", "info");
  }

  if (!cliente) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compras ({ventasDelCliente.length})</h2>
      {ventasDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Todavía no tiene compras registradas.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-1.5">
            {ventasVisibles.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-700 dark:text-slate-200">{formatearFecha(v.fecha)}</p>
                    <span className={`badge ${v.estado === "anulada" ? "badge-neutral" : "badge-success"}`}>
                      {v.estado === "anulada" ? "Anulada" : "Pagada"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                    {ventaItems.filter((it) => it.ventaId === v.id).map((it) => it.descripcion).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">S/ {v.total.toFixed(2)}</span>
                  <button
                    onClick={() => imprimirRecibo(v)}
                    title="Reimprimir recibo"
                    aria-label={`Reimprimir recibo de la compra del ${formatearFecha(v.fecha)}`}
                    className="row-icon-btn"
                  >
                    <Printer size={15} />
                  </button>
                  {v.estado !== "anulada" && (
                    <button
                      onClick={() => setConfirmarAnular(v)}
                      disabled={anulandoId === v.id}
                      title="Anular venta"
                      aria-label={`Anular la compra del ${formatearFecha(v.fecha)}`}
                      className="row-icon-btn row-icon-btn-danger disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination pagina={paginaVentas} totalPaginas={totalPaginasVentas} onCambiar={setPaginaVentas} />
        </>
      )}

      <ConfirmDialog
        abierto={Boolean(confirmarAnular)}
        titulo="¿Anular venta?"
        mensaje="El stock de los productos vendidos se devolverá al inventario. Esta acción no se puede deshacer."
        confirmarTexto="Anular"
        onConfirmar={confirmarAnularAccion}
        onCancelar={() => setConfirmarAnular(null)}
      />
    </div>
  );
}
