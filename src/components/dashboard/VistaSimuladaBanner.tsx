"use client";

import { Eye, X } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { nombreRol } from "@/lib/roles";

/* Franja fija arriba de TODO el dashboard mientras "ver como" está activo —
   a propósito imposible de perderse de vista (a diferencia de un badge en
   el topbar): es lo único que le recuerda al administrador que lo que está
   viendo no es necesariamente lo que puede hacer con su sesión real (ver
   src/lib/simulacion-rol.ts, es solo simulación de UI). */
export function VistaSimuladaBanner() {
  const { rolSimulado, salirSimulacion } = useSession();
  if (!rolSimulado) return null;

  return (
    // No sticky a propósito: DashboardTopbar ya es `sticky top-0` — apilar
    // dos elementos sticky en el mismo tope pisaría uno al otro sin un
    // cálculo de offset dinámico. Este banner scrollea con la página; el
    // control de "Volver a mi vista" también vive en el menú de cuenta del
    // topbar (siempre visible) para no depender de que el banner esté a la vista.
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <Eye size={15} />
      Viendo como {nombreRol(rolSimulado)} — así se ve el dashboard con ese rol.
      <button
        type="button"
        onClick={salirSimulacion}
        className="ml-2 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-white/30"
      >
        <X size={12} /> Volver a mi vista
      </button>
    </div>
  );
}
