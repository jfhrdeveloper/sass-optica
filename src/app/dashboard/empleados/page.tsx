"use client";

import { useState } from "react";
import Link from "next/link";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

/* Ruta protegida a nivel de proxy y de RLS. El alta/baja NUNCA llama a
   Supabase directo desde aquí — siempre vía /api/empleados/* con
   service_role (ver invariante en docs/architecture.md). */
export default function EmpleadosPage() {
  const { empleados } = useData();
  const { empleado: yo } = useSession();
  const [email, setEmail] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [rol, setRol] = useState<"encargado" | "trabajador">("trabajador");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    const res = await fetch("/api/empleados/invitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombres, apellidos, rol }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setMensaje(data.error ?? "No se pudo invitar.");
      return;
    }
    setMensaje(`Invitación enviada a ${email}.`);
    setEmail(""); setNombres(""); setApellidos("");
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este empleado?")) return;
    const res = await fetch("/api/empleados/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "No se pudo eliminar.");
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Empleados</h1>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">← Inicio</Link>
      </div>

      <form onSubmit={invitar} className="card mt-4 grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <input placeholder="Nombres" required value={nombres} onChange={(e) => setNombres(e.target.value)} className="input text-sm" />
        <input placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="input text-sm" />
        <input placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input text-sm" />
        <select value={rol} onChange={(e) => setRol(e.target.value as "encargado" | "trabajador")} className="input text-sm">
          <option value="trabajador">Trabajador</option>
          <option value="encargado">Encargado</option>
        </select>
        <button type="submit" disabled={enviando} className="btn-primary col-span-full">
          {enviando ? "Enviando…" : "Invitar empleado"}
        </button>
        {mensaje && <p className="col-span-full text-sm">{mensaje}</p>}
      </form>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400">
            <th className="py-2">Nombre</th><th>Email</th><th>Rol</th><th />
          </tr>
        </thead>
        <tbody>
          {empleados.map((e) => (
            <tr key={e.id} className="border-b border-slate-100">
              <td className="py-2">{e.nombres} {e.apellidos}</td>
              <td>{e.email ?? "—"}</td>
              <td>{e.rol}</td>
              <td className="text-right">
                {e.rol !== "administrador" && e.id !== yo?.id && (
                  <button onClick={() => eliminar(e.id)} className="text-red-600 underline">Eliminar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
