/* Indicador de paso 1/2 para los flujos de alta en 2 pasos (SlideOver de
   clientes y productos) — puramente visual, el estado del paso lo maneja
   cada página. */
export function Stepper({ paso, total }: { paso: number; total: number }) {
  return (
    <div className="mb-4 flex items-center">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              n <= paso ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
            }`}
          >
            {n}
          </div>
          {n < total && <div className={`h-0.5 w-8 ${n < paso ? "bg-primary" : "bg-slate-100 dark:bg-slate-800"}`} />}
        </div>
      ))}
    </div>
  );
}
