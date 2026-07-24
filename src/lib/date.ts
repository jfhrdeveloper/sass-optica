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
