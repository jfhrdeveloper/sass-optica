import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, CreditCard, Activity } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_NEGOCIOS, MOCK_ADMIN_SUSCRIPCIONES, MOCK_ADMIN_EMPLEADOS, MOCK_ADMIN_PAGOS, MOCK_ADMIN_EVENTOS_USO } from "@/lib/mock/mock-data";
import { leerOverridesActivo, aplicarOverridesActivo } from "@/lib/mock/mock-admin-overrides";
import { formatearFechaPE } from "@/lib/formato/date";
import { SuspenderNegocioButton } from "@/components/admin/SuspenderNegocioButton";
import { ActividadBarChart } from "@/components/admin/ActividadBarChart";
import { ActividadHeatmap } from "@/components/admin/ActividadHeatmap";
import {
  ultimaActividad, etiquetaUltimaActividad, eventosPorDia, heatmapDiaHora,
  picoDeUso, etiquetaPico, modulosMasUsados,
} from "@/lib/uso";

const DIAS_ACTIVIDAD = 14;

const PLAN_LABEL: Record<string, string> = { gratis: "Gratis", basico: "Básico", premium: "Premium" };
const ESTADO_LABEL: Record<string, string> = { trial: "Trial", activa: "Activa", vencida: "Vencida", cancelada: "Cancelada" };
const ESTADO_BADGE: Record<string, string> = { trial: "badge-warning", activa: "badge-success", vencida: "badge-danger", cancelada: "badge-neutral" };

/* Server Component puro — mismo criterio que el resto del admin-panel:
   admin.ts (service role) nunca sale de aquí. Vista cross-tenant de UN
   negocio: datos de contacto, empleados, suscripción actual e historial de
   pagos, + la acción de suspender/reactivar (SuspenderNegocioButton). */
