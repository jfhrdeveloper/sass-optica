import { useState } from "react";

const TAMANO_PAGINA = 10;

/* Corta un array ya filtrado/ordenado en páginas de tamaño fijo. La página
   se clampea en cada lectura (no con un efecto aparte) — si un filtro nuevo
   reduce el total de páginas, la vista cae sola a la última válida sin
   necesitar sincronizar estado extra. */
export function usePaginado<T>(items: T[], tamanoPagina: number = TAMANO_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = items.slice((paginaActual - 1) * tamanoPagina, paginaActual * tamanoPagina);
  return { pagina: paginaActual, setPagina, totalPaginas, visibles };
}
