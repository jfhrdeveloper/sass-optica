"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useData, type Venta } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha } from "@/lib/formato/date";
import { construirHtmlRecibo } from "@/lib/recibo";

/* Pestaña "Compras" de la ficha de cliente. */
export default function ClienteComprasPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { negocio, clientes, ventas, ventaItems } = useData();
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
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(v.fecha)}</p>
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
                </div>
              </li>
            ))}
          </ul>
          <Pagination pagina={paginaVentas} totalPaginas={totalPaginasVentas} onCambiar={setPaginaVentas} />
        </>
      )}
    </div>
  );
}
