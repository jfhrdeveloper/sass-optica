"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { BottomTabBar } from "@/components/dashboard/BottomTabBar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { WelcomePlanModal } from "@/components/dashboard/WelcomePlanModal";
import { VistaSimuladaBanner } from "@/components/dashboard/VistaSimuladaBanner";
import { AsistenciaPrompt } from "@/components/dashboard/AsistenciaPrompt";

const CLAVE_COLAPSADO = "sidebar-colapsado";

/* Dueño del estado de colapso del sidebar — vive separado de DashboardNav
   para que el margen del contenido (`ml-64`/`ml-16`) nunca se desincronice
   del ancho real del `<aside>` fijo: un solo lugar decide ambos.

   Mismo patrón anti-flash-de-SSR que ThemeToggle.tsx: no se puede leer
   localStorage en el initializer de useState (no existe en el servidor), así
   que este estado de React arranca expandido y se sincroniza recién en un
   efecto (después del primer paint). Eso SÍ dejaría ver un flash de sidebar
   expandido en cada F5 — se evita aparte, a nivel CSS: el script inline de
   layout.tsx marca <html> con la clase `sidebar-colapsado` antes de que React
   monte, y la regla sin `@layer` de globals.css fuerza el ancho de
   `.dashboard-aside`/`.dashboard-content` ya en ese primer paint, sin esperar
   a este efecto. Por eso el `<aside>` y este div llevan esas clases fijas
   además de las condicionales de abajo. */
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
      <div className={`dashboard-content min-h-screen transition-[margin-left] duration-200 ${colapsado ? "md:ml-16" : "md:ml-64"}`}>
        <VistaSimuladaBanner />
        <DashboardTopbar />
        {/* `.page-enter` acá y no en cada page.tsx: un solo punto de
            aplicación, igual que antes. `pb-24` en mobile: el tab bar fijo
            de abajo (BottomTabBar.tsx) taparía el final del contenido. */}
        <div className="page-enter mx-auto max-w-[1440px] px-4 sm:px-6 pb-24 md:pb-6">
          {children}
        </div>
      </div>
      <BottomTabBar />
      <CommandPalette />
      <WelcomePlanModal />
      <AsistenciaPrompt />
    </div>
  );
}
