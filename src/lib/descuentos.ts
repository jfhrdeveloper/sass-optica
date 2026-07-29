import type { Descuento } from "@/components/providers/DataProvider";

/* Validación de un código de cupón — compartida entre cotizaciones/page.tsx
   y ventas/page.tsx (antes cada uno hubiera reimplementado su propia
   variante de "¿este código vale acá?"). Un cupón es válido si: existe,
   está activo, su ámbito (`aplicaA`) incluye el documento donde se está
   usando, la fecha de hoy cae dentro de su vigencia (si tiene) y todavía no
   llegó a su límite de usos (si tiene). */
export function buscarDescuentoValido(
  descuentos: Descuento[],
  codigo: string,
  contexto: "cotizaciones" | "ventas",
): Descuento | null {
  const buscado = codigo.trim().toUpperCase();
  if (!buscado) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const d = descuentos.find((d) => d.codigo.toUpperCase() === buscado);
  if (!d || !d.activo) return null;
  if (d.aplicaA !== "ambos" && d.aplicaA !== contexto) return null;
  if (d.vigenciaDesde && hoy < d.vigenciaDesde) return null;
  if (d.vigenciaHasta && hoy > d.vigenciaHasta) return null;
  if (d.limiteUsos != null && d.usos >= d.limiteUsos) return null;
  return d;
}

/** Monto a descontar dado un cupón ya validado — nunca más que la base. */
export function montoDescuento(d: Descuento, base: number): number {
  const monto = d.tipo === "porcentaje" ? base * (d.valor / 100) : d.valor;
  return Math.min(Math.max(monto, 0), base);
}
