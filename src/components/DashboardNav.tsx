"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

const LINKS = [
  { href: "/dashboard", label: "Inicio", soloAdmin: false },
  { href: "/dashboard/clientes", label: "Clientes", soloAdmin: false },
  { href: "/dashboard/citas", label: "Citas", soloAdmin: false },
  { href: "/dashboard/productos", label: "Stock", soloAdmin: false },
  { href: "/dashboard/ventas", label: "Ventas", soloAdmin: false },
  { href: "/dashboard/gastos", label: "Gastos", soloAdmin: true },
  { href: "/dashboard/empleados", label: "Empleados", soloAdmin: true },
];

/* Nav simple del dashboard. Oculta (no solo deshabilita) los links
   admin-only para encargado/trabajador — la protección real es la RLS +
   el proxy, esto es solo ergonomía de UI. */
export function DashboardNav() {
  const pathname = usePathname();
  const { negocio } = useData();
  const { empleado, signOut } = useSession();
  const esAdmin = empleado?.rol === "administrador";

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <span className="font-semibold">{negocio?.nombre ?? "Panel"}</span>
        <button onClick={signOut} className="text-sm underline">Cerrar sesión</button>
      </div>
      <nav className="mx-auto flex max-w-4xl gap-4 overflow-x-auto px-6 pb-3 text-sm">
        {LINKS.filter((l) => !l.soloAdmin || esAdmin).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "font-semibold underline" : "text-neutral-600"}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
