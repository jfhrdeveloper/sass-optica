"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Wallet, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMockMode, MOCK_ADMIN_COOKIE } from "@/lib/mock/mock-mode";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV = [
  { href: "/admin-panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin-panel/negocios", label: "Negocios", icon: Building2 },
  { href: "/admin-panel/pagos", label: "Pagos", icon: Wallet },
];

/* Sidebar fijo del panel admin — versión reducida de DashboardNav.tsx (solo
   3 rutas, sin grupos/colapso: no hace falta esa complejidad para un menú
   tan chico). Sin dependencia de DataProvider/SessionProvider (esos
   providers son del namespace de negocio, el admin-panel nunca los monta). */
export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    if (isMockMode()) {
      document.cookie = `${MOCK_ADMIN_COOKIE}=; path=/; max-age=0`;
      router.replace("/admin-panel/login");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-slate-900 dark:text-slate-100">Panel del SaaS</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">Administración</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href;
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
