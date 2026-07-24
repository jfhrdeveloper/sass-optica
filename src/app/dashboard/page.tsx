"use client";

import Link from "next/link";
import { Users, CalendarDays, PackageX, ShoppingCart } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

const STATS = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas hoy", icon: CalendarDays },
  { href: "/dashboard/productos", label: "Stock bajo", icon: PackageX },
  { href: "/dashboard/ventas", label: "Ventas totales", icon: ShoppingCart },
] as const;

/* Resumen del dashboard: confirma que auth + tenant + roles + módulos de
   dominio funcionan de punta a punta, con accesos rápidos a cada módulo. */
export default function DashboardPage() {
  const { empleado } = useSession();
  const { negocio, suscripcion, clientes, citas, productos, ventas } = useData();

  const citasHoy = citas.filter((c) => c.fechaHora.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const stockBajo = productos.filter((p) => p.stockActual <= p.stockMinimo);
  const valores = [clientes.length, citasHoy.length, stockBajo.length, ventas.length];

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900">Hola, {empleado?.nombres || "—"}</h1>
      <p className="text-sm text-slate-500">{negocio?.nombre} · rol {empleado?.rol}</p>

      {suscripcion?.estado === "trial" && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          Estás en prueba gratuita hasta el {suscripcion.trialFin}.
        </p>
      )}
      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu prueba gratuita venció. <Link href="/dashboard/facturacion" className="ml-1 underline">Activa tu plan</Link>
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon size={18} />
              </div>
              <div className="text-2xl font-semibold text-slate-900">{valores[i]}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <dl className="mt-8 space-y-1 text-xs text-slate-400">
        <div>Negocio: {negocio?.nombre} ({negocio?.subdominio})</div>
        <div>Plan: {suscripcion?.plan ?? "—"} · Estado: {suscripcion?.estado ?? "—"}</div>
      </dl>
    </main>
  );
}
