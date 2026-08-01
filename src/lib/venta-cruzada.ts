/* Venta cruzada SIN IA — reglas por co-ocurrencia sobre el historial real
   de venta_items: "¿qué otros productos aparecieron en las mismas ventas
   donde apareció este?". Cuanto más se repite un par, más arriba sale.
   100% derivado de datos que ya existen, no hace falta guardar nada nuevo
   ni llamar a ningún servicio externo. */

interface VentaItemMin { ventaId: string; productoId?: string }

/** Devuelve los ids de producto que más veces acompañaron a `productoId` en
 *  ventas pasadas, de mayor a menor frecuencia — nunca incluye al propio
 *  `productoId` ni ítems sin producto ligado (ventas personalizadas). */
export function productosRelacionados(
  productoId: string,
  ventaItems: VentaItemMin[],
  maxResultados = 3,
): string[] {
  const ventasConProducto = new Set(
    ventaItems.filter((i) => i.productoId === productoId).map((i) => i.ventaId),
  );
  if (ventasConProducto.size === 0) return [];

  const conteo = new Map<string, number>();
  for (const item of ventaItems) {
    if (!item.productoId || item.productoId === productoId) continue;
    if (!ventasConProducto.has(item.ventaId)) continue;
    conteo.set(item.productoId, (conteo.get(item.productoId) ?? 0) + 1);
  }

  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResultados)
    .map(([id]) => id);
}
