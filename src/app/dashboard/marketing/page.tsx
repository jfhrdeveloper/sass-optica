"use client";

import { useState } from "react";
import { Info, Plus } from "lucide-react";
import { useData, type CampaniaEmail } from "@/components/providers/DataProvider";
import { SlideOver } from "@/components/SlideOver";

const VACIO: Partial<CampaniaEmail> = { nombre: "", asunto: "", cuerpo: "" };

/* Campañas de email (idea de UX #13). SCAFFOLD a propósito: no hay
   proveedor de email conectado (Resend/Postmark vía Marketplace), así que
   "Enviar" solo pasa la campaña a estado 'enviada' con métricas en 0 — no
   manda correos de verdad. Ver docs/pending-task.md para conectar un
   proveedor real cuando el usuario lo decida. */
export default function MarketingPage() {
  const { campanias, addCampania, deleteCampania, updateCampania } = useData();
  const [form, setForm] = useState<Partial<CampaniaEmail>>(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.asunto) return;
    setGuardando(true);
    await addCampania(form);
    setGuardando(false);
    setAbierto(false);
    setForm(VACIO);
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Marketing</h1>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span>
          Todavía no hay un proveedor de email conectado. Las campañas se guardan como borrador, pero
          &quot;Enviar&quot; no manda correos de verdad hasta que conectes uno (Resend o Postmark).
        </span>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={() => setAbierto(true)} className="btn-primary gap-1.5">
          <Plus size={16} /> Nueva campaña
        </button>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-400 dark:text-slate-500">
            <th className="py-2">Nombre</th><th>Asunto</th><th>Estado</th><th>Enviados</th><th>Fallidos</th><th>Desuscritos</th><th />
          </tr>
        </thead>
        <tbody>
          {campanias.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="py-2">{c.nombre}</td>
              <td>{c.asunto}</td>
              <td><span className={`badge ${c.estado === "enviada" ? "badge-success" : "badge-neutral"}`}>{c.estado}</span></td>
              <td>{c.enviados}</td>
              <td>{c.fallidos}</td>
              <td>{c.desuscritos}</td>
              <td className="space-x-2 text-right">
                {c.estado === "borrador" && (
                  <button onClick={() => updateCampania(c.id, { estado: "enviada" })} className="link">Marcar enviada</button>
                )}
                <button onClick={() => deleteCampania(c.id)} className="link-danger">Eliminar</button>
              </td>
            </tr>
          ))}
          {campanias.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin campañas todavía.</td></tr>
          )}
        </tbody>
      </table>

      <SlideOver abierto={abierto} onClose={() => setAbierto(false)} titulo="Nueva campaña">
        <form onSubmit={onSubmit} className="space-y-3">
          <input placeholder="Nombre interno" required value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input w-full text-sm" />
          <input placeholder="Asunto del correo" required value={form.asunto ?? ""} onChange={(e) => setForm({ ...form, asunto: e.target.value })} className="input w-full text-sm" />
          <textarea placeholder="Cuerpo del mensaje" value={form.cuerpo ?? ""} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} className="input w-full text-sm" rows={5} />
          <button type="submit" disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : "Guardar borrador"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
