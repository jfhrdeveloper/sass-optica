"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";
import { HORA_INICIO_AGENDA, HORA_FIN_AGENDA, PASO_MINUTOS_AGENDA } from "@/lib/citas";

interface Props {
  valor: string; // "HH:mm" o ""
  onChange: (valor: string) => void;
  etiqueta?: string;
  placeholder?: string;
}

function generarOpciones(): string[] {
  const opciones: string[] = [];
  for (let min = HORA_INICIO_AGENDA * 60; min <= HORA_FIN_AGENDA * 60; min += PASO_MINUTOS_AGENDA) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    opciones.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return opciones;
}
const OPCIONES = generarOpciones();

/* Selector de UNA hora — contraparte de DatePicker.tsx para el campo de hora
   de "Agendar cita" (antes vivía junto a la fecha en un único `<input
   type="datetime-local">` nativo: además de verse distinto al resto del
   dashboard, el ícono/flechas nativos del navegador se pintan negros sin
   respetar el modo oscuro de la página). Mismo rango horario que la grilla
   de CalendarioAgenda (`HORA_INICIO_AGENDA`..`HORA_FIN_AGENDA`, cada
   `PASO_MINUTOS_AGENDA` min) — una cita no puede agendarse fuera del horario
   que la agenda ya muestra. */
export function TimePicker({ valor, onChange, etiqueta = "Hora", placeholder = "Elegir hora" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(160, window.innerWidth - margen * 2);
    const alto = 260;
    const abajo = t.bottom + margen + alto <= window.innerHeight;
    const top = abajo ? t.bottom + margen : Math.max(margen, t.top - margen - alto);
    const left = Math.min(Math.max(margen, t.left), window.innerWidth - ancho - margen);
    setPos({ top, left, ancho });
  }

  useEffect(() => {
    if (!abierto) return;
    ubicar();
    /* Centra la opción ya elegida (o la más cercana a "ahora" si no hay
       ninguna) en vez de abrir siempre arriba del todo — con ~55 opciones
       en una lista de 260px, sin esto habría que scrollear a ciegas. */
    const idx = valor ? OPCIONES.indexOf(valor) : -1;
    const el = listaRef.current?.children[idx >= 0 ? idx : 0] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "center" });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function seleccionar(h: string) {
    onChange(h);
    setAbierto(false);
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
        className="input flex h-11 w-full items-center gap-2 sm:h-auto"
      >
        <Clock size={15} className="shrink-0 text-slate-400" />
        <span className={valor ? "flex-1 text-left" : "flex-1 text-left text-slate-500 dark:text-slate-500"}>
          {valor || placeholder}
        </span>
        {valor && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar hora"
            onClick={limpiar}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(""); } }}
            /* -my-[10px]: mismo fix que DatePicker.tsx — el área táctil sigue
               midiendo 44px, pero el margen negativo evita que este botón
               anidado empuje la altura de la fila del `.input` (que
               naturalmente mide ~40px) cuando aparece (solo con `valor`). */
            className="-my-[10px] flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
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
          className="card fixed z-50 p-1.5 shadow-xl"
        >
          <div ref={listaRef} className="max-h-64 overflow-y-auto pr-0.5">
            {OPCIONES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => seleccionar(h)}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  h === valor
                    ? "bg-primary text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
