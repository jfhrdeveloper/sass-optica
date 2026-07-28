"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/* Aviso de transparencia — patrón tomado de ferdocs-web (su footer abre un
   modal aclarando qué es y qué NO es el servicio). Acá el punto sensible no
   es la vinculación con el Estado sino el manejo de datos de salud: la
   graduación y las recetas son datos sensibles bajo la Ley N° 29733, y a un
   dueño de óptica le pesa saber quién puede verlos.

   Modal propio, no framer-motion: esta pantalla puntual (una sola transición
   de opacidad) no lo justificaba. La landing SÍ usa framer-motion desde la
   sesión de animaciones de entrada/scroll (`HeroSection.tsx`, `Reveal.tsx`,
   `LandingMotionProvider.tsx`) — este modal se queda con su implementación
   propia porque no la necesita, no por seguir evitando la librería. */
export function AvisoTransparencia() {
  const [abierto, setAbierto] = useState(false);

  /* Escape para cerrar + bloqueo del scroll de fondo mientras está abierto. */
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="border-b border-dotted border-slate-300 pb-0.5 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-300"
      >
        Cómo cuidamos los datos de tus pacientes
      </button>

      {abierto && (
        <>
          <div
            onClick={() => setAbierto(false)}
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="aviso-titulo">
            <div className="card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800">
                <h2 id="aviso-titulo" className="text-lg text-slate-900 dark:text-slate-100">
                  Cómo cuidamos los datos de tus pacientes
                </h2>
                <button
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar"
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto p-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <p>
                  La información de tu óptica está{" "}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">aislada de la de cualquier otro negocio</strong>{" "}
                  a nivel de base de datos. No es una separación de pantalla: el servidor filtra por
                  negocio en cada consulta, así que ningún usuario de otra óptica puede llegar a tus
                  datos aunque lo intente.
                </p>
                <p>
                  Las graduaciones y recetas son{" "}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">datos sensibles de salud</strong>{" "}
                  según la Ley N° 29733. Se usan únicamente para que atiendas a tu paciente y le des
                  seguimiento a sus controles. No se comparten con terceros, no alimentan publicidad
                  y no se venden bajo ninguna circunstancia.
                </p>
                <p>
                  Dentro de tu propio equipo tú decides quién ve qué: los roles de administrador,
                  encargado y trabajador limitan el acceso, y los módulos con información financiera
                  se delegan uno por uno, sin tener que ascender a nadie de rol.
                </p>
                <p>
                  Tú sigues siendo el responsable de los datos de tus pacientes; nosotros solo ponemos
                  la infraestructura y los tratamos siguiendo tus instrucciones. Si cancelas, tu
                  información no se queda con nosotros indefinidamente.
                </p>
                <p className="border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  El detalle completo está en la{" "}
                  <Link href="/legal?tab=privacidad" className="link font-medium">Política de privacidad</Link>{" "}
                  y en los{" "}
                  <Link href="/legal?tab=terminos" className="link font-medium">Términos y condiciones</Link>.
                </p>
              </div>

              <div className="flex shrink-0 justify-end border-t border-slate-100 p-6 dark:border-slate-800">
                <button onClick={() => setAbierto(false)} className="btn-primary px-6">Entendido</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
