"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/* Toggle de modo oscuro — persiste en localStorage bajo la clave "tema" y
   alterna la clase `dark` en <html>. El estado inicial NO puede leerse en
   el initializer de useState (localStorage no existe en SSR — ver el mismo
   problema resuelto en ChangelogBanner.tsx/CoachTooltip.tsx): arranca
   asumiendo `false` y se sincroniza en un efecto con la clase que el script
   inline de layout.tsx ya aplicó a <html> antes del primer paint (evita el
   flash, pero React igual necesita enterarse del estado real para pintar
   el ícono correcto). */
export function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la clase que el script inline de <head> ya aplicó (localStorage no existe en SSR)
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.classList.toggle("dark", nuevo);
    window.localStorage.setItem("tema", nuevo ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      className="flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
    >
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
