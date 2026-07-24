"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastTipo = "success" | "error" | "info";
interface ToastItem { id: string; mensaje: string; tipo: ToastTipo }

const DURACION_MS = 3500;

const ICONO: Record<ToastTipo, typeof CheckCircle2> = {
  success: CheckCircle2, error: XCircle, info: Info,
};
const ESTILO: Record<ToastTipo, string> = {
  success: "border-l-4 border-accent [&>svg]:text-accent",
  error: "border-l-4 border-red-500 [&>svg]:text-red-500",
  info: "border-l-4 border-primary [&>svg]:text-primary",
};

const Ctx = createContext<((mensaje: string, tipo?: ToastTipo) => void) | null>(null);

/* Confirmación transitoria tras guardar/eliminar — antes no había ningún
   feedback más allá del texto del botón cambiando a "Guardando…". Viewport
   fijo en la esquina (ver namethatui.com/web/toast): no bloquea la página,
   se autodescarta, y respeta `role="status"`/`aria-live="polite"` para
   lectores de pantalla. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const descartar = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((mensaje: string, tipo: ToastTipo = "success") => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => descartar(id), DURACION_MS);
  }, [descartar]);

  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        {items.map((t) => {
          const Icono = ICONO[t.tipo];
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`card pointer-events-auto flex w-72 items-start gap-2.5 px-3.5 py-3 text-sm shadow-lg ${ESTILO[t.tipo]}`}
            >
              <Icono size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-slate-700 dark:text-slate-200">{t.mensaje}</p>
              <button onClick={() => descartar(t.id)} className="shrink-0 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return v;
}
