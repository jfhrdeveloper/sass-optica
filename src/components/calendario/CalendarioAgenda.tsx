"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type { Cita } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { EstadoCitaBadge } from "@/components/citas/EstadoCitaBadge";
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
/* Solo para el título de la vista Día en mobile — ahí la cabecera de columna
   (abreviatura + círculo con el número) se oculta por redundante con este
   título (ver más abajo), así que el nombre del día se muda acá completo en
   vez de la abreviatura de 3 letras. */
const DIAS_SEMANA_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const HORA_INICIO = HORA_INICIO_AGENDA; // 07:00 — primera fila
const HORA_FIN = HORA_FIN_AGENDA; // 21:00 — la grilla llega hasta acá (última fila = 20:00-21:00)
const SNAP_MIN = PASO_MINUTOS_AGENDA; // granularidad del clic-y-arrastre, en minutos

/* Zoom vertical de la grilla — controles +/- en la cabecera. SOLO 3 niveles
   discretos, cada uno atado a una granularidad de hora concreta (hora en
   punto / media hora / cuarto de hora) — antes era un incremento continuo
   de a 12px con el rango [32,112], así que la mayoría de los clics
   agrandaban el panel SIN agregar ningún horario nuevo (bug real,
   reportado por el usuario: "sigo viendo clics que agrandan pero no
   agregan las horas"). Ahora cada clic en +/- SIEMPRE cambia el detalle
   mostrado, nunca solo el tamaño. */
/* `altoHora / (60/pasoMarca)` = alto de CADA marca — antes bajaba a medida
   que se afinaba el zoom (56px con marcas de hora, pero solo 42px con
   medias horas y 28px con cuartos de hora), quedando más apretado justo en
   los niveles que se usan para ver más detalle; y el nivel por defecto
   (sin zoom) también se sentía muy junto para una cita de 30 min (que a
   56px/hora rendía solo 26px de alto). Ahora todos suben (80/56/60px) — el
   nivel de 15 min queda con el más alto de los tres (pedido explícito del
   usuario: es el que más le importa). */
const NIVELES_ZOOM = [
  { altoHora: 80, pasoMarca: 60 }, // horas en punto (7:00, 8:00…) — nivel por defecto
  { altoHora: 112, pasoMarca: 30 }, // + medias horas (7:00, 7:30, 8:00…)
  { altoHora: 240, pasoMarca: 15 }, // + cuartos de hora (7:00, 7:15, 7:30, 7:45…) — prioridad
] as const;

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
/* Mismo mapeo que COLOR_ESTADO pero como punto sólido — se usa como
   indicador chico junto al nombre en el sidebar y en los grupos solapados de
   mobile (ver MAX_COLS_VISIBLE), mismo criterio que COLOR_DOT_ESTADO en
   CalendarioMes. */
const COLOR_DOT_ESTADO: Record<string, string> = {
  programada: "bg-primary",
  atendida: "bg-accent",
  cancelada: "bg-slate-400 dark:bg-slate-600",
  no_asistio: "bg-red-500",
};
/* Igual criterio que MAX_CHIPS_POR_DIA en CalendarioMes: a partir de 4
   citas solapadas a la misma hora las columnas angostas ya no se leen —
   se muestran 3 en su ancho normal y el resto se agrupa (ver
   agruparPorSolape) en un chip "+N más" por franja horaria que abre la
   lista completa de esa franja. */
const MAX_COLS_VISIBLE = 3;
/* Piso de alto (px) para el cúmulo mobile de citas solapadas (2+, ver
   gruposDiaMobile) — sin esto, un cúmulo de duración real corta rendía
   con el `alto` normal (hasta 18px) y las 2 líneas de nombre no entraban:
   el contenido se recortaba y solo quedaba visible el "+N más" (reportado
   por el usuario, tampoco se podía tocar bien de tan chico). Alcanza para
   2 líneas de texto de 10px + el padding vertical del chip. */
const ALTO_MIN_GRUPO = 34;

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

