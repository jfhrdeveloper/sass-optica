import { Lightbulb } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_MEJORAS, MOCK_ADMIN_MEJORAS_VOTOS, MOCK_ADMIN_NEGOCIOS } from "@/lib/mock/mock-data";
import { leerOverridesMejoras } from "@/lib/mock/mock-admin-overrides";
import { formatearFechaPE } from "@/lib/formato/date";
import { EstadoMejoraSelect } from "@/components/admin/EstadoMejoraSelect";

/* Server Component puro — admin.ts (service role) solo se llama aquí, mismo
   patrón que /admin-panel/reclamos. A diferencia de /dashboard/mejoras (que
   lee la vista anonimizada mejoras_publicas), acá el dueño del SaaS SÍ ve
   qué negocio propuso cada mejora y qué negocios votaron cada una — es la
   única vista con esa visibilidad completa, ver el comentario de
   mejoras_sugeridas en supabase-schema.sql. */
export default async function MejorasAdminPage() {
  const mock = isMockMode();

  let mejoras: { id: string; negocio_id: string; titulo: string; descripcion: string | null; estado: string; created_at: string }[];
  let votos: { mejora_id: string; negocio_id: string }[];
  let negocios: { id: string; nombre: string }[];

  if (mock) {
    const overrides = await leerOverridesMejoras();
    mejoras = MOCK_ADMIN_MEJORAS.map((m) => ({ ...m, estado: overrides[m.id] ?? m.estado }));
    votos = MOCK_ADMIN_MEJORAS_VOTOS;
    negocios = MOCK_ADMIN_NEGOCIOS;
  } else {
    const admin = createAdminClient();
    const [mejorasRes, votosRes, negociosRes] = await Promise.all([
      admin.from("mejoras_sugeridas").select("id, negocio_id, titulo, descripcion, estado, created_at").order("created_at", { ascending: false }),
      admin.from("mejoras_votos").select("mejora_id, negocio_id"),
      admin.from("negocios").select("id, nombre"),
    ]);
    mejoras = mejorasRes.data ?? [];
    votos = votosRes.data ?? [];
    negocios = negociosRes.data ?? [];
  }

  const nombrePorNegocio = new Map(negocios.map((n) => [n.id, n.nombre]));
  const votosPorMejora = new Map<string, string[]>();
  for (const v of votos) {
    const lista = votosPorMejora.get(v.mejora_id) ?? [];
    lista.push(nombrePorNegocio.get(v.negocio_id) ?? v.negocio_id);
    votosPorMejora.set(v.mejora_id, lista);
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Buzón de mejoras</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Propuestas de las ópticas y quién votó cada una — en <code>/dashboard/mejoras</code> se ven
        anonimizadas entre ellas, acá se ve todo para priorizar según demanda real.
      </p>

      <div className="table-card mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">Mejora</th>
                <th className="table-head-cell">Propuesta por</th>
                <th className="table-head-cell hidden md:table-cell">Votos</th>
                <th className="table-head-cell hidden lg:table-cell">Fecha</th>
                <th className="table-head-cell text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {mejoras.map((m) => {
                const votantes = votosPorMejora.get(m.id) ?? [];
                return (
                  <tr key={m.id} className="table-row">
                    <td className="table-body-cell">
                      <span className="block font-medium text-slate-900 dark:text-slate-100">{m.titulo}</span>
                      {m.descripcion && <span className="block text-xs text-slate-400 dark:text-slate-500">{m.descripcion}</span>}
                    </td>
                    <td className="table-body-cell text-slate-600 dark:text-slate-300">{nombrePorNegocio.get(m.negocio_id) ?? "—"}</td>
                    <td className="table-body-cell hidden md:table-cell">
                      <span className={`badge ${votantes.length > 0 ? "badge-success" : "badge-neutral"}`}>{votantes.length}</span>
                      {votantes.length > 0 && (
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{votantes.join(", ")}</span>
                      )}
                    </td>
                    <td className="table-body-cell hidden text-slate-600 dark:text-slate-300 lg:table-cell">{formatearFechaPE(m.created_at)}</td>
                    <td className="table-body-cell text-right">
                      <EstadoMejoraSelect id={m.id} estadoActual={m.estado} />
                    </td>
                  </tr>
                );
              })}
              {mejoras.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Lightbulb size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin mejoras propuestas todavía.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
