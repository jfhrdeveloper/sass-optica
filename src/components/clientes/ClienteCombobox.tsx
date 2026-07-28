"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, User, X } from "lucide-react";
import type { Cliente } from "@/components/providers/DataProvider";
import { coincideBusqueda } from "@/lib/texto";

interface Props {
  clientes: Cliente[];
  clienteId: string;
  onChange: (id: string) => void;
  /** true si el cliente NO tiene historial previo (primera cita) — lo decide
   *  el padre (citas/page.tsx), que es quien conoce `citas` y sabe excluir
   *  la cita que se está editando de su propio historial. */
  esNuevo: (clienteId: string) => boolean;
}

type Filtro = "todos" | "nuevos" | "antiguos";

/* Selector de cliente para "Agendar cita" — reemplaza el <select> plano
   (sin buscador, sin forma de distinguir un cliente nuevo de uno con
   historial) por un combobox: buscar por nombre/documento + filtrar por
   Nuevo/Antiguo, mismo patrón visual (botón + popover) que DatePicker/
   TimePicker. */
export function ClienteCombobox({ clientes, clienteId, onChange, esNuevo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);

  const seleccionado = clientes.find((c) => c.id === clienteId) ?? null;

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    const ancho = Math.min(320, window.innerWidth - margen * 2);
    const alto = 340;
    const abajo = t.bottom + margen + alto <= window.innerHeight;
    const top = abajo ? t.bottom + margen : Math.max(margen, t.top - margen - alto);
    const left = Math.min(Math.max(margen, t.left), window.innerWidth - ancho - margen);
    setPos({ top, left, ancho });
  }

  useEffect(() => {
    if (!abierto) return;
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

  const filtrados = clientes
    .filter((c) => coincideBusqueda(`${c.nombres} ${c.apellidos} ${c.documentoNumero ?? ""}`, busqueda))
    .filter((c) => {
      if (filtro === "todos") return true;
      return filtro === "nuevos" ? esNuevo(c.id) : !esNuevo(c.id);
    });

  function seleccionar(id: string) {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Cliente"
        className="input flex w-full items-center gap-2 text-sm"
      >
        <User size={15} className="shrink-0 text-slate-400" />
        <span className={seleccionado ? "flex-1 truncate text-left" : "flex-1 text-left text-slate-400 dark:text-slate-500"}>
          {seleccionado ? `${seleccionado.nombres} ${seleccionado.apellidos}` : "Cliente…"}
        </span>
        {seleccionado && (
          <span className={`badge shrink-0 ${esNuevo(seleccionado.id) ? "badge-warning" : "badge-neutral"}`}>
            {esNuevo(seleccionado.id) ? "Nuevo" : "Antiguo"}
          </span>
        )}
        {seleccionado && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Quitar cliente"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChange(""); } }}
            className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Elegir cliente"
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 flex flex-col p-3 shadow-xl"
        >
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={buscadorRef}
              placeholder="Buscar por nombre o documento…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input w-full pl-8 text-sm"
            />
          </div>

          <div className="mt-2 flex gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
            {([["todos", "Todos"], ["nuevos", "Nuevos"], ["antiguos", "Antiguos"]] as [Filtro, string][]).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFiltro(v)}
                className={`flex-1 rounded-full py-1 font-medium transition-colors ${
                  filtro === v ? "bg-primary text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">Sin resultados.</p>
            ) : (
              filtrados.map((c) => {
                const nuevo = esNuevo(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionar(c.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      c.id === clienteId ? "bg-primary-light" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="row-avatar h-8 w-8 shrink-0"><User size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900 dark:text-slate-100">{c.nombres} {c.apellidos}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">{c.documentoTipo} {c.documentoNumero ?? "—"}</span>
                    </span>
                    <span className={`badge shrink-0 ${nuevo ? "badge-warning" : "badge-neutral"}`}>{nuevo ? "Nuevo" : "Antiguo"}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
