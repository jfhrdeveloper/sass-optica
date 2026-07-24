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
      <h1 className="text-xl font-semibold">Panel del SaaS</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border p-4"><div className="text-2xl font-semibold">{total}</div><div className="text-sm text-neutral-600">Negocios</div></div>
        <div className="rounded border p-4"><div className="text-2xl font-semibold">{trials}</div><div className="text-sm text-neutral-600">En trial</div></div>
        <div className="rounded border p-4"><div className="text-2xl font-semibold">{activas}</div><div className="text-sm text-neutral-600">Pagando</div></div>
        <div className="rounded border p-4"><div className="text-2xl font-semibold">S/ {mrr.toFixed(2)}</div><div className="text-sm text-neutral-600">MRR estimado</div></div>
      </div>
      {vencidas > 0 && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          {vencidas} negocio(s) con el trial vencido sin pagar.
        </p>
      )}

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2">Negocio</th><th>Subdominio</th><th>Plan</th><th>Estado</th><th>Trial hasta</th>
          </tr>
        </thead>
        <tbody>
          {(negocios ?? []).map((n) => {
            const s = porNegocio.get(n.id);
            return (
              <tr key={n.id} className="border-b">
                <td className="py-2">{n.nombre}{!n.activo && " (inactivo)"}</td>
                <td>{n.subdominio}</td>
                <td>{s?.plan ?? "—"}</td>
                <td>{s?.estado ?? "—"}</td>
                <td>{s?.trial_fin ?? "—"}</td>
              </tr>
            );
          })}
          {total === 0 && <tr><td colSpan={5} className="py-6 text-center text-neutral-500">Sin negocios registrados todavía.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
