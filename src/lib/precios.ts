/* ================= CONFIGURACIÓN COMERCIAL =================
   Fuente única de los planes y de la oferta anual. Vive en `lib/` (no dentro
   del componente de la landing) por dos razones: se consume desde más de un
   lugar — la landing hoy, el checkout de Culqi cuando se conecte — y así la
   aritmética queda testeable sin renderizar React (ver precios.test.ts).

   Para cambiar la oferta se toca SOLO la constante OFERTA_ANUAL de abajo:
   el precio anual, el badge del toggle, el texto explicativo y el ahorro en
   soles se derivan todos de ella. */

/** La oferta del plan anual es UNA de dos, nunca las dos a la vez: o se
 *  descuenta un porcentaje, o se regalan meses. Es una unión discriminada a
 *  propósito — TypeScript hace imposible configurar ambas y terminar
 *  comunicando el mismo beneficio dos veces (que además se contradice:
 *  un 30% equivale a ~3.6 meses, no a 2). */
export type OfertaAnual =
  | { tipo: "descuento"; porcentaje: number }
  | { tipo: "meses_gratis"; meses: number };

/** ⬅️ ÚNICA LÍNEA A TOCAR PARA CAMBIAR LA OFERTA.
 *  Ejemplos válidos:
 *    { tipo: "meses_gratis", meses: 2 }    → paga 10 meses, lleva 12
 *    { tipo: "descuento", porcentaje: 30 } → 30% menos sobre los 12 meses
 */
export const OFERTA_ANUAL: OfertaAnual = { tipo: "meses_gratis", meses: 2 };

export type CicloFacturacion = "mensual" | "anual";

export interface Plan {
  id: string;
  nombre: string;
  /** Precio de lista por mes, en soles. El anual se deriva de este. */
  mensual: number;
  destacado?: boolean;
  bullets: string[];
}

export const PLANES: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    mensual: 89.9,
    bullets: [
      "Clientes, citas y recetas",
      "Ventas, inventario y gastos",
      "Proveedores, cotizaciones e informes",
      "Empleados ilimitados",
    ],
  },
  {
    id: "premium",
    nombre: "Premium",
    mensual: 149.9,
    destacado: true,
    bullets: [
      "Todo lo de Básico, además de:",
      "Facturación electrónica SUNAT",
      "Soporte prioritario",
    ],
  },
];

/** Redondeo a 2 decimales sin arrastrar el error binario de coma flotante
 *  (89.9 * 12 * 0.7 da 755.1600000000001 en JS si no se redondea). */
function aDosDecimales(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Precio total del año, ya con la oferta anual aplicada. */
export function precioAnual(mensual: number): number {
  if (OFERTA_ANUAL.tipo === "descuento") {
    return aDosDecimales(mensual * 12 * (1 - OFERTA_ANUAL.porcentaje / 100));
  }
  /* meses_gratis: se pagan (12 - meses) y se usan los 12. */
  return aDosDecimales(mensual * (12 - OFERTA_ANUAL.meses));
}

/** Cuánto se ahorra en el año contra pagar mes a mes. */
export function ahorroAnual(mensual: number): number {
  return aDosDecimales(mensual * 12 - precioAnual(mensual));
}

/** Precio a mostrar según el ciclo elegido. */
export function precioSegunCiclo(mensual: number, ciclo: CicloFacturacion): number {
  return ciclo === "anual" ? precioAnual(mensual) : mensual;
}

/** Monto a cobrar en céntimos (lo que exige la API de Culqi) para un plan y
 *  ciclo dados. Única fuente del monto real de un cargo — nunca se recibe
 *  el monto desde el cliente al crear el cargo, se recalcula acá con el
 *  `planId` que el cliente sí puede elegir. */
export function montoCentimosSegunCiclo(planId: string, ciclo: CicloFacturacion): number | null {
  const plan = PLANES.find((p) => p.id === planId);
  if (!plan) return null;
  return Math.round(precioSegunCiclo(plan.mensual, ciclo) * 100);
}

/** Texto corto para el badge del toggle Anual. */
export function etiquetaOferta(): string {
  return OFERTA_ANUAL.tipo === "descuento"
    ? `-${OFERTA_ANUAL.porcentaje}%`
    : `${OFERTA_ANUAL.meses} ${OFERTA_ANUAL.meses === 1 ? "mes" : "meses"} gratis`;
}

/** Frase explicativa que acompaña al plan anual. Usa la MISMA unidad que el
 *  badge — nunca las dos formas de expresar la oferta a la vez. */
export function descripcionOferta(): string {
  if (OFERTA_ANUAL.tipo === "descuento") {
    return `Pagando el año por adelantado ahorras ${OFERTA_ANUAL.porcentaje}%`;
  }
  const { meses } = OFERTA_ANUAL;
  return `Pagando el año por adelantado te llevas ${meses} ${meses === 1 ? "mes" : "meses"} gratis`;
}
