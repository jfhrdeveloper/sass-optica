import { DIAS_SEMANA } from "@/lib/uso";

const HORAS = Array.from({ length: 24 }, (_, h) => h);

/* Heatmap día de semana × hora (América/Lima) — sigue la guía de la skill
   dataviz: sequential = un solo hue (azul de marca, `--color-primary`),
   más oscuro = más uso, con la casilla en 0 recibiendo un gris neutro (no
   transparente: "cero" debe leerse tan claro como "mucho"). Es una
   visualización decorativa (`role="img"` con un resumen textual), no una
   tabla navegable celda por celda — para eso está la frase con el pico de
   uso arriba, que es el dato que de verdad importa. */
export function ActividadHeatmap({ matriz, picoLabel }: { matriz: number[][]; picoLabel: string | null }) {
  const max = Math.max(1, ...matriz.flat());
  const totalEventos = matriz.flat().reduce((a, b) => a + b, 0);

  if (totalEventos === 0) {
    return <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Sin actividad registrada todavía.</p>;
  }

  return (
    <div>
      {picoLabel && (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Más activo: <span className="font-medium text-slate-900 dark:text-slate-100">{picoLabel}</span>
        </p>
      )}

      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={`Mapa de calor de actividad por día y hora.${picoLabel ? ` Más activo: ${picoLabel}.` : ""}`}
          className="inline-block min-w-full"
        >
          <div className="flex pl-9">
            {HORAS.map((h) => (
              <div key={h} className="min-w-[1.1rem] flex-1 text-center text-[9px] text-slate-400 dark:text-slate-500">
                {h % 4 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {matriz.map((fila, dia) => (
            <div key={dia} className="flex items-center">
              <div className="w-9 shrink-0 pr-1.5 text-right text-[10px] text-slate-400 dark:text-slate-500">{DIAS_SEMANA[dia]}</div>
              {fila.map((total, hora) => (
                <div
                  key={hora}
                  title={`${DIAS_SEMANA[dia]} ${String(hora).padStart(2, "0")}:00–${String((hora + 1) % 24).padStart(2, "0")}:00 · ${total} evento${total === 1 ? "" : "s"}`}
                  className={`m-[1px] aspect-square min-w-[1.1rem] flex-1 rounded-[2px] ${total === 0 ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                  style={total > 0 ? { backgroundColor: "var(--color-primary)", opacity: Math.max(0.2, total / max) } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        Menos
        <span className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--color-primary)", opacity: 0.35 }} />
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--color-primary)", opacity: 0.7 }} />
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--color-primary)" }} />
        Más
      </div>
    </div>
  );
}
