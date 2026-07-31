import type { EstadoOrdenLaboratorio } from "@/components/providers/DataProvider";

/* ================= ÓRDENES DE LABORATORIO =================
   Transiciones válidas entre estados — sin esto, el <select> del estado
   dejaría "saltar" de "generado" directo a "entregado", perdiendo el
   sentido del seguimiento. `entregado` y `cancelado` son terminales (no
   transicionan a nada más); `cancelado` es alcanzable desde cualquier
   estado no terminal, mismo criterio que `estado_venta.anulada`. */

export const TRANSICIONES_VALIDAS: Record<EstadoOrdenLaboratorio, EstadoOrdenLaboratorio[]> = {
  generado:     ["enviado", "cancelado"],
  enviado:      ["en_proceso", "cancelado"],
  en_proceso:   ["terminado", "cancelado"],
  terminado:    ["en_transito", "cancelado"],
  en_transito:  ["recibido", "cancelado"],
  recibido:     ["entregado", "cancelado"],
  entregado:    [],
  cancelado:    [],
};

export function puedeTransicionar(actual: EstadoOrdenLaboratorio, siguiente: EstadoOrdenLaboratorio): boolean {
  if (actual === siguiente) return true;
  return TRANSICIONES_VALIDAS[actual].includes(siguiente);
}

export const ESTADOS_ORDEN_LABORATORIO: EstadoOrdenLaboratorio[] = [
  "generado", "enviado", "en_proceso", "terminado", "en_transito", "recibido", "entregado", "cancelado",
];

export const ESTADO_ORDEN_LABORATORIO_LABEL: Record<EstadoOrdenLaboratorio, string> = {
  generado: "Generado",
  enviado: "Enviado al laboratorio",
  en_proceso: "En proceso",
  terminado: "Terminado en lab",
  en_transito: "En tránsito",
  recibido: "Recibido en sede",
  entregado: "Entregado al paciente",
  cancelado: "Cancelado",
};

export const ESTADO_ORDEN_LABORATORIO_BADGE: Record<EstadoOrdenLaboratorio, string> = {
  generado: "badge-neutral",
  enviado: "badge-warning",
  en_proceso: "badge-warning",
  terminado: "badge-success",
  en_transito: "badge-warning",
  recibido: "badge-success",
  entregado: "badge-success",
  cancelado: "badge-danger",
};
