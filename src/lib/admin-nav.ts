import { LayoutDashboard, Building2, Wallet, MessageSquareWarning, Lightbulb, type LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/* Fuente única del árbol de navegación del admin-panel — igual criterio que
   lib/dashboard-nav.ts: AdminNav.tsx (sidebar de escritorio) y
   AdminBottomTabBar.tsx (tab bar mobile) leen de acá para no mantener dos
   listas de secciones desincronizadas. Solo 5 rutas, así que ninguna de las
   dos necesita grupos ni un menú "Más". */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin-panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin-panel/negocios", label: "Negocios", icon: Building2 },
  { href: "/admin-panel/pagos", label: "Pagos", icon: Wallet },
  { href: "/admin-panel/reclamos", label: "Reclamos", icon: MessageSquareWarning },
  { href: "/admin-panel/mejoras", label: "Mejoras", icon: Lightbulb },
];

/* `pathname === href` deja el tab apagado en cualquier ficha de detalle
   (ej. /admin-panel/negocios/[id]) porque nunca hay igualdad exacta con
   "/admin-panel/negocios". Mismo criterio que BottomTabBar.tsx (dashboard de
   negocio): igualdad exacta, o el pathname es un descendiente de `href`. La
   raíz "/admin-panel" queda con igualdad exacta nomás — es prefijo de TODAS
   las demás rutas, un startsWith ahí dejaría "Resumen" siempre activo. */
export function esRutaActivaAdmin(pathname: string, href: string): boolean {
  if (href === "/admin-panel") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
