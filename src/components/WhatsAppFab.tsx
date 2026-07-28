"use client";

import { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { urlWhatsApp } from "@/lib/contacto";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

/* Botón flotante de WhatsApp — solo en la landing (el dashboard tiene su
   propio soporte y ahí estorbaría sobre las tablas).

   Burbuja animada (escribiendo → mensaje → oculto, en loop cada 12s) igual
   a la de ferdocs-web, para que el botón dé "señal de vida" en vez de ser
   un ícono estático. Usa `m.*` (no `motion.*`) porque este árbol vive
   dentro de LandingMotionProvider con LazyMotion en modo `strict`.

   Verde oficial de WhatsApp (#25D366) a propósito, no la paleta de marca:
   el reconocimiento del color ES la señal de qué hace el botón. */
export function WhatsAppFab() {
  const [fase, setFase] = useState<"escribiendo" | "mensaje" | "oculto">("oculto");
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const ciclo = () => {
      const t1 = setTimeout(() => setFase("escribiendo"), 2000);
      const t2 = setTimeout(() => setFase("mensaje"), 3500);
      const t3 = setTimeout(() => setFase("oculto"), 8000);
      const t4 = setTimeout(ciclo, 12000);
      timeoutsRef.current = [t1, t2, t3, t4];
    };
    ciclo();
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const href = urlWhatsApp();

  return (
    <m.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, duration: 0.5, type: "spring", stiffness: 200 }}
      className="fixed bottom-8 right-5 z-30 flex flex-row-reverse items-center sm:bottom-10 sm:right-6"
    >
      {/* Botón principal */}
      <div className="relative shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20" />
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-1 hover:bg-[#1DA851]"
        >
          <WhatsAppIcon size={26} className="translate-x-[1.5px]" />
        </a>
      </div>

      {/* Burbuja */}
      <AnimatePresence>
        {fase !== "oculto" && (
          <m.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative mr-3 flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 drop-shadow-lg transition-shadow hover:drop-shadow-xl dark:border-slate-700 dark:bg-slate-800"
            style={{
              width: fase === "escribiendo" ? "76px" : "220px",
              height: fase === "escribiendo" ? "48px" : "60px",
              transition: "width 0.4s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Puntita apuntando al botón — a la derecha porque el fab está a la derecha */}
            <span className="absolute -right-[6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-tr-[2px] border-r border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />

            {fase === "escribiendo" ? (
              <div className="relative z-10 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <m.span
                    key={i}
                    className="block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
            ) : (
              <m.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="relative z-10 whitespace-nowrap text-xs font-medium leading-tight text-slate-800 dark:text-slate-100 sm:text-sm"
              >
                ¿Dudas sobre el sistema?
                <br />
                <span className="font-semibold text-[#25D366]">Escríbenos por WhatsApp 👋</span>
              </m.p>
            )}
          </m.a>
        )}
      </AnimatePresence>
    </m.div>
  );
}
