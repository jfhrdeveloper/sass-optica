"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useIsomorphicLayoutEffect } from "@/lib/hooks/useIsomorphicLayoutEffect";

/* Toggle de modo oscuro — persiste en localStorage bajo la clave "tema" y
   alterna la clase `dark` en <html>. Guardar acá una elección manual es lo
   que hace que ThemeScheduler.tsx deje de aplicar el horario por defecto
   (7am-6pm claro / resto oscuro, ver lib/theme-schedule.ts): mientras exista
   "tema" en localStorage, la elección del usuario gana siempre sobre el
   horario.

   El ÍCONO (Moon/Sun) NO depende de estado de React — se decide 100% por
   CSS con `dark:` (el mismo mecanismo de Tailwind que ya pinta el resto del
   sitio, ligado a la clase `dark` de <html>). Es más estricto que sincronizar
   `oscuro` en un efecto: esta página SÍ se renderiza en el servidor (a
   diferencia de lo que un vistazo rápido haría suponer, `DashboardShell` es
   parte del HTML servido en modo mock), así que el navegador PINTA el ícono
   del servidor ANTES de que cualquier JS corra — ni `useLayoutEffect` evita
   eso, porque el problema no es el orden de los efectos de React sino que el
   HTML crudo ya trae el ícono equivocado (el servidor no puede leer
   localStorage). Con `dark:hidden`/`dark:block`, en cambio, el ícono
   correcto ya está en el HTML servido en cuanto el script inline de
   layout.tsx marca `<html>` con la clase `dark` (corre ANTES del primer
   paint) — no hace falta esperar a React para nada.

   `oscuro` se mantiene solo para el texto de accesibilidad (aria-label/title)
   y para decidir hacia qué lado alternar en el próximo click — ahí sí basta
   con leer la clase real de <html> en el momento del click, sin depender de
   que este estado ya se haya sincronizado. */
export function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevo = !document.documentElement.classList.contains("dark");
    setOscuro(nuevo);
    document.documentElement.classList.toggle("dark", nuevo);
    window.localStorage.setItem("tema", nuevo ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
    >
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}
