"use client";

import Link from "next/link";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

/* Resumen del dashboard: confirma que auth + tenant + roles + módulos de
   dominio funcionan de punta a punta, con accesos rápidos a cada módulo. */
export default function DashboardPage() {
  const { empleado } = useSession();
  const { negocio, suscripcion, clientes, citas, productos, ventas } = useData();

  const citasHoy = citas.filter((c) => c.fechaHora.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const stockBajo = productos.filter((p) => p.stockActual <= p.stockMinimo);

  return (
    <main>
      <h1 className="text-xl font-semibold">Hola, {empleado?.nombres || "—"}</h1>
      <p className="text-sm text-neutral-600">Rol: {empleado?.rol}</p>

      {suscripcion?.estado === "trial" && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          Estás en prueba gratuita hasta el {suscripcion.trialFin}.
        </p>
      )}
      {suscripcion?.estado === "vencida" && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm">
          Tu prueba gratuita venció. <Link href="/dashboard/facturacion" className="underline">Activa tu plan</Link> para seguir usando el sistema.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/dashboard/clientes" className="rounded border p-4">
          <div className="text-2xl font-semibold">{clientes.length}</div>
          <div className="text-sm text-neutral-600">Clientes</div>
        </Link>
        <Link href="/dashboard/citas" className="rounded border p-4">
          <div className="text-2xl font-semibold">{citasHoy.length}</div>
          <div className="text-sm text-neutral-600">Citas hoy</div>
        </Link>
        <Link href="/dashboard/productos" className="rounded border p-4">
          <div className="text-2xl font-semibold">{stockBajo.length}</div>
          <div className="text-sm text-neutral-600">Stock bajo</div>
        </Link>
        <Link href="/dashboard/ventas" className="rounded border p-4">
          <div className="text-2xl font-semibold">{ventas.length}</div>
          <div className="text-sm text-neutral-600">Ventas totales</div>
        </Link>
      </div>

      <dl className="mt-8 space-y-1 text-xs text-neutral-500">
        <div>Negocio: {negocio?.nombre} ({negocio?.subdominio})</div>
        <div>Plan: {suscripcion?.plan ?? "—"} · Estado: {suscripcion?.estado ?? "—"}</div>
      </dl>
    </main>
  );
}
