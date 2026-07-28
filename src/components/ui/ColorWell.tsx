"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pipette } from "lucide-react";
import { PALETA_MARCA, esHexValido, sirveParaTextoBlanco, contraste } from "@/lib/formato/color";

interface Props {
  valor: string;
  onChange: (hex: string) => void;
  etiqueta?: string;
}

/* Selector de color de marca. Reemplaza al `<input type="color">`, que abre
   el panel de color del sistema operativo — distinto en cada SO, imposible de
   ajustar al diseño, y sobre todo SIN límites: dejaba elegir cualquier color,
   incluso los que vuelven ilegible el texto blanco de los botones.

   Estructura (mismos nombres que un color well nativo): el swatch muestra el
   color actual y abre el popover; el popover trae la grilla de swatches
   permitidos y el gotero. */
export function ColorWell({ valor, onChange, etiqueta = "Color de marca" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; ancho: number } | null>(null);
  const [hex, setHex] = useState(valor);
  const [soportaGotero, setSoportaGotero] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  /* La EyeDropper API solo existe en navegadores Chromium. Se detecta en un
     efecto y no en el render para no romper la hidratación: el servidor no
     tiene `window`, así que el primer render del cliente debe coincidir con
     el del servidor. Es la excepción legítima a la regla — sincronizar con
     un API del navegador ausente en SSR, mismo caso que ThemeToggle.tsx. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detecta un API del navegador que no existe en SSR
    setSoportaGotero("EyeDropper" in window);
  }, []);

  /* El hex escrito a mano es un borrador local; se resetea al valor real al
     ABRIR el popover (evento del usuario), no con un efecto que espeje la
     prop en cada render. */
  function alternar() {
    setHex(valor);
    setAbierto((v) => !v);
  }

  function ubicar() {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const margen = 8;
    /* Ancho clampeado al viewport disponible — mismo fix que
       DateRangePicker.tsx: sin esto, en una pantalla más angosta que
       `anchoDeseado + margen*2` el popover queda con `left` negativo,
       cortado por el borde. */
    const ancho = Math.min(264, window.innerWidth - margen * 2);
    const alto = 280;
    const abajo = t.bottom + margen + alto <= window.innerHeight;
    setPos({
      top: abajo ? t.bottom + margen : Math.max(margen, t.top - margen - alto),
      left: Math.min(Math.max(margen, t.left), window.innerWidth - ancho - margen),
      ancho,
    });
  }

  useEffect(() => {
    if (!abierto) return;
    ubicar();
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

  function elegir(nuevo: string) {
    onChange(nuevo);
    setAbierto(false);
  }

  async function gotero() {
    try {
      const EyeDropper = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const { sRGBHex } = await new EyeDropper().open();
      setHex(sRGBHex);
      if (sirveParaTextoBlanco(sRGBHex)) elegir(sRGBHex);
    } catch {
      /* El usuario canceló el gotero (Escape): no es un error que reportar. */
    }
  }

  const hexOk = esHexValido(hex);
  const hexLegible = hexOk && sirveParaTextoBlanco(hex);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={alternar}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${etiqueta}: ${valor}`}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1 pr-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <span
          className="h-7 w-7 rounded-full border border-black/10"
          style={{ backgroundColor: valor }}
          aria-hidden="true"
        />
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {abierto && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={etiqueta}
          style={{ top: pos.top, left: pos.left, width: pos.ancho }}
          className="card fixed z-50 p-3 shadow-xl"
        >
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Colores disponibles</p>
          <div className="grid grid-cols-7 gap-1.5">
            {PALETA_MARCA.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => elegir(c.hex)}
                title={`${c.nombre} · ${c.hex}`}
                aria-label={c.nombre}
                aria-pressed={valor.toLowerCase() === c.hex.toLowerCase()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 transition-transform hover:scale-110"
                style={{ backgroundColor: c.hex }}
              >
                {valor.toLowerCase() === c.hex.toLowerCase() && <Check size={14} className="text-white" />}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="hex-marca">
              O escribe un color
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                id="hex-marca"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                placeholder="#2563EB"
                spellCheck={false}
                className="input w-full text-sm"
              />
              {soportaGotero && (
                <button
                  type="button"
                  onClick={gotero}
                  title="Tomar un color de la pantalla"
                  aria-label="Tomar un color de la pantalla"
                  className="shrink-0 rounded-full border border-slate-300 p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Pipette size={14} />
                </button>
              )}
            </div>

            {/* Se avisa POR QUÉ no se puede usar, en vez de rechazarlo en
                silencio: el color se aplica a botones con texto blanco. */}
            {hexOk && !hexLegible && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Muy claro para texto blanco ({contraste(hex, "#FFFFFF").toFixed(1)}:1, hace falta 4.5:1).
              </p>
            )}
            <button
              type="button"
              disabled={!hexLegible}
              onClick={() => elegir(hex.toUpperCase())}
              className="btn-primary mt-2 w-full text-sm disabled:cursor-not-allowed"
            >
              Usar este color
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
