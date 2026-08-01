/* ================= SEGUIMIENTO DE CLIENTES =================
   Dos avisos que hoy nadie recuerda a mano: cuándo a un cliente le toca
   reponer sus lentes de contacto, y cuándo vence la garantía de algo que
   compró. Se calculan 100% a partir de datos que ya existen (ventas +
   venta_items + productos.duracionReposicionDias/garantiaMeses) — no hace
   falta que el cliente "avise" ni una tabla nueva de seguimiento. */

export interface Seguimiento {
  clienteId: string;
  ventaId: string;
  productoNombre: string;
  tipo: "reposicion" | "garantia";
  /** ISO yyyy-mm-dd. */
  fecha: string;
}

interface VentaMin { id: string; clienteId?: string; fecha: string }
interface VentaItemMin { ventaId: string; productoId?: string; descripcion: string }
interface ProductoMin { id: string; nombre: string; duracionReposicionDias?: number; garantiaMeses?: number }

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function sumarMeses(iso: string, meses: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/* Reposición: solo la compra MÁS RECIENTE de cada (cliente, producto)
   importa — una compra nueva reinicia el conteo, las anteriores dejan de
   ser relevantes. Garantía: cada compra tiene su propia garantía
   independiente (un cliente puede tener 2 monturas con vencimientos
   distintos), así que se listan todas. */
export function calcularSeguimientos(
  ventas: VentaMin[],
  ventaItems: VentaItemMin[],
  productos: ProductoMin[],
): Seguimiento[] {
  const ventaPorId = new Map(ventas.map((v) => [v.id, v]));
  const productoPorId = new Map(productos.map((p) => [p.id, p]));

  const reposicionesPorClienteProducto = new Map<string, Seguimiento>();
  const garantias: Seguimiento[] = [];

  for (const item of ventaItems) {
    const venta = ventaPorId.get(item.ventaId);
    const producto = item.productoId ? productoPorId.get(item.productoId) : undefined;
    if (!venta || !venta.clienteId || !producto) continue;

    if (producto.duracionReposicionDias) {
      const clave = `${venta.clienteId}:${producto.id}`;
      const previo = reposicionesPorClienteProducto.get(clave);
      const fechaVentaPrevia = previo ? ventaPorId.get(previo.ventaId)?.fecha : undefined;
      if (!previo || venta.fecha > (fechaVentaPrevia ?? "")) {
        reposicionesPorClienteProducto.set(clave, {
          clienteId: venta.clienteId, ventaId: venta.id, productoNombre: producto.nombre,
          tipo: "reposicion", fecha: sumarDias(venta.fecha.slice(0, 10), producto.duracionReposicionDias),
        });
      }
    }

    if (producto.garantiaMeses) {
      garantias.push({
        clienteId: venta.clienteId, ventaId: venta.id, productoNombre: producto.nombre,
        tipo: "garantia", fecha: sumarMeses(venta.fecha.slice(0, 10), producto.garantiaMeses),
      });
    }
  }

  return [...reposicionesPorClienteProducto.values(), ...garantias].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Filtra a "vencido o próximo dentro de N días" — mismo criterio que el
 *  badge "En riesgo" de clientes: no hace falta mostrar TODO, solo lo
 *  accionable. */
export function seguimientosProximos(seguimientos: Seguimiento[], diasVentana = 30, hoy = new Date()): Seguimiento[] {
  const limite = sumarDias(hoy.toISOString().slice(0, 10), diasVentana);
  return seguimientos.filter((s) => s.fecha <= limite);
}

export function estaVencido(fecha: string, hoy = new Date()): boolean {
  return fecha < hoy.toISOString().slice(0, 10);
}
