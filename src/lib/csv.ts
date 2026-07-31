/* Exportación CSV genérica — separa el armado del string (puro, testable)
   de la descarga en el navegador (Blob + link temporal, no testable sin
   jsdom). Reutilizable por cualquier tabla del dashboard, no solo informes. */

/** Escapa una celda según RFC 4180: solo envuelve en comillas si hace falta
 *  (contiene coma, comilla o salto de línea), y duplica comillas internas. */
function escaparCelda(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

/** Arma el contenido CSV completo (con cabecera) a partir de filas de
 *  celdas ya convertidas a string. `﻿` (BOM) al inicio es necesario
 *  para que Excel en Windows reconozca UTF-8 y no rompa las tildes. */
export function aCSV(filas: string[][]): string {
  return "﻿" + filas.map((fila) => fila.map(escaparCelda).join(",")).join("\r\n");
}

/** Dispara la descarga del CSV en el navegador — efecto de lado, sin
 *  cobertura de test (depende de `document`/`URL.createObjectURL`). */
export function descargarCSV(nombreArchivo: string, filas: string[][]): void {
  const blob = new Blob([aCSV(filas)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
