"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

export interface TabDeAjustes { href: string; label: string; soloAdmin?: boolean }

export const TABS_AJUSTES: TabDeAjustes[] = [
  { href: "/dashboard/ajustes", label: "Perfil del negocio", soloAdmin: true },
  { href: "/dashboard/facturacion", label: "Suscripción y facturación" },
  { href: "/dashboard/ajustes/auditoria", label: "Auditoría", soloAdmin: true },
];

/* Genérico: navegación en pestañas basada en RUTAS reales (no estado de tab
   en cliente) — patrón tomado de diseno-referencia/settings-subscription.html
   (un solo "Settings" con tabs Profile/.../Billing adentro), reusado por
   /dashboard/ajustes+/dashboard/facturacion (Perfil de negocio / Suscripción
   y facturación), /dashboard/informes+/dashboard/informes/reportes
   (Ingresos y egresos / Reportes) y la ficha de cliente (Citas/Recetas/
   Exámenes optométricos/Compras). Cada caller pasa su propio array de tabs;
   si al filtrar por rol solo queda una visible, no tiene sentido mostrar el
   selector. */
export function SettingsTabs({ tabs: tabsProp, gridMobile2 }: { tabs: TabDeAjustes[]; gridMobile2?: boolean }) {
  const pathname = usePathname();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const tabs = tabsProp.filter((t) => !t.soloAdmin || esAdmin);
  if (tabs.length < 2) return null;

  /* `gridMobile2`: variante en grilla de 2 columnas para móvil (pedido
     explícito del usuario para la ficha de cliente, 4 pestañas — en una
     sola fila con scroll quedaban muy apretadas; después reusada por
     Ventas/Cotizaciones —2 tabs, a todo el ancho del cartel— y Roles —3
     tabs—). Con pocas pestañas cortas (Ajustes: 3, Informes: 2) el default
     de fila-con-scroll siempre entró en pantalla y sigue igual; esto es
     opt-in, no cambia esos casos. Con cantidad IMPAR de tabs, la última
     ocupa las 2 columnas (línea propia a todo el ancho) en vez de quedar a
     mitad de fila con un hueco vacío al lado — pedido explícito para Roles
     (2 tabs arriba + 1 sola abajo). */
  return (
    <div className={`mt-4 border-b border-slate-200 pb-2 dark:border-slate-800 ${gridMobile2 ? "" : "overflow-x-auto"}`}>
      <div className={gridMobile2 ? "grid grid-cols-2 gap-1.5 sm:flex sm:w-fit" : "flex w-fit gap-1"}>
        {tabs.map((t, i) => {
          const activo = pathname === t.href;
          const ultimaImpar = gridMobile2 && tabs.length % 2 === 1 && i === tabs.length - 1;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-4 text-center text-sm font-medium transition-colors sm:h-auto sm:py-2 ${ultimaImpar ? "col-span-2" : ""} ${
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
    </div>
  );
}
