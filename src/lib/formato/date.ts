/* Formatea una fecha civil (string "YYYY-MM-DD", como vienen los <input
   type="date"> y las columnas `date` de Postgres) al formato peruano
   DD-MM-AAAA. A propósito NO pasa por `new Date(iso)`: ese constructor
   interpreta un string "solo fecha" como medianoche UTC, y en un huso
   negativo como America/Lima (UTC-5) eso corre la fecha un día para atrás
   al formatear en local — se manipula el string directamente, sin
   conversión de zona horaria de por medio. */
export function formatearFechaPE(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}-${mes}-${anio}`;
}

/* ================= FORMATO DE TIMESTAMPTZ =================
   A diferencia de `formatearFechaPE` (fecha civil, sin hora ni huso), estas
   dos sí reciben un instante real (timestamptz: citas, papelera, audit_log)
   y por eso SÍ pasan por `new Date(iso)` — acá es correcto, porque el string
   ya trae huso y el navegador lo convierte a la hora local del usuario. */
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ================= PUENTE FECHA CIVIL <-> Date =================
   El resto del sistema guarda fechas como strings "YYYY-MM-DD" (fechas
   civiles: un día del calendario, sin hora ni huso). react-day-picker en
   cambio trabaja con objetos `Date`, que SÍ tienen instante y huso. Estas
   dos funciones son el único puente permitido entre ambos mundos.

   Las dos formas ingenuas de cruzarlo están mal y dan el mismo error de un
   día en America/Lima (UTC-5):
     new Date("2026-07-24")   → medianoche UTC → 23-07 a las 19:00 local
     fecha.toISOString()      → pasa a UTC     → puede caer al día anterior
   Por eso acá se arma y se lee la fecha por componentes locales. */

/** "YYYY-MM-DD" → Date a medianoche LOCAL (nunca UTC). */
export function aFechaLocal(iso: string): Date | undefined {
  const partes = iso?.slice(0, 10).split("-");
  if (!partes || partes.length !== 3) return undefined;
  const [anio, mes, dia] = partes.map(Number);
  if (!anio || !mes || !dia) return undefined;
  /* `mes - 1` porque los meses de Date son 0-based: enero es 0, no 1.
     Olvidarlo es el clásico "me muestra el mes equivocado". */
  const d = new Date(anio, mes - 1, dia);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Date → "YYYY-MM-DD" leyendo los componentes LOCALES (nunca toISOString). */
export function aCadenaISO(fecha: Date | undefined): string {
  if (!fecha || Number.isNaN(fecha.getTime())) return "";
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Devuelve el rango con los extremos en orden. Si alguien deja el fin antes
 *  del inicio (posible al editar a mano o al re-elegir sobre un rango ya
 *  hecho), se intercambian en vez de dejar pasar un rango imposible que
 *  luego filtra 0 resultados sin explicación. */
export function ordenarRango(desde: string, hasta: string): [string, string] {
  if (desde && hasta && desde > hasta) return [hasta, desde];
  return [desde, hasta];
}

/** Días de calendario entre dos fechas civiles "YYYY-MM-DD" (puede dar
 *  negativo si `hasta` es anterior a `desde`). Aritmética 100% en UTC
 *  (`Date.UTC` a partir de los componentes, nunca `new Date(iso)` +
 *  getters/setters locales) — mismo motivo que `sumarMeses` en
 *  `lib/seguimiento-clientes.ts`: con un huso horario negativo como el de
 *  Perú, mezclar un parseo UTC con aritmética local desfasa el resultado. */
export function diasEntre(desde: string, hasta: string): number {
  const [ay, am, ad] = desde.slice(0, 10).split("-").map(Number);
  const [by, bm, bd] = hasta.slice(0, 10).split("-").map(Number);
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / msPorDia);
}
