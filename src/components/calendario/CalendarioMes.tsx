"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Cita } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { EstadoCitaBadge } from "@/components/citas/EstadoCitaBadge";

/* ================= CALENDARIO MENSUAL DE CITAS =================
   Vista tipo Google Calendar para /dashboard/citas — grilla de 6 semanas
   con las citas del mes como chips de color por estado. Es un componente
   100% propio (sin librería externa tipo react-big-calendar/FullCalendar):
   dado que solo necesitábamos la vista de mes, no vale la pena cargar una
   librería completa ni pelear con sus estilos para que calce con el resto
   del panel (`.card`, tokens de marca, dark mode ya existentes).

   Solo pinta la grilla y avisa al padre qué se clickeó (`onClickDia`
   para agendar, `onClickCita` para editar) — todo el estado de citas,
   filtros y el formulario siguen viviendo en citas/page.tsx, este
   componente es puramente de presentación. */

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/* Mismo mapeo de color que ESTADO_BADGE en clientes/page.tsx pero en
   versión "chip" (fondo + texto, sin el padding/radius de `.badge`) — no
   se reusa esa constante porque vive en otro archivo y son solo 4 líneas;
   si el catálogo de estados creciera, vale la pena centralizarlo. */
const COLOR_ESTADO: Record<string, string> = {
  programada: "bg-primary-light text-primary",
  atendida: "bg-accent-light text-accent",
  cancelada: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 line-through",
  no_asistio: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};
/* Mismos estados que COLOR_ESTADO pero como color SÓLIDO (no pastel) — un
   punto de 6px en pastel casi no se ve. Es el indicador que reemplaza a los
   chips de texto en mobile: la celda ahí es demasiado angosta para mostrar
   "hora + nombre" (salía cortado en "…"), así que solo se señala "hay
   citas acá" (mismo patrón que Google Calendar mobile) y se ve el detalle
   completo al tocar el día. */
const COLOR_DOT_ESTADO: Record<string, string> = {
  programada: "bg-primary",
  atendida: "bg-accent",
  cancelada: "bg-slate-400 dark:bg-slate-600",
  no_asistio: "bg-red-500",
};
const MAX_PUNTOS_POR_DIA = 4;
/* Más de 3 citas en un día real (agenda muy cargada) rompería la celda —
   se cortan y se deja un "+N más"; para ver la lista completa de ese día
   está la vista Lista con el filtro de rango de fechas. */
const MAX_CHIPS_POR_DIA = 3;

/* Clave de agrupación por día en hora LOCAL (no `toISOString().slice(0,10)`,
   que trabaja en UTC y puede correr la cita al día siguiente/anterior según
   la zona horaria del navegador — el mismo cuidado que ya se toma en
   clientes/page.tsx con `enRiesgo`). */
function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Grilla de 42 celdas (6 semanas × 7 días) que siempre completa el mes con
   los días sobrantes del mes anterior/siguiente atenuados — el mismo truco
   que usa cualquier calendario tipo Google Calendar para no tener que
   calcular cuántas filas hacen falta según el mes. Semana Lunes-primero:
   `getDay()` de JS devuelve 0=Domingo, así que se convierte a un índice
   Lunes=0..Domingo=6 antes de retroceder hasta el inicio de la grilla. */
function construirGrilla(anio: number, mes: number): Date[] {
  const primerDia = new Date(anio, mes, 1);
  const diaSemanaLunesPrimero = (primerDia.getDay() + 6) % 7;
  const inicioGrilla = new Date(anio, mes, 1 - diaSemanaLunesPrimero);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrilla);
    d.setDate(inicioGrilla.getDate() + i);
    return d;
  });
}

interface PopoverDia {
  dia: Date;
  citas: Cita[];
  top: number;
  left: number;
  ancho: number;
}

interface Props {
  mesActual: Date;
  onCambiarMes: (delta: number) => void;
  onIrAHoy: () => void;
  citas: Cita[];
  nombreCliente: (clienteId: string) => string;
  onClickDia: (fecha: Date) => void;
  onClickCita: (cita: Cita) => void;
}

