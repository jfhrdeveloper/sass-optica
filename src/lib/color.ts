/* ================= COLOR DE MARCA =================
   El color primario que elige cada óptica en Ajustes se aplica como variable
   CSS y termina siendo el FONDO de `.btn-primary`, que lleva texto blanco.
   Por eso no se ofrece una rueda de color libre: si alguien elige un amarillo
   claro, el texto blanco queda ilegible y la interfaz se rompe sin que el
   dueño entienda por qué. Se ofrece una paleta pre-validada por contraste, y
   si igual se escribe un hex a mano, se valida antes de aceptarlo. */

/** Contraste mínimo de WCAG AA para texto normal. */
export const CONTRASTE_MINIMO = 4.5;

export function esHexValido(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/** Luminancia relativa según WCAG 2.x. */
function luminancia(hex: string): number {
  const canales = (hex.slice(1).match(/../g) ?? []).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = canales;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste entre dos colores (1:1 a 21:1). */
export function contraste(a: string, b: string): number {
  if (!esHexValido(a) || !esHexValido(b)) return 0;
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** ¿Se puede usar este color de fondo con el texto blanco de `.btn-primary`? */
export function sirveParaTextoBlanco(hex: string): boolean {
  return contraste(hex, "#FFFFFF") >= CONTRASTE_MINIMO;
}

/** Paleta curada — TODOS estos pasan WCAG AA contra texto blanco (verificado,
 *  ver color.test.ts). Se excluyó a propósito el verde `#16A34A` del acento:
 *  da 3.3:1, insuficiente como fondo de botón con texto blanco. */
export const PALETA_MARCA: { hex: string; nombre: string }[] = [
  { hex: "#2563EB", nombre: "Azul" },
  { hex: "#1E40AF", nombre: "Azul marino" },
  { hex: "#4338CA", nombre: "Índigo" },
  { hex: "#6D28D9", nombre: "Violeta" },
  { hex: "#7E22CE", nombre: "Púrpura" },
  { hex: "#BE185D", nombre: "Fucsia" },
  { hex: "#B91C1C", nombre: "Rojo" },
  { hex: "#C2410C", nombre: "Naranja" },
  { hex: "#A16207", nombre: "Ámbar" },
  { hex: "#15803D", nombre: "Verde" },
  { hex: "#0F766E", nombre: "Turquesa" },
  { hex: "#0E7490", nombre: "Cian" },
  { hex: "#334155", nombre: "Pizarra" },
  { hex: "#44403C", nombre: "Piedra" },
];
