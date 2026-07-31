/** Dispara la descarga de un Blob ya armado (Excel, CSV binario, etc.) —
 *  compartido entre lib/caja-excel.ts y lib/informes-reporte.ts. */
export function descargarBlob(nombreArchivo: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
