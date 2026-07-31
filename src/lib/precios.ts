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

/** Plan Gratis permanente (freemium) — a diferencia de Básico/Premium, NO es
 *  un plan pago y por eso no vive en `PLANES` (ese array alimenta el
 *  checkout de Culqi; "gratis" nunca se cobra ni pasa por ahí). Límites
 *  confirmados con el usuario, no ajustar sin que lo pida: el resto del
 *  sistema (clientes/citas/recetas/productos/inventario) queda sin límite. */
export const LIMITE_EMPLEADOS_GRATIS = 2;
export const LIMITE_VENTAS_MES_GRATIS = 30;

export const PLAN_IDS = ["gratis", "basico", "premium"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function esPlanIdValido(id: string): id is PlanId {
  return (PLAN_IDS as readonly string[]).includes(id);
}

/** Fila a insertar/actualizar en `suscripciones` (snake_case, tal cual la
 *  espera Supabase) para arrancar un plan elegido — usado por /api/registro,
 *  /api/registro/completar y /api/suscripcion/probar-plan, para que las 3
 *  ramifiquen exactamente igual entre "gratis" (permanente, sin trial) y
 *  "básico/premium" (30 días de prueba sin pagar). No incluye `negocio_id`:
 *  cada caller lo agrega según si es un insert o un update. */
export function datosSuscripcionParaPlan(plan: PlanId): Record<string, unknown> {
  if (plan === "gratis") return { plan: "gratis", estado: "activa", trial_inicio: null, trial_fin: null };
  const hoy = new Date();
  const trialFin = new Date(hoy);
  trialFin.setDate(trialFin.getDate() + 30);
  return {
    plan,
    estado: "trial",
    trial_inicio: hoy.toISOString().slice(0, 10),
    trial_fin: trialFin.toISOString().slice(0, 10),
  };
}

/** Nombre de plan para mostrar al dueño del negocio. `gratis` no está en
 *  `PLANES` (no es un plan pago), así que se etiqueta aparte en vez de
 *  mostrar el valor crudo del enum de la base de datos. */
export function nombrePlanSuscripcion(plan: string): string {
  if (plan === "gratis") return "Gratis";
  return PLANES.find((p) => p.id === plan)?.nombre ?? plan;
}

/** Estado de la suscripción para mostrar al dueño del negocio — mismo
 *  criterio que `nombrePlanSuscripcion`: no mostrar el valor crudo del enum
 *  (`estado_suscripcion` en `supabase-schema.sql`). `trial` ahora SIEMPRE
 *  significa "probando un plan pago sin haber pagado todavía" (nunca el
 *  plan Gratis, que es permanente) — "En prueba" en vez de "Prueba
 *  gratuita" para no confundirlo con el plan Gratis. */
const ESTADO_SUSCRIPCION_LABEL: Record<string, string> = {
  trial: "En prueba",
  activa: "Activa",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export function nombreEstadoSuscripcion(estado: string): string {
  return ESTADO_SUSCRIPCION_LABEL[estado] ?? estado;
}

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
