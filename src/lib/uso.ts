import { NAV } from "@/lib/dashboard-nav";

/* ================= ANALÍTICA DE USO (panel admin) =================
   Aritmética pura sobre `eventos_uso` (un evento por cada módulo del
   dashboard que un negocio visita, ver DataProvider.tsx) — separada de la
   UI para poder testearla sin renderizar, mismo criterio que lib/precios.ts.
   Todo lo que agrupa por día/hora usa America/Lima explícitamente: el
   servidor (Vercel) corre en UTC, y "qué día y qué hora usa el sistema una
   óptica peruana" solo tiene sentido en SU huso horario, no en el del
   servidor. */

const ZONA = "America/Lima";

export interface EventoUso {
  ruta: string;
  createdAt: string;
}

const MAPA_DIA_SEMANA: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const DIAS_SEMANA_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** Día de semana (0=lunes..6=domingo) y hora (0-23) de un timestamp, en
 *  America/Lima. `% 24` cubre el caso borde de motores que devuelven "24"
 *  para medianoche con hourCycle "h23" en vez de "00". */
function diaHoraLima(iso: string): { dia: number; hora: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA, weekday: "short", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const dia = MAPA_DIA_SEMANA[partes.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 0;
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return { dia, hora };
}

/** "YYYY-MM-DD" del timestamp en America/Lima (no en UTC ni en el huso del
 *  servidor) — "en-CA" es el truco: es el único locale común cuyo formato
 *  corto de fecha ya sale en orden AAAA-MM-DD. */
function fechaLima(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
}

/** Más reciente `createdAt`, o `null` si no hay eventos. */
export function ultimaActividad(eventos: EventoUso[]): string | null {
  if (eventos.length === 0) return null;
  return eventos.reduce((max, e) => (e.createdAt > max ? e.createdAt : max), eventos[0].createdAt);
}

/** Texto relativo corto para la última actividad — "Hace 3 min" / "Hace 5 h"
 *  / "Hace 2 d" / "Sin actividad registrada". */
export function etiquetaUltimaActividad(fechaIso: string | null, ahora: Date = new Date()): string {
  if (!fechaIso) return "Sin actividad registrada";
  const minutos = Math.max(0, Math.round((ahora.getTime() - new Date(fechaIso).getTime()) / 60000));
  if (minutos < 1) return "Hace instantes";
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `Hace ${dias} d`;
}

/** Días transcurridos desde la última actividad (para marcar negocios
 *  inactivos en el listado admin) — `null` si nunca hubo actividad. */
export function diasInactivo(fechaIso: string | null, ahora: Date = new Date()): number | null {
  if (!fechaIso) return null;
  return Math.floor((ahora.getTime() - new Date(fechaIso).getTime()) / 86_400_000);
}

/** Serie diaria de conteo de eventos para los últimos `dias` días
 *  (incluyendo hoy), en orden cronológico, con ceros para días sin uso —
 *  igual criterio que el MRR del admin: un día sin actividad debe "caer" en
 *  el gráfico, no desaparecer y dar una falsa sensación de continuidad. */
export function eventosPorDia(eventos: EventoUso[], dias: number, ahora: Date = new Date()): { fecha: string; label: string; total: number }[] {
  const conteo = new Map<string, number>();
  for (const e of eventos) conteo.set(fechaLima(e.createdAt), (conteo.get(fechaLima(e.createdAt)) ?? 0) + 1);

  const out: { fecha: string; label: string; total: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);
    const fecha = fechaLima(d.toISOString());
    out.push({
      fecha,
      label: new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, day: "2-digit", month: "2-digit" }).format(d),
      total: conteo.get(fecha) ?? 0,
    });
  }
  return out;
}

/** Matriz 7×24 (día de semana × hora, ambos en America/Lima) con el conteo
 *  de eventos en cada casilla — la entrada del heatmap de "qué día/hora se
 *  usa más". Índice de día: 0=lunes .. 6=domingo (DIAS_SEMANA). */
export function heatmapDiaHora(eventos: EventoUso[]): number[][] {
  const matriz: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of eventos) {
    const { dia, hora } = diaHoraLima(e.createdAt);
    matriz[dia][hora] += 1;
  }
  return matriz;
}

/** La casilla día/hora con más eventos — para un titular tipo "más activo:
 *  Miércoles, 15:00–16:00". `null` si no hay ningún evento. */
export function picoDeUso(eventos: EventoUso[]): { dia: number; hora: number; total: number } | null {
  const matriz = heatmapDiaHora(eventos);
  let mejor: { dia: number; hora: number; total: number } | null = null;
  for (let dia = 0; dia < 7; dia++) {
    for (let hora = 0; hora < 24; hora++) {
      const total = matriz[dia][hora];
      if (total > 0 && (!mejor || total > mejor.total)) mejor = { dia, hora, total };
    }
  }
  return mejor;
}

/** Frase legible del pico de uso — "Miércoles, 15:00–16:00". `null` si no
 *  hay ningún pico (sin eventos). */
export function etiquetaPico(pico: { dia: number; hora: number } | null): string | null {
  if (!pico) return null;
  const horaFin = (pico.hora + 1) % 24;
  return `${DIAS_SEMANA_LARGO[pico.dia]}, ${String(pico.hora).padStart(2, "0")}:00–${String(horaFin).padStart(2, "0")}:00`;
}

/** Última actividad por negocio, a partir de una lista cruzada de varios
 *  negocios a la vez — la vista que necesita el listado cross-tenant de
 *  admin.dominio (a diferencia de `ultimaActividad`, que asume un solo
 *  negocio ya filtrado). */
export function ultimaActividadPorNegocio(eventos: { negocioId: string; createdAt: string }[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const e of eventos) {
    const actual = mapa.get(e.negocioId);
    if (!actual || e.createdAt > actual) mapa.set(e.negocioId, e.createdAt);
  }
  return mapa;
}

/** Nombre legible de una ruta del dashboard (ej. "/dashboard/ventas" →
 *  "Ventas"), leyendo el mismo árbol de navegación que ya usan el sidebar y
 *  el tab bar mobile (lib/dashboard-nav.ts) — una sola fuente, ni un mapa
 *  duplicado acá ni uno desincronizado si se agrega una sección nueva. Cae
 *  a la propia ruta si no la encuentra (mejor mostrar el path crudo que
 *  ocultar el dato). */
export function etiquetaRuta(ruta: string): string {
  for (const item of NAV) {
    if (item.kind === "link" && item.href === ruta) return item.label;
    if (item.kind === "group") {
      const hijo = item.children.find((h) => h.href === ruta);
      if (hijo) return hijo.label;
    }
  }
  return ruta.replace(/^\/dashboard\/?/, "") || "Inicio";
}

/** Los `top` módulos más visitados, ya con label legible y ordenados de
 *  mayor a menor uso. */
export function modulosMasUsados(eventos: EventoUso[], top = 5): { ruta: string; label: string; total: number }[] {
  const conteo = new Map<string, number>();
  for (const e of eventos) conteo.set(e.ruta, (conteo.get(e.ruta) ?? 0) + 1);
  return [...conteo.entries()]
    .map(([ruta, total]) => ({ ruta, label: etiquetaRuta(ruta), total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}
