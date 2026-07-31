import type { ItemAperturaCaja, Venta } from "@/components/providers/DataProvider";
import { puedeVerSucursal } from "@/lib/sucursales";

/** Suma automática del desglose de apertura — el total que se guarda en
 *  `cajas.monto_inicial`. */
export function sumaDesglose(desglose: ItemAperturaCaja[]): number {
  return Math.round(desglose.reduce((acc, it) => acc + it.monto, 0) * 100) / 100;
}

/** Cuánto del desglose de apertura es efectivo físico (lo único que
 *  participa del cuadre de caja) — el resto del desglose es informativo.
 *  Con `desglose` vacío (cajas de antes de este campo) se asume que TODO
 *  `montoInicialFallback` era efectivo, igual que el comportamiento anterior. */
export function efectivoDeDesglose(desglose: ItemAperturaCaja[], montoInicialFallback: number): number {
  if (desglose.length === 0) return montoInicialFallback;
  return Math.round(
    desglose.filter((it) => it.metodo.trim().toLowerCase() === "efectivo").reduce((acc, it) => acc + it.monto, 0) * 100,
  ) / 100;
}

/* ================= CAJA =================
   Cálculo puro del cuadre al cerrar: totales por método de pago + monto de
   efectivo esperado (inicial + ventas en efectivo), sobre ventas ya
   cargadas en DataProvider en el rango [desde, hasta]. Se excluyen ventas
   anuladas (no son ingreso real, mismo criterio que lib/informes.ts). El
   resultado se guarda congelado en `cajas` al cerrar — si una venta de ese
   rango se anula después, el historial de caja ya cerrado no cambia. */

export interface CuadreCaja {
  totalEfectivo: number;
  totalTarjeta: number;
  totalYape: number;
  totalPlin: number;
  totalTransferencia: number;
  montoEfectivoEsperado: number;
}

export function calcularCuadreCaja(
  ventas: Venta[],
  montoInicial: number,
  desde: string,
  hasta: string,
  sucursalId?: string,
): CuadreCaja {
  let totalEfectivo = 0, totalTarjeta = 0, totalYape = 0, totalPlin = 0, totalTransferencia = 0;

  for (const v of ventas) {
    if (v.estado === "anulada") continue;
    const fecha = v.fecha.slice(0, 10);
    if (fecha < desde || fecha > hasta) continue;
    if (!puedeVerSucursal(sucursalId, v.sucursalId)) continue;

    switch (v.metodoPago) {
      case "efectivo": totalEfectivo += v.total; break;
      case "tarjeta": totalTarjeta += v.total; break;
      case "yape": totalYape += v.total; break;
      case "plin": totalPlin += v.total; break;
      case "transferencia": totalTransferencia += v.total; break;
    }
  }

  return {
    totalEfectivo: Math.round(totalEfectivo * 100) / 100,
    totalTarjeta: Math.round(totalTarjeta * 100) / 100,
    totalYape: Math.round(totalYape * 100) / 100,
    totalPlin: Math.round(totalPlin * 100) / 100,
    totalTransferencia: Math.round(totalTransferencia * 100) / 100,
    montoEfectivoEsperado: Math.round((montoInicial + totalEfectivo) * 100) / 100,
  };
}
