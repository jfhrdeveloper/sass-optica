"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Building2, ChevronRight } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { coincideBusqueda } from "@/lib/formato/texto";

export type NegocioFila = {
  id: string;
  nombre: string;
  subdominio: string;
  activo: boolean;
  createdAt: string;
  plan: string | null;
  estado: string | null;
  trialFin: string | null;
};

const DIAS_POR_VENCER = 7;

const PLAN_LABEL: Record<string, string> = { trial: "Prueba", basico: "Básico", premium: "Premium" };
const ESTADO_LABEL: Record<string, string> = { trial: "Trial", activa: "Activa", vencida: "Vencida", cancelada: "Cancelada" };
const ESTADO_BADGE: Record<string, string> = { trial: "badge-warning", activa: "badge-success", vencida: "badge-danger", cancelada: "badge-neutral" };

type Filtro = "todos" | "por_vencer" | "trial" | "activa" | "vencida" | "inactivo";

/* Tabla interactiva del listado de negocios — recibe filas ya cruzadas
   (negocio + suscripción) desde el Server Component en page.tsx, que es el
   único lugar donde se llama a admin.ts (service role). */
export function NegociosTable({ negocios }: { negocios: NegocioFila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  /* Lazy initializer (no Date.now() directo en el render) — misma regla de
     pureza que ClientesPage.tsx para "en riesgo". */
  const [ahora] = useState(() => Date.now());

  function diasParaVencer(trialFin: string | null): number | null {
    if (!trialFin) return null;
    return Math.ceil((new Date(`${trialFin}T00:00:00`).getTime() - ahora) / 86400000);
  }
  function porVencer(n: NegocioFila): boolean {
    if (n.estado !== "trial") return false;
    const dias = diasParaVencer(n.trialFin);
    return dias !== null && dias <= DIAS_POR_VENCER;
  }

  const filtrados = negocios
    .filter((n) => coincideBusqueda(`${n.nombre} ${n.subdominio}`, busqueda))
    .filter((n) => {
      switch (filtro) {
        case "todos": return true;
        case "por_vencer": return porVencer(n);
        case "inactivo": return !n.activo;
        default: return n.estado === filtro;
      }
    })
    .sort((a, b) => {
      if (filtro === "por_vencer") return (diasParaVencer(a.trialFin) ?? 0) - (diasParaVencer(b.trialFin) ?? 0);
      return b.createdAt.localeCompare(a.createdAt);
    });
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtrados);

  return (
    <div className="table-card mt-4">
      <div className="table-filter-bar">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Buscar por nombre o subdominio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="select text-sm">
          <option value="todos">Todos</option>
          <option value="por_vencer">Por vencer (≤{DIAS_POR_VENCER}d)</option>
          <option value="trial">En trial</option>
          <option value="activa">Pagando</option>
          <option value="vencida">Vencida</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-head-cell">Negocio</th>
              <th className="table-head-cell">Plan</th>
              <th className="table-head-cell">Estado</th>
              <th className="table-head-cell">Trial hasta</th>
              <th className="table-head-cell">Alta</th>
              <th className="table-head-cell text-right"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((n) => {
              const dias = diasParaVencer(n.trialFin);
              return (
                <tr key={n.id} className="table-row">
                  <td className="table-cell">
                    <Link href={`/admin-panel/negocios/${n.id}`} className="flex items-center gap-3 text-left">
                      <span className="row-avatar"><Building2 size={16} /></span>
                      <span>
                        <span className="block font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">
                          {n.nombre}
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">{n.subdominio}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{n.plan ? PLAN_LABEL[n.plan] ?? n.plan : "—"}</td>
                  <td className="table-cell">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {n.estado && <span className={`badge ${ESTADO_BADGE[n.estado] ?? "badge-neutral"}`}>{ESTADO_LABEL[n.estado] ?? n.estado}</span>}
                      {!n.activo && <span className="badge badge-neutral">Inactivo</span>}
                      {porVencer(n) && <span className="badge badge-warning">Vence en {dias}d</span>}
                    </span>
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{n.trialFin ? formatearFechaPE(n.trialFin) : "—"}</td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(n.createdAt)}</td>
                  <td className="table-cell text-right">
                    <Link href={`/admin-panel/negocios/${n.id}`} className="row-icon-btn ml-auto">
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="table-empty">
                    <Building2 size={28} className="text-slate-300 dark:text-slate-600" />
                    Sin negocios que coincidan con el filtro.
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