/* Fusiona en un solo grupo las citas que se solapan entre sí (sweep de
   intervalos, mismo criterio que asignarColumnas pero fusionando en vez de
   repartir en columnas nuevas). Genérica en `T extends Cita` porque sirve
   para dos casos distintos:
   - Desktop: solo se llama con las citas que quedaron fuera de
     MAX_COLS_VISIBLE, para fusionarlas en el chip "+N más".
   - Mobile: se llama con TODAS las citas del día, para decidir por franja
     horaria (no por el máximo del día completo, que es una simplificación
     de asignarColumnas que sobre-angosta citas que en realidad no se cruzan
     con nada) si esa franja va como chip legible (grupo de 1) o como cúmulo
     de puntos que abre el panel (grupo de 2+) — ver el render de
     `gruposDiaMobile` más abajo. */
function agruparPorSolape<T extends Cita>(citasDelDia: T[]): T[][] {
  const ordenadas = [...citasDelDia].sort(
    (a, b) => minutosDesdeInicio(new Date(a.fechaHora)) - minutosDesdeInicio(new Date(b.fechaHora))
  );
  const grupos: T[][] = [];
  let finGrupo = -Infinity;
  for (const c of ordenadas) {
    const inicio = minutosDesdeInicio(new Date(c.fechaHora));
    if (grupos.length > 0 && inicio < finGrupo) {
      grupos[grupos.length - 1].push(c);
    } else {
      grupos.push([c]);
    }
    finGrupo = Math.max(finGrupo, inicio + (c.duracionMin ?? DURACION_DEFECTO_MIN));
  }
  return grupos;
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

  /* Zoom vertical — 3 niveles fijos (ver NIVELES_ZOOM), no un incremento
     continuo: cada clic en +/- cambia SIEMPRE tanto el tamaño como el
     detalle de horario mostrado (franjas de hora/media hora/cuarto de
     hora), nunca uno sin el otro. Solo afecta esta grilla, no hace falta
     que el padre lo sepa (no cambia qué citas se ven, solo qué tan finas
     se dibujan las franjas). */
  const [nivelZoom, setNivelZoom] = useState(0);
  const acercar = () => setNivelZoom((n) => Math.min(NIVELES_ZOOM.length - 1, n + 1));
  const alejar = () => setNivelZoom((n) => Math.max(0, n - 1));
  const { altoHora, pasoMarca } = NIVELES_ZOOM[nivelZoom];
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

  /* Sidebar con la lista completa de un grupo de citas solapadas que quedó
     fuera de MAX_COLS_VISIBLE — mismo panel (y mismo componente) en mobile y
     desktop; antes mobile abría un popover flotante en vez de este panel,
     se unificó a pedido del usuario. */
  const [sidebarAgenda, setSidebarAgenda] = useState<{ dia: Date; citas: Cita[] } | null>(null);

  function alClickOverflow(e: React.MouseEvent<HTMLSpanElement>, dia: Date, grupo: Cita[]) {
    e.stopPropagation();
    setSidebarAgenda({ dia, citas: grupo });
  }

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

  /* Desktop: clickear CUALQUIER cita visible (columna normal o chip de
     overflow) abre el sidebar con TODAS las citas de ese día, no solo esa
     cita puntual ni solo el grupo que no entraba — mismo criterio que
     CalendarioMes (pedido explícito del usuario: "igual que en mes"). Mobile
     sigue con su propio comportamiento (chip único edita directo, grupo
     solapado abre solo ese grupo vía alClickOverflow) — no se tocó, no fue
     lo que se pidió acá. */
  function abrirSidebarDia(dia: Date) {
    const clave = claveDia(dia);
    const citasOrdenadas = [...(citasPorDia.get(clave) ?? [])].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    setSidebarAgenda({ dia, citas: citasOrdenadas });
  }

  const primero = columnas[0];
  const ultimo = columnas[columnas.length - 1];
  const nombreDia = DIAS_SEMANA_LARGO[(primero.getDay() + 6) % 7];
  const tituloDiaMobil = dias === 1
    ? `${nombreDia.charAt(0).toUpperCase()}${nombreDia.slice(1)}, ${primero.getDate()} de ${MESES_LARGO[primero.getMonth()]} de ${primero.getFullYear()}`
    : "";
  const tituloRango = dias === 1
    ? `${primero.getDate()} de ${MESES_CORTO[primero.getMonth()]} de ${primero.getFullYear()}`
    : primero.getMonth() === ultimo.getMonth()
      ? `${primero.getDate()}–${ultimo.getDate()} de ${MESES_CORTO[primero.getMonth()]} de ${primero.getFullYear()}`
      : `${primero.getDate()} ${MESES_CORTO[primero.getMonth()]} – ${ultimo.getDate()} ${MESES_CORTO[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;

  return (
    <div className="card overflow-hidden">
      {/* Mobile: 2 líneas (la fecha completa arriba, controles abajo) — en
         una sola línea "4 de agosto de 2026" competía por espacio con 6
         controles y todo salía apretado/desalineado. Desktop (`sm:`) vuelve
         a una sola fila como antes: fecha a la izquierda, controles a la
         derecha, zoom primero (orden original). Los dos grupos de controles
         usan `order-*` (no dos JSX separados) para invertir su orden entre
         mobile y desktop sin duplicar el markup. */}
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg text-slate-900 dark:text-slate-100">
            {dias === 1 ? (
              <>
                <span className="sm:hidden">{tituloDiaMobil}</span>
                <span className="hidden sm:inline">{tituloRango}</span>
              </>
            ) : tituloRango}
          </h2>
          <div className="flex items-center justify-between gap-2 sm:gap-1 sm:justify-end">
            <div className="order-1 flex items-center gap-2 sm:order-2 sm:gap-1">
              <button onClick={() => onNavegar(-dias)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-auto sm:w-auto sm:p-1.5" aria-label="Período anterior">
                <ChevronLeft size={18} />
              </button>
              <button onClick={onIrAHoy} className="btn-outline h-11 min-w-[92px] px-3 text-sm sm:h-auto sm:min-w-0 sm:px-3 sm:py-1 sm:text-xs">Hoy</button>
              <button onClick={() => onNavegar(dias)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-auto sm:w-auto sm:p-1.5" aria-label="Período siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
            {/* Zoom vertical de la grilla: track tipo toggle (mismo fondo/borde
               que SegmentedControl) con un botón "-" y uno "+" a los lados. */}
            <div className="order-2 flex items-center rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 sm:order-1">
              <button
                type="button"
                onClick={alejar}
                disabled={nivelZoom <= 0}
                aria-label="Reducir la grilla"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-6 sm:w-6"
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={acercar}
                disabled={nivelZoom >= NIVELES_ZOOM.length - 1}
                aria-label="Estirar la grilla"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-6 sm:w-6"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Ancho mínimo PROPORCIONAL a `dias` (90px por columna + 56px de la
            columna de horas), no un total fijo — con un total fijo (ej. 640px)
            la vista Día (1 sola columna) quedaba forzada al mismo ancho que
            Semana (7 columnas) y salía scroll horizontal en mobile sin
            necesidad. Con esto Día ocupa TODO el ancho del card sin scroll
            (igual que Google Calendar/Toggl Track), y el scroll solo aparece
            en 5 días/Semana cuando de verdad no entran en pantalla angosta —
            mismo comportamiento que esas apps. */}
        <div
          style={dias > 1 ? { minWidth: 56 + dias * 90 } : undefined}
          className={dragVisual ? "select-none" : ""}
        >
          {/* Cabecera: columna de horas (angosta, vacía) + una columna por día.
              En Día (1 sola columna) en mobile se oculta (`dias === 1 &&
              hidden sm:grid`): repetía el mismo día que ya dice el título de
              arriba ("martes, 4 de agosto…") — con varias columnas (3/5/
              Semana) sigue haciendo falta, ahí cada columna es un día
              distinto y no hay título único que los cubra a todos. */}
          <div
            className={`grid border-b border-slate-100 dark:border-slate-800 ${dias === 1 ? "hidden sm:grid" : ""}`}
            style={{ gridTemplateColumns: `56px repeat(${dias}, 1fr)` }}
          >
            <div />
            {columnas.map((dia) => {
              const esHoy = claveDia(dia) === hoyClave;
              return (
                <div key={dia.toISOString()} className="border-l border-slate-100 py-2 text-center dark:border-slate-800">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">{DIAS_SEMANA_CORTO[(dia.getDay() + 6) % 7]}</div>
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
                      esHora ? "text-[11px] text-slate-500 dark:text-slate-500" : "text-[10px] text-slate-300 dark:text-slate-600"
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
              const totalColsDia = citasDia[0]?._totalCols ?? 1;
              const hayOverflow = totalColsDia > MAX_COLS_VISIBLE;
              const citasNormales = hayOverflow ? citasDia.filter((c) => c._col < MAX_COLS_VISIBLE) : citasDia;
              const gruposOverflow = hayOverflow ? agruparPorSolape(citasDia.filter((c) => c._col >= MAX_COLS_VISIBLE)) : [];
              const colsVisibles = hayOverflow ? MAX_COLS_VISIBLE + 1 : totalColsDia;
              const anchoPctDia = 100 / colsVisibles;
              /* Mobile: no reusa colsVisibles/MAX_COLS_VISIBLE de desktop —
                 ese cálculo es a nivel DÍA (el mismo _totalCols para todas
                 las citas del día, aunque no se crucen entre sí) y en una
                 pantalla angosta hasta 2 columnas ya salen ilegibles. Acá se
                 agrupa por SOLAPE REAL de cada franja: una cita sola en su
                 franja queda legible a ancho completo, solo el grupo que de
                 verdad se solapa colapsa en el bloque de hasta 2 nombres +
                 "N más". */
              const gruposDiaMobile = agruparPorSolape(citasPorDia.get(clave) ?? []);

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

                  {citasNormales.map((c) => {
                    const inicio = minutosDesdeInicio(new Date(c.fechaHora));
                    const top = (inicio / 60) * altoHora;
                    const alto = Math.max(((c.duracionMin ?? DURACION_DEFECTO_MIN) / 60) * altoHora - 2, 18);

                    return (
                      <span
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); abrirSidebarDia(dia); }}
                        style={{ top, height: alto, left: `${c._col * anchoPctDia}%`, width: `${anchoPctDia}%` }}
                        className={`absolute z-[5] hidden cursor-pointer overflow-hidden truncate rounded-md border-l-2 px-1.5 py-0.5 text-[11px] font-medium leading-tight sm:block ${COLOR_ESTADO[c.estado] ?? "border-slate-300 bg-slate-100 text-slate-600"}`}
                        title={`${new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} · ${nombreCliente(c.clienteId)}`}
                        suppressHydrationWarning
                      >
                        {nombreCliente(c.clienteId)}
                      </span>
                    );
                  })}

                  {/* Antes decía solo "+N más" sin ningún nombre — mismo
                      tratamiento que el bloque mobile de arriba: hasta 2
                      nombres y, si sobran, un renglón "+N más". */}
                  {gruposOverflow.map((grupo, gi) => {
                    const inicio = Math.min(...grupo.map((c) => minutosDesdeInicio(new Date(c.fechaHora))));
                    const fin = Math.max(...grupo.map((c) => minutosDesdeInicio(new Date(c.fechaHora)) + (c.duracionMin ?? DURACION_DEFECTO_MIN)));
                    const top = (inicio / 60) * altoHora;
                    const alto = Math.max(((fin - inicio) / 60) * altoHora - 2, 18);

                    return (
                      <span
                        key={`overflow-${clave}-${gi}`}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); abrirSidebarDia(dia); }}
                        style={{ top, height: alto, left: `${MAX_COLS_VISIBLE * anchoPctDia}%`, width: `${anchoPctDia}%` }}
                        className="absolute z-[5] hidden cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-md border-l-2 border-slate-300 bg-slate-100 px-1.5 py-0.5 leading-tight sm:flex dark:border-slate-600 dark:bg-slate-800"
                      >
                        {grupo.slice(0, 2).map((c) => (
                          <span key={c.id} className="flex items-center gap-1 truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT_ESTADO[c.estado] ?? "bg-slate-400"}`} />
                            <span className="truncate">{nombreCliente(c.clienteId)}</span>
                          </span>
                        ))}
                        {grupo.length > 2 && (
                          <span className="text-[9px] font-medium leading-none text-slate-500 dark:text-slate-400">+{grupo.length - 2} más</span>
                        )}
                      </span>
                    );
                  })}

                  {/* Mobile: por franja, o el chip legible (sola) o hasta 2
                      nombres + "N más" (2+, ver gruposDiaMobile arriba) que
                      abre el sidebar con el grupo completo. */}
                  {gruposDiaMobile.map((grupo, gi) => {
                    const inicio = Math.min(...grupo.map((c) => minutosDesdeInicio(new Date(c.fechaHora))));
                    const fin = Math.max(...grupo.map((c) => minutosDesdeInicio(new Date(c.fechaHora)) + (c.duracionMin ?? DURACION_DEFECTO_MIN)));
                    const top = (inicio / 60) * altoHora;
                    const alto = Math.max(((fin - inicio) / 60) * altoHora - 2, 18);

                    if (grupo.length === 1) {
                      const c = grupo[0];
                      return (
                        <span
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); onClickCita(c); }}
                          style={{ top, height: alto, left: 0, width: "100%" }}
                          className={`absolute z-[5] block cursor-pointer overflow-hidden truncate rounded-md border-l-2 px-1.5 py-0.5 text-[11px] font-medium leading-tight sm:hidden ${COLOR_ESTADO[c.estado] ?? "border-slate-300 bg-slate-100 text-slate-600"}`}
                          title={`${new Date(c.fechaHora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} · ${nombreCliente(c.clienteId)}`}
                          suppressHydrationWarning
                        >
                          {nombreCliente(c.clienteId)}
                        </span>
                      );
                    }

                    /* Antes esto era un cúmulo de puntos por estado (no
                       decían nombres) — pedido explícito del usuario: hasta
                       2 nombres reales. Con el `alto` real (según duración)
                       el cúmulo podía quedar de apenas 18px — insuficiente
                       para 2 líneas de texto, así que el contenido se
                       recortaba y solo se alcanzaba a ver el "+N más"
                       (reportado por el usuario, no se podía ni leer ni
                       tocar bien). ALTO_MIN_GRUPO le da piso propio a este
                       cúmulo (no toca `alto` del chip de 1 sola cita, que
                       con 1 línea no lo necesita) y el conteo de sobrantes
                       se suma al segundo nombre en vez de una 3ra línea
                       aparte, para no volver a necesitar más alto del que
                       ya garantiza el piso. Todo el bloque sigue siendo un
                       solo clickeable que abre el sidebar con el grupo
                       completo (alClickOverflow), no hace falta un "ver
                       más" aparte. */
                    const nombresMostrados = grupo.slice(0, 2);
                    const restantes = grupo.length - nombresMostrados.length;
                    return (
                      <span
                        key={`mobile-grupo-${clave}-${gi}`}
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => alClickOverflow(e, dia, grupo)}
                        style={{ top, height: Math.max(alto, ALTO_MIN_GRUPO), left: 0, width: "100%" }}
                        aria-label={`${grupo.length} citas a esta hora`}
                        className="absolute z-[5] flex cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-md border-l-2 border-slate-300 bg-slate-100 px-1.5 py-0.5 leading-tight sm:hidden dark:border-slate-600 dark:bg-slate-800"
                      >
                        {nombresMostrados.map((c, i) => (
                          <span key={c.id} className="flex items-center gap-1 truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COLOR_DOT_ESTADO[c.estado] ?? "bg-slate-400"}`} />
                            <span className="truncate">
                              {nombreCliente(c.clienteId)}
                              {i === nombresMostrados.length - 1 && restantes > 0 ? ` +${restantes}` : ""}
                            </span>
                          </span>
                        ))}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SlideOver
        abierto={!!sidebarAgenda}
        onClose={() => setSidebarAgenda(null)}
        titulo={sidebarAgenda ? `Citas del ${sidebarAgenda.dia.getDate()} de ${MESES_CORTO[sidebarAgenda.dia.getMonth()]}` : "Citas"}
      >
        {sidebarAgenda && (
          <div className="space-y-1 pb-4">
            {sidebarAgenda.citas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onClickCita(c); setSidebarAgenda(null); }}
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
          </div>
        )}
      </SlideOver>
    </div>
  );
}
