"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { es } from "react-day-picker/locale";
import { CalendarDays, X } from "lucide-react";
import { aCadenaISO, aFechaLocal, formatearFechaPE } from "@/lib/formato/date";

/* react-day-picker (~20KB) solo hace falta cuando el usuario ABRE el
   calendario — no en el render inicial del botón "Elegir fecha", que está
   en CASI TODAS las páginas del dashboard. `dynamic()` difiere la descarga
   al primer clic en vez de sumarla al JS inicial de cada ruta. `ssr: false`
   porque ya vive detrás de un `abierto &&` (nunca se renderiza en el
   servidor de todas formas) y el propio DayPicker asume `window`. */
const DayPicker = dynamic(() => import("react-day-picker").then((m) => m.DayPicker), { ssr: false });

interface Props {
  valor: string; // "YYYY-MM-DD" o "" — mismo lenguaje de fecha civil que el resto del sistema
  onChange: (valor: string) => void;
  etiqueta?: string;
  placeholder?: string;
}

/* Selector de UNA fecha (no rango) — contraparte de DateRangePicker.tsx para
   los campos de formulario que hasta ahora seguían con el `<input
   type="date">` nativo (fecha de nacimiento, fecha del gasto, vigencia de
   una cotización): cada navegador dibuja su propio calendario del sistema,
   desentonando con el resto del dashboard.

   Es un componente aparte (no un `modo` en DateRangePicker): react-day-picker
   tipa `selected`/`onSelect` distinto según `mode="single"` vs `mode="range"`
   (`Date | undefined` contra `DateRange | undefined`), meter los dos modos
   en un solo componente genérico hubiera significado pelear con esos tipos
   sin ganar nada — es más simple duplicar el poco boilerplate de
   posicionamiento (mismo patrón que ya repite ColorWell.tsx) que forzar una
   abstracción compartida a la fuerza. */
export function DatePicker({ valor, onChange, etiqueta = "Fecha", placeholder = "Elegir fecha" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /* El popover se renderiza en un portal con `position: fixed`, ubicado a
     partir del rect del trigger — dentro de un `SlideOver` o de una tabla
     con `overflow-x-auto` un hijo normal quedaría recortado. El ancho se
     clampea al viewport disponible: sin eso, en una pantalla más angosta
     que `anchoDeseado + margen*2` el popover queda con `left` negativo. */
  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(300, window.innerWidth - margen * 2);
    const alto = 340;
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
    window.addEventListener("scroll", ubicar, true);
    return () => {
      document.removeEventListener("mousedown", onFuera);
      document.removeEventListener("keydown", onTecla);
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto]);

  function seleccionar(d: Date | undefined) {
    onChange(aCadenaISO(d));
    setAbierto(false); // un solo día elegido ya cierra: no hay un segundo extremo que esperar
  }

  function limpiar(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={etiqueta}
        className="input flex w-full items-center gap-2 text-sm"
      >
        <CalendarDays size={15} className="shrink-0 text-slate-400" />
        <span className={valor ? "flex-1 text-left" : "flex-1 text-left text-slate-400 dark:text-slate-500"}>
          {valor ? formatearFechaPE(valor) : placeholder}
        </span>
        {valor && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar fecha"
            onClick={limpiar}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(""); } }}
            className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
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
            mode="single"
            locale={es}
            selected={aFechaLocal(valor)}
            onSelect={seleccionar}
            defaultMonth={aFechaLocal(valor) ?? new Date()}
            showOutsideDays
            classNames={CLASES}
          />
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <button type="button" onClick={() => onChange("")} className="text-xs font-medium link">
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

/* Mismos tokens de marca que DateRangePicker.tsx (primary/slate/dark:) —
   la única diferencia real es `selected`: en modo `single` es react-day-picker
   quien pinta el día elegido con ese modifier (en `range` esa clase queda
   vacía a propósito, ahí pintan `range_start`/`range_end`/`range_middle`). */
const CLASES = {
  months: "relative",
  month: "w-full",
  month_caption: "flex h-9 items-center justify-center",
  caption_label: "text-sm font-semibold capitalize text-slate-900 dark:text-slate-100",
  nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
  /* Flechas de navegación de mes casi invisibles en dark mode con
     `dark:text-slate-400` (bajo contraste contra el popover oscuro) —
     subidas a `dark:text-slate-100`, queja explícita de un usuario real. */
  button_previous:
    "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-100 dark:hover:bg-slate-800",
  button_next:
    "flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-100 dark:hover:bg-slate-800",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-10 pb-1 text-[11px] font-medium uppercase text-slate-400 dark:text-slate-500",
  week: "flex w-full",
  day: "h-9 w-10 p-0 text-center text-sm",
  day_button:
    "h-9 w-full rounded-lg text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800",
  selected: "[&_button]:bg-primary [&_button]:text-white [&_button:hover]:bg-primary",
  today: "[&_button]:font-semibold [&_button]:text-primary [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-primary/40",
  outside: "[&_button]:text-slate-300 dark:[&_button]:text-slate-600",
  disabled: "opacity-40",
  hidden: "invisible",
  focused: "[&_button]:ring-2 [&_button]:ring-primary/40",
};
