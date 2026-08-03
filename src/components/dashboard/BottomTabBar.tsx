"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, ShoppingCart, Menu, X } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useData } from "@/components/providers/DataProvider";
import { NAV } from "@/lib/dashboard-nav";
import { puedeLeerModulo } from "@/lib/permisos";

/* Los 4 destinos de más uso a diario en una óptica quedan siempre a un toque;
   el resto (Stock, Proveedores, Cotizaciones, Descuentos, Administración
   completa) vive detrás de "Más", que abre un panel a pantalla completa —
   igual de accesible pero sin competir por espacio en la barra. */
const TABS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/citas", label: "Citas", icon: CalendarDays },
  { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart },
] as const;

/* Reemplaza al sidebar de escritorio en mobile (DashboardNav.tsx se oculta
   con `md:flex` ahí) — mismo patrón que Instagram/Notion mobile: tab bar fija
   abajo con lo más usado + un tab "Más" que despliega el resto. `NAV` se
   comparte con el sidebar (ver lib/dashboard-nav.ts) para no mantener dos
   listas de secciones desincronizadas. */
export function BottomTabBar() {
  const pathname = usePathname();
  const { empleado } = useSession();
  const { rolesPersonalizados } = useData();
  const esAdmin = empleado?.rol === "administrador";
  const tienePermiso = (clave?: string) => !clave || puedeLeerModulo(empleado, rolesPersonalizados, clave);
  const puedeVer = (i: { soloAdmin?: boolean; permiso?: string }) => (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso);
  const [masAbierto, setMasAbierto] = useState(false);

  const hrefsEnTabs = new Set<string>(TABS.map((t) => t.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden"
        aria-label="Navegación principal"
      >
        {TABS.map((t) => {
          /* Igual que en DashboardNav.tsx: "Clientes" tiene ficha de detalle
             en /dashboard/clientes/[id], así que hace falta el `startsWith`
             para que el tab siga marcado activo ahí (si no, se apaga al
             entrar a la ficha y solo vuelve al salir). "Inicio" queda con
             igualdad exacta porque su href es prefijo de todas las demás rutas. */
          const activo = pathname === t.href || (t.href !== "/dashboard" && pathname.startsWith(`${t.href}/`));
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              {/* "Seleccionado" se ve igual en todo el sitio: fondo primario sólido +
                  texto blanco (docs/style-guide.md), no solo un cambio de color de texto. */}
              <span
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 ${
                  activo ? "bg-primary text-white" : ""
                }`}
              >
                <Icon size={20} strokeWidth={activo ? 2.5 : 2} />
                {t.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu size={20} />
          Más
        </button>
      </nav>

      {masAbierto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-slate-950 md:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Más secciones</h2>
            <button
              onClick={() => setMasAbierto(false)}
              aria-label="Cerrar"
              className="rounded-full bg-slate-100 p-2 text-slate-500 dark:bg-white/5 dark:text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {NAV.filter((item) => item.kind === "group").map((grupo) => {
              if (grupo.kind !== "group") return null;
              const hijos = grupo.children.filter((h) => puedeVer(h) && !hrefsEnTabs.has(h.href));
              if (hijos.length === 0) return null;
              return (
                <div key={grupo.key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {grupo.label}
                  </p>
                  <div className="space-y-1">
                    {hijos.map((h) => (
                      <Link
                        key={h.href}
                        href={h.href}
                        onClick={() => setMasAbierto(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <h.icon size={18} className="text-slate-400" />
                        {h.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
