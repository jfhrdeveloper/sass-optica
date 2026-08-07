import Link from "next/link";
import { Lock } from "lucide-react";

/* Hermano de FeatureGateBanner, NO una variante — bloquean cosas distintas:
   FeatureGateBanner oculta-en-modo-lectura un módulo entero, permanente,
   por plan ("no tienes Premium"). Este bloquea UNA acción puntual, temporal
   ("llegaste al tope de este mes en Gratis") — todo lo ya registrado sigue
   editable, no hay fieldset disabled alrededor de nada. Reusar el mismo
   componente con props extra hubiera mezclado dos mensajes que no
   comparten ni el copy ni el CTA ("Mejorar plan" acá, nunca "Quitar
   restricción" — eso es específico del candado de SUNAT). */
export function LimitePlanBanner({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
      <div className="flex items-center gap-2">
        <Lock size={20} className="shrink-0" />
        <span>{mensaje}</span>
      </div>
      <Link
        href="/dashboard/facturacion"
        className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
      >
        Mejorar plan
      </Link>
    </div>
  );
}
