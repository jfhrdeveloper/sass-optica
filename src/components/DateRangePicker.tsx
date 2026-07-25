"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { CalendarDays, X } from "lucide-react";
import { aCadenaISO, aFechaLocal, formatearFechaPE, ordenarRango } from "@/lib/date";

interface Props {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  etiqueta?: string;
}

/* Selector de rango de fechas: un campo que abre un calendario flotante.
   Reemplaza a los dos `<input type="date">` sueltos que había en los filtros
   — con el nativo no se veía la relación entre ambos extremos ni el tramo
   elegido, y cada navegador dibujaba su propio calendario del sistema.

   Sobre las fechas: hacia afuera este componente habla SOLO en fechas civiles
   ("YYYY-MM-DD"), igual que el resto del sistema; los `Date` que necesita
   react-day-picker se arman y se leen con los helpers de lib/date.ts, que
   evitan el clásico error de un día por interpretar la fecha como UTC. */
export function DateRangePicker({ desde, hasta, onChange, etiqueta = "Rango de fechas" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const rango: DateRange | undefined = desde || hasta
    ? { from: aFechaLocal(desde), to: aFechaLocal(hasta) }
    : undefined;

  /* El popover se renderiza en un portal con `position: fixed` y se ubica a
     partir del rect del trigger. Es a propósito: dentro del árbol, un
     ancestro con `overflow` (las tablas viven en `.overflow-x-auto`) o con
     `transform` (el SlideOver) lo recortaría o le movería el sistema de
     coordenadas — el bug más molesto de diagnosticar de un calendario. */
  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    /* El ANCHO también se clampea al viewport, no solo la posición: en una
       pantalla de 320px (iPhone SE), `320 - margen*2` ya no entra un panel
       de 320px fijo y quedaba con `left` negativo, cortado por el borde
       izquierdo (medido con Playwright: -8px). Sin este clamp, cualquier
       viewport más angosto que `anchoDeseado + margen*2` se recorta. */
    const anchoDeseado = 320;
    const ancho = Math.min(anchoDeseado, window.innerWidth - margen * 2);
    const alto = 360;
    /* Si no entra abajo, se abre hacia arriba; si se sale por la derecha, se
       corre a la izquierda. Sin esto, en una fila de filtros pegada al borde
       el calendario queda cortado por el viewport. */
    const abajo = t.bottom + margen + alto <= window.innerHeight;
    const top = abajo ? t.bottom + margen : Math.max(margen, t.top - margen - alto);
    const left = Math.min(Math.max(margen, t.left), window.innerWidth - ancho - margen);
    setPos({ top, left, ancho });
  }

  useEffect(() => {
    if (!abierto) return;
    ubicar();
    function onFuera(e: MouseEvent) {
      const n = e.target as Node;
      if (!popoverRef.current?.contains(n) && !triggerRef.current?.contains(n)) setAbierto(false);
    }
    function onTecla(e: KeyboardEvent) {
      if (e.key === "Escape") { setAbierto(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("mousedown", onFuera);
    document.addEventListener("keydown", onTecla);
    window.addEventListener("resize", ubicar);
    /* `capture: true` para enterarse también del scroll de un contenedor
       interno, que no burbujea hasta window. */
    window.addEventListener("scroll", ubicar, true);
    return () => {
      document.removeEventListener("mousedown", onFuera);
      document.removeEventListener("keydown", onTecla);
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto]);

  function seleccionar(r: DateRange | undefined) {
    const [d, h] = ordenarRango(aCadenaISO(r?.from), aCadenaISO(r?.to));
    onChange(d, h);
    /* Se cierra solo cuando el rango abarca DOS días distintos. Ojo con la
       condición: al primer clic react-day-picker no devuelve `to: undefined`
       sino `{ from: X, to: X }` (un rango de un día), así que preguntar
       "¿ya hay from y to?" cerraba el calendario apenas se elegía el inicio,
       sin dejar elegir el fin. Un rango de un solo día se cierra a mano. */
    if (d && h && d !== h) setAbierto(false);
  }

  function limpiar(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", "");
  }

  const hayRango = Boolean(desde || hasta);
  const texto = !hayRango
    ? "Cualquier fecha"
    : desde && hasta
      /* Un rango de un solo día se muestra como una fecha suelta, no como
         "08-07-2026 — 08-07-2026", que se lee raro. */
      ? (desde === hasta ? formatearFechaPE(desde) : `${formatearFechaPE(desde)} — ${formatearFechaPE(hasta)}`)
      : `Desde ${formatearFechaPE(desde || hasta)}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={etiqueta}
        className="input flex items-center gap-2 text-sm"
      >
        <CalendarDays size={15} className="shrink-0 text-slate-400" />
        <span className={hayRango ? "" : "text-slate-400 dark:text-slate-500"}>{texto}</span>
        {hayRango && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar filtro de fechas"
            onClick={limpiar}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange("", ""); } }}
            className="ml-1 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={etiqueta}
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 overflow-x-auto p-3 shadow-xl"
        >
          <DayPicker
            mode="range"
            locale={es}
            selected={rango}
            onSelect={seleccionar}
            defaultMonth={aFechaLocal(desde) ?? new Date()}
            showOutsideDays
            classNames={CLASES}
          />
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <button type="button" onClick={() => onChange("", "")} className="text-xs font-medium link">
              Limpiar
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs font-medium link">
              Cerrar
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* Estilos propios en vez de importar la hoja de react-day-picker: así el
   calendario usa los mismos tokens de marca que el resto (primary, slate,
   dark:) y no hay que pelearle a una CSS externa con `!important`.
   Las claves salen del enum UI / DayFlag / SelectionState de la librería. */
const CLASES = {
  months: "relative",
  month: "w-full",
  month_caption: "flex h-9 items-center justify-center",
  caption_label: "text-sm font-semibold capitalize text-slate-900 dark:text-slate-100",
  nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
  button_previous:
    "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800",
  button_next:
    "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-10 pb-1 text-[11px] font-medium uppercase text-slate-400 dark:text-slate-500",
  week: "flex w-full",
  day: "h-9 w-10 p-0 text-center text-sm",
  day_button:
    "h-9 w-full rounded-lg text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800",
  /* Extremos del rango: relleno sólido. El tramo intermedio, tinte suave —
     así se lee de un vistazo dónde empieza y termina la selección. */
  range_start: "rounded-l-lg bg-primary [&_button]:bg-primary [&_button]:text-white [&_button:hover]:bg-primary",
  range_end: "rounded-r-lg bg-primary [&_button]:bg-primary [&_button]:text-white [&_button:hover]:bg-primary",
  range_middle: "bg-primary-light [&_button]:rounded-none [&_button]:text-primary",
  selected: "",
  today: "[&_button]:font-semibold [&_button]:text-primary [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-primary/40",
  outside: "[&_button]:text-slate-300 dark:[&_button]:text-slate-600",
  disabled: "opacity-40",
  hidden: "invisible",
  focused: "[&_button]:ring-2 [&_button]:ring-primary/40",
};
