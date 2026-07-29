"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CalendarDays, PackageX, ShoppingCart, Search, Truck, FileText, Package } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { CoachTooltip } from "@/components/dashboard/CoachTooltip";
import { ChangelogBanner } from "@/components/dashboard/ChangelogBanner";
import { coincideBusqueda } from "@/lib/formato/texto";
import { formatearFechaPE } from "@/lib/formato/date";

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

const MAX_RESULTADOS = 5;

/* Buscador global de Inicio: en vez de tener que entrar a Clientes/Stock/
   Proveedores por separado para ubicar algo, se busca una vez acá y salta
   directo al registro (o a la sección, si el registro no tiene ficha propia
   todavía). Cubre las 3 listas con identidad propia por nombre; citas/
   cotizaciones/ventas son registros transaccionales sin ficha individual
   navegable, así que quedan fuera de este buscador puntual. */
function BuscadorGlobal() {
  const router = useRouter();
  const { clientes, productos, proveedores } = useData();
  const [q, setQ] = useState("");
  const [enfocado, setEnfocado] = useState(false);

  const resultados = useMemo(() => {
    if (!q.trim()) return null;
    return {
      clientes: clientes
        .filter((c) => !c.eliminadoEn && coincideBusqueda(`${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`, q))
        .slice(0, MAX_RESULTADOS),
      productos: productos
        .filter((p) => coincideBusqueda(`${p.nombre} ${p.codigo ?? ""} ${p.marca ?? ""}`, q))
        .slice(0, MAX_RESULTADOS),
      proveedores: proveedores
        .filter((p) => coincideBusqueda(`${p.nombre} ${p.contacto ?? ""}`, q))
        .slice(0, MAX_RESULTADOS),
    };
  }, [q, clientes, productos, proveedores]);

  const hayResultados = resultados && (resultados.clientes.length > 0 || resultados.productos.length > 0 || resultados.proveedores.length > 0);

  function ir(href: string) {
    router.push(href);
    setQ("");
    setEnfocado(false);
  }

  return (
    <div className="relative mt-4 max-w-md">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setTimeout(() => setEnfocado(false), 150)}
        placeholder="Buscar cliente, producto o proveedor…"
        className="input w-full pl-9 text-sm"
      />

      {enfocado && q.trim() && (
        <div className="card absolute z-30 mt-1 max-h-96 w-full overflow-y-auto p-2 shadow-lg">
          {!hayResultados ? (
            <p className="p-3 text-sm text-slate-400 dark:text-slate-500">Sin resultados para &quot;{q}&quot;.</p>
          ) : (
            <>
              {resultados!.clientes.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Clientes</p>
                  {resultados!.clientes.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => ir(`/dashboard/clientes/${c.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Users size={14} className="shrink-0 text-slate-400" /> {c.nombres} {c.apellidos}
                    </button>
                  ))}
                </div>
              )}
              {resultados!.proveedores.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Proveedores</p>
                  {resultados!.proveedores.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => ir(`/dashboard/proveedores/${p.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Truck size={14} className="shrink-0 text-slate-400" /> {p.nombre}
                    </button>
                  ))}
                </div>
              )}
              {resultados!.productos.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Productos</p>
                  {resultados!.productos.map((p) => (
                    <button
                      key={p.id}
                      onMouseDown={() => ir("/dashboard/productos")}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Package size={14} className="shrink-0 text-slate-400" /> {p.nombre}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

      <BuscadorGlobal />

      {suscripcion?.estado === "trial" && (
        <p className="badge badge-warning mt-4 px-3 py-1.5">
          Estás en prueba gratuita hasta el {formatearFechaPE(suscripcion.trialFin)}.
        </p>
      )}
      {suscripcion?.estado === "vencida" && (
        <p className="badge badge-danger mt-4 px-3 py-1.5">
          Tu prueba gratuita venció. <Link href="/dashboard/facturacion" className="ml-1 font-semibold transition-colors hover:text-red-900 dark:hover:text-red-200">Activa tu plan</Link>
        </p>
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

      <dl className="mt-8 space-y-1 text-xs text-slate-400 dark:text-slate-500">
        <div>Negocio: {negocio?.nombre} ({negocio?.subdominio})</div>
        <div>Plan: {suscripcion?.plan ?? "—"} · Estado: {suscripcion?.estado ?? "—"}</div>
      </dl>
    </main>
  );
}
