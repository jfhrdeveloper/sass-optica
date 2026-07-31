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

/** RUC 10 (persona natural con negocio) — ver el análisis de la decisión
 *  RUC 10 vs RUC 20 en docs/pending-task.md. Se usa en /legal y en los datos
 *  del proveedor del Libro de Reclamaciones (exigido por INDECOPI). */
export const RUC = "10708343931";

/** El servicio se ofrece 100% en línea, sin local físico de atención al
 *  público — así se lo declara donde antes iría una dirección (footer,
 *  /legal, Libro de Reclamaciones), en vez de inventar una. */
export const ATENCION_100_VIRTUAL = "Atención 100% virtual — sin local físico de atención al público.";

/* ====== Autoría (crédito en footer y pantallas de acceso) ====== */
export const DESARROLLADOR = "jfhrdev";
export const DESARROLLADOR_URL = "https://jfhrdeveloper.com";

export function urlWhatsApp(mensaje: string = WHATSAPP_MENSAJE): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/** Link de WhatsApp para el teléfono de un cliente/contacto del negocio (no
 *  el fijo del sistema, ver `urlWhatsApp`). Asume Perú (51) si el número
 *  guardado no trae ya código de país — así el usuario puede escribir el
 *  celular a 9 dígitos, como lo hace normalmente. `mensaje` es opcional
 *  (recordatorio de cita, aviso de producto listo, etc.) — sin él abre el
 *  chat en blanco, mismo comportamiento de siempre. */
export function urlWhatsAppContacto(telefono: string, mensaje?: string): string {
  const digitos = telefono.replace(/\D/g, "");
  const conCodigo = digitos.startsWith("51") ? digitos : `51${digitos}`;
  const query = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${conCodigo}${query}`;
}
