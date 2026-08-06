import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Users, CalendarDays, ShoppingCart, PackageX } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode } from "@/lib/mock/mock-mode";
import {
  MOCK_ADMIN_NEGOCIOS, MOCK_ADMIN_VISTA_CLIENTES, MOCK_ADMIN_VISTA_CITAS,
  MOCK_ADMIN_VISTA_VENTAS, MOCK_ADMIN_VISTA_STOCK_BAJO,
} from "@/lib/mock/mock-data";
import { leerOverridesActivo, aplicarOverridesActivo } from "@/lib/mock/mock-admin-overrides";
import { formatearFechaPE, formatearFechaHora } from "@/lib/formato/date";
import { EstadoCitaBadge } from "@/components/citas/EstadoCitaBadge";

const LIMITE = 5;

/* ================= "VER COMO NEGOCIO" — SOLO LECTURA =================
   Decisión explícita (2026-08-01): NO es una sesión impersonada. Una sesión
   Supabase real no tiene un modo "solo lectura" — el token de un
   administrador de este negocio podría escribir igual, así que forzar ese
   camino solo para terminar bloqueando la escritura habría significado
   tocar la política RLS de ~25 tablas (agregarles una rama "o sos
   super_admin en modo debug"), un cambio mucho más invasivo que el resto de
   este schema ("aditivo, sin tocar nada existente").

   En cambio, esto es exactamente el mismo patrón que el resto del
   admin-panel: Server Component puro, admin.ts (service role) nunca sale de
   aquí, sin ningún endpoint de escritura — es de solo lectura porque
   literalmente no hay código para escribir, no porque algo lo bloquee en
   tiempo de ejecución. Solo super_admins llegan hasta acá (ver el layout de
   admin-panel), así que "quién puede ver esto" ya está resuelto sin lógica
   extra.

   Alcance deliberadamente resumido (no es un espejo pixel-a-pixel del
   dashboard real del negocio): clientes recientes, próximas citas, ventas
   recientes y stock bajo — las cuatro preguntas típicas de soporte ("¿tiene
   clientes cargados?", "¿le está fallando algo con las citas/ventas?",
   "¿se quedó sin stock?"). Tampoco replica Multisedes (stock_sucursal): lee
   solo `inventario`, que sigue siendo la fuente de verdad para negocios sin
   sucursales — la mayoría. */
