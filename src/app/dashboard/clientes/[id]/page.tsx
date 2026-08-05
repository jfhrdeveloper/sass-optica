"use client";

import { useParams } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFecha } from "@/lib/formato/date";
import { ESTADO_CITA_LABEL, ESTADO_CITA_BADGE } from "@/lib/citas";

/* Pestaña "Citas" de la ficha de cliente (ruta base /dashboard/clientes/[id]
   — el resto del shell, header/contacto/notas/pestañas, vive en layout.tsx
   de esta misma carpeta). */
export default function ClienteCitasPage() {
  const params = useParams<{ id: string }>();
  const { clientes, citas } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const citasDelCliente = cliente
    ? [...citas].filter((c) => c.clienteId === cliente.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    : [];
  const { pagina: paginaCitas, setPagina: setPaginaCitas, totalPaginas: totalPaginasCitas, visibles: citasVisibles } =
    usePaginado(citasDelCliente);

  if (!cliente) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Citas ({citasDelCliente.length})</h2>
      {citasDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Primera vez — todavía no tiene citas registradas.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {citasVisibles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(c.fechaHora)}</p>
                  {c.motivo && <p className="text-xs text-slate-500 dark:text-slate-500">{c.motivo}</p>}
                </div>
                <span className={`badge ${ESTADO_CITA_BADGE[c.estado] ?? "badge-neutral"}`}>{ESTADO_CITA_LABEL[c.estado] ?? c.estado}</span>
              </li>
            ))}
          </ul>
          <Pagination pagina={paginaCitas} totalPaginas={totalPaginasCitas} onCambiar={setPaginaCitas} />
        </>
      )}
    </div>
  );
}
