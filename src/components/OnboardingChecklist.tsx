"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";

/* Checklist de onboarding del dashboard (idea de UX #1 del research de
   competencia, Finegym) — cada tarea se deriva de datos ya existentes en
   DataProvider, sin campo nuevo de "onboarding completado" en la DB. El
   cierre (X) es solo de sesión — reaparece si se recarga, a propósito, hasta
   que las 6 tareas estén hechas de verdad. */
const TAREAS = [
  { key: "cliente", label: "Añade tu primer cliente", href: "/dashboard/clientes" },
  { key: "producto", label: "Agrega tu primer producto", href: "/dashboard/productos" },
  { key: "cita", label: "Agenda tu primera cita", href: "/dashboard/citas" },
  { key: "venta", label: "Registra tu primera venta", href: "/dashboard/ventas" },
  { key: "equipo", label: "Invita a tu equipo", href: "/dashboard/empleados" },
  { key: "logo", label: "Sube el logo de tu negocio", href: "/dashboard/ajustes" },
] as const;

export function OnboardingChecklist() {
  const { negocio, clientes, productos, citas, ventas, empleados } = useData();
  const [colapsado, setColapsado] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  const completadas: Record<string, boolean> = {
    cliente: clientes.length > 0,
    producto: productos.length > 0,
    cita: citas.length > 0,
    venta: ventas.length > 0,
    equipo: empleados.length > 1,
    logo: Boolean(negocio?.logoUrl),
  };
  const total = TAREAS.length;
  const hechas = TAREAS.filter((t) => completadas[t.key]).length;

  if (cerrado || hechas === total) return null;

  return (
    <div className="card mt-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setColapsado((v) => !v)} className="flex flex-1 items-center gap-2 text-left">
          {colapsado ? <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" /> : <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" />}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Guía de configuración</span>
          <span className="badge badge-neutral">{hechas} de {total} tareas</span>
        </button>
        <button
          onClick={() => setCerrado(true)}
          className="rounded p-1 text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-500"
          aria-label="Cerrar guía"
        >
          <X size={16} />
        </button>
      </div>
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
        <div className="h-1 bg-accent transition-all duration-500" style={{ width: `${(hechas / total) * 100}%` }} />
      </div>
      {!colapsado && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {TAREAS.map((t) => {
            const hecha = completadas[t.key];
            return (
              <li key={t.key}>
                <Link href={t.href} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      hecha ? "bg-accent text-white" : "border border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {hecha && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={hecha ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
