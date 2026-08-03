"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/* Panel lateral deslizante reutilizable para formularios de alta/edición —
   reemplaza el patrón anterior de "formulario inline arriba de la tabla" en
   todas las páginas de /dashboard/*. Cierra con Escape, click en el fondo,
   o el botón X. */
interface Props {
  abierto: boolean;
  onClose: () => void;
  titulo: string;
  children: React.ReactNode;
}

export function SlideOver({ abierto, onClose, titulo, children }: Props) {
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, onClose]);

  return (
    <div className={`fixed inset-0 z-40 ${abierto ? "" : "pointer-events-none"}`} aria-hidden={!abierto}>
      <div
        className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-200 ${abierto ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white dark:bg-slate-900 shadow-xl transition-transform duration-200 ease-out ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>{children}</div>
      </div>
    </div>
  );
}
