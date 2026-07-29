"use client";

import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAdminSignOut } from "@/lib/hooks/useAdminSignOut";

/* Franja superior visible solo en mobile — en escritorio "Panel del SaaS",
   el tema y "Cerrar sesión" viven dentro de AdminNav.tsx (sidebar), que ahí
   se oculta (`md:flex`). Cerrar sesión queda acá y NO como un tab más del
   AdminBottomTabBar.tsx a propósito: es una acción de una sola vez, distinta
   en peso de "ir a Resumen/Negocios/Pagos" — mezclarla en la barra de
   navegación primaria le restaría claridad a esos 3 destinos. */
export function AdminMobileHeader() {
  const signOut = useAdminSignOut();

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
      <div className="min-w-0">
        <p className="truncate font-display text-sm text-slate-900 dark:text-slate-100">Panel del SaaS</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={signOut}
          aria-label="Cerrar sesión"
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
