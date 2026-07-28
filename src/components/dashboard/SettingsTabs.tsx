"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

const TABS: { href: string; label: string; soloAdmin?: boolean }[] = [
  { href: "/dashboard/ajustes", label: "Perfil del negocio", soloAdmin: true },
  { href: "/dashboard/facturacion", label: "Suscripción y facturación" },
];

/* Compartida entre /dashboard/ajustes y /dashboard/facturacion (patrón
   tomado de diseno-referencia/settings-subscription.html: un solo "Settings"
   con tabs Profile/Password/.../Subscription/Billing adentro) — en vez de
   dos entradas sueltas de sidebar, es UNA sola ("Ajustes", ver DashboardNav.tsx)
   que aterriza en la pestaña que le corresponda al rol. Un `trabajador`/
   `encargado` nunca ve la pestaña "Perfil del negocio" (esa ruta sigue
   admin-only en proxy.ts) — si solo queda una pestaña visible, no tiene
   sentido mostrar el selector. */
export function SettingsTabs() {
  const pathname = usePathname();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const tabs = TABS.filter((t) => !t.soloAdmin || esAdmin);
  if (tabs.length < 2) return null;

  return (
    <div className="mt-4 flex gap-1 border-b border-slate-200 pb-2 dark:border-slate-800">
      {tabs.map((t) => {
        const activo = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activo
                ? "bg-primary-light text-primary"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
