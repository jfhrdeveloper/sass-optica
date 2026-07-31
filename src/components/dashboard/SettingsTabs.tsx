"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

export interface TabDeAjustes { href: string; label: string; soloAdmin?: boolean }

export const TABS_AJUSTES: TabDeAjustes[] = [
  { href: "/dashboard/ajustes", label: "Perfil del negocio", soloAdmin: true },
  { href: "/dashboard/facturacion", label: "Suscripción y facturación" },
];

/* Genérico: navegación en pestañas basada en RUTAS reales (no estado de tab
   en cliente) — patrón tomado de diseno-referencia/settings-subscription.html
   (un solo "Settings" con tabs Profile/.../Billing adentro), reusado por
   /dashboard/ajustes+/dashboard/facturacion (Perfil de negocio / Suscripción
   y facturación) y por /dashboard/informes+/dashboard/informes/reportes
   (Ingresos y egresos / Reportes). Cada caller pasa su propio array de tabs;
   si al filtrar por rol solo queda una visible, no tiene sentido mostrar el
   selector. */
export function SettingsTabs({ tabs: tabsProp }: { tabs: TabDeAjustes[] }) {
  const pathname = usePathname();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const tabs = tabsProp.filter((t) => !t.soloAdmin || esAdmin);
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
