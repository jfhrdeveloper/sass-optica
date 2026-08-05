"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

/* Números a mostrar alrededor de la página actual + siempre primera/última,
   colapsando el resto en "…" (ver anatomía de namethatui.com/web/pagination:
   enlaces numerados + elipsis para rangos colapsados). */
function paginasVisibles(pagina: number, total: number): (number | "…")[] {
  const rango = 1;
  const paginas = new Set<number>([1, total, pagina]);
  for (let i = pagina - rango; i <= pagina + rango; i++) {
    if (i >= 1 && i <= total) paginas.add(i);
  }
  const ordenadas = [...paginas].sort((a, b) => a - b);
  const resultado: (number | "…")[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    if (i > 0 && ordenadas[i] - ordenadas[i - 1] > 1) resultado.push("…");
    resultado.push(ordenadas[i]);
  }
  return resultado;
}

/* Paginación reutilizable para el pie de cada `.table-card` — solo se
   renderiza si hay más de una página (ver uso en cada page.tsx: no vale la
   pena mostrarla con 2-3 filas mock, pero sí con datos reales de una óptica
   con cientos de clientes/productos). */
export function Pagination({ pagina, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1 border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
      <button
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina <= 1}
        aria-label="Página anterior"
        className="flex h-11 w-11 items-center justify-center text-slate-600 transition-colors hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:text-white"
      >
        <ChevronLeft size={16} />
      </button>
      {paginasVisibles(pagina, totalPaginas).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-sm text-slate-500 dark:text-slate-500">
            <span aria-hidden="true">…</span>
            <span className="sr-only">Más páginas</span>
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onCambiar(p)}
            aria-current={p === pagina ? "page" : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-medium transition-colors ${
              p === pagina
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        aria-label="Página siguiente"
        className="flex h-11 w-11 items-center justify-center text-slate-600 transition-colors hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:text-white"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
