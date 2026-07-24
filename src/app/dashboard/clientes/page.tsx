"use client";

import { useState } from "react";
import Link from "next/link";
import { useData, type Cliente } from "@/components/providers/DataProvider";

const VACIO: Partial<Cliente> = { nombres: "", apellidos: "", documentoTipo: "DNI" };

export default function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente } = useData();
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  const filtrados = clientes.filter((c) =>
    `${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  function editar(c: Cliente) {
    setEditandoId(c.id);
    setForm(c);
  }
  function cancelar() {
    setEditandoId(null);
    setForm(VACIO);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombres) return;
    setGuardando(true);
    if (editandoId) {
      await updateCliente(editandoId, form);
    } else {
      await addCliente(form);
    }
    setGuardando(false);
    cancelar();
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Inicio</Link>
      </div>

      <form onSubmit={onSubmit} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        <input placeholder="Nombres" required value={form.nombres ?? ""} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="input text-sm" />
        <input placeholder="Apellidos" value={form.apellidos ?? ""} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="input text-sm" />
        <input placeholder="DNI" value={form.documentoNumero ?? ""} onChange={(e) => setForm({ ...form, documentoNumero: e.target.value })} className="input text-sm" />
        <input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input text-sm" />
        <input placeholder="Email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input text-sm" />
        <input placeholder="Fecha de nacimiento" type="date" value={form.fechaNacimiento ?? ""} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="input text-sm" />
        <div className="col-span-full flex gap-2">
          <button type="submit" disabled={guardando} className="btn-primary">
            {editandoId ? "Guardar cambios" : "Agregar cliente"}
          </button>
          {editandoId && <button type="button" onClick={cancelar} className="text-sm font-medium text-primary hover:underline">Cancelar</button>}
        </div>
      </form>

      <input
        placeholder="Buscar por nombre o documento…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        className="input mt-4 w-full text-sm"
      />

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="py-2">Nombre</th><th>Documento</th><th>Teléfono</th><th />
          </tr>
        </thead>
        <tbody>
          {filtrados.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2">{c.nombres} {c.apellidos}</td>
              <td>{c.documentoNumero ?? "—"}</td>
              <td>{c.telefono ?? "—"}</td>
              <td className="space-x-2 text-right">
                <button onClick={() => editar(c)} className="underline">Editar</button>
                <button onClick={() => deleteCliente(c.id)} className="text-red-600 underline">Eliminar</button>
              </td>
            </tr>
          ))}
          {filtrados.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin clientes todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
