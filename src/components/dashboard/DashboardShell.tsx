"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { BottomTabBar } from "@/components/dashboard/BottomTabBar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { WelcomePlanModal } from "@/components/dashboard/WelcomePlanModal";
import { VistaSimuladaBanner } from "@/components/dashboard/VistaSimuladaBanner";

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
      <div className={`min-h-screen transition-[margin-left] duration-200 ${colapsado ? "md:ml-16" : "md:ml-60"}`}>
        <VistaSimuladaBanner />
        <DashboardTopbar sidebarColapsado={colapsado} />
        {/* `.page-enter` acá y no en cada page.tsx: un solo punto de
            aplicación, igual que antes. `pb-24` en mobile: el tab bar fijo
            de abajo (BottomTabBar.tsx) taparía el final del contenido. */}
        <div className="page-enter mx-auto max-w-[1440px] px-6 pb-24 md:pb-6">
          {children}
        </div>
      </div>
      <BottomTabBar />
      <CommandPalette />
      <WelcomePlanModal />
    </div>
  );
}
