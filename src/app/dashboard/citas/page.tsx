"use client";

import { useState } from "react";
import Link from "next/link";
import { useData, type Cita } from "@/components/providers/DataProvider";

const ESTADOS = ["programada", "atendida", "cancelada", "no_asistio"] as const;
const VACIO: Partial<Cita> = { estado: "programada" };

export default function CitasPage() {
  const { citas, clientes, addCita, updateCita, deleteCita, addReceta } = useData();
  const [form, setForm] = useState<Partial<Cita>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [recetaAbierta, setRecetaAbierta] = useState<string | null>(null);
  const [receta, setReceta] = useState<Record<string, string>>({});

  const nombreCliente = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  function editar(c: Cita) {
    setEditandoId(c.id);
    setForm(c);
  }
  function cancelar() {
    setEditandoId(null);
    setForm(VACIO);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteId || !form.fechaHora) return;
    setGuardando(true);
    if (editandoId) {
      await updateCita(editandoId, form);
    } else {
      await addCita(form);
    }
    setGuardando(false);
    cancelar();
  }

  async function guardarReceta(citaId: string, clienteId: string) {
    await addReceta({
      clienteId, citaId, tipo: "lejos",
      odEsfera: receta.odEsfera ? Number(receta.odEsfera) : undefined,
      odCilindro: receta.odCilindro ? Number(receta.odCilindro) : undefined,
      odEje: receta.odEje ? Number(receta.odEje) : undefined,
      oiEsfera: receta.oiEsfera ? Number(receta.oiEsfera) : undefined,
      oiCilindro: receta.oiCilindro ? Number(receta.oiCilindro) : undefined,
      oiEje: receta.oiEje ? Number(receta.oiEje) : undefined,
      dip: receta.dip ? Number(receta.dip) : undefined,
    });
    setRecetaAbierta(null);
    setReceta({});
  }

  const ordenadas = [...citas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Citas</h1>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Inicio</Link>
      </div>

      <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <select required value={form.clienteId ?? ""} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="input text-sm">
          <option value="">Cliente…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
        </select>
        <input type="datetime-local" required value={form.fechaHora?.slice(0, 16) ?? ""} onChange={(e) => setForm({ ...form, fechaHora: e.target.value })} className="input text-sm" />
        <input placeholder="Motivo" value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="input text-sm" />
        <select value={form.estado ?? "programada"} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input text-sm">
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="col-span-full flex gap-2">
          <button type="submit" disabled={guardando} className="btn-primary">
            {editandoId ? "Guardar cambios" : "Agendar cita"}
          </button>
          {editandoId && <button type="button" onClick={cancelar} className="text-sm font-medium text-primary hover:underline">Cancelar</button>}
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {ordenadas.map((c) => (
          <div key={c.id} className="card p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{nombreCliente(c.clienteId)}</div>
                <div className="text-slate-500">{new Date(c.fechaHora).toLocaleString("es-PE")} · {c.estado} {c.motivo ? `· ${c.motivo}` : ""}</div>
              </div>
              <div className="space-x-2 whitespace-nowrap">
                <button onClick={() => setRecetaAbierta(recetaAbierta === c.id ? null : c.id)} className="underline">Receta</button>
                <button onClick={() => editar(c)} className="underline">Editar</button>
                <button onClick={() => deleteCita(c.id)} className="text-red-600 underline">Eliminar</button>
              </div>
            </div>

            {recetaAbierta === c.id && (
              <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-xs">
                <span className="col-span-full font-medium">OD (ojo derecho)</span>
                <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, odEsfera: e.target.value })} className="input text-sm" />
                <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, odCilindro: e.target.value })} className="input text-sm" />
                <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, odEje: e.target.value })} className="input text-sm" />
                <span className="col-span-full mt-1 font-medium">OI (ojo izquierdo)</span>
                <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, oiEsfera: e.target.value })} className="input text-sm" />
                <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, oiCilindro: e.target.value })} className="input text-sm" />
                <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, oiEje: e.target.value })} className="input text-sm" />
                <input placeholder="DIP (mm)" onChange={(e) => setReceta({ ...receta, dip: e.target.value })} className="input text-sm" />
                <button onClick={() => guardarReceta(c.id, c.clienteId)} className="btn-primary col-span-full text-sm">
                  Guardar receta
                </button>
              </div>
            )}
          </div>
        ))}
        {ordenadas.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Sin citas todavía.</p>}
      </div>
    </main>
  );
}