export default async function NegocioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mock = isMockMode();

  let negocio: { id: string; nombre: string; subdominio: string; ruc: string | null; telefono: string | null; direccion: string | null; activo: boolean; created_at: string } | null;
  let suscripcion: { plan: string; estado: string; trial_fin: string; fecha_pago_ultimo: string | null } | null;
  let empleados: { id: string; nombres: string; apellidos: string; rol: string; email: string | null; activo: boolean }[];
  let pagos: { id: string; monto: number; moneda: string; metodo_pago: string | null; estado: string; created_at: string }[];
  let eventos: { ruta: string; created_at: string }[];

  if (mock) {
    const negociosConOverride = aplicarOverridesActivo(MOCK_ADMIN_NEGOCIOS, await leerOverridesActivo());
    negocio = negociosConOverride.find((n) => n.id === id) ?? null;
    const s = MOCK_ADMIN_SUSCRIPCIONES.find((s) => s.negocio_id === id) ?? null;
    suscripcion = s ? { ...s, fecha_pago_ultimo: null } : null;
    empleados = MOCK_ADMIN_EMPLEADOS.filter((e) => e.negocio_id === id);
    pagos = MOCK_ADMIN_PAGOS.filter((p) => p.negocio_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    eventos = MOCK_ADMIN_EVENTOS_USO.filter((e) => e.negocio_id === id);
  } else {
    const admin = createAdminClient();
    const [negocioRes, suscripcionRes, empleadosRes, pagosRes, eventosRes] = await Promise.all([
      admin.from("negocios").select("id, nombre, subdominio, ruc, telefono, direccion, activo, created_at").eq("id", id).maybeSingle(),
      admin.from("suscripciones").select("plan, estado, trial_fin, fecha_pago_ultimo").eq("negocio_id", id).maybeSingle(),
      admin.from("empleados").select("id, nombres, apellidos, rol, email, activo").eq("negocio_id", id),
      admin.from("pagos_saas").select("id, monto, moneda, metodo_pago, estado, created_at").eq("negocio_id", id).order("created_at", { ascending: false }),
      admin.from("eventos_uso").select("ruta, created_at").eq("negocio_id", id),
    ]);
    negocio = negocioRes.data;
    suscripcion = suscripcionRes.data;
    empleados = empleadosRes.data ?? [];
    pagos = pagosRes.data ?? [];
    eventos = eventosRes.data ?? [];
  }

  if (!negocio) notFound();

  const eventosUso = eventos.map((e) => ({ ruta: e.ruta, createdAt: e.created_at }));
  const ultima = ultimaActividad(eventosUso);
  const serieActividad = eventosPorDia(eventosUso, DIAS_ACTIVIDAD);
  const heatmap = heatmapDiaHora(eventosUso);
  const pico = etiquetaPico(picoDeUso(eventosUso));
  const modulos = modulosMasUsados(eventosUso);
  const totalEventos30d = eventosPorDia(eventosUso, 30).reduce((acc, p) => acc + p.total, 0);

  return (
    <main>
      <Link href="/admin-panel/negocios" className="flex items-center gap-1.5 text-sm font-medium link">
        <ArrowLeft size={15} /> Negocios
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{negocio.nombre}</h1>
            {suscripcion?.estado && <span className={`badge ${ESTADO_BADGE[suscripcion.estado] ?? "badge-neutral"}`}>{ESTADO_LABEL[suscripcion.estado] ?? suscripcion.estado}</span>}
            {!negocio.activo && <span className="badge badge-neutral">Inactivo</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{negocio.subdominio}.dominio.pe · alta {formatearFechaPE(negocio.created_at)}</p>
        </div>
        <SuspenderNegocioButton id={negocio.id} activo={negocio.activo} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">RUC</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{negocio.ruc ?? "—"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">Teléfono</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{negocio.telefono ?? "—"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">Dirección</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{negocio.direccion ?? "—"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">Plan</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{suscripcion?.plan ? PLAN_LABEL[suscripcion.plan] ?? suscripcion.plan : "—"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">Trial hasta</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{suscripcion?.trial_fin ? formatearFechaPE(suscripcion.trial_fin) : "—"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 dark:text-slate-500">Último pago</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{suscripcion?.fecha_pago_ultimo ? formatearFechaPE(suscripcion.fecha_pago_ultimo) : "—"}</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Activity size={16} /> Uso del sistema
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Qué tan seguido entra este negocio, a qué hora y qué módulos usa más — no depende de si paga o no.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-xs text-slate-400 dark:text-slate-500">Última actividad</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{etiquetaUltimaActividad(ultima)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 dark:text-slate-500">Eventos (últimos 30 días)</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{totalEventos30d}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 dark:text-slate-500">Módulo más usado</div>
            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{modulos[0]?.label ?? "—"}</div>
          </div>
        </div>

        <div className="card mt-4 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Actividad diaria (últimos {DIAS_ACTIVIDAD} días)</h3>
          <ActividadBarChart puntos={serieActividad} />
        </div>

        <div className="card mt-4 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Día y hora de uso (hora de Perú)</h3>
          <div className="mt-3">
            <ActividadHeatmap matriz={heatmap} picoLabel={pico} />
          </div>
        </div>

        {modulos.length > 0 && (
          <div className="card mt-4 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Módulos más usados</h3>
            <ul className="mt-3 space-y-2">
              {modulos.map((m) => {
                const max = modulos[0].total;
                return (
                  <li key={m.ruta} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 text-slate-600 dark:text-slate-300">{m.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (m.total / max) * 100)}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">{m.total}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Users size={16} /> Empleados ({empleados.length})
        </h2>
        <div className="table-card mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><th className="table-head-cell">Nombre</th><th className="table-head-cell">Rol</th><th className="table-head-cell">Email</th></tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell font-medium text-slate-900 dark:text-slate-100">{e.nombres} {e.apellidos}{!e.activo && " (inactivo)"}</td>
                    <td className="table-cell capitalize text-slate-600 dark:text-slate-300">{e.rol}</td>
                    <td className="table-cell text-slate-600 dark:text-slate-300">{e.email ?? "—"}</td>
                  </tr>
                ))}
                {empleados.length === 0 && (
                  <tr><td colSpan={3}><div className="table-empty">Sin empleados registrados.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <CreditCard size={16} /> Historial de pagos ({pagos.length})
        </h2>
        <div className="table-card mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><th className="table-head-cell">Fecha</th><th className="table-head-cell">Monto</th><th className="table-head-cell">Método</th><th className="table-head-cell">Estado</th></tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(p.created_at)}</td>
                    <td className="table-cell font-medium text-slate-900 dark:text-slate-100">{p.moneda} {p.monto.toFixed(2)}</td>
                    <td className="table-cell capitalize text-slate-600 dark:text-slate-300">{p.metodo_pago ?? "—"}</td>
                    <td className="table-cell"><span className="badge badge-success">{p.estado}</span></td>
                  </tr>
                ))}
                {pagos.length === 0 && (
                  <tr><td colSpan={4}><div className="table-empty">Sin pagos registrados todavía.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
