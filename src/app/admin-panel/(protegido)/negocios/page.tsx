import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_NEGOCIOS, MOCK_ADMIN_SUSCRIPCIONES } from "@/lib/mock/mock-data";
import { leerOverridesActivo, aplicarOverridesActivo } from "@/lib/mock/mock-admin-overrides";
import { NegociosTable, type NegocioFila } from "@/components/admin/NegociosTable";

/* Server Component puro — mismo criterio que (protegido)/page.tsx: admin.ts
   (service role) nunca se importa desde un componente "use client". El
   filtro/búsqueda es interactivo, así que la tabla en sí vive en
   NegociosTable.tsx ("use client"), recibiendo los datos ya cruzados. */
export default async function NegociosPage() {
  const mock = isMockMode();
  let negocios: { id: string; nombre: string; subdominio: string; ruc: string | null; telefono: string | null; direccion: string | null; activo: boolean; created_at: string }[] | null;
  let suscripciones: { negocio_id: string; plan: string; estado: string; trial_fin: string }[] | null;

  if (mock) {
    negocios = aplicarOverridesActivo(MOCK_ADMIN_NEGOCIOS, await leerOverridesActivo());
    suscripciones = MOCK_ADMIN_SUSCRIPCIONES;
  } else {
    const admin = createAdminClient();
    const [negociosRes, suscripcionesRes] = await Promise.all([
      admin.from("negocios").select("id, nombre, subdominio, ruc, telefono, direccion, activo, created_at").order("created_at", { ascending: false }),
      admin.from("suscripciones").select("negocio_id, plan, estado, trial_fin"),
    ]);
    negocios = negociosRes.data;
    suscripciones = suscripcionesRes.data;
  }

  const porNegocio = new Map((suscripciones ?? []).map((s) => [s.negocio_id, s]));
  const filas: NegocioFila[] = (negocios ?? []).map((n) => {
    const s = porNegocio.get(n.id);
    return {
      id: n.id, nombre: n.nombre, subdominio: n.subdominio, activo: n.activo, createdAt: n.created_at,
      plan: s?.plan ?? null, estado: s?.estado ?? null, trialFin: s?.trial_fin ?? null,
    };
  });

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Negocios</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Todas las ópticas registradas en el SaaS, con su plan y estado de suscripción.
      </p>
      <NegociosTable negocios={filas} />
    </main>
  );
}