export default async function VistaNegocioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mock = isMockMode();

  let negocio: { id: string; nombre: string; subdominio: string } | null;
  let clientes: { id: string; nombres: string; apellidos: string; telefono: string | null; created_at: string }[];
  let citas: { id: string; fecha_hora: string; motivo: string | null; estado: string; cliente_nombre: string }[];
  let ventas: { id: string; fecha: string; total: number; metodo_pago: string; estado: string; cliente_nombre: string }[];
  let stockBajo: { producto_id: string; nombre: string; stock_actual: number; stock_minimo: number }[];

  if (mock) {
    const negociosConOverride = aplicarOverridesActivo(MOCK_ADMIN_NEGOCIOS, await leerOverridesActivo());
    negocio = negociosConOverride.find((n) => n.id === id) ?? null;
    clientes = MOCK_ADMIN_VISTA_CLIENTES.filter((c) => c.negocio_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, LIMITE);
    citas = MOCK_ADMIN_VISTA_CITAS.filter((c) => c.negocio_id === id)
      .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)).slice(0, LIMITE);
    ventas = MOCK_ADMIN_VISTA_VENTAS.filter((v) => v.negocio_id === id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, LIMITE);
    stockBajo = MOCK_ADMIN_VISTA_STOCK_BAJO.filter((p) => p.negocio_id === id);
  } else {
    const admin = createAdminClient();
    const [negocioRes, clientesRes, citasRes, ventasRes, inventarioRes] = await Promise.all([
      admin.from("negocios").select("id, nombre, subdominio").eq("id", id).maybeSingle(),
      admin.from("clientes")
        .select("id, nombres, apellidos, telefono, created_at")
        .eq("negocio_id", id).is("eliminado_en", null)
        .order("created_at", { ascending: false }).limit(LIMITE),
      admin.from("citas")
        .select("id, fecha_hora, motivo, estado, clientes(nombres, apellidos)")
        .eq("negocio_id", id).gte("fecha_hora", new Date().toISOString())
        .order("fecha_hora", { ascending: true }).limit(LIMITE),
      admin.from("ventas")
        .select("id, fecha, total, metodo_pago, estado, clientes(nombres, apellidos)")
        .eq("negocio_id", id)
        .order("fecha", { ascending: false }).limit(LIMITE),
      admin.from("inventario")
        .select("producto_id, stock_actual, stock_minimo, productos!inner(nombre, negocio_id)")
        .eq("productos.negocio_id", id),
    ]);
    negocio = negocioRes.data;
    clientes = clientesRes.data ?? [];
    type FilaCita = { id: string; fecha_hora: string; motivo: string | null; estado: string; clientes: { nombres: string; apellidos: string } | null };
    citas = ((citasRes.data ?? []) as unknown as FilaCita[]).map((c) => ({
      id: c.id, fecha_hora: c.fecha_hora, motivo: c.motivo, estado: c.estado,
      cliente_nombre: c.clientes ? `${c.clientes.nombres} ${c.clientes.apellidos}` : "—",
    }));
    type FilaVenta = { id: string; fecha: string; total: number; metodo_pago: string; estado: string; clientes: { nombres: string; apellidos: string } | null };
    ventas = ((ventasRes.data ?? []) as unknown as FilaVenta[]).map((v) => ({
      id: v.id, fecha: v.fecha, total: v.total, metodo_pago: v.metodo_pago, estado: v.estado,
      cliente_nombre: v.clientes ? `${v.clientes.nombres} ${v.clientes.apellidos}` : "Sin cliente",
    }));
    type FilaInventario = { producto_id: string; stock_actual: number; stock_minimo: number; productos: { nombre: string } | null };
    stockBajo = ((inventarioRes.data ?? []) as unknown as FilaInventario[])
      .filter((r) => r.stock_actual <= r.stock_minimo)
      .map((r) => ({ producto_id: r.producto_id, nombre: r.productos?.nombre ?? "—", stock_actual: r.stock_actual, stock_minimo: r.stock_minimo }));
  }

  if (!negocio) notFound();

  return (
    <main>
      <Link href={`/admin-panel/negocios/${negocio.id}`} className="flex items-center gap-1.5 text-sm font-medium link">
        <ArrowLeft size={15} /> {negocio.nombre}
      </Link>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
        <Eye size={15} className="shrink-0" />
        Modo debug — solo lectura. Un resumen de lo que este negocio tiene cargado, no el dashboard real que usa.
      </div>

      <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Vista rápida de {negocio.nombre}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Users size={16} /> Clientes recientes
          </h2>
          <div className="table-card mt-2">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {clientes.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{c.nombres} {c.apellidos}</span>
                  <span className="text-slate-500 dark:text-slate-400">{c.telefono ?? "—"}</span>
                </li>
              ))}
              {clientes.length === 0 && <li className="table-empty">Sin clientes cargados todavía.</li>}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <CalendarDays size={16} /> Próximas citas
          </h2>
          <div className="table-card mt-2">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {citas.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-slate-100">{c.cliente_nombre}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">{formatearFechaHora(c.fecha_hora)}{c.motivo ? ` · ${c.motivo}` : ""}</span>
                  </span>
                  <EstadoCitaBadge estado={c.estado} />
                </li>
              ))}
              {citas.length === 0 && <li className="table-empty">Sin citas programadas.</li>}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <ShoppingCart size={16} /> Ventas recientes
          </h2>
          <div className="table-card mt-2">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {ventas.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-slate-100">{v.cliente_nombre}</span>
                    <span className="text-xs capitalize text-slate-500 dark:text-slate-500">{formatearFechaPE(v.fecha)} · {v.metodo_pago}</span>
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">S/ {v.total.toFixed(2)}</span>
                </li>
              ))}
              {ventas.length === 0 && <li className="table-empty">Sin ventas registradas.</li>}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <PackageX size={16} /> Stock bajo
          </h2>
          <div className="table-card mt-2">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stockBajo.map((p) => (
                <li key={p.producto_id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{p.nombre}</span>
                  <span className="badge badge-danger">{p.stock_actual} / mín. {p.stock_minimo}</span>
                </li>
              ))}
              {stockBajo.length === 0 && <li className="table-empty">Sin productos por debajo del mínimo.</li>}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
