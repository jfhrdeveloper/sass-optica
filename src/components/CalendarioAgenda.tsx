"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type { Cita } from "@/components/providers/DataProvider";
import { HORA_INICIO_AGENDA, HORA_FIN_AGENDA, PASO_MINUTOS_AGENDA, DURACION_CITA_DEFECTO_MIN } from "@/lib/citas";

/* ================= CALENDARIO DE AGENDA (Día / N días / Semana) =================
   Hermano de CalendarioMes.tsx (que solo cubre la vista de mes): grilla
   horaria tipo Google Calendar, con columnas por día y filas por hora. Un
   solo componente sirve para Día (dias=1), 3 días, 5 días y Semana
   (dias=7) — la única diferencia entre esas vistas es cuántas columnas se
   piden y desde qué fecha arrancan (eso lo decide citas/page.tsx). Mismo
   criterio que CalendarioMes: sin librería externa, reusa `.card` y los
   tokens de marca/dark mode ya existentes. */

const DIAS_SEMANA_CORTO = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const HORA_INICIO = HORA_INICIO_AGENDA; // 07:00 — primera fila
const HORA_FIN = HORA_FIN_AGENDA; // 21:00 — la grilla llega hasta acá (última fila = 20:00-21:00)
const SNAP_MIN = PASO_MINUTOS_AGENDA; // granularidad del clic-y-arrastre, en minutos

/* Zoom vertical de la grilla (px por hora) — controles +/- en la cabecera.
   56 es el valor "cómodo" original; el rango [32, 112] deja ver el día
   completo (32) o distinguir citas de 15 min pegadas (112) sin que ninguno
   de los dos extremos rompa el layout. */
const ALTO_HORA_DEFECTO = 56;
const ALTO_HORA_MIN = 32;
const ALTO_HORA_MAX = 112;
const ALTO_HORA_PASO = 12;

/* `duracionMin` es opcional en `Cita` (citas viejas no la tienen) — cuando
   falta, se asume DURACION_CITA_DEFECTO_MIN (compartida con el <select> de
   duración del formulario en citas/page.tsx). */
const DURACION_DEFECTO_MIN = DURACION_CITA_DEFECTO_MIN;

const COLOR_ESTADO: Record<string, string> = {
  programada: "border-primary bg-primary-light text-primary",
  atendida: "border-accent bg-accent-light text-accent",
  cancelada: "border-slate-300 bg-slate-100 text-slate-500 line-through dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400",
  no_asistio: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400",
};

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sumarDias(fecha: Date, n: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}

/* Minutos desde HORA_INICIO, acotados a la ventana visible — una cita fuera
   del horario de la grilla igual se dibuja pegada al borde en vez de
   desaparecer sin avisar (mejor una cita mal ubicada visualmente que una
   cita invisible). */
function minutosDesdeInicio(fecha: Date): number {
  const min = (fecha.getHours() - HORA_INICIO) * 60 + fecha.getMinutes();
  return Math.max(0, Math.min(min, (HORA_FIN - HORA_INICIO) * 60));
}

/* Convierte un offset en píxeles (desde el borde superior de la columna del
   día) a minutos desde HORA_INICIO, ajustado al múltiplo de SNAP_MIN más
   cercano — así el clic-y-arrastre siempre cae en una hora "prolija"
   (7:15, 7:30…) en vez de un minuto exacto al azar. Recibe `altoHora` en vez
   de leer una constante porque el zoom +/- lo vuelve variable. */
function minutosDesdeY(offsetY: number, altoHora: number): number {
  const totalMin = (HORA_FIN - HORA_INICIO) * 60;
  const crudo = (offsetY / altoHora) * 60;
  const ajustado = Math.round(crudo / SNAP_MIN) * SNAP_MIN;
  return Math.max(0, Math.min(totalMin, ajustado));
}

