"use client";

import { useParams } from "next/navigation";
import { Truck } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { formatearFecha } from "@/lib/formato/date";

/* Detalle de proveedor — mismo patrón que clientes/[id]/page.tsx: en vez de
   agregar un campo nuevo a la DB para "cuánto le hemos comprado", se DERIVA
   de lo que ya existe (productos y gastos con proveedorId). Esto da
   trazabilidad real (monto y fecha de gastos, costo y stock de productos)
   sin migración de schema.

   Lo que NO da: "cantidad solicitada" por pedido puntual — eso requeriría
   una tabla de "órdenes de compra" que hoy no existe en supabase-schema.sql.
   Si se necesita ese detalle nivel pedido, es una feature nueva aparte
   (tabla + RLS + UI), no un ajuste de esta pantalla. */
export default function ProveedorDetallePage() {
  const params = useParams<{ id: string }>();
  const { proveedores, productos, gastos, updateProveedor } = useData();

  const proveedor = proveedores.find((p) => p.id === params.id) ?? null;

  const productosDelProveedor = proveedor
    ? productos.filter((p) => p.proveedorId === proveedor.id).sort((a, b) => a.nombre.localeCompare(b.nombre))
    : [];
  const gastosDelProveedor = proveedor
    ? [...gastos].filter((g) => g.proveedorId === proveedor.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const totalComprado = gastosDelProveedor.reduce((acc, g) => acc + g.monto, 0);

  if (!proveedor) {
    return (
      <main>
        <p className="text-sm text-slate-500 dark:text-slate-400">Proveedor no encontrado.</p>
      </main>
    );
  }

  return (
    <main>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{proveedor.nombre}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-500">{proveedor.ruc ?? "Sin RUC"}</p>
          </div>
        </div>
        <label className="btn-outline inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 px-3 py-1.5 text-xs sm:h-auto">
          <input
            type="checkbox" role="switch" checked={proveedor.activo}
            onChange={() => updateProveedor(proveedor.id, { activo: !proveedor.activo })}
            className="switch"
          />
          {proveedor.activo ? "Activo" : "Inactivo"}
        </label>
      </div>

      <div className="card mt-5 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Contacto</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{proveedor.contacto ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Teléfono</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {proveedor.telefono ?? "—"}
            {proveedor.telefono && <BotonWhatsApp telefono={proveedor.telefono} />}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Email</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{proveedor.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500">Dirección</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{proveedor.direccion ?? "—"}</div>
        </div>
      </div>

      {proveedor.notas && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{proveedor.notas}</p>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Productos que provee ({productosDelProveedor.length})</h2>
        {productosDelProveedor.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Todavía no tiene productos vinculados en Stock.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {productosDelProveedor.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{p.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">Stock actual: {p.stockActual}</p>
                </div>
                <span className="text-slate-500 dark:text-slate-400">Costo S/ {p.precioCosto.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gastos registrados ({gastosDelProveedor.length})</h2>
          {gastosDelProveedor.length > 0 && (
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Total: S/ {totalComprado.toFixed(2)}</span>
          )}
        </div>
        {gastosDelProveedor.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
            Todavía no hay gastos registrados a nombre de este proveedor.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {gastosDelProveedor.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(g.fecha)}</p>
                  {g.descripcion && <p className="text-xs text-slate-500 dark:text-slate-500">{g.descripcion}</p>}
                </div>
                <span className="text-slate-500 dark:text-slate-400">S/ {g.monto.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
