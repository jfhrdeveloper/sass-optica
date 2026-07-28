/* ================= NORMALIZACIÓN DE TEXTO PARA BÚSQUEDA ================= */
/* Los filtros de búsqueda del dashboard (clientes, negocios, pagos) comparan
   texto escrito por el usuario contra datos reales — y en español eso casi
   siempre implica tildes ("José", "Óptica"). Sin normalizar, buscar "jose"
   no encontraba a "José" porque `.includes()` compara carácter a carácter y
   "e" ≠ "é". Esta función quita tildes/diéresis (NFD + descarte de marcas
   combinantes, mismo truco que generarSlug en slug.ts) y baja a minúsculas,
   así la comparación es tolerante a mayúsculas Y a tildes en ambos lados. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("")
    .trim();
}

/* Coincidencia por substring normalizado, con guarda para búsqueda vacía
   (evita recorrer `campos` sin necesidad en el caso más común: sin filtro). */
export function coincideBusqueda(campos: string, busqueda: string): boolean {
  const query = normalizarBusqueda(busqueda);
  if (!query) return true;
  return normalizarBusqueda(campos).includes(query);
}
