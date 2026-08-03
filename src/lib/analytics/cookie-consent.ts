/* Estado de consentimiento de cookies no esenciales (hoy solo PostHog) —
   compartido entre AnalyticsProvider.tsx (banner + inicialización) y la
   pestaña "Política de cookies" de LegalHub.tsx (botón "Cambiar mi
   preferencia"), que no se hablan entre sí directamente. */
const CLAVE = "cookie_consent";

export type ConsentimientoCookies = "aceptado" | "rechazado";

export function leerConsentimientoCookies(): ConsentimientoCookies | null {
  const valor = window.localStorage.getItem(CLAVE);
  return valor === "aceptado" || valor === "rechazado" ? valor : null;
}

export function guardarConsentimientoCookies(valor: ConsentimientoCookies) {
  window.localStorage.setItem(CLAVE, valor);
}

/* Recarga la página a propósito: es la forma más simple y confiable de que
   AnalyticsProvider (montado en el layout raíz) vuelva a leer el estado
   limpio y muestre el banner de nuevo, sin necesitar un event bus entre
   componentes que no comparten árbol. */
export function reiniciarConsentimientoCookies() {
  window.localStorage.removeItem(CLAVE);
  window.location.reload();
}
