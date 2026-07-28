"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CalendarDays, Package, ShoppingCart,
  Wallet, UserCog, Settings, Tag, Megaphone, Truck, FileText, BarChart3,
  PanelLeftClose, PanelLeftOpen, ChevronDown,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";

type Restriccion = { soloAdmin?: boolean; permiso?: string };
type Hijo = Restriccion & { href: string; label: string; icon: typeof LayoutDashboard };
type NavItem =
  | (Restriccion & { kind: "link"; href: string; label: string; icon: typeof LayoutDashboard })
  | { kind: "group"; key: string; label: string; icon: typeof LayoutDashboard; children: Hijo[] };

/* Modelo de navegación con grupos desplegables (patrón tomado de
   tramys-rrhh/src/components/layout/Sidebar.tsx, a pedido explícito del
   usuario): ítems sueltos de alto uso quedan siempre visibles; los que se
   pueden agrupar quedan detrás de un acordeón (un solo grupo abierto a la
   vez, se auto-expande el que contiene la ruta activa). */
const NAV: NavItem[] = [
  { kind: "link", href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { kind: "link", href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { kind: "link", href: "/dashboard/citas", label: "Citas", icon: CalendarDays },
  {
    kind: "group", key: "comercial", label: "Comercial", icon: ShoppingCart,
    children: [
      { href: "/dashboard/productos", label: "Stock", icon: Package },
      { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck },
      { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: FileText },
      { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/dashboard/descuentos", label: "Descuentos", icon: Tag, permiso: "descuentos" },
      { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone, permiso: "marketing" },
    ],
  },
  {
    kind: "group", key: "administracion", label: "Administración", icon: Settings,
    children: [
      { href: "/dashboard/gastos", label: "Gastos", icon: Wallet, permiso: "gastos" },
      { href: "/dashboard/informes", label: "Informes", icon: BarChart3, permiso: "gastos" },
      { href: "/dashboard/empleados", label: "Empleados", icon: UserCog, soloAdmin: true },
      /* Un solo link para todo el cluster de "ajustes" (ver
         settings-subscription.html): adentro hay tabs (SettingsTabs.tsx)
         entre Perfil del negocio (admin-only) y Suscripción/facturación
         (todos los roles) — acá solo decidimos a cuál de las dos aterriza
         cada rol al hacer click, sin duplicar la entrada de sidebar. */
      { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

/* Sidebar fijo del dashboard (patrón tomado de las referencias en
   diseno-referencia/: sidebar blanco). Oculta (no solo deshabilita) los
   links admin-only/con-permiso para quien no los tiene — la protección
   real es la RLS + el proxy, esto es solo ergonomía de UI.

   `colapsado`/`onToggle` vienen de DashboardShell.tsx (dueño del estado +
   persistencia en localStorage) — este componente es puramente presentacional
   respecto al colapso, así el ancho del sidebar y el margen del contenido
   nunca se desincronizan. */
export function DashboardNav({ colapsado, onToggle }: { colapsado: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const tienePermiso = (clave?: string) => esAdmin || !clave || empleado?.permisos?.[clave] === true;
  const puedeVer = (i: Restriccion) => (!i.soloAdmin || esAdmin) && tienePermiso(i.permiso);
  /* El link "Ajustes" apunta a /dashboard/ajustes si sos administrador; el
     resto de roles no puede entrar ahí (proxy.ts los rebota), así que
     aterrizan directo en la pestaña de Suscripción/facturación — ver
     SettingsTabs.tsx, comparten la misma UI de tabs. */
  const resolverHref = (href: string) => (href === "/dashboard/ajustes" && !esAdmin ? "/dashboard/facturacion" : href);
  const esActivo = (href: string) => pathname === resolverHref(href);
  const grupoTieneActivo = (hijos: Hijo[]) => hijos.some((h) => esActivo(h.href));

  /* Acordeón: un solo grupo abierto a la vez, por defecto el que contiene la
     ruta activa (si estoy en /dashboard/ventas, "Comercial" arranca abierto).
     Se deriva de `pathname` en cada render (sin efecto ni setState fuera de
     un click) — el click del usuario guarda una anulación puntual atada a
     ESA ruta (`override.path === pathname`); en cuanto cambia la ruta la
     anulación queda obsoleta sola y vuelve a mandar el valor derivado, sin
     necesidad de sincronizarlo a mano en un useEffect. */
  const grupoActivo = NAV.find((it) => it.kind === "group" && grupoTieneActivo(it.children));
  const grupoPorDefecto = grupoActivo && grupoActivo.kind === "group" ? grupoActivo.key : null;
  const [override, setOverride] = useState<{ path: string; key: string | null } | null>(null);
  const grupoAbierto = override && override.path === pathname ? override.key : grupoPorDefecto;
  const alternarGrupo = (key: string) => setOverride({ path: pathname, key: grupoAbierto === key ? null : key });

  function filaLink(href: string, label: string, Icon: typeof LayoutDashboard, activo: boolean, esHijo = false) {
    return (
      <Link
        key={href}
        href={resolverHref(href)}
        title={colapsado ? label : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          colapsado ? "justify-center" : ""
        } ${
          activo
            ? "bg-primary-light text-primary"
            : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {esHijo ? (
          <span
            aria-hidden="true"
            className={`h-1 w-1 shrink-0 rounded-full ${activo ? "bg-primary/50" : "bg-slate-300 dark:bg-slate-600"}`}
          />
        ) : (
          <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
        )}
        {!colapsado && label}
      </Link>
    );
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      {/* Identidad del negocio/empleado y ThemeToggle viven en
          DashboardTopbar.tsx — este header queda solo con la marca de la
          app (genérica, no del tenant) y el botón de colapsar, así el
          sidebar es puramente navegación. */}
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-3 py-4 dark:border-slate-800">
        {!colapsado && (
          <span className="truncate pl-1 font-display text-base text-slate-900 dark:text-slate-100">SaaS Óptica</span>
        )}
        <button
          onClick={onToggle}
          className={`flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
            colapsado ? "w-full" : "shrink-0"
          }`}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
        >
          {colapsado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-4">
        {NAV.map((item) => {
          if (item.kind === "link") {
            if (!puedeVer(item)) return null;
            return filaLink(item.href, item.label, item.icon, esActivo(item.href));
          }

          const hijos = item.children.filter(puedeVer);
          if (hijos.length === 0) return null;

          /* Sidebar entero colapsado a solo-íconos: no hay espacio para el
             acordeón (label + chevron), así que cada hijo se muestra suelto
             como ícono propio — sigue siendo navegable sin expandir nada,
             mismo criterio que tramys-rrhh/Sidebar.tsx. */
          if (colapsado) {
            return (
              <Fragment key={item.key}>
                {hijos.map((h) => filaLink(h.href, h.label, h.icon, esActivo(h.href)))}
              </Fragment>
            );
          }

          const abierto = grupoAbierto === item.key;
          const activo = grupoTieneActivo(hijos);
          const Icon = item.icon;

          return (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => alternarGrupo(item.key)}
                aria-expanded={abierto}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activo ? "text-primary" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown size={14} className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
              </button>

              {abierto && (
                <div className="ml-4 mt-0.5 space-y-0.5 px-2">
                  {hijos.map((h) => (
                    <div key={h.href}>
                      {filaLink(h.href, h.label, h.icon, esActivo(h.href), true)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
