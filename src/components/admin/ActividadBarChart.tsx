export type PuntoActividad = { fecha: string; label: string; total: number };

const ALTURA_PLOT_PX = 100;

/* Misma anatomía que MrrBarChart.tsx (barra simple de una sola serie, sin
   librería nueva) — pero de CONTEOS, no de soles: sin el prefijo "S/", con
   `label` cada 2 días para no amontonar 14 etiquetas de fecha en el mismo
   ancho que antes tenía 6 meses. */
export function ActividadBarChart({ puntos }: { puntos: PuntoActividad[] }) {
  const max = Math.max(1, ...puntos.map((p) => p.total));

  if (puntos.every((p) => p.total === 0)) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-500">Sin actividad registrada en este período.</p>;
  }

  return (
    <div className="flex items-end gap-1.5 px-2 pt-6">
      {puntos.map((p, i) => {
        const alturaPx = Math.max(2, Math.round((p.total / max) * ALTURA_PLOT_PX));
        return (
          <div key={p.fecha} className="group relative flex flex-1 flex-col items-center" title={`${p.label}: ${p.total} evento${p.total === 1 ? "" : "s"}`}>
            <span className="pointer-events-none absolute -top-6 rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
              {p.total}
            </span>
            <div
              className="w-full rounded-t bg-primary transition-colors group-hover:bg-primary-dark"
              style={{ height: `${alturaPx}px` }}
            />
            {/* Una etiqueta cada 2 días: 14 fechas completas se amontonan y
                dejan de leerse — selectivo, no "todas" (ver skill dataviz). */}
            <span className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">{i % 2 === 0 ? p.label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
