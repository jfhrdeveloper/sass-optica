"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Tag } from "lucide-react";
import type { Descuento } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";

interface Props {
  descuentos: Descuento[];
  codigo: string;
  onChange: (codigo: string) => void;
}

/* Mismo patrón botón + popover con buscador que ProductoCombobox/
   SucursalCombobox — con muchas campañas activas a la vez (cada una vive
   más de un mes, es fácil terminar con 20-30 vigentes) el <select> plano
   se vuelve tan largo como el de producto era antes. */
export function DescuentoCombobox({ descuentos, codigo, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const seleccionado = descuentos.find((d) => d.codigo === codigo) ?? null;

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(300, window.innerWidth - margen * 2);
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

  const filtrados = descuentos.filter((d) => coincideBusqueda(d.codigo, busqueda));

  function seleccionar(cod: string) {
    onChange(cod);
    setAbierto(false);
  }

  function etiquetaValor(d: Descuento) {
    return d.tipo === "porcentaje" ? `${d.valor}%` : `S/ ${d.valor.toFixed(2)}`;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Código de descuento"
        className="input flex w-full items-center gap-2 sm:w-48"
      >
        <Tag size={15} className="shrink-0 text-slate-400" />
        <span className={seleccionado ? "flex-1 truncate text-left" : "flex-1 text-left text-slate-500 dark:text-slate-500"}>
          {seleccionado ? `${seleccionado.codigo} — ${etiquetaValor(seleccionado)}` : "Sin descuento"}
        </span>
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Elegir código de descuento"
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 flex flex-col p-3 shadow-xl"
        >
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscadorRef}
              placeholder="Buscar código…"
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
                !codigo ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="row-avatar h-8 w-8 shrink-0"><Tag size={14} /></span>
              <span className="font-medium text-slate-500 dark:text-slate-500">Sin descuento</span>
            </button>
            {filtrados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-500">Sin resultados.</p>
            ) : (
              filtrados.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => seleccionar(d.codigo)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    d.codigo === codigo ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="row-avatar h-8 w-8 shrink-0"><Tag size={14} /></span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-100">{d.codigo}</span>
                  <span className="shrink-0 font-medium text-accent">{etiquetaValor(d)}</span>
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
