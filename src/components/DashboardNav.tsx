"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CalendarDays, Package, ShoppingCart,
  Wallet, UserCog, LogOut,
} from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

const GRUPOS = [
  {
    label: "Atención",
    items: [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, soloAdmin: false },
      { href: "/dashboard/clientes", label: "Clientes", icon: Users, soloAdmin: false },
      { href: "/dashboard/citas", label: "Citas", icon: CalendarDays, soloAdmin: false },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/dashboard/productos", label: "Stock", icon: Package, soloAdmin: false },
      { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart, soloAdmin: false },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/dashboard/gastos", label: "Gastos", icon: Wallet, soloAdmin: true },
      { href: "/dashboard/empleados", label: "Empleados", icon: UserCog, soloAdmin: true },
    ],
  },
];

/* Sidebar fijo del dashboard (patrón tomado de las referencias en
   diseno-referencia/: sidebar blanco, secciones agrupadas con label en
   mayúscula gris). Oculta (no solo deshabilita) los links admin-only para
   encargado/trabajador — la protección real es la RLS + el proxy, esto es
   solo ergonomía de UI. */
export function DashboardNav() {
  const pathname = usePathname();
  const { negocio } = useData();
  const { empleado, signOut } = useSession();
  const esAdmin = empleado?.rol === "administrador";

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="truncate font-semibold text-slate-900">{negocio?.nombre ?? "Panel"}</p>
        <p className="truncate text-xs text-slate-400">{empleado?.nombres} {empleado?.apellidos}</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto py-4">
        {GRUPOS.map((grupo) => {
          const items = grupo.items.filter((i) => !i.soloAdmin || esAdmin);
          if (items.length === 0) return null;
          return (
            <div key={grupo.label}>
              <p className="nav-section-label">{grupo.label}</p>
              <div className="mt-1 space-y-0.5 px-2">
                {items.map((item) => {
                  const activo = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activo ? "bg-primary-light text-primary" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={18} strokeWidth={activo ? 2.5 : 2} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-2">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
