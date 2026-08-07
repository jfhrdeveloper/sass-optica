"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Package } from "lucide-react";
import type { Producto } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/formato/texto";

interface Props {
  productos: Producto[];
  productoId: string;
  onChange: (id: string) => void;
}

/* Variante "popover" del selector de producto — mismo patrón (botón +
   popover con buscador) que ClienteCombobox.tsx, para probar en vivo contra
   ProductoBuscadorInline.tsx (variante simple, sin popover) y decidir cuál
   se queda. Reemplaza el <select> plano de toda la lista de productos, que
   con un catálogo real (cientos de ítems) se vuelve una lista interminable
   sin forma de buscar. Sin "+ Nuevo producto" a propósito, a diferencia de
   ClienteCombobox — pedido explícito del usuario: acá solo hace falta
   buscar, dar de alta un producto nuevo sigue siendo flujo de /dashboard/productos. */
export function ProductoCombobox({ productos, productoId, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const seleccionado = productos.find((p) => p.id === productoId) ?? null;

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(360, window.innerWidth - margen * 2);
    const alto = 320;
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

  const filtrados = productos
    .filter((p) => p.activo)
    .filter((p) => coincideBusqueda(`${p.nombre} ${p.codigo ?? ""} ${p.marca ?? ""}`, busqueda));

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
        aria-label="Producto"
        className="input flex w-full items-center gap-2"
      >
        <Package size={15} className="shrink-0 text-slate-400" />
        <span className={seleccionado ? "flex-1 truncate text-left" : "flex-1 text-left text-slate-500 dark:text-slate-500"}>
          {seleccionado ? `${seleccionado.nombre} — S/ ${seleccionado.precioVenta.toFixed(2)}` : "Buscar producto…"}
        </span>
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Elegir producto"
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 flex flex-col p-3 shadow-xl"
        >
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscadorRef}
              placeholder="Buscar por nombre, código o marca…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input w-full pl-8"
            />
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-500">Sin resultados.</p>
            ) : (
              filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => seleccionar(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    p.id === productoId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="row-avatar h-8 w-8 shrink-0"><Package size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900 dark:text-slate-100">{p.nombre}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-500">
                      {p.codigo ? `${p.codigo} · ` : ""}Stock {p.stockActual}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-700 dark:text-slate-200">S/ {p.precioVenta.toFixed(2)}</span>
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
