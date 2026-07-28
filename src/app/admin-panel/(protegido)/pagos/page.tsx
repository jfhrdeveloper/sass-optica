import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_NEGOCIOS, MOCK_ADMIN_PAGOS } from "@/lib/mock/mock-data";
import { PagosTable, type PagoFila } from "@/components/admin/PagosTable";
import { MrrBarChart, type PuntoMrr } from "@/components/admin/MrrBarChart";

const MESES_HISTORIAL = 6;

/* Últimos N meses en orden cronológico (incluye meses sin pagos, en 0 —
   para que la barra "caiga" visualmente si un mes no tuvo cobros, en vez
   de saltárselo y dar una falsa sensación de continuidad). */
function ultimosMeses(n: number): { clave: string; label: string }[] {
  const out: { clave: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const f = new Date(d);
    f.setMonth(f.getMonth() - i);
    out.push({
      clave: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`,
      label: f.toLocaleDateString("es-PE", { month: "short" }).replace(".", ""),
    });
  }
  return out;
}

/* Server Component puro — admin.ts (service role) solo se llama aquí. */
export default async function PagosPage() {
  const mock = isMockMode();

  let negocios: { id: string; nombre: string }[];
  let pagos: { id: string; negocio_id: string; monto: number; moneda: string; metodo_pago: string | null; estado: string; created_at: string }[];

  if (mock) {
    negocios = MOCK_ADMIN_NEGOCIOS;
    pagos = MOCK_ADMIN_PAGOS;
  } else {
    const admin = createAdminClient();
    const [negociosRes, pagosRes] = await Promise.all([
      admin.from("negocios").select("id, nombre"),
      admin.from("pagos_saas").select("id, negocio_id, monto, moneda, metodo_pago, estado, created_at").order("created_at", { ascending: false }),
    ]);
    negocios = negociosRes.data ?? [];
    pagos = pagosRes.data ?? [];
  }

  const nombrePorNegocio = new Map(negocios.map((n) => [n.id, n.nombre]));
  const filas: PagoFila[] = pagos.map((p) => ({
    id: p.id, negocioId: p.negocio_id, negocioNombre: nombrePorNegocio.get(p.negocio_id) ?? "—",
    monto: p.monto, moneda: p.moneda, metodoPago: p.metodo_pago, estado: p.estado, createdAt: p.created_at,
  }));

  const montoPorMes = new Map<string, number>();
  for (const p of pagos) {
    const clave = p.created_at.slice(0, 7);
    montoPorMes.set(clave, (montoPorMes.get(clave) ?? 0) + Number(p.monto));
  }
  const puntos: PuntoMrr[] = ultimosMeses(MESES_HISTORIAL).map(({ clave, label }) => ({
    mes: clave, label, monto: montoPorMes.get(clave) ?? 0,
  }));

  const totalRecaudado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const mrrMesActual = puntos.at(-1)?.monto ?? 0;

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pagos</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Cada cobro exitoso de Culqi, cross-tenant, más la evolución del MRR de los últimos {MESES_HISTORIAL} meses.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-2xl font-semibold text-accent">S/ {mrrMesActual.toFixed(2)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">MRR mes actual</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">S/ {totalRecaudado.toFixed(2)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Recaudado histórico</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{pagos.length}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Cobros totales</div>
        </div>
      </div>

      <div className="card mt-6 p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">MRR por mes</h2>
        <MrrBarChart puntos={puntos} />
      </div>

      <PagosTable pagos={filas} />
    </main>
  );
}
