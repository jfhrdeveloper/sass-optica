"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CreditCard } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/date";
import { coincideBusqueda } from "@/lib/texto";

export type PagoFila = {
  id: string;
  negocioId: string;
  negocioNombre: string;
  monto: number;
  moneda: string;
  metodoPago: string | null;
  estado: string;
  createdAt: string;
};

type Filtro = "todos" | "tarjeta" | "yape";

/* Tabla cross-tenant de todos los pagos_saas — mismo patrón de
   búsqueda/filtro/paginación que NegociosTable.tsx. */
export function PagosTable({ pagos }: { pagos: PagoFila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtrados = pagos
    .filter((p) => coincideBusqueda(p.negocioNombre, busqueda))
    .filter((p) => filtro === "todos" || p.metodoPago === filtro)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  return (
    <div className="table-card mt-4">
      <div className="table-filter-bar">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Buscar por negocio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="select text-sm">
          <option value="todos">Todos los métodos</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="yape">Yape</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-head-cell">Negocio</th>
              <th className="table-head-cell">Fecha</th>
              <th className="table-head-cell">Monto</th>
              <th className="table-head-cell">Método</th>
              <th className="table-head-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell">
                  <Link href={`/admin-panel/negocios/${p.negocioId}`} className="font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">
                    {p.negocioNombre}
                  </Link>
                </td>
                <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(p.createdAt)}</td>
                <td className="table-cell font-medium text-slate-900 dark:text-slate-100">{p.moneda} {p.monto.toFixed(2)}</td>
                <td className="table-cell capitalize text-slate-600 dark:text-slate-300">{p.metodoPago ?? "—"}</td>
                <td className="table-cell"><span className="badge badge-success">{p.estado}</span></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="table-empty">
                    <CreditCard size={28} className="text-slate-300 dark:text-slate-600" />
                    Sin pagos que coincidan con el filtro.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
    </div>
  );
}
