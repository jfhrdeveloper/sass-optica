import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import { MOCK_ADMIN_RECLAMOS } from "@/lib/mock/mock-data";
import { leerOverridesReclamos, aplicarOverridesReclamos } from "@/lib/mock/mock-admin-overrides";
import { ReclamosTable, type ReclamoFila } from "@/components/admin/ReclamosTable";

/* Server Component puro — admin.ts (service role) solo se llama aquí, mismo
   patrón que /admin-panel/pagos. libro_reclamaciones es deny-all para
   anon/authenticated (ver supabase-schema.sql), así que la única forma de
   leerlo es acá. */
export default async function ReclamosPage() {
  const mock = isMockMode();

  type Row = typeof MOCK_ADMIN_RECLAMOS[number];
  let reclamos: Row[];

  if (mock) {
    const overrides = await leerOverridesReclamos();
    reclamos = aplicarOverridesReclamos(MOCK_ADMIN_RECLAMOS, overrides) as Row[];
  } else {
    const admin = createAdminClient();
    const { data } = await admin
      .from("libro_reclamaciones")
      .select(`
        id, numero, tipo, consumidor_nombres, consumidor_apellidos,
        consumidor_documento_tipo, consumidor_documento_numero, consumidor_domicilio,
        consumidor_telefono, consumidor_email, es_menor_edad, apoderado_nombre, bien_tipo, bien_descripcion,
        monto_reclamado, detalle, pedido, estado, respuesta, created_at
      `)
      .order("created_at", { ascending: false });
    reclamos = (data ?? []) as Row[];
  }

  const pendientes = reclamos.filter((r) => r.estado === "pendiente").length;

  const filas: ReclamoFila[] = reclamos.map((r) => ({
    id: r.id, numero: r.numero, tipo: r.tipo as ReclamoFila["tipo"],
    consumidorNombres: r.consumidor_nombres, consumidorApellidos: r.consumidor_apellidos,
    consumidorDocumentoTipo: r.consumidor_documento_tipo, consumidorDocumentoNumero: r.consumidor_documento_numero,
    consumidorDomicilio: r.consumidor_domicilio, consumidorTelefono: r.consumidor_telefono,
    consumidorEmail: r.consumidor_email, esMenorEdad: r.es_menor_edad, apoderadoNombre: r.apoderado_nombre,
    bienTipo: r.bien_tipo as ReclamoFila["bienTipo"],
    bienDescripcion: r.bien_descripcion, montoReclamado: r.monto_reclamado,
    detalle: r.detalle, pedido: r.pedido, estado: r.estado as ReclamoFila["estado"],
    respuesta: r.respuesta, createdAt: r.created_at,
  }));

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Libro de Reclamaciones</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Reclamos y quejas enviados desde <code>/libro-reclamaciones</code> — exigido por INDECOPI, con un plazo
        máximo de 15 días hábiles para responder cada uno.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{reclamos.length}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total histórico</div>
        </div>
        <div className="card p-4">
          <div className={`text-2xl font-semibold ${pendientes > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>{pendientes}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Pendientes de responder</div>
        </div>
      </div>

      <ReclamosTable reclamos={filas} />
    </main>
  );
}
