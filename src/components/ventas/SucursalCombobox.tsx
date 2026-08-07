"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Store } from "lucide-react";
import type { Sucursal } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";

interface Props {
  sucursales: Sucursal[];
  sucursalId: string;
  onChange: (id: string) => void;
}

/* Mismo patrón botón + popover con buscador que ProductoCombobox/
   ClienteCombobox — un negocio real con varias sedes (o los ~50 de los
   datos de stress) vuelve el <select> plano tan largo como el de producto
   era antes. Solo se usa cuando el empleado NO tiene sede fija (ver
   ventas/page.tsx: con sede fija se muestra una etiqueta bloqueada, sin
   nada que buscar ahí). */
export function SucursalCombobox({ sucursales, sucursalId, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const seleccionada = sucursales.find((s) => s.id === sucursalId) ?? null;

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

  const filtradas = sucursales
    .filter((s) => s.activo)
    .filter((s) => coincideBusqueda(`${s.nombre} ${s.direccion ?? ""}`, busqueda));

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
        aria-label="Sede"
        className="input flex w-full items-center gap-2"
      >
        <Store size={15} className="shrink-0 text-slate-400" />
        <span className={seleccionada ? "flex-1 truncate text-left" : "flex-1 text-left text-slate-500 dark:text-slate-500"}>
          {seleccionada ? seleccionada.nombre : "Sin sede asignada"}
        </span>
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Elegir sede"
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 flex flex-col p-3 shadow-xl"
        >
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscadorRef}
              placeholder="Buscar sede por nombre o dirección…"
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
                !sucursalId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="row-avatar h-8 w-8 shrink-0"><Store size={14} /></span>
              <span className="font-medium text-slate-500 dark:text-slate-500">Sin sede asignada</span>
            </button>
            {filtradas.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-500">Sin resultados.</p>
            ) : (
              filtradas.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => seleccionar(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    s.id === sucursalId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="row-avatar h-8 w-8 shrink-0"><Store size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900 dark:text-slate-100">{s.nombre}</span>
                    {s.direccion && <span className="block truncate text-xs text-slate-500 dark:text-slate-500">{s.direccion}</span>}
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
