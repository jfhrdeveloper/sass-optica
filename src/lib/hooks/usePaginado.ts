import { useEffect, useState } from "react";

const TAMANO_PAGINA_DESKTOP = 8;
const TAMANO_PAGINA_MOBILE = 4;

/* Corta un array ya filtrado/ordenado en páginas de tamaño fijo. La página
   se clampea en cada lectura (no con un efecto aparte) — si un filtro nuevo
   reduce el total de páginas, la vista cae sola a la última válida sin
   necesitar sincronizar estado extra.

   Tamaño de página RESPONSIVE por defecto (8 en escritorio, 4 en mobile,
   pedido explícito del usuario) — con más de 4 filas una pantalla angosta
   ya obliga a mucho scroll antes de llegar a la paginación; en escritorio
   sí hay espacio de sobra para 8. Un `tamanoPagina` explícito (ej.
   TAMANO_PAGINA_FICHA en clientes/[id]/page.tsx, un widget de resumen a
   propósito más chico) sigue ganando siempre sobre este default. */
export function usePaginado<T>(items: T[], tamanoPagina?: number) {
  const [tamanoResponsive, setTamanoResponsive] = useState(TAMANO_PAGINA_DESKTOP);
  useEffect(() => {
    function actualizar() {
      setTamanoResponsive(window.matchMedia("(max-width: 639px)").matches ? TAMANO_PAGINA_MOBILE : TAMANO_PAGINA_DESKTOP);
    }
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  const efectivo = tamanoPagina ?? tamanoResponsive;
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / efectivo));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = items.slice((paginaActual - 1) * efectivo, paginaActual * efectivo);
  return { pagina: paginaActual, setPagina, totalPaginas, visibles };
}
