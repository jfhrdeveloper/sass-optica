"use client";

import Link from "next/link";
import { Users, CalendarDays, PackageX, ShoppingCart, Truck, FileText, Package } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { CoachTooltip } from "@/components/dashboard/CoachTooltip";
import { ChangelogBanner } from "@/components/dashboard/ChangelogBanner";
import { formatearFechaPE } from "@/lib/formato/date";
import { nombrePlanSuscripcion } from "@/lib/precios";

const STATS = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas hoy", icon: CalendarDays },
  { href: "/dashboard/productos", label: "Stock bajo", icon: PackageX },
  { href: "/dashboard/ventas", label: "Ventas totales", icon: ShoppingCart },
] as const;

/* Accesos rápidos a secciones de alto uso que NO están ya cubiertas por las
   stats de arriba (Clientes/Citas/Stock/Ventas) — pedido explícito del
   usuario de tener "botones tipo card" además de los números. */
const ACCESOS_RAPIDOS = [
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck },
  { href: "/dashboard/productos", label: "Stock", icon: Package },
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
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Hola, {empleado?.nombres || "—"}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{negocio?.nombre} · rol <span className="capitalize">{empleado?.rol}</span></p>

      {suscripcion?.estado === "trial" && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          Estás probando {nombrePlanSuscripcion(suscripcion.plan)} hasta el {formatearFechaPE(suscripcion.trialFin)}. Si no activas el pago, vuelves al plan Gratis.
        </p>
      )}
      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu suscripción venció. <Link href="/dashboard/facturacion" className="ml-1 font-semibold transition-colors hover:text-red-900 dark:hover:text-red-200">Activa tu plan</Link>
        </p>
      )}

      {/* Alerta proactiva de stock bajo — el stat card de abajo ya cuenta
         cuántos productos están en ese estado, pero con el mismo peso visual
         que "Clientes" o "Ventas totales" pasa desapercibido. Este banner
         nombra los productos afectados, igual que las alertas de
         trial/vencido de arriba. */}
      {stockBajo.length > 0 && (
        <Link
          href="/dashboard/productos"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
        >
          <PackageX size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{stockBajo.length}</strong> {stockBajo.length === 1 ? "producto está" : "productos están"} con stock bajo:{" "}
            {stockBajo.slice(0, 3).map((p) => p.nombre).join(", ")}
            {stockBajo.length > 3 ? ` y ${stockBajo.length - 3} más` : ""}.
          </span>
        </Link>
      )}

      <ChangelogBanner negocioId={negocio?.id} />
      <OnboardingChecklist />
      <CoachTooltip />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon size={18} />
              </div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{valores[i]}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-200">Accesos rápidos</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACCESOS_RAPIDOS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href} href={a.href}
              className="card flex items-center gap-3 p-3 text-sm font-medium text-slate-700 transition-shadow hover:shadow-md dark:text-slate-200"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon size={16} />
              </div>
              {a.label}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
