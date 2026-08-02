import Link from "next/link";
import { Lock } from "lucide-react";

/* "Candado visible" freemium (idea de UX #10 del research de competencia,
   OkVet): la función Pro se sigue mostrando completa — no se oculta el
   módulo — pero con este banner fijo encima y (responsabilidad del caller)
   los controles de escritura deshabilitados. Deja ver el valor de lo
   premium en vez de esconderlo. */
export function FeatureGateBanner({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
      <div className="flex items-start gap-2">
        <Lock size={16} className="mt-0.5 shrink-0" />
        <span>
          {mensaje} Disponible en el plan Pro. Lo que ya registraste sigue ahí, solo que no vas a poder editarlo.
        </span>
      </div>
      <Link
        href="/dashboard/facturacion"
        className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
      >
        Quitar restricción
      </Link>
    </div>
  );
}
