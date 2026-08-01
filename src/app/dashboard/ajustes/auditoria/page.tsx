"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useData } from "@/components/providers/DataProvider";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_AUDIT_LOG } from "@/lib/mock/mock-data";
import { formatearFechaHora } from "@/lib/formato/date";
import { SettingsTabs, TABS_AJUSTES } from "@/components/dashboard/SettingsTabs";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { Pagination } from "@/components/ui/Pagination";

interface FilaAuditoria {
  id: number;
  ts: string;
  actorId: string | null;
  accion: string;
  tabla: string;
  filaId: string | null;
}

const ACCION_LABEL: Record<string, string> = { INSERT: "Creó", UPDATE: "Editó", DELETE: "Eliminó" };
const ACCION_BADGE: Record<string, string> = { INSERT: "badge-success", UPDATE: "badge-warning", DELETE: "badge-danger" };

/* Ruta protegida a nivel de proxy (rutasSoloAdministrador cubre todo lo que
   empieza con /dashboard/ajustes) — solo administrador llega hasta acá.
   Lee la tabla audit_log (ya poblada por triggers en supabase-schema.sql,
   ver fn_audit()) directo con el cliente de browser: la propia RLS
   (audit_read: is_administrador() and negocio_id = current_tenant()) ya
   filtra al tenant correcto, no hace falta admin.ts ni un route handler. */
export default function AuditoriaPage() {
  const { empleados } = useData();
  const mock = isMockMode();
  const [filas, setFilas] = useState<FilaAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTabla, setFiltroTabla] = useState("todas");

  useEffect(() => {
    let activo = true;
    async function cargar() {
      if (mock) {
        setFilas(MOCK_AUDIT_LOG.map((r) => ({ id: r.id, ts: r.ts, actorId: r.actor_id, accion: r.accion, tabla: r.tabla, filaId: r.fila_id })));
        setCargando(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_log")
        .select("id, ts, actor_id, accion, tabla, fila_id")
        .order("ts", { ascending: false })
        .limit(200);
      if (!activo) return;
      setFilas((data ?? []).map((r) => ({ id: r.id, ts: r.ts, actorId: r.actor_id, accion: r.accion, tabla: r.tabla, filaId: r.fila_id })));
      setCargando(false);
    }
    void cargar();
    return () => { activo = false; };
  }, [mock]);

  const nombrePorId = new Map(empleados.map((e) => [e.id, `${e.nombres} ${e.apellidos}`]));
  const tablas = Array.from(new Set(filas.map((f) => f.tabla))).sort();
  const filtradas = filas.filter((f) => filtroTabla === "todas" || f.tabla === filtroTabla);
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtradas, 20);

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ajustes</h1>
      <SettingsTabs tabs={TABS_AJUSTES} />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Quién cambió qué dentro de tu negocio — creación, edición y eliminación de registros
        sensibles (clientes, recetas, ventas, gastos, empleados, entre otros).
      </p>

      <div className="table-card mt-4">
        <div className="table-filter-bar">
          <select value={filtroTabla} onChange={(e) => setFiltroTabla(e.target.value)} className="select text-sm">
            <option value="todas">Todas las tablas</option>
            {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Fecha</th>
                <th className="table-head-cell">Quién</th>
                <th className="table-head-cell">Acción</th>
                <th className="table-head-cell hidden md:table-cell">Tabla</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.id} className="table-row">
                  <td className="table-body-cell text-slate-600 dark:text-slate-300">{formatearFechaHora(f.ts)}</td>
                  <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">
                    {f.actorId ? nombrePorId.get(f.actorId) ?? "Empleado eliminado" : "Sistema"}
                  </td>
                  <td className="table-body-cell">
                    <span className={`badge ${ACCION_BADGE[f.accion] ?? "badge-neutral"}`}>{ACCION_LABEL[f.accion] ?? f.accion}</span>
                    <span className="ml-2 text-slate-500 dark:text-slate-400 md:hidden">{f.tabla}</span>
                  </td>
                  <td className="table-body-cell hidden capitalize text-slate-600 dark:text-slate-300 md:table-cell">{f.tabla}</td>
                </tr>
              ))}
              {!cargando && filtradas.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">
                      <History size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin actividad registrada todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>
    </main>
  );
}
