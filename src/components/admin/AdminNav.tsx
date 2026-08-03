"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ADMIN_NAV, esRutaActivaAdmin } from "@/lib/admin-nav";
import { useAdminSignOut } from "@/lib/hooks/useAdminSignOut";

/* Sidebar fijo del panel admin — versión reducida de DashboardNav.tsx (solo
   5 rutas, sin grupos/colapso: no hace falta esa complejidad para un menú
   tan chico). Sin dependencia de DataProvider/SessionProvider (esos
   providers son del namespace de negocio, el admin-panel nunca los monta).
   `hidden md:flex`: en mobile la navegación vive en AdminBottomTabBar.tsx +
   AdminMobileHeader.tsx (mismo patrón que DashboardNav/BottomTabBar del
   lado de negocio) — antes este sidebar de 240px quedaba fijo SIEMPRE,
   sin importar el ancho de pantalla, y `AdminShell` le sumaba `ml-60`
   también sin condición: en un celular eso dejaba el contenido real
   comprimido a un ~30% del ancho de la pantalla. */
export function AdminNav() {
  const pathname = usePathname();
  const signOut = useAdminSignOut();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-slate-900 dark:text-slate-100">Panel del SaaS</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">Administración</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const activo = esRutaActivaAdmin(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activo
                  ? "bg-primary-light text-primary"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-2 dark:border-slate-800">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
