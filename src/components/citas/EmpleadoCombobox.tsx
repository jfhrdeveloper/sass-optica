"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, User } from "lucide-react";
import type { Empleado } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";
import { nombreRol } from "@/lib/roles";

interface Props {
  empleados: Empleado[];
  empleadoId: string;
  onChange: (id: string) => void;
}

/* Mismo patrón botón + popover con buscador que SucursalCombobox/
   ProductoCombobox — un negocio con varios empleados (o los de stress test)
   vuelve el <select> plano de "Empleado asignado" tan interminable como
   ya era el de Producto/Sede antes de tener su propio combobox. */
export function EmpleadoCombobox({ empleados, empleadoId, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const seleccionado = empleados.find((e) => e.id === empleadoId) ?? null;

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(320, window.innerWidth - margen * 2);
    const alto = 300;
    const abajo = t.bottom + margen + alto <= window.innerHeight;
    const top = abajo ? t.bottom + margen : Math.max(margen, t.top - margen - alto);
    const left = Math.min(Math.max(margen, t.left), window.innerWidth - ancho - margen);
    setPos({ top, left, ancho });
  }

  useEffect(() => {
    if (!abierto) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia la búsqueda al cerrar por cualquier vía
      setBusqueda("");
      return;
    }
    ubicar();
    buscadorRef.current?.focus();
    function onFuera(e: MouseEvent) {
      const n = e.target as Node;
      if (!popoverRef.current?.contains(n) && !triggerRef.current?.contains(n)) setAbierto(false);
    }
    function onTecla(e: KeyboardEvent) {
      if (e.key === "Escape") { setAbierto(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("mousedown", onFuera);
    document.addEventListener("keydown", onTecla);
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    return () => {
      document.removeEventListener("mousedown", onFuera);
      document.removeEventListener("keydown", onTecla);
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto]);

  const filtrados = empleados
    .filter((e) => e.activo)
    .filter((e) => coincideBusqueda(`${e.nombres} ${e.apellidos}`, busqueda));

  function seleccionar(id: string) {
    onChange(id);
    setAbierto(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Empleado asignado"
        className="input flex w-full items-center gap-2"
      >
        <User size={15} className="shrink-0 text-slate-400" />
        <span className={seleccionado ? "flex-1 truncate text-left" : "flex-1 text-left text-slate-500 dark:text-slate-500"}>
          {seleccionado ? `${seleccionado.nombres} ${seleccionado.apellidos}` : "Sin asignar"}
        </span>
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Elegir empleado"
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 flex flex-col p-3 shadow-xl"
        >
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscadorRef}
              placeholder="Buscar empleado por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input w-full pl-8"
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => seleccionar("")}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                !empleadoId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="row-avatar h-8 w-8 shrink-0"><User size={14} /></span>
              <span className="font-medium text-slate-500 dark:text-slate-500">Sin asignar</span>
            </button>
            {filtrados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-500">Sin resultados.</p>
            ) : (
              filtrados.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => seleccionar(e.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    e.id === empleadoId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="row-avatar h-8 w-8 shrink-0"><User size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900 dark:text-slate-100">{e.nombres} {e.apellidos}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-500">{nombreRol(e.rol)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
