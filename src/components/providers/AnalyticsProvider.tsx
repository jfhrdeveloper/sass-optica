"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { initPosthog } from "@/lib/analytics/posthog";
import {
  leerConsentimientoCookies,
  guardarConsentimientoCookies,
  type ConsentimientoCookies,
} from "@/lib/analytics/cookie-consent";

/* Cookies no esenciales (hoy solo PostHog) SOLO en páginas públicas —
   nunca en /dashboard ni /admin-panel, donde la pantalla puede mostrar
   datos de salud de pacientes (recetas, graduaciones). Ver la pestaña
   "Política de cookies" de /legal, que documenta esta misma restricción. */
function esRutaExcluida(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin-panel");
}

/* Banner de cookies — solo aparece si: 1) la ruta actual es pública, y
   2) el visitante todavía no decidió. Ley 29733: el consentimiento debe ser
   previo, libre y expreso — por eso "Aceptar" y "Rechazar" pesan lo mismo
   visualmente (btn-primary/btn-outline, no un botón grande y un link chico)
   y PostHog no se inicializa hasta que el usuario elige, nunca antes ni por
   defecto. Si ya hay una decisión guardada de una visita anterior, no se
   vuelve a mostrar — solo se reactiva desde "Cambiar mi preferencia" en la
   pestaña de cookies (ver cookie-consent.ts). */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const [consentimiento, setConsentimiento] = useState<ConsentimientoCookies | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de localStorage, no existe en SSR
    setConsentimiento(leerConsentimientoCookies());
    setListo(true);
  }, []);

  useEffect(() => {
    if (esRutaExcluida(pathname)) return;
    if (consentimiento === "aceptado") void initPosthog();
  }, [pathname, consentimiento]);

  if (esRutaExcluida(pathname) || !listo || consentimiento !== null) return null;

  function elegir(valor: ConsentimientoCookies) {
    guardarConsentimientoCookies(valor);
    setConsentimiento(valor);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="page-enter fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Usamos cookies para entender cómo se usa esta página y mejorarla. Puedes ver el detalle
          en nuestra <Link href="/legal?tab=cookies" className="link font-medium">Política de cookies</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => elegir("rechazado")} className="btn-outline">Rechazar</button>
          <button onClick={() => elegir("aceptado")} className="btn-primary">Aceptar</button>
        </div>
      </div>
    </div>
  );
}
