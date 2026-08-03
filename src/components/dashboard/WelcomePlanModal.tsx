"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, PartyPopper, X } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { PLANES, LIMITE_EMPLEADOS_GRATIS, LIMITE_VENTAS_MES_GRATIS, esPlanIdValido, type PlanId } from "@/lib/precios";

function clavePersistencia(negocioId: string) {
  return `bienvenida-vista-${negocioId}`;
}

/* Explica qué incluye el plan recién elegido, justo después de crear la
   cuenta — RegistroForm/CompletarRegistroForm redirigen con `?bienvenida=`
   (ver esos componentes). Mismo shell visual que CommandPalette.tsx (modal
   centrado + backdrop + `role="dialog"`), pero centrado en la pantalla en
   vez de anclado arriba: acá no hay un input que necesite estar a la vista
   de entrada.

   Se muestra una sola vez por negocio (localStorage, mismo patrón que
   CoachTooltip.tsx) — al cerrar, además de persistir eso, limpia el query
   param con router.replace() para que ni un refresh ni volver con el botón
   "atrás" del navegador lo vuelvan a disparar. */
function WelcomePlanModalInner() {
  const { negocio } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [abierto, setAbierto] = useState(false);

  const bienvenidaParam = searchParams.get("bienvenida");
  const plan: PlanId | null = bienvenidaParam && esPlanIdValido(bienvenidaParam) ? bienvenidaParam : null;

  useEffect(() => {
    if (!plan || !negocio) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de localStorage, no existe en SSR
    if (window.localStorage.getItem(clavePersistencia(negocio.id)) !== "1") setAbierto(true);
  }, [plan, negocio]);

  function cerrar() {
    setAbierto(false);
    if (negocio) window.localStorage.setItem(clavePersistencia(negocio.id), "1");
    router.replace(pathname, { scroll: false });
  }

  if (!abierto || !plan) return null;

  const planPago = PLANES.find((p) => p.id === plan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <div className="absolute inset-0 bg-slate-900/40" onClick={cerrar} />
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={16} />
        </button>

        <PartyPopper size={28} className="text-primary" />

        {plan === "gratis" ? (
          <>
            <h2 className="mt-3 font-display text-xl text-slate-900 dark:text-slate-100">Bienvenido a tu cuenta Gratis</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Para siempre, sin tarjeta. Esto incluye:</p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Clientes, citas, recetas, productos e inventario sin límite</li>
              <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Hasta {LIMITE_EMPLEADOS_GRATIS} empleados</li>
              <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />Hasta {LIMITE_VENTAS_MES_GRATIS} ventas al mes</li>
            </ul>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Mejora tu plan cuando lo necesites, sin perder nada de lo que ya cargaste.</p>
          </>
        ) : (
          <>
            <h2 className="mt-3 font-display text-xl text-slate-900 dark:text-slate-100">Tienes 30 días de prueba de {planPago?.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sin tarjeta. Esto incluye:</p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              {planPago?.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-accent" />{b}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Si no activas el pago antes de que termine, tu cuenta vuelve automáticamente al plan Gratis — nunca se bloquea ni pierdes tus datos.
            </p>
          </>
        )}

        <button onClick={cerrar} className="btn-primary mt-5 w-full">Entendido</button>
      </div>
    </div>
  );
}

/* `useSearchParams` exige un límite de Suspense (convención ya usada en
   login/nueva-clave/page.tsx) — se encapsula acá adentro para que
   DashboardShell.tsx pueda montar `<WelcomePlanModal />` sin tener que
   saberlo. */
export function WelcomePlanModal() {
  return (
    <Suspense fallback={null}>
      <WelcomePlanModalInner />
    </Suspense>
  );
}
