/* ================= SEGUIMIENTO DE CLIENTES =================
   Tres avisos que hoy nadie recuerda a mano: cuándo a un cliente le toca
   reponer sus lentes de contacto, cuándo vence la garantía de algo que
   compró, y cuándo le toca su control anual. Se calculan 100% a partir de
   datos que ya existen (ventas + venta_items + productos.duracionReposicionDias/
   garantiaMeses, o recetas/exámenes optométricos) — no hace falta que el
   cliente "avise" ni una tabla nueva de seguimiento. */

export interface Seguimiento {
  clienteId: string;
  tipo: "reposicion" | "garantia" | "control_anual";
  /** ISO yyyy-mm-dd. */
  fecha: string;
  /** Ausente en "control_anual" — no está ligado a una compra puntual. */
  ventaId?: string;
  /** Ausente en "control_anual". */
  productoNombre?: string;
}

interface VentaMin { id: string; clienteId?: string; fecha: string }
interface VentaItemMin { ventaId: string; productoId?: string; descripcion: string }
interface ProductoMin { id: string; nombre: string; duracionReposicionDias?: number; garantiaMeses?: number }
interface VisitaMin { clienteId: string; fecha: string }

/* Aritmética 100% en UTC (Date.UTC + componentes parseados a mano, nunca
   `new Date(iso)` + getters/setters locales): con un huso horario negativo
   como el de Perú (UTC-5), `new Date("2026-01-01")` cae en medianoche UTC =
   31 de diciembre 19:00 hora local — un mes/día atrás. `setMonth()`/
   `setDate()` operan en hora LOCAL, así que heredan ese desfase y a veces
   devuelven un día equivocado (sumarDias "acertaba" antes por casualidad;
   sumarMeses no, cada vez que el mes de destino tiene distinta cantidad de
   días que el de origen). */
function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10);
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
      const fechaVentaPrevia = previo?.ventaId ? ventaPorId.get(previo.ventaId)?.fecha : undefined;
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

/* Recall de control anual: `mesesControl` después de la ÚLTIMA receta o
   examen optométrico del cliente (lo que sea más reciente) — el control
   anual es el motivo más común de que un paciente vuelva a la óptica sin
   haber comprado nada nuevo, y es lo primero que ninguna óptica pyme tiene
   tiempo de rastrear a mano. Un cliente sin ninguna receta/examen todavía
   no genera recall: no hay "primer control" del que contar 12 meses. */
export function calcularRecallControlAnual(
  recetas: VisitaMin[],
  examenes: VisitaMin[],
  mesesControl = 12,
): Seguimiento[] {
  const ultimaVisitaPorCliente = new Map<string, string>();
  for (const v of [...recetas, ...examenes]) {
    const previa = ultimaVisitaPorCliente.get(v.clienteId);
    if (!previa || v.fecha > previa) ultimaVisitaPorCliente.set(v.clienteId, v.fecha);
  }
  return [...ultimaVisitaPorCliente.entries()]
    .map(([clienteId, fecha]) => ({ clienteId, tipo: "control_anual" as const, fecha: sumarMeses(fecha.slice(0, 10), mesesControl) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
