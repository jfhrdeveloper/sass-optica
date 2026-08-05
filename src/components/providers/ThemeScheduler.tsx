"use client";

import { useEffect } from "react";
import { oscuroPorHorario, msHastaProximoCambio } from "@/lib/theme-schedule";

/* Aplica claro/oscuro por horario mientras el usuario no haya elegido manual
   (ThemeToggle.tsx guarda esa elección en localStorage['tema'], y esa
   elección gana siempre — este componente no le pisa nada si existe). Se
   reprograma un `setTimeout` exacto al próximo cambio de franja (7am/6pm) en
   vez de sondear, para que el cambio se vea al instante con la pestaña
   abierta, sin esperar a un refresh. El chequeo de localStorage se repite en
   cada disparo (no solo al montar) porque si el usuario elige manualmente
   mientras ya había un timeout programado, ese timeout debe abortarse solo
   en vez de pisar la elección al llegar la hora. */
export function ThemeScheduler() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function aplicar() {
      if (localStorage.getItem("tema")) return;
      document.documentElement.classList.toggle("dark", oscuroPorHorario());
      timeoutId = setTimeout(aplicar, msHastaProximoCambio());
    }

    aplicar();
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
