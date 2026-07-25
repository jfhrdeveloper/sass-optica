export type PuntoMrr = { mes: string; label: string; monto: number };

const ALTURA_PLOT_PX = 140;

/* Barra simple de una sola serie (magnitud en el tiempo) — sin librería de
   gráficos en el proyecto, y con solo 4-6 puntos no vale la pena sumar una
   dependencia nueva. Un solo hue (bg-primary), sin leyenda (no hace falta
   con una sola serie — ver skill dataviz, check 6), etiqueta directa sobre
   cada barra (son pocos puntos, "selectivo" acá es "todos"), tooltip nativo
   vía title + un tooltip visual en hover (group-hover, sin JS).

   Altura en píxeles fijos (no `%`) a propósito: un `%` de alto en un hijo
   flex-column solo resuelve si el padre tiene una altura "definida" en el
   sentido del spec de CSS, y con `items-end` en el contenedor de fila cada
   columna se encoge a su contenido (sin alto definido) — el `%` colapsaba a
   0 en la práctica. Con px calculados en el servidor no hay ambigüedad. */
export function MrrBarChart({ puntos }: { puntos: PuntoMrr[] }) {
  const max = Math.max(1, ...puntos.map((p) => p.monto));

  if (puntos.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Sin pagos todavía para graficar.</p>;
  }

  return (
    <div className="flex items-end gap-3 px-2 pt-6">
      {puntos.map((p) => {
        const alturaPx = Math.max(3, Math.round((p.monto / max) * ALTURA_PLOT_PX));
        return (
          <div key={p.mes} className="group relative flex flex-1 flex-col items-center" title={`${p.label}: S/ ${p.monto.toFixed(2)}`}>
            <span className="pointer-events-none absolute -top-6 rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
              S/ {p.monto.toFixed(2)}
            </span>
            <span className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">{p.monto > 0 ? `S/${Math.round(p.monto)}` : ""}</span>
            <div
              className="w-full rounded-t bg-primary transition-colors group-hover:bg-primary-dark"
              style={{ height: `${alturaPx}px` }}
            />
            <span className="mt-2 text-xs text-slate-400 dark:text-slate-500">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}
