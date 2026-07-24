/* ================= SLUG DE SUBDOMINIO ================= */
/* Genera y valida el subdominio a partir del nombre del negocio, estilo      */
/* Instagram: se deriva en vivo del input, nunca lo escribe el usuario a mano. */
/* Ver brief-saas-proyecto.md §2 para el diseño original de esta función. */

export type FormatoSlug = "guiones" | "junto";

/* Quita marcas diacríticas (tildes) de un texto ya normalizado en forma NFD:
   las vocales acentuadas se separan en letra base + marca combinante (rango
   Unicode 0x0300–0x036F); esto las descarta sin depender de un regex con
   escapes \\u que son propensos a corromperse al pasar por herramientas que
   interpretan JSON. */
function quitarDiacriticos(texto: string): string {
  return texto
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
}

export function generarSlug(nombreNegocio: string, formato: FormatoSlug = "guiones"): string {
  const base = quitarDiacriticos(nombreNegocio.toLowerCase().normalize("NFD"))
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "") // quita símbolos
    .trim();

  if (formato === "junto") {
    return base.replace(/\s+/g, "");
  }

  return base
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Subdominios reservados: rutas internas del sistema (api, admin, dashboard...)
   y espacios reservados para uso futuro (billing, staging...). Ningún negocio
   puede registrarse con estos nombres — ver docs/architecture.md §3. */
export const SUBDOMINIOS_RESERVADOS = [
  "www", "api", "admin", "app", "dashboard", "mail", "ftp",
  "blog", "help", "soporte", "support", "login", "auth",
  "billing", "pagos", "test", "staging", "dev", "null", "undefined",
];

export function esReservado(slug: string): boolean {
  return SUBDOMINIOS_RESERVADOS.includes(slug);
}

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export interface ValidacionSlug {
  valido: boolean;
  error?: string;
}

/* Validación de formato + reservado. La unicidad se valida aparte contra la
   base de datos (ver /api/registro/disponibilidad). Se corre TANTO en el
   cliente (feedback en vivo) COMO en el servidor (nunca confiar en el frontend). */
export function validarFormatoSlug(slug: string): ValidacionSlug {
  if (slug.length < 3) return { valido: false, error: "Debe tener al menos 3 caracteres." };
  if (slug.length > 30) return { valido: false, error: "Debe tener como máximo 30 caracteres." };
  if (!SLUG_RE.test(slug)) {
    return { valido: false, error: "Solo minúsculas, números y guiones (sin empezar/terminar con guion)." };
  }
  if (esReservado(slug)) return { valido: false, error: "Ese nombre está reservado, elige otro." };
  return { valido: true };
}