function formatHora(minDesdeInicio: number): string {
  const total = HORA_INICIO * 60 + minDesdeInicio;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* A más zoom, más franjas horarias visibles — no solo filas más altas.
   Con el alto por defecto se ven las horas en punto (como antes); estirar
   con "+" primero revela las medias horas y, estirando más, los cuartos de
   hora — así "+" agrega horarios (7:00 → 7:00/7:30 → 7:00/7:15/7:30/7:45)
   en vez de solo hacer más grande el mismo horario de siempre. */
function pasoMarcaParaZoom(altoHora: number): number {
  if (altoHora > 84) return 15;
  if (altoHora > 56) return 30;
  return 60;
}

/* Misma idea que formatHora pero sin cero a la izquierda en la hora (7:00,
   no 07:00) — es la que se ve en la columna de horas, más compacta. */
function etiquetaMarca(minDesdeInicio: number): string {
  const total = HORA_INICIO * 60 + minDesdeInicio;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

interface CitaConColumna extends Cita {
  _col: number;
  _totalCols: number;
}

/* Reparte en sub-columnas las citas que se solapan en el mismo día (greedy:
   cada cita entra en la primera columna cuya última cita ya terminó antes
   de que esta empiece; si ninguna sirve, abre columna nueva). No es el
   coloreo óptimo de intervalos, pero para la carga real de una óptica
   (pocas citas a la misma hora) da el mismo resultado visual y es mucho
   más simple de leer que un algoritmo de grafos completo. */
function asignarColumnas(citasDelDia: Cita[]): CitaConColumna[] {
  const ordenadas = [...citasDelDia].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const finColumna: number[] = [];
  const conColumna: (Cita & { _col: number })[] = [];

  for (const c of ordenadas) {
    const inicio = minutosDesdeInicio(new Date(c.fechaHora));
    const fin = inicio + (c.duracionMin ?? DURACION_DEFECTO_MIN);
    let col = finColumna.findIndex((f) => f <= inicio);
    if (col === -1) { col = finColumna.length; finColumna.push(fin); }
    else { finColumna[col] = fin; }
    conColumna.push({ ...c, _col: col });
  }

  const totalCols = Math.max(1, finColumna.length);
  return conColumna.map((c) => ({ ...c, _totalCols: totalCols }));
}

interface Props {
  /** Primer día visible en la grilla (ya resuelto por el padre: inicio de
   *  semana para la vista Semana, la fecha tal cual para Día/3/5 días). */
  fechaAncla: Date;
  /** Cuántas columnas de día se muestran (1, 3, 5 o 7). */
  dias: number;
  /** Navega +/- `dias` días (el padre decide qué hacer con el resultado). */
  onNavegar: (deltaDias: number) => void;
  onIrAHoy: () => void;
  citas: Cita[];
  nombreCliente: (clienteId: string) => string;
  /** `duracionMin` viene poblado cuando el usuario arrastró de una hora X a
   *  una hora Y (en vez de solo clickear); el padre lo usa para prellenar
   *  la cita con esa duración real en vez del default de 30 min. */
  onClickSlot: (fecha: Date, duracionMin?: number) => void;
  onClickCita: (cita: Cita) => void;
}

export function CalendarioAgenda({ fechaAncla, dias, onNavegar, onIrAHoy, citas, nombreCliente, onClickSlot, onClickCita }: Props) {
  const columnas = Array.from({ length: dias }, (_, i) => sumarDias(fechaAncla, i));
  const hoyClave = claveDia(new Date());
  const minutosAhora = minutosDesdeInicio(new Date());

  /* Zoom vertical — no es solo "más píxeles por hora": a partir de cierto
     zoom aparecen también las franjas de media hora y, más adelante, las de
     cuarto de hora (`pasoMarca`/`marcas`, ver pasoMarcaParaZoom). Solo
     afecta esta grilla, no hace falta que el padre lo sepa (no cambia qué
     citas se ven, solo qué tan finas se dibujan las franjas). */
  const [altoHora, setAltoHora] = useState(ALTO_HORA_DEFECTO);
  const acercar = () => setAltoHora((a) => Math.min(ALTO_HORA_MAX, a + ALTO_HORA_PASO));
  const alejar = () => setAltoHora((a) => Math.max(ALTO_HORA_MIN, a - ALTO_HORA_PASO));
  const pasoMarca = pasoMarcaParaZoom(altoHora);
  const altoMarca = (pasoMarca / 60) * altoHora;
  const marcas = Array.from({ length: ((HORA_FIN - HORA_INICIO) * 60) / pasoMarca }, (_, i) => i * pasoMarca);

  /* Clic-y-arrastre tipo Google Calendar: mousedown sobre la columna del
     día arranca la selección, mousemove (en window, para no perderla si el
     mouse sale de la columna) la actualiza, y mouseup abre el formulario de
     nueva cita con la hora de inicio Y la duración real arrastrada (de X a
     Y). Un clic simple (sin arrastre) sigue funcionando igual: la duración
     sale en 0 y se omite, así el padre aplica su propio default. */
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragInfoRef = useRef<{ diaIdx: number; startMin: number } | null>(null);
  const [dragVisual, setDragVisual] = useState<{ diaIdx: number; min: number; max: number } | null>(null);

  useEffect(() => {
    function calcMin(clientY: number, diaIdx: number): number {
      const el = columnRefs.current[diaIdx];
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return minutosDesdeY(clientY - rect.top, altoHora);
    }
    function onMove(e: MouseEvent) {
      const info = dragInfoRef.current;
      if (!info) return;
      const min = calcMin(e.clientY, info.diaIdx);
      setDragVisual({ diaIdx: info.diaIdx, min: Math.min(info.startMin, min), max: Math.max(info.startMin, min) });
    }
    function onUp(e: MouseEvent) {
      const info = dragInfoRef.current;
      if (!info) return;
      dragInfoRef.current = null;
      setDragVisual(null);
      const fin = calcMin(e.clientY, info.diaIdx);
      const min = Math.min(info.startMin, fin);
      const max = Math.max(info.startMin, fin);
      const duracion = max - min;
      const fecha = sumarDias(fechaAncla, info.diaIdx);
      fecha.setHours(HORA_INICIO, min, 0, 0);
      onClickSlot(fecha, duracion >= SNAP_MIN ? duracion : undefined);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [fechaAncla, onClickSlot, altoHora]);

  function iniciarDrag(e: React.MouseEvent<HTMLDivElement>, diaIdx: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const min = minutosDesdeY(e.clientY - rect.top, altoHora);
    dragInfoRef.current = { diaIdx, startMin: min };
    setDragVisual({ diaIdx, min, max: min });
  }

  const citasPorDia = new Map<string, Cita[]>();
  for (const c of citas) {
    const clave = claveDia(new Date(c.fechaHora));
    const lista = citasPorDia.get(clave) ?? [];
    lista.push(c);
    citasPorDia.set(clave, lista);
  }

  const primero = columnas[0];
  const ultimo = columnas[columnas.length - 1];
  const tituloRango = dias === 1
    ? `${primero.getDate()} de ${MESES_CORTO[primero.getMonth()]} de ${primero.getFullYear()}`
    : primero.getMonth() === ultimo.getMonth()
      ? `${primero.getDate()}–${ultimo.getDate()} de ${MESES_CORTO[primero.getMonth()]} de ${primero.getFullYear()}`
      : `${primero.getDate()} ${MESES_CORTO[primero.getMonth()]} – ${ultimo.getDate()} ${MESES_CORTO[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="font-display text-lg text-slate-900 dark:text-slate-100">{tituloRango}</h2>
        <div className="flex items-center gap-1">
          {/* Zoom vertical de la grilla: track tipo toggle (mismo fondo/borde
             que SegmentedControl) con un botón "-" y uno "+" a los lados. */}
          <div className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={alejar}
              disabled={altoHora <= ALTO_HORA_MIN}
              aria-label="Reducir la grilla"
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              onClick={acercar}
              disabled={altoHora >= ALTO_HORA_MAX}
              aria-label="Estirar la grilla"
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus size={13} />
            </button>
          </div>
          <button onClick={onIrAHoy} className="btn-outline px-3 py-1 text-xs">Hoy</button>
          <button onClick={() => onNavegar(-dias)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Período anterior">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => onNavegar(dias)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Período siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={`min-w-[640px] ${dragVisual ? "select-none" : ""}`}>
          {/* Cabecera: columna de horas (angosta, vacía) + una columna por día */}
          <div className="grid border-b border-slate-100 dark:border-slate-800" style={{ gridTemplateColumns: `56px repeat(${dias}, 1fr)` }}>
            <div />
            {columnas.map((dia) => {
              const esHoy = claveDia(dia) === hoyClave;
              return (
                <div key={dia.toISOString()} className="border-l border-slate-100 py-2 text-center dark:border-slate-800">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{DIAS_SEMANA_CORTO[(dia.getDay() + 6) % 7]}</div>
                  <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${esHoy ? "bg-primary text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {dia.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grilla horaria: columna de horas + una columna por día, con las
              citas absolutamente posicionadas encima según su hora. */}
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dias}, 1fr)` }}>
            <div>
              {marcas.map((min, i) => {
                const esHora = min % 60 === 0;
                return (
                  <div
                    key={min}
                    style={{ height: altoMarca }}
                    className={`${i === 0 ? "" : "-translate-y-2"} pr-2 text-right ${
                      esHora ? "text-[11px] text-slate-400 dark:text-slate-500" : "text-[10px] text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    {etiquetaMarca(min)}
                  </div>
                );
              })}
            </div>

            {columnas.map((dia, i) => {
              const clave = claveDia(dia);
              const esHoy = clave === hoyClave;
              const citasDia = asignarColumnas(citasPorDia.get(clave) ?? []);

              return (
                <div
                  key={dia.toISOString()}
                  ref={(el) => { columnRefs.current[i] = el; }}
                  onMouseDown={(e) => iniciarDrag(e, i)}
                  className="relative cursor-pointer border-l border-slate-100 dark:border-slate-800"
                >
                  {marcas.map((min) => {
                    const esHora = min % 60 === 0;
                    return (
                      <div
                        key={min}
                        style={{ height: altoMarca }}
                        className={`pointer-events-none border-t hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          esHora ? "border-slate-100 dark:border-slate-800" : "border-dashed border-slate-100 dark:border-slate-800/60"
                        }`}
                      />
                    );
                  })}

                  {esHoy && minutosAhora > 0 && minutosAhora < (HORA_FIN - HORA_INICIO) * 60 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                      style={{ top: (minutosAhora / 60) * altoHora }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      <span className="h-px flex-1 bg-red-500" />
                    </div>
                  )}

                  {dragVisual && dragVisual.diaIdx === i && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-1 z-20 overflow-hidden rounded-md border-2 border-primary bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                      style={{ top: (dragVisual.min / 60) * altoHora, height: Math.max(((dragVisual.max - dragVisual.min) / 60) * altoHora, 18) }}
                    >
                      {formatHora(dragVisual.min)}
                      {dragVisual.max > dragVisual.min ? ` – ${formatHora(dragVisual.max)}` : ""}
                    </div>
                  )}

                  {citasDia.map((c) => {
                    const inicio = minutosDesdeInicio(new Date(c.fechaHora));
                    const top = (inicio / 60) * altoHora;
                    const alto = Math.max(((c.duracionMin ?? DURACION_DEFECTO_MIN) / 60) * altoHora - 2, 18);
                    const anchoPct = 100 / c._totalCols;

                    return (
                      <span
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onClickCita(c); }}
                        style={{ top, height: alto, left: `${c._col * anchoPct}%`, width: `${anchoPct}%` }}
                        className={`absolute z-[5] cursor-pointer overflow-hidden truncate rounded-md border-l-2 px-1.5 py-0.5 text-[11px] font-medium leading-tight ${COLOR_ESTADO[c.estado] ?? "border-slate-300 bg-slate-100 text-slate-600"}`}
                        title={`${new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} · ${nombreCliente(c.clienteId)}`}
                        suppressHydrationWarning
                      >
                        <span suppressHydrationWarning>{new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span> {nombreCliente(c.clienteId)}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
