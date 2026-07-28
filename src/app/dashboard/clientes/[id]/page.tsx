"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, User, History, Pencil } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useClienteForm } from "@/lib/hooks/useClienteForm";
import { ClienteFormSlideOver } from "@/components/clientes/ClienteFormSlideOver";
import { BotonWhatsApp } from "@/components/clientes/BotonWhatsApp";
import { formatearFecha, formatearFechaHora } from "@/lib/formato/date";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock/mock-mode";
import { ESTADO_CITA_LABEL, ESTADO_CITA_BADGE } from "@/lib/citas";

type EntradaAuditoria = { id: number; ts: string; accion: string };
const ACCION_LABEL: Record<string, string> = { INSERT: "Creado", UPDATE: "Editado", DELETE: "Eliminado" };

/* Grado óptico con signo explícito (+1.25 / -0.50) — sin signo, "1.25" se
   lee ambiguo; en optometría la miopía y la hipermetropía se distinguen
   justamente por ese signo. */
function fmtDiop(n?: number): string {
  if (n === undefined || n === null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const { clientes, citas, recetas, ventas } = useData();
  const { empleado } = useSession();
  const esAdmin = empleado?.rol === "administrador";
  const formEstado = useClienteForm();

  const cliente = clientes.find((c) => c.id === params.id) ?? null;

  const citasDelCliente = cliente
    ? [...citas].filter((c) => c.clienteId === cliente.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    : [];
  const recetasDelCliente = cliente
    ? [...recetas].filter((r) => r.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const ventasDelCliente = cliente
    ? [...ventas].filter((v) => v.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];

  /* Historial de cambios: misma fuente (audit_log) y misma restricción de
     rol que tenía el panel lateral anterior — ver comentario original en
     el historial de git de clientes/page.tsx. */
  const [historial, setHistorial] = useState<{ id: string | null; entradas: EntradaAuditoria[] }>({ id: null, entradas: [] });
  useEffect(() => {
    if (!cliente || !esAdmin || isMockMode()) return;
    let activo = true;
    const supabase = createClient();
    supabase
      .from("audit_log")
      .select("id, ts, accion")
      .eq("tabla", "clientes")
      .eq("fila_id", cliente.id)
      .order("ts", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (activo) setHistorial({ id: cliente.id, entradas: data ?? [] }); });
    return () => { activo = false; };
  }, [cliente, esAdmin]);
  const historialCambios = historial.id === cliente?.id ? historial.entradas : [];

  if (!cliente) {
    return (
      <main>
        <Link href="/dashboard/clientes" className="flex items-center gap-1.5 text-sm font-medium link">
          <ArrowLeft size={15} /> Clientes
        </Link>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Cliente no encontrado (puede haber sido eliminado o estar en la papelera).
        </p>
      </main>
    );
  }

  return (
    <main>
      <Link href="/dashboard/clientes" className="flex items-center gap-1.5 text-sm font-medium link">
        <ArrowLeft size={15} /> Clientes
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{cliente.nombres} {cliente.apellidos}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">{cliente.documentoTipo} {cliente.documentoNumero ?? "—"}</p>
          </div>
        </div>
        <button onClick={() => formEstado.editar(cliente)} className="btn-outline shrink-0 gap-1.5 px-3 py-1.5 text-xs">
          <Pencil size={13} /> Editar
        </button>
      </div>

      <div className="card mt-5 grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Teléfono</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.telefono ?? "—"}
            {cliente.telefono && <BotonWhatsApp telefono={cliente.telefono} />}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Email</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{cliente.email ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Nacimiento</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
            {cliente.fechaNacimiento ? formatearFecha(cliente.fechaNacimiento) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 dark:text-slate-500">Dirección</div>
          <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{cliente.direccion ?? "—"}</div>
        </div>
      </div>

      {cliente.notas && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{cliente.notas}</p>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Citas ({citasDelCliente.length})</h2>
        {citasDelCliente.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Primera vez — todavía no tiene citas registradas.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {citasDelCliente.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{formatearFecha(c.fechaHora)}</p>
                  {c.motivo && <p className="text-xs text-slate-400 dark:text-slate-500">{c.motivo}</p>}
                </div>
                <span className={`badge ${ESTADO_CITA_BADGE[c.estado] ?? "badge-neutral"}`}>{ESTADO_CITA_LABEL[c.estado] ?? c.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recetasDelCliente.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recetas ({recetasDelCliente.length})</h2>
          <ul className="mt-2 space-y-3">
            {recetasDelCliente.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatearFecha(r.fecha)}</span>
                  <span className="text-slate-400 dark:text-slate-500">{r.tipo}</span>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-xs">
                    <thead>
                      <tr className="text-slate-400 dark:text-slate-500">
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
                {r.dip != null && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">DIP: {r.dip} mm</p>}
                {r.notas && (
                  <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{r.notas}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ventasDelCliente.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compras ({ventasDelCliente.length})</h2>
          <ul className="mt-2 space-y-1.5">
            {ventasDelCliente.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-200">{formatearFecha(v.fecha)}</span>
                <span className="text-slate-400 dark:text-slate-500">S/ {v.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {esAdmin && historialCambios.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <History size={15} /> Historial de cambios
          </h2>
          <ul className="mt-2 space-y-1.5">
            {historialCambios.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-200">{ACCION_LABEL[h.accion] ?? h.accion}</span>
                <span className="text-slate-400 dark:text-slate-500">{formatearFechaHora(h.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ClienteFormSlideOver estado={formEstado} />
    </main>
  );
}
