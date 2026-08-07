import Link from "next/link";
import { Lock } from "lucide-react";

/* Bloquea el registro de ventas/cotizaciones si no hay una caja abierta —
   pedido explícito del usuario ("no se puede generar ventas, cotizaciones,
   etc. sin abrir la caja"). Mismo lenguaje visual que LimitePlanBanner (no
   el mismo componente: ese bloquea por plan, este por un estado operativo
   del día — el CTA y el copy son distintos). */
export function CajaCerradaBanner() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
      <div className="flex items-center gap-2">
        <Lock size={20} className="shrink-0" />
        <span>Abre la caja para poder registrar ventas o cotizaciones.</span>
      </div>
      <Link
        href="/dashboard/caja"
        className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
      >
        Ir a Caja
      </Link>
    </div>
  );
}
