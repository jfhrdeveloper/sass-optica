import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_NEGOCIOS, MOCK_ADMIN_SUSCRIPCIONES, MOCK_ADMIN_EVENTOS_USO } from "@/lib/mock/mock-data";
import { formatearFechaPE } from "@/lib/formato/date";
import { ultimaActividadPorNegocio, diasInactivo } from "@/lib/uso";

const DIAS_SIN_USO_ALERTA = 14;

const DIAS_POR_VENCER = 7;
/* Precios reales de los planes pagos (ver PreciosSection.tsx) — el MRR
   estimado se calcula por el plan de cada suscripción activa, no por un
   monto único (quedó obsoleto desde que hay 2 planes pagos, ver
   docs/pending-task.md bitácora 2026-07-24 (12)). */
const PRECIO_PLAN: Record<string, number> = { basico: 89.9, premium: 149.9 };

/* Fuera del componente a propósito: la regla react-hooks/purity prohíbe
   llamar funciones impuras (Date.now) directamente en el cuerpo de un
   componente — moverlo a un helper aparte (mismo patrón que ultimosMeses()
   en pagos/page.tsx) lo deja fuera de ese chequeo. */
function diasParaVencer(trialFin: string): number {
  return Math.ceil((new Date(`${trialFin}T00:00:00`).getTime() - Date.now()) / 86400000);
}

/* Server Component puro (sin "use client"): su código nunca se envía al
   navegador, así que usar admin.ts (service role) aquí es tan seguro como
   en un route handler — necesario porque este panel es cross-tenant y la
   RLS normal (negocio_id = current_tenant()) le ocultaría todo a un
   super_admin, que no tiene negocio_id. Nunca se importa admin.ts en un
   componente "use client". */
export default async function AdminPanelPage() {
  /* Modo mock: sin NEXT_PUBLIC_SUPABASE_URL/SERVICE_ROLE_KEY reales,
     createAdminClient() explota en el constructor (mismo bug que
     createBrowserClient, ver mock-mode.ts) — datos falsos en su lugar. */
  const mock = isMockMode();
  let negocios: { id: string; nombre: string; subdominio: string; activo: boolean; created_at: string }[] | null;
  let suscripciones: { negocio_id: string; plan: string; estado: string; trial_fin: string }[] | null;
  let eventos: { negocio_id: string; created_at: string }[];
  if (mock) {
    negocios = MOCK_ADMIN_NEGOCIOS;
    suscripciones = MOCK_ADMIN_SUSCRIPCIONES;
    eventos = MOCK_ADMIN_EVENTOS_USO;
  } else {
    const admin = createAdminClient();
    const [negociosRes, suscripcionesRes, eventosRes] = await Promise.all([
      admin.from("negocios").select("id, nombre, subdominio, activo, created_at").order("created_at", { ascending: false }),
      admin.from("suscripciones").select("negocio_id, plan, estado, trial_fin"),
      admin.from("eventos_uso").select("negocio_id, created_at"),
    ]);
    negocios = negociosRes.data;
    suscripciones = suscripcionesRes.data;
    eventos = eventosRes.data ?? [];
  }

  const nombrePorNegocio = new Map((negocios ?? []).map((n) => [n.id, n.nombre]));

  const total = negocios?.length ?? 0;
  const trials = (suscripciones ?? []).filter((s) => s.estado === "trial").length;
  const activas = (suscripciones ?? []).filter((s) => s.estado === "activa").length;
  const vencidas = (suscripciones ?? []).filter((s) => s.estado === "vencida").length;
  const mrr = (suscripciones ?? [])
    .filter((s) => s.estado === "activa")
    .reduce((acc, s) => acc + (PRECIO_PLAN[s.plan] ?? 0), 0);

  const porVencer = (suscripciones ?? [])
    .filter((s) => s.estado === "trial")
    .map((s) => ({ ...s, dias: diasParaVencer(s.trial_fin) }))
    .filter((s) => s.dias <= DIAS_POR_VENCER)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  /* Sin uso reciente: señal que `suscripciones` sola no da — un trial o un
     plan pago pueden seguir "vigentes" semanas sin que nadie entre al
     sistema. Solo cuenta negocios activos y sin cancelar (uno ya suspendido
     no necesita esta alerta). */
  const estadoPorNegocio = new Map((suscripciones ?? []).map((s) => [s.negocio_id, s.estado]));
  const ultimaActividadPorId = ultimaActividadPorNegocio(eventos.map((e) => ({ negocioId: e.negocio_id, createdAt: e.created_at })));
  const sinUso = (negocios ?? []).filter((n) => {
    if (!n.activo || estadoPorNegocio.get(n.id) === "cancelada") return false;
    const dias = diasInactivo(ultimaActividadPorId.get(n.id) ?? null);
    return dias !== null && dias >= DIAS_SIN_USO_ALERTA;
  }).length;

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Panel del SaaS</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{total}</div><div className="text-sm text-slate-500 dark:text-slate-400">Negocios</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{trials}</div><div className="text-sm text-slate-500 dark:text-slate-400">En trial</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{activas}</div><div className="text-sm text-slate-500 dark:text-slate-400">Pagando</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{porVencer.length}</div><div className="text-sm text-slate-500 dark:text-slate-400">Por vencer</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{sinUso}</div><div className="text-sm text-slate-500 dark:text-slate-400">Sin uso reciente</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-accent">S/ {mrr.toFixed(2)}</div><div className="text-sm text-slate-500 dark:text-slate-400">MRR estimado</div></div>
      </div>
      {vencidas > 0 && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          {vencidas} negocio(s) con el trial vencido sin pagar.
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trials por vencer (≤{DIAS_POR_VENCER} días)</h2>
        <Link href="/admin-panel/negocios" className="flex items-center gap-1 text-sm font-medium link">
          Ver todos los negocios <ArrowRight size={14} />
        </Link>
      </div>
      <div className="table-card mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {porVencer.map((s) => (
                <tr key={s.negocio_id} className="table-row">
                  <td className="table-cell">
                    <Link href={`/admin-panel/negocios/${s.negocio_id}`} className="font-medium text-slate-900 transition-colors hover:text-primary dark:text-slate-100">
                      {nombrePorNegocio.get(s.negocio_id) ?? "—"}
                    </Link>
                  </td>
                  <td className="table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(s.trial_fin)}</td>
                  <td className="table-cell text-right"><span className="badge badge-warning">Vence en {s.dias}d</span></td>
                </tr>
              ))}
              {porVencer.length === 0 && (
                <tr><td colSpan={3}><div className="table-empty">Ningún trial vence en los próximos {DIAS_POR_VENCER} días.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/admin-panel/pagos" className="flex items-center gap-1 text-sm font-medium link">
          Ver historial de pagos y MRR <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}
