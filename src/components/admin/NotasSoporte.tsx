"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { formatearFechaHora } from "@/lib/formato/date";

export interface NotaSoporte {
  id: string;
  autor: string;
  texto: string;
  createdAt: string;
}

/* Bitácora de contacto/soporte con este negocio-tenant, visible solo para el
   dueño del SaaS (nunca para el propio negocio, ver RLS deny-all de
   notas_soporte). POST a /api/admin/negocios/notas y refresca el Server
   Component — mismo criterio que SuspenderNegocioButton: la fuente de
   verdad sigue siendo la DB/mock, no estado optimista. */
export function NotasSoporte({ negocioId, notas }: { negocioId: string; notas: NotaSoporte[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    const res = await fetch("/api/admin/negocios/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negocioId, texto }),
    });
    setEnviando(false);
    if (res.ok) {
      setTexto("");
      router.refresh();
    } else {
      window.alert("No se pudo guardar la nota.");
    }
  }

  return (
    <div className="card mt-4 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <MessageSquarePlus size={16} /> Notas internas
      </h3>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Registro de contacto con este negocio — solo lo ve el equipo de soporte, nunca el negocio.
      </p>

      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej. llamó por WhatsApp preguntando por el bloqueo del trial…"
          rows={2}
          className="input flex-1 text-sm"
        />
        <button type="submit" disabled={enviando || !texto.trim()} className="btn-primary shrink-0 sm:self-end">
          {enviando ? "Guardando…" : "Agregar nota"}
        </button>
      </form>

      <ul className="mt-4 space-y-3">
        {notas.map((n) => (
          <li key={n.id} className="border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <p className="text-slate-700 dark:text-slate-200">{n.texto}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{n.autor} · {formatearFechaHora(n.createdAt)}</p>
          </li>
        ))}
        {notas.length === 0 && (
          <li className="text-sm text-slate-400 dark:text-slate-500">Sin notas todavía.</li>
        )}
      </ul>
    </div>
  );
}
