"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Building2, ChevronRight } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { formatearFechaPE } from "@/lib/formato/date";
import { coincideBusqueda } from "@/lib/formato/texto";
import { etiquetaUltimaActividad, diasInactivo } from "@/lib/uso";

export type NegocioFila = {
  id: string;
  nombre: string;
  subdominio: string;
  activo: boolean;
  createdAt: string;
  plan: string | null;
  estado: string | null;
  trialFin: string | null;
  ultimaActividad: string | null;
};

const DIAS_POR_VENCER = 7;
/* Umbral para marcar "sin uso reciente" — señal de riesgo de abandono que
   `suscripciones` sola no muestra (un trial puede seguir vigente semanas
   sin que nadie entre al sistema). Solo se marca en negocios que siguen
   activos y sin cancelar: uno ya suspendido no necesita esta alerta. */
const DIAS_SIN_USO_ALERTA = 14;

const PLAN_LABEL: Record<string, string> = { gratis: "Gratis", basico: "Básico", premium: "Premium" };
const ESTADO_LABEL: Record<string, string> = { trial: "Trial", activa: "Activa", vencida: "Vencida", cancelada: "Cancelada" };
const ESTADO_BADGE: Record<string, string> = { trial: "badge-warning", activa: "badge-success", vencida: "badge-danger", cancelada: "badge-neutral" };

type Filtro = "todos" | "por_vencer" | "trial" | "activa" | "vencida" | "inactivo" | "sin_uso";

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
  function sinUsoReciente(n: NegocioFila): boolean {
    if (!n.activo || n.estado === "cancelada") return false;
    const dias = diasInactivo(n.ultimaActividad, new Date(ahora));
    return dias !== null && dias >= DIAS_SIN_USO_ALERTA;
  }

  const filtrados = negocios
    .filter((n) => coincideBusqueda(`${n.nombre} ${n.subdominio}`, busqueda))
    .filter((n) => {
      switch (filtro) {
        case "todos": return true;
        case "por_vencer": return porVencer(n);
        case "inactivo": return !n.activo;
        case "sin_uso": return sinUsoReciente(n);
        /* "Pagando" ≠ solo estado activa: el plan Gratis también es siempre
           "activa" (su estado normal, permanente) — sin excluirlo acá el
           filtro mezclaría negocios que nunca pagaron nada. */
        case "activa": return n.estado === "activa" && n.plan !== "gratis";
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
            className="input w-full pl-9"
          />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="select">
          <option value="todos">Todos</option>
          <option value="por_vencer">Por vencer (≤{DIAS_POR_VENCER}d)</option>
          <option value="trial">En trial</option>
          <option value="activa">Pagando</option>
          <option value="vencida">Vencida</option>
          <option value="inactivo">Inactivo</option>
          <option value="sin_uso">Sin uso hace {DIAS_SIN_USO_ALERTA}+ días</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-head-cell">Negocio</th>
              <th className="table-head-cell hidden sm:table-cell">Plan</th>
              <th className="table-head-cell">Estado</th>
              <th className="table-head-cell hidden lg:table-cell">Última actividad</th>
              <th className="table-head-cell hidden md:table-cell">Trial hasta</th>
              <th className="table-head-cell hidden lg:table-cell">Alta</th>
              <th className="table-head-cell text-right"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((n) => {
              const dias = diasParaVencer(n.trialFin);
              return (
                <tr key={n.id} className="table-row">
                  <td className="table-body-cell">
                    <Link href={`/admin-panel/negocios/${n.id}`} className="flex items-center gap-3 text-left">
                      <span className="row-avatar"><Building2 size={16} /></span>
                      <span>
                        <span className="block font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">
                          {n.nombre}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-500">{n.subdominio}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="table-body-cell hidden sm:table-cell text-slate-600 dark:text-slate-300">{n.plan ? PLAN_LABEL[n.plan] ?? n.plan : "—"}</td>
                  <td className="table-body-cell">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {n.estado && <span className={`badge ${ESTADO_BADGE[n.estado] ?? "badge-neutral"}`}>{ESTADO_LABEL[n.estado] ?? n.estado}</span>}
                      {!n.activo && <span className="badge badge-neutral">Inactivo</span>}
                      {porVencer(n) && <span className="badge badge-warning">Vence en {dias}d</span>}
                      {sinUsoReciente(n) && <span className="badge badge-warning">Sin uso</span>}
                    </span>
                  </td>
                  <td className="table-body-cell hidden lg:table-cell text-slate-600 dark:text-slate-300">{etiquetaUltimaActividad(n.ultimaActividad, new Date(ahora))}</td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{n.trialFin ? formatearFechaPE(n.trialFin) : "—"}</td>
                  <td className="table-body-cell hidden lg:table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(n.createdAt)}</td>
                  <td className="table-body-cell text-right">
                    <Link href={`/admin-panel/negocios/${n.id}`} aria-label={`Ver detalle de ${n.nombre}`} className="row-icon-btn ml-auto">
                      <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7}>
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
