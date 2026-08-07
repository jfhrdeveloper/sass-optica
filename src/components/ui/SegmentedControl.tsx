"use client";

import { useCallback, useEffect, useRef } from "react";

export interface OpcionSegmento {
  valor: string;
  label: string;
  /* Contenido opcional a la derecha del label (ej. el badge de descuento
     del toggle Anual en PreciosSection). */
  extra?: React.ReactNode;
}

interface Props {
  opciones: OpcionSegmento[];
  valor: string;
  onChange: (valor: string) => void;
  "aria-label": string;
  className?: string;
  /* "tabs" (default): cambiar de opción revela un panel de contenido
     distinto — `role="tablist"`/`"tab"` (uso: las pestañas de
     FuncionesShowcase, Clientes/Citas/.../Equipo).
     "opciones": elegir UNA entre varias alternativas que no revelan un
     panel — semánticamente un grupo de radios, `role="radiogroup"`/`"radio"`
     (uso: el toggle Mensual/Anual de PreciosSection). Antes ambos casos
     usaban `tablist`/`tab` a secas: un lector de pantalla anunciaba
     "Anual, pestaña 2 de 2" para algo que no es una pestaña — no cambia de
     panel, cambia el precio mostrado. */
  variante?: "tabs" | "opciones";
  /* Por defecto el track mide lo que ocupa su contenido (`w-fit`,
     centrado) — correcto para casos cortos como Mensual/Anual. Cuando el
     control debe ocupar TODO el ancho disponible del contenedor (ej. el
     selector de vista de Citas: Día/Semana/Mes/Lista), esta prop reparte
     el ancho en partes iguales entre las opciones en vez de dejar que cada
     una mida lo que su propio texto necesita — si no, un label largo
     ("Semana") queda más ancho que uno corto ("Mes") y el conjunto se ve
     desalineado del card que lo contiene. */
  distribuirAncho?: boolean;
}

/* Segmented control con indicador DESLIZANTE: un solo bloque (track) con
   una píldora que se mueve entre las opciones, en vez de botones sueltos
   que se prenden y apagan.

   El indicador se posiciona escribiendo `transform`/`width` directo sobre
   el nodo (vía ref), NO con estado de React: es una medida puramente visual
   derivada del DOM ya pintado — pasarla por estado obligaría a un render
   extra por cada cambio y chocaría con la regla `react-hooks/set-state-in-effect`
   del proyecto sin ganar nada.

   La transición se habilita recién DESPUÉS del primer posicionamiento
   (`dataset.listo`): si no, al montar el indicador animaría desde
   `translateX(0)` con ancho 0 hasta su lugar, que se ve como un glitch. */
export function SegmentedControl({ opciones, valor, onChange, className, variante = "tabs", distribuirAncho = false, ...aria }: Props) {
  const esTabs = variante === "tabs";
  const botonesRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const indicadorRef = useRef<HTMLSpanElement>(null);

  const medir = useCallback(() => {
    const boton = botonesRef.current[valor];
    const indicador = indicadorRef.current;
    if (!boton || !indicador) return;

    indicador.style.transform = `translateX(${boton.offsetLeft}px)`;
    indicador.style.width = `${boton.offsetWidth}px`;

    if (!indicador.dataset.listo) {
      requestAnimationFrame(() => {
        indicador.dataset.listo = "1";
        indicador.style.transition = "transform 300ms ease, width 300ms ease";
      });
    }
  }, [valor]);

  useEffect(() => {
    medir();
    /* Re-medir en resize: los botones cambian de ancho con el viewport
       (y con el scroll horizontal del track en pantallas angostas), así que
       una medida tomada una sola vez queda desfasada. */
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  return (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <div
        role={esTabs ? "tablist" : "radiogroup"}
        aria-label={aria["aria-label"]}
        className={`relative flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 ${
          distribuirAncho ? "w-full" : "mx-auto w-fit"
        }`}
      >
        <span
          ref={indicadorRef}
          aria-hidden="true"
          className="absolute inset-y-1 left-0 rounded-full bg-primary shadow-sm"
        />
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <button
              key={o.valor}
              ref={(el) => { botonesRef.current[o.valor] = el; }}
              type="button"
              role={esTabs ? "tab" : "radio"}
              aria-selected={esTabs ? activo : undefined}
              aria-checked={esTabs ? undefined : activo}
              onClick={() => onChange(o.valor)}
              className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                distribuirAncho ? "flex-1" : "shrink-0"
              } ${activo ? "text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}
            >
              {o.label}
              {o.extra}
            </button>
          );
        })}
      </div>
    </div>
  );
}
