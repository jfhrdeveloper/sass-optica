import {
  LayoutDashboard, Users, CalendarDays, Package, ShoppingCart,
  Wallet, UserCog, Settings, Tag, Truck, FileText, BarChart3, Percent, Store, FlaskConical, Banknote,
} from "lucide-react";

export type Restriccion = { soloAdmin?: boolean; permiso?: string };
export type Hijo = Restriccion & { href: string; label: string; icon: typeof LayoutDashboard };
export type NavItem =
  | (Restriccion & { kind: "link"; href: string; label: string; icon: typeof LayoutDashboard })
  | { kind: "group"; key: string; label: string; icon: typeof LayoutDashboard; children: Hijo[] };

/* Fuente única del árbol de navegación del dashboard — antes vivía solo
   dentro de DashboardNav.tsx (el sidebar de escritorio); se extrajo acá para
   que BottomTabBar.tsx (el tab bar + menú "Más" de mobile) pueda reusar
   exactamente los mismos ítems, iconos y reglas de permiso sin duplicarlos. */
export const NAV: NavItem[] = [
  { kind: "link", href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { kind: "link", href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { kind: "link", href: "/dashboard/citas", label: "Citas", icon: CalendarDays },
  {
    kind: "group", key: "comercial", label: "Comercial", icon: ShoppingCart,
    children: [
      { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: FileText },
      { href: "/dashboard/laboratorio", label: "Laboratorio", icon: FlaskConical },
      { href: "/dashboard/caja", label: "Caja", icon: Banknote },
      { href: "/dashboard/descuentos", label: "Descuentos", icon: Tag, permiso: "descuentos" },
      { href: "/dashboard/productos", label: "Stock", icon: Package },
      { href: "/dashboard/proveedores", label: "Proveedores", icon: Truck },
    ],
  },
  {
    kind: "group", key: "administracion", label: "Administración", icon: Settings,
    children: [
      { href: "/dashboard/gastos", label: "Gastos", icon: Wallet, permiso: "gastos" },
      { href: "/dashboard/informes", label: "Informes", icon: BarChart3, permiso: "gastos" },
      { href: "/dashboard/comisiones", label: "Comisiones", icon: Percent, permiso: "gastos" },
      { href: "/dashboard/sucursales", label: "Sucursales", icon: Store, soloAdmin: true },
      { href: "/dashboard/empleados", label: "Empleados", icon: UserCog, soloAdmin: true },
      { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

export type ItemNavPlano = Restriccion & { href: string; label: string; icon: typeof LayoutDashboard; grupo?: string };

/* Aplana NAV (links sueltos + hijos de grupo) en una sola lista — misma
   fuente que usa CommandPalette.tsx, reusada también por el editor de
   accesos rápidos de /dashboard (evita mantener dos copias de este árbol). */
export function aplanarNav(nav: typeof NAV = NAV): ItemNavPlano[] {
  const items: ItemNavPlano[] = [];
  for (const n of nav) {
    if (n.kind === "link") items.push({ href: n.href, label: n.label, icon: n.icon, soloAdmin: n.soloAdmin, permiso: n.permiso });
    else for (const h of n.children) items.push({ href: h.href, label: h.label, icon: h.icon, grupo: n.label, soloAdmin: h.soloAdmin, permiso: h.permiso });
  }
  return items;
}
