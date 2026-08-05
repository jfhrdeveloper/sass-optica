"use client";

import { useParams } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { formatearFecha } from "@/lib/formato/date";

/* Grado óptico con signo explícito (+1.25 / -0.50) — sin signo, "1.25" se
   lee ambiguo; en optometría la miopía y la hipermetropía se distinguen
   justamente por ese signo. */
function fmtDiop(n?: number): string {
  if (n === undefined || n === null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

/* Pestaña "Recetas" de la ficha de cliente — sin paginación (igual que
   antes de dividir esto en pestañas): en la práctica una óptica no acumula
   tantas recetas por cliente como para necesitarla. */
export default function ClienteRecetasPage() {
  const params = useParams<{ id: string }>();
  const { clientes, recetas } = useData();
  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const recetasDelCliente = cliente
    ? [...recetas].filter((r) => r.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  if (!cliente) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recetas ({recetasDelCliente.length})</h2>
      {recetasDelCliente.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Todavía no tiene recetas registradas.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {recetasDelCliente.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(r.fecha)}</span>
                <span className="text-slate-500 dark:text-slate-500">{r.tipo}</span>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[320px] text-xs">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-500">
                      <th className="pb-1 pr-3 text-left font-normal"></th>
                      <th className="pb-1 pr-3 text-left font-normal">Esfera</th>
                      <th className="pb-1 pr-3 text-left font-normal">Cilindro</th>
                      <th className="pb-1 pr-3 text-left font-normal">Eje</th>
                      <th className="pb-1 text-left font-normal">Adición</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    <tr>
                      <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OD</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.odEsfera)}</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.odCilindro)}</td>
                      <td className="py-0.5 pr-3">{r.odEje != null ? `${r.odEje}°` : "—"}</td>
                      <td className="py-0.5">{fmtDiop(r.odAdicion)}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-3 font-medium text-slate-500 dark:text-slate-400">OI</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.oiEsfera)}</td>
                      <td className="py-0.5 pr-3">{fmtDiop(r.oiCilindro)}</td>
                      <td className="py-0.5 pr-3">{r.oiEje != null ? `${r.oiEje}°` : "—"}</td>
                      <td className="py-0.5">{fmtDiop(r.oiAdicion)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {r.dip != null && <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">DIP: {r.dip} mm</p>}
              {r.notas && (
                <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{r.notas}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
