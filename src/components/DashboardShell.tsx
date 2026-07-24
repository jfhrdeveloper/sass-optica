"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";

const CLAVE_COLAPSADO = "sidebar-colapsado";

/* Dueño del estado de colapso del sidebar — vive separado de DashboardNav
   para que el margen del contenido (`ml-60`/`ml-16`) nunca se desincronice
   del ancho real del `<aside>` fijo: un solo lugar decide ambos.

   Mismo patrón anti-flash-de-SSR que ThemeToggle.tsx: no se puede leer
   localStorage en el initializer de useState (no existe en el servidor),
   así que arranca expandido y se sincroniza en un efecto. El "flash" de un
   sidebar expandido por una fracción de segundo es aceptable (a diferencia
   del tema oscuro, no hay parpadeo de color en toda la pantalla). */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage (no existe en SSR)
    setColapsado(window.localStorage.getItem(CLAVE_COLAPSADO) === "1");
  }, []);

  function alternar() {
    const nuevo = !colapsado;
    setColapsado(nuevo);
    window.localStorage.setItem(CLAVE_COLAPSADO, nuevo ? "1" : "0");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardNav colapsado={colapsado} onToggle={alternar} />
      <div className={`min-h-screen p-6 transition-[margin-left] duration-200 ${colapsado ? "ml-16" : "ml-60"}`}>
        <div className="page-enter mx-auto max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
