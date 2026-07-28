/* Etiquetas legibles del estado de una cita — fuente única para no mostrar
   el valor crudo de la DB ("no_asistio", con guion bajo y minúsculas) en
   ningún <select> ni listado. El color SÍ se queda repetido por archivo
   (badge en tablas, chip en CalendarioMes, borde en CalendarioAgenda: son
   tratamientos visuales distintos, no vale la pena forzarlos a compartir
   clases), pero el texto es uno solo. */
export const ESTADOS_CITA = ["programada", "atendida", "cancelada", "no_asistio"] as const;

export const ESTADO_CITA_LABEL: Record<string, string> = {
  programada: "Programada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export const ESTADO_CITA_BADGE: Record<string, string> = {
  programada: "badge-warning",
  atendida: "badge-success",
  cancelada: "badge-neutral",
  no_asistio: "badge-danger",
};

/* Ventana horaria de la agenda — compartida entre CalendarioAgenda.tsx (la
   grilla Día/3 días/5 días/Semana) y TimePicker.tsx (el selector de hora del
   formulario "Agendar cita"), para que ambos ofrezcan exactamente el mismo
   rango y granularidad. */
export const HORA_INICIO_AGENDA = 7; // 07:00
export const HORA_FIN_AGENDA = 21; // 21:00
export const PASO_MINUTOS_AGENDA = 15;

/** Duración por defecto de una cita cuando no se especifica (citas antiguas,
 *  o agendadas con un clic simple sin arrastrar). */
export const DURACION_CITA_DEFECTO_MIN = 30;

/* ================= ARITMÉTICA DE "HH:mm" =================
   El formulario de cita habla en hora de INICIO + hora de FIN (no en
   minutos de duración: eso es justo lo que el arrastre en la agenda ya
   representa visualmente, de una hora a otra) — estas dos funciones son el
   único lugar que convierte entre esa pareja y los minutos que sí guarda
   `Cita.duracionMin`. */

/** "HH:mm" → minutos desde medianoche. */
function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** Minutos desde medianoche → "HH:mm". */
function aHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Hora de fin = hora de inicio + duración, acotada a HORA_FIN_AGENDA. */
export function sumarMinutosHora(hora: string, minutos: number): string {
  const tope = HORA_FIN_AGENDA * 60;
  return aHora(Math.min(tope, aMinutos(hora) + minutos));
}

/** Minutos entre hora de inicio y hora de fin — negativo o 0 si el fin no
 *  es posterior al inicio (el formulario lo trata como inválido). */
export function diferenciaMinutos(horaInicio: string, horaFin: string): number {
  return aMinutos(horaFin) - aMinutos(horaInicio);
}
