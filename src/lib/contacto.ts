/* ================= DATOS DE CONTACTO / MARCA =================
   Fuente única de los datos públicos. Están acá y no hardcodeados en cada
   componente porque aparecen en el footer, en el botón flotante de WhatsApp,
   en las páginas legales y en el aviso de transparencia. */

/** Formato internacional SIN `+` ni espacios — es el que exige la API de
 *  wa.me. 51 = Perú. */
export const WHATSAPP_NUMERO = "51931314659";
export const WHATSAPP_MENSAJE = "Hola, quiero información sobre el sistema para mi óptica.";
export const EMAIL_SOPORTE = "jfhrdeveloper@gmail.com";

/** Titular del tratamiento de datos, para las páginas legales. */
export const RAZON_SOCIAL = "SaaS Óptica";

/* ====== Autoría (crédito en footer y pantallas de acceso) ====== */
export const DESARROLLADOR = "JFHR";
export const DESARROLLADOR_URL = "https://jfhrdeveloper.com";

export function urlWhatsApp(mensaje: string = WHATSAPP_MENSAJE): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}
