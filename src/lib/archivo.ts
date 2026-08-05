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

/** Convierte un File (foto elegida o tomada con la cámara) a un data URI
 *  base64 — el formato en que se guarda la evidencia de asistencia
 *  (`AsistenciaFoto.fotoBase64`, ver DataProvider.tsx). */
export function archivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
