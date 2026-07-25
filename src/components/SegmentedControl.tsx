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
export function SegmentedControl({ opciones, valor, onChange, className, ...aria }: Props) {
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
        role="tablist"
        aria-label={aria["aria-label"]}
        className="relative mx-auto flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
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
              role="tab"
              aria-selected={activo}
              onClick={() => onChange(o.valor)}
              className={`relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activo ? "text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
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
