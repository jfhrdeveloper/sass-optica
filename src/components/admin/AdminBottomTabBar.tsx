"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, esRutaActivaAdmin } from "@/lib/admin-nav";

/* Reemplaza al sidebar de escritorio en mobile (AdminNav.tsx se oculta con
   `md:flex` ahí) — con solo 5 destinos no hace falta un tab "Más" como en
   BottomTabBar.tsx (el del dashboard de negocio, que sí tiene que colapsar
   ~10 secciones): las 5 rutas de ADMIN_NAV entran completas. */
export function AdminBottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden"
      aria-label="Navegación principal"
    >
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const activo = esRutaActivaAdmin(pathname, href);
        return (
          <Link
            key={href}
            href={href}
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
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
