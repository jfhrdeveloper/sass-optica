import { createAdminClient } from "@/lib/supabase/admin";

/* Server Component puro (sin "use client"): su código nunca se envía al
   navegador, así que usar admin.ts (service role) aquí es tan seguro como
   en un route handler — necesario porque este panel es cross-tenant y la
   RLS normal (negocio_id = current_tenant()) le ocultaría todo a un
   super_admin, que no tiene negocio_id. Nunca se importa admin.ts en un
   componente "use client". */
export default async function AdminPanelPage() {
  const admin = createAdminClient();
  const [{ data: negocios }, { data: suscripciones }] = await Promise.all([
    admin.from("negocios").select("id, nombre, subdominio, activo, created_at").order("created_at", { ascending: false }),
    admin.from("suscripciones").select("negocio_id, plan, estado, trial_fin"),
  ]);

  const porNegocio = new Map((suscripciones ?? []).map((s) => [s.negocio_id, s]));
  const montoPlanPro = Number(process.env.CULQI_MONTO_PLAN_PRO_CENTIMOS ?? 4900) / 100;

  const total = negocios?.length ?? 0;
  const trials = (suscripciones ?? []).filter((s) => s.estado === "trial").length;
  const activas = (suscripciones ?? []).filter((s) => s.estado === "activa").length;
  const vencidas = (suscripciones ?? []).filter((s) => s.estado === "vencida").length;
  const mrr = activas * montoPlanPro;

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900">Panel del SaaS</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900">{total}</div><div className="text-sm text-slate-500">Negocios</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900">{trials}</div><div className="text-sm text-slate-500">En trial</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-slate-900">{activas}</div><div className="text-sm text-slate-500">Pagando</div></div>
        <div className="card p-4"><div className="text-2xl font-semibold text-accent">S/ {mrr.toFixed(2)}</div><div className="text-sm text-slate-500">MRR estimado</div></div>
      </div>
      {vencidas > 0 && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          {vencidas} negocio(s) con el trial vencido sin pagar.
        </p>
      )}

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="py-2">Negocio</th><th>Subdominio</th><th>Plan</th><th>Estado</th><th>Trial hasta</th>
          </tr>
        </thead>
        <tbody>
          {(negocios ?? []).map((n) => {
            const s = porNegocio.get(n.id);
            return (
              <tr key={n.id} className="border-b border-slate-100">
                <td className="py-2">{n.nombre}{!n.activo && " (inactivo)"}</td>
                <td>{n.subdominio}</td>
                <td>{s?.plan ?? "—"}</td>
                <td>{s?.estado ?? "—"}</td>
                <td>{s?.trial_fin ?? "—"}</td>
              </tr>
            );
          })}
          {total === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Sin negocios registrados todavía.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
