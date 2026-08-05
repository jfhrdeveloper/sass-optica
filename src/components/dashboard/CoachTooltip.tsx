"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";

/* Onboarding vía tooltip apuntando a UNA acción a la vez, con stepper
   numérico (idea de UX #12 del research de competencia, OkVet) — complemento
   del checklist completo (OnboardingChecklist). Se cierra permanentemente
   por negocio (localStorage), a diferencia del checklist que reaparece cada
   sesión. NO se puede leer localStorage en el initializer de useState: en
   modo mock (ver mock-mode.ts) DataProvider/SessionProvider arrancan con
   `ready=true` de forma síncrona, así que este componente SÍ se renderiza
   durante el SSR — `window` no existe ahí (`ReferenceError`). El efecto +
   setState es la excepción legítima a la regla del proyecto de "no derivar
   en efectos": sincroniza con un API del navegador que no existe en el
   servidor. */
const PASOS = [
  { key: "cliente", label: "Crea tu primer cliente", href: "/dashboard/clientes" },
  { key: "producto", label: "Agrega tu primer producto", href: "/dashboard/productos" },
  { key: "cita", label: "Agenda tu primera cita", href: "/dashboard/citas" },
  { key: "venta", label: "Registra tu primera venta", href: "/dashboard/ventas" },
] as const;

export function CoachTooltip() {
  const { negocio, clientes, productos, citas, ventas } = useData();
  const storageKey = negocio ? `coach_tooltip_cerrado_${negocio.id}` : null;
  const [cerrado, setCerrado] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR, ver comentario arriba
    if (storageKey) setCerrado(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const completadas: Record<string, boolean> = {
    cliente: clientes.length > 0,
    producto: productos.length > 0,
    cita: citas.length > 0,
    venta: ventas.length > 0,
  };
  const indiceActual = PASOS.findIndex((p) => !completadas[p.key]);

  function cerrar() {
    if (storageKey) window.localStorage.setItem(storageKey, "1");
    setCerrado(true);
  }

  if (cerrado || indiceActual === -1) return null;
  const paso = PASOS[indiceActual];

  return (
    <div className="card mt-4 flex items-start gap-3 border-primary/20 bg-primary-light p-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
        {indiceActual + 1}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Paso {indiceActual + 1} de {PASOS.length}</p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{paso.label}</p>
        <Link href={paso.href} className="mt-2 inline-block text-sm font-medium link">
          Ir ahora →
        </Link>
      </div>
      <button onClick={cerrar} className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-slate-400 dark:text-slate-500 transition-colors hover:bg-white/60 dark:hover:bg-white/10" aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  );
}
