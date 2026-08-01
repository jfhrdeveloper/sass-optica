"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning, Eye } from "lucide-react";
import { SlideOver } from "@/components/ui/SlideOver";
import { formatearFechaPE } from "@/lib/formato/date";

export interface ReclamoFila {
  id: string;
  numero: string;
  tipo: "reclamo" | "queja";
  consumidorNombres: string;
  consumidorApellidos: string;
  consumidorDocumentoTipo: string;
  consumidorDocumentoNumero: string;
  consumidorDomicilio: string;
  consumidorTelefono: string | null;
  consumidorEmail: string;
  esMenorEdad: boolean;
  apoderadoNombre: string | null;
  bienTipo: "producto" | "servicio";
  bienDescripcion: string;
  montoReclamado: number | null;
  detalle: string;
  pedido: string;
  estado: "pendiente" | "atendido";
  respuesta: string | null;
  createdAt: string;
}

/* Tabla cross-tenant del admin panel — mismo patrón que NegociosTable.tsx/
   PagosTable.tsx: Server Component (page.tsx) resuelve los datos (mock o
   service_role), este componente cliente solo pinta + dispara la acción de
   responder. Columnas secundarias ocultas en mobile (mismo criterio de
   tramys-rrhh aplicado el resto de la sesión) — se dejan siempre visibles
   Número/Consumidor/Estado, que son las que identifican y priorizan un
   reclamo de un vistazo. */
export function ReclamosTable({ reclamos }: { reclamos: ReclamoFila[] }) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<ReclamoFila | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);

  function abrir(r: ReclamoFila) {
    setDetalle(r);
    setRespuesta(r.respuesta ?? "");
  }

  async function responder() {
    if (!detalle || !respuesta.trim()) return;
    setEnviando(true);
    const res = await fetch("/api/admin/reclamos/actualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: detalle.id, respuesta: respuesta.trim() }),
    });
    setEnviando(false);
    if (res.ok) { setDetalle(null); router.refresh(); }
    else window.alert("No se pudo guardar la respuesta.");
  }

  return (
    <>
      <div className="table-card mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-head-cell">N°</th>
                <th className="table-head-cell hidden md:table-cell">Tipo</th>
                <th className="table-head-cell">Consumidor</th>
                <th className="table-head-cell hidden lg:table-cell">Bien</th>
                <th className="table-head-cell hidden md:table-cell">Fecha</th>
                <th className="table-head-cell">Estado</th>
                <th className="table-head-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reclamos.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="table-body-cell font-medium text-slate-900 dark:text-slate-100">{r.numero}</td>
                  <td className="table-body-cell hidden md:table-cell capitalize text-slate-600 dark:text-slate-300">{r.tipo}</td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-3">
                      <span className="row-avatar"><MessageSquareWarning size={16} /></span>
                      <span>
                        <span className="block font-medium text-slate-900 dark:text-slate-100">{r.consumidorNombres} {r.consumidorApellidos}</span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500">{r.consumidorEmail}</span>
                      </span>
                    </div>
                  </td>
                  <td className="table-body-cell hidden lg:table-cell text-slate-600 dark:text-slate-300">{r.bienDescripcion}</td>
                  <td className="table-body-cell hidden md:table-cell text-slate-600 dark:text-slate-300">{formatearFechaPE(r.createdAt.slice(0, 10))}</td>
                  <td className="table-body-cell">
                    <span className={`badge ${r.estado === "atendido" ? "badge-success" : "badge-warning"}`}>
                      {r.estado === "atendido" ? "Atendido" : "Pendiente"}
                    </span>
                  </td>
                  <td className="table-body-cell text-right">
                    <button onClick={() => abrir(r)} title="Ver detalle" aria-label={`Ver reclamo ${r.numero}`} className="row-icon-btn ml-auto">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {reclamos.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <MessageSquareWarning size={28} className="text-slate-300 dark:text-slate-600" />
                      Sin reclamos registrados.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SlideOver abierto={Boolean(detalle)} onClose={() => setDetalle(null)} titulo={detalle ? `${detalle.numero} — ${detalle.tipo === "reclamo" ? "Reclamo" : "Queja"}` : ""}>
        {detalle && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Consumidor</p>
              <p className="text-slate-700 dark:text-slate-300">{detalle.consumidorNombres} {detalle.consumidorApellidos}</p>
              <p className="text-slate-500 dark:text-slate-400">{detalle.consumidorDocumentoTipo} {detalle.consumidorDocumentoNumero}</p>
              <p className="text-slate-500 dark:text-slate-400">{detalle.consumidorDomicilio}</p>
              <p className="text-slate-500 dark:text-slate-400">{detalle.consumidorEmail}{detalle.consumidorTelefono ? ` · ${detalle.consumidorTelefono}` : ""}</p>
              {detalle.esMenorEdad && detalle.apoderadoNombre && (
                <p className="text-slate-500 dark:text-slate-400">Padre/madre/apoderado: {detalle.apoderadoNombre}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Bien contratado</p>
              <p className="text-slate-700 dark:text-slate-300 capitalize">{detalle.bienTipo}: {detalle.bienDescripcion}</p>
              {detalle.montoReclamado != null && <p className="text-slate-500 dark:text-slate-400">Monto: S/ {detalle.montoReclamado.toFixed(2)}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Detalle</p>
              <p className="text-slate-700 dark:text-slate-300">{detalle.detalle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Pedido</p>
              <p className="text-slate-700 dark:text-slate-300">{detalle.pedido}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Respuesta {detalle.estado === "atendido" && "(ya enviada)"}
              </label>
              <textarea rows={4} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} className="input w-full text-sm" />
            </div>
            <button onClick={responder} disabled={enviando || !respuesta.trim()} className="btn-primary w-full">
              {enviando ? "Guardando…" : "Marcar como atendido"}
            </button>
          </div>
        )}
      </SlideOver>
    </>
  );
}
