/* ================= PROCESAMIENTO DE IMÁGENES SUBIDAS =================
   El logo del negocio se guarda como data URL directo en `negocios.logo_url`
   (columna `text`, sin Supabase Storage de por medio) y `DataProvider` lee
   esa fila completa al iniciar sesión — en cada carga del dashboard, no solo
   en Ajustes. Sin límite ni redimensionado, una foto de celular sin
   comprimir (10-20MB) se convertía en ~30MB de texto viajando en cada
   request. Este helper cap ea las dimensiones ANTES de codificar, así el
   tamaño final no depende de lo que suba el usuario. */

const DIMENSION_MAXIMA = 512; // px — de sobra para un avatar de 56px a resolución retina
const CALIDAD_JPEG = 0.85;
const TAMANO_MAXIMO_ORIGINAL_MB = 8; // rechazo temprano: no vale la pena decodificar un archivo absurdo

export class ImagenInvalidaError extends Error {}

/** Valida, redimensiona (si hace falta) y comprime una imagen subida por el
 *  usuario, devolviendo un data URL listo para guardar. Nunca lanza fuera de
 *  la promesa — rechaza con `ImagenInvalidaError` y un mensaje mostrable. */
export function prepararImagen(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new ImagenInvalidaError("El archivo debe ser una imagen."));
  }
  if (file.size > TAMANO_MAXIMO_ORIGINAL_MB * 1024 * 1024) {
    return Promise.reject(new ImagenInvalidaError(`La imagen pesa más de ${TAMANO_MAXIMO_ORIGINAL_MB}MB.`));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      /* Solo se achica, nunca se agranda (`Math.min(1, …)`) — una imagen ya
         pequeña no gana nada estirándose. */
      const escala = Math.min(1, DIMENSION_MAXIMA / Math.max(img.width, img.height));
      const ancho = Math.round(img.width * escala);
      const alto = Math.round(img.height * escala);

      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new ImagenInvalidaError("El navegador no pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, ancho, alto);

      /* PNG conserva transparencia (los logos suelen tenerla); cualquier
         otro formato se recodifica a JPEG, que comprime mucho mejor una
         foto de cámara. */
      const conservarPng = file.type === "image/png";
      resolve(canvas.toDataURL(conservarPng ? "image/png" : "image/jpeg", CALIDAD_JPEG));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagenInvalidaError("No se pudo leer el archivo como imagen."));
    };

    img.src = url;
  });
}