export function CalendarioMes({ mesActual, onCambiarMes, onIrAHoy, citas, nombreCliente, onClickDia, onClickCita }: Props) {
  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth();
  const grilla = construirGrilla(anio, mes);
  const hoyClave = claveDia(new Date());

  /* Popover "de quién es la cita" — SOLO mobile (los puntitos de arriba no
     dicen nombres). En un día CON citas, tocarlo abre esta lista corta (hora
     + nombre, tocar una la edita) en vez de ir directo a "Nueva cita" — un
     día vacío sigue yendo directo a crear, no hay nada que listar. Se
     renderiza en un portal (no como hijo normal de la celda) porque el
     `.card` de arriba tiene `overflow-hidden`: un popover hijo normal se
     recortaría contra ese borde en vez de flotar libre, mismo problema que
     ya resuelve DatePicker.tsx con su propio portal. */
  const [popover, setPopover] = useState<PopoverDia | null>(null);
  /* Desktop: clickear un evento (o cualquier parte de un día con citas) NO
     va directo a editar esa cita puntual — abre este sidebar derecho con la
     lista completa del día (mismo criterio que el popover de mobile, pero
     como panel fijo en vez de flotante junto al dedo) y desde ahí se elige
     cuál editar. Antes el clic en el chip de texto editaba directo esa
     cita: con varias citas el mismo día no había forma de ver "todo" sin
     adivinar cuál chip tocar (pedido explícito del usuario). */
  const [sidebarDia, setSidebarDia] = useState<{ dia: Date; citas: Cita[] } | null>(null);

  useEffect(() => {
    if (!popover) return;
    function cerrar() { setPopover(null); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") cerrar(); }
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  function alClickDia(e: React.MouseEvent<HTMLButtonElement>, dia: Date, citasDelDia: Cita[]) {
    if (citasDelDia.length === 0) {
      onClickDia(dia);
      return;
    }
    const esMobile = window.matchMedia("(max-width: 639px)").matches;
    if (!esMobile) {
      setSidebarDia({ dia, citas: citasDelDia });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const margen = 8;
    const ancho = Math.min(260, window.innerWidth - margen * 2);
    const top = Math.min(rect.bottom + margen, window.innerHeight - margen);
    const left = Math.min(Math.max(margen, rect.left), window.innerWidth - ancho - margen);
    setPopover({ dia, citas: citasDelDia, top, left, ancho });
  }

  /* Agrupa TODAS las citas del negocio por día una sola vez por render
     (no por celda) — con 42 celdas sería 42 pasadas sobre `citas` si se
     filtrara dentro del .map de la grilla. */
  const citasPorDia = new Map<string, Cita[]>();
  for (const c of citas) {
    const clave = claveDia(new Date(c.fechaHora));
    const lista = citasPorDia.get(clave) ?? [];
    lista.push(c);
    citasPorDia.set(clave, lista);
  }
  for (const lista of citasPorDia.values()) {
    lista.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  }

  return (
    <div className="card overflow-hidden">
      {/* Mismo criterio que CalendarioAgenda.tsx: en mobile el título va en su
         propia línea y los controles (ya a 44px por el mínimo táctil) abajo
         — todo en una sola fila quedaba apretado/desalineado contra el
         título. Desktop (`sm:`) vuelve a una sola fila con el tamaño
         compacto original. */}
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg text-slate-900 dark:text-slate-100">{MESES[mes]} {anio}</h2>
          <div className="flex items-center gap-2 sm:gap-1">
            <button onClick={onIrAHoy} className="btn-outline h-11 min-w-[80px] px-3 text-sm sm:h-auto sm:min-w-0 sm:px-3 sm:py-1 sm:text-xs">Hoy</button>
            <button onClick={() => onCambiarMes(-1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-auto sm:w-auto sm:p-1.5" aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => onCambiarMes(1)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-auto sm:w-auto sm:p-1.5" aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-500">
        {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {grilla.map((dia, i) => {
          const clave = claveDia(dia);
          const esDelMes = dia.getMonth() === mes;
          const esHoy = clave === hoyClave;
          const citasDelDia = citasPorDia.get(clave) ?? [];
          const visibles = citasDelDia.slice(0, MAX_CHIPS_POR_DIA);
          const restantes = citasDelDia.length - visibles.length;

          return (
            <button
              key={i}
              onClick={(e) => alClickDia(e, dia, citasDelDia)}
              aria-label={`${dia.getDate()} de ${MESES[mes]}${
                citasDelDia.length > 0 ? ` — ${citasDelDia.length} cita${citasDelDia.length === 1 ? "" : "s"}` : ""
              }`}
              className={`flex min-h-[64px] flex-col items-stretch gap-1 border-b border-r border-slate-100 p-1.5 text-left align-top last:border-r-0 dark:border-slate-800 sm:min-h-[110px] ${
                esDelMes ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-950/40"
              } hover:bg-slate-50 dark:hover:bg-slate-800/60`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  esHoy
                    ? "bg-primary text-white"
                    : esDelMes ? "text-slate-700 dark:text-slate-300" : "text-slate-300 dark:text-slate-700"
                }`}
              >
                {dia.getDate()}
              </span>

              {/* Mobile: la celda es demasiado angosta para "hora + nombre"
                  legible (salía cortado en "…") — un punto sólido por cita
                  alcanza para señalar "hay algo acá" (Google Calendar mobile
                  hace lo mismo); el detalle completo se ve al tocar el día. */}
              <div className="flex flex-wrap gap-1 px-0.5 sm:hidden" aria-hidden="true">
                {citasDelDia.slice(0, MAX_PUNTOS_POR_DIA).map((c) => (
                  <span key={c.id} className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT_ESTADO[c.estado] ?? "bg-slate-400"}`} />
                ))}
              </div>

              <div className="hidden flex-1 flex-col gap-1 sm:flex">
                {/* Cada chip de cita es un <span> y no un <button> real: la
                    celda del día YA es un <button> (para agendar al click en
                    el espacio vacío) y anidar <button> dentro de <button> es
                    HTML inválido — el navegador lo "arregla" solo cerrando el
                    externo antes de tiempo, rompiendo el layout. No lleva
                    onClick propio: el clic burbujea al <button> de la celda,
                    que abre el sidebar con la lista completa del día (ver
                    alClickDia) — clickear un evento puntual ya NO edita
                    directo, muestra "todo" primero. */}
                {visibles.map((c) => (
                  <span
                    key={c.id}
                    className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR_ESTADO[c.estado] ?? "bg-slate-100 text-slate-600"}`}
                    title={`${new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} · ${nombreCliente(c.clienteId)}`}
                    /* suppressHydrationWarning: mismo falso positivo de Intl que en
                       citas/page.tsx y ventas/page.tsx — el ICU de Node (SSR) y el
                       del navegador formatean la hora con un espacio Unicode
                       distinto (texto visible idéntico). No es un bug real. */
                    suppressHydrationWarning
                  >
                    {new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} {nombreCliente(c.clienteId)}
                  </span>
                ))}
                {restantes > 0 && (
                  <span className="px-1.5 text-[11px] text-slate-500 dark:text-slate-500">+{restantes} más</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {popover && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            role="dialog"
            aria-label={`Citas del ${popover.dia.getDate()} de ${MESES[popover.dia.getMonth()]}`}
            style={{ top: popover.top, left: popover.left, width: popover.ancho }}
            className="card fixed z-50 p-1.5 shadow-xl"
          >
            <div className="max-h-64 overflow-y-auto">
              {popover.citas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onClickCita(c); setPopover(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT_ESTADO[c.estado] ?? "bg-slate-400"}`} />
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-500" suppressHydrationWarning>
                    {new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-200">{nombreCliente(c.clienteId)}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onClickDia(popover.dia); setPopover(null); }}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary-light dark:hover:bg-primary/10"
            >
              <Plus size={15} /> Nueva cita
            </button>
          </div>
        </>,
        document.body
      )}

      <SlideOver
        abierto={!!sidebarDia}
        onClose={() => setSidebarDia(null)}
        titulo={sidebarDia ? `Citas del ${sidebarDia.dia.getDate()} de ${MESES[sidebarDia.dia.getMonth()]}` : "Citas del día"}
      >
        {sidebarDia && (
          <div className="space-y-1 pb-4">
            {sidebarDia.citas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onClickCita(c); setSidebarDia(null); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT_ESTADO[c.estado] ?? "bg-slate-400"}`} />
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-500" suppressHydrationWarning>
                  {new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{nombreCliente(c.clienteId)}</span>
                <EstadoCitaBadge estado={c.estado} className="ml-auto" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onClickDia(sidebarDia.dia); setSidebarDia(null); }}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary-light dark:hover:bg-primary/10"
            >
              <Plus size={15} /> Nueva cita
            </button>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
