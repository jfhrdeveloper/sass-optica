"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/* Modal de confirmación centrado — reemplaza `window.confirm` (alert nativo
   del navegador, sin estilo ni dark mode) para acciones destructivas o
   irreversibles. Cierra con Escape o click en el fondo, igual que SlideOver. */
interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  confirmarTexto?: string;
  cancelarTexto?: string;
  variante?: "danger" | "primary";
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  variante = "danger",
  onConfirmar,
  onCancelar,
}: Props) {
  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 transition-opacity" onClick={onCancelar} />
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              variante === "danger"
                ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                : "bg-primary-light text-primary"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mensaje}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancelar} className="btn-outline px-4 py-2 text-sm">
            {cancelarTexto}
          </button>
          <button
            onClick={onConfirmar}
            className={variante === "danger" ? "btn-danger px-4 py-2 text-sm" : "btn-primary px-4 py-2 text-sm"}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
