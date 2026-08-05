"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { MarcarEntradaForm } from "@/components/dashboard/MarcarEntradaForm";

/* Auto-aviso de asistencia al ingresar — si el empleado todavía no marcó
   ENTRADA hoy, se abre este popup UNA VEZ por sesión/día (sessionStorage por
   empleado+día) para que no se le olvide — mismo criterio EXACTO que
   tramys-rrhh (TopbarWorker.tsx, "Auto-aviso de asistencia al ingresar").
   Cerrar con la X solo lo descarta por hoy, no vuelve a insistir hasta
   mañana ni al navegar entre páginas del dashboard. No aparece mientras un
   administrador está "viendo como" otro rol (rolSimulado) — sería confuso
   pedirle que marque SU propia asistencia en medio de una simulación de UI
   (mismo criterio que `isImpersonating` en tramys-rrhh). TAMPOCO aparece
   para el rol `administrador` en sí: es el dueño del negocio, no alguien a
   quien haya que controlarle entrada/salida — en tramys-rrhh este mismo
   aviso vive en TopbarWorker.tsx (un componente aparte, exclusivo del rol
   worker), el owner nunca lo ve. Sigue pudiendo marcar la suya a mano desde
   /dashboard/asistencia si quiere (la policy `asistencias_self` no lo
   excluye), solo no se le insiste con el popup.

   Mismo shell visual que WelcomePlanModal.tsx (backdrop + modal centrado),
   reusa MarcarEntradaForm.tsx (compartido con /dashboard/asistencia) para no
   duplicar la lógica de sede del día + foto opcional. */
export function AsistenciaPrompt() {
  const { asistencias } = useData();
  const { empleado, rolSimulado } = useSession();
  const [abierto, setAbierto] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const yaMarco = !!(empleado && asistencias.find((a) => a.empleadoId === empleado.id && a.fecha === hoy)?.horaEntrada);

  useEffect(() => {
    if (!empleado || rolSimulado || yaMarco || empleado.rol === "administrador") return;
    const key = `asistencia_prompt_${empleado.id}_${hoy}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage no existe en SSR, mismo criterio que ChangelogBanner.tsx
    setAbierto(true);
  }, [empleado, rolSimulado, yaMarco, hoy]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Marcar asistencia">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => setAbierto(false)} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar — puedes marcar luego"
          title="Cerrar — puedes marcar luego"
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={16} />
        </button>

        <h2 className="font-display text-xl text-slate-900 dark:text-slate-100">¿Ya llegaste?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Marca tu entrada para que quede registrada.</p>

        <div className="mt-4">
          <MarcarEntradaForm onMarcado={() => setAbierto(false)} />
        </div>
      </div>
    </div>
  );
}
