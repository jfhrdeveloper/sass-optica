"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

/* Banner de novedades fijo (idea de UX #13, patrón OkVet) — versión estática
   simple: un solo mensaje con la versión actual, cerrable y persistido por
   negocio+versión en localStorage (si se sube VERSION más adelante, vuelve a
   aparecer una vez). NO se puede leer localStorage en el initializer de
   useState: en modo mock (ver mock-mode.ts) DataProvider/SessionProvider
   arrancan con `ready=true` de forma síncrona, así que este componente SÍ
   se renderiza durante el SSR — `window` no existe ahí (`ReferenceError`).
   El efecto + setState es la excepción legítima a la regla del proyecto de
   "no derivar en efectos": sincroniza con un API del navegador que no
   existe en el servidor, es justo el caso de uso que React documenta para
   useEffect (no algo derivable durante el render). */
const VERSION = "2026-07-24";

export function ChangelogBanner({ negocioId }: { negocioId?: string }) {
  const key = negocioId ? `changelog_visto_${negocioId}_${VERSION}` : null;
  const [cerrado, setCerrado] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en SSR, ver comentario arriba
    if (key) setCerrado(window.localStorage.getItem(key) === "1");
  }, [key]);

  function cerrar() {
    if (key) window.localStorage.setItem(key, "1");
    setCerrado(true);
  }

  if (cerrado) return null;

  return (
    /* Mismo px-3 py-2 + estructura que stock bajo/seguimientos (ver
       dashboard/page.tsx): antes este banner usaba un padding asimétrico
       propio (pl-4 pr-3) para acercar la X a los otros avisos, pero eso
       corrió el ÍCONO unos px a la derecha respecto a los otros dos —
       mismo padding en los tres lados alinea ícono Y "X" a la vez, sin
       necesidad de un valor especial por banner. */
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-light px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
      <div className="flex flex-1 items-center gap-2">
        <Sparkles size={20} className="shrink-0 text-accent" />
        <span>¡Hay novedades! Rediseñamos el panel y ahora puedes darle permisos puntuales a cada empleado.</span>
      </div>
      <button onClick={cerrar} className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-slate-500 dark:text-slate-500 hover:bg-white/60 dark:hover:bg-white/10" aria-label="Cerrar">
        <X size={16} />
      </button>
    </div>
  );
}
