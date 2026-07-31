import { LayoutDashboard, Building2, Wallet, MessageSquareWarning, type LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/* Fuente única del árbol de navegación del admin-panel — igual criterio que
   lib/dashboard-nav.ts: AdminNav.tsx (sidebar de escritorio) y
   AdminBottomTabBar.tsx (tab bar mobile) leen de acá para no mantener dos
   listas de secciones desincronizadas. Solo 4 rutas, así que ninguna de las
   dos necesita grupos ni un menú "Más". */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin-panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin-panel/negocios", label: "Negocios", icon: Building2 },
  { href: "/admin-panel/pagos", label: "Pagos", icon: Wallet },
  { href: "/admin-panel/reclamos", label: "Reclamos", icon: MessageSquareWarning },
];
