"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "planificado", label: "Planificado" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completado", label: "Completado" },
  { value: "rechazado", label: "Rechazado" },
];

/* Cambia el estado de una mejora sugerida — POST a
   /api/admin/mejoras/actualizar y refresca el Server Component, mismo
   patrón que SuspenderNegocioButton. El negocio que la propuso NUNCA puede
   hacer esto (sin policy de update en mejoras_sugeridas): es exclusivo del
   dueño del SaaS. */
export function EstadoMejoraSelect({ id, estadoActual }: { id: string; estadoActual: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const estado = e.target.value;
    setEnviando(true);
    const res = await fetch("/api/admin/mejoras/actualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    setEnviando(false);
    if (res.ok) router.refresh();
    else window.alert("No se pudo actualizar el estado.");
  }

  return (
    <select value={estadoActual} onChange={onChange} disabled={enviando} className="select text-sm">
      {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
    </select>
  );
}
