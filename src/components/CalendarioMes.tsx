"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Cita } from "@/components/providers/DataProvider";

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
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="font-display text-lg text-slate-900 dark:text-slate-100">{MESES[mes]} {anio}</h2>
        <div className="flex items-center gap-1">
          <button onClick={onIrAHoy} className="btn-outline px-3 py-1 text-xs">Hoy</button>
          <button onClick={() => onCambiarMes(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => onCambiarMes(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
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
              onClick={() => onClickDia(dia)}
              className={`flex min-h-[92px] flex-col items-stretch gap-1 border-b border-r border-slate-100 p-1.5 text-left align-top last:border-r-0 dark:border-slate-800 sm:min-h-[110px] ${
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
              <div className="flex flex-1 flex-col gap-1">
                {/* Cada chip de cita es un <span role="button"> y no un <button>
                    real: la celda del día YA es un <button> (para agendar al
                    click en el espacio vacío) y anidar <button> dentro de
                    <button> es HTML inválido — el navegador lo "arregla" solo
                    cerrando el externo antes de tiempo, rompiendo el layout.
                    `stopPropagation` en el click evita que abrir una cita
                    dispare también el `onClickDia` de la celda. */}
                {visibles.map((c) => (
                  <span
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onClickCita(c); }}
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
                  <span className="px-1.5 text-[11px] text-slate-400 dark:text-slate-500">+{restantes} más</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
