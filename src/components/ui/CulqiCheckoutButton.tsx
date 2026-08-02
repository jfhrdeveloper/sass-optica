"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";

/* ================= CULQI CHECKOUT EMBEBIDO =================
   Carga el script v4 de Culqi (checkout embebido en la propia página, sin
   redirección externa — brief §8). Al completar el pago, Culqi entrega un
   token vía el callback global `window.culqi`; ese token se envía a
   /api/pagos/culqi/cargo (server-side, con CULQI_SECRET_KEY) para crear el
   cargo real. NUNCA se crea el cargo desde el navegador.

   NOTA: la forma exacta de Culqi.settings()/Culqi.options() puede variar
   entre versiones de su SDK — verificar contra la documentación oficial de
   Culqi al conectar credenciales reales por primera vez. */

declare global {
  interface Window {
    Culqi?: {
      publicKey: string;
      settings: (opts: Record<string, unknown>) => void;
      options: (opts: Record<string, unknown>) => void;
      open: () => void;
      close: () => void;
      token?: { id: string };
      error?: { user_message?: string; merchant_message?: string };
    };
    culqi?: () => void;
  }
}

interface Props {
  /** Solo para lo que Culqi muestra en su propio modal — el monto que
   *  realmente se cobra lo recalcula el servidor a partir de `planId` +
   *  `ciclo` (ver /api/pagos/culqi/cargo), nunca confía en este valor. */
  montoCentimos: number;
  planId: string;
  ciclo: "mensual" | "anual";
  tituloNegocio: string;
  onExito: () => void;
}

export function CulqiCheckoutButton({ montoCentimos, planId, ciclo, tituloNegocio, onExito }: Props) {
  const [scriptListo, setScriptListo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;

  const confirmarCargo = useCallback(async (token: string) => {
    setProcesando(true);
    setError(null);
    try {
      const res = await fetch("/api/pagos/culqi/cargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, planId, ciclo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar el pago.");
        setProcesando(false);
        return;
      }
      onExito();
    } catch {
      setError("No se pudo confirmar el pago. Intenta de nuevo.");
      setProcesando(false);
    }
  }, [onExito, planId, ciclo]);

  useEffect(() => {
    if (!scriptListo || !window.Culqi) return;

    window.Culqi.publicKey = publicKey ?? "";
    window.Culqi.settings({
      title: tituloNegocio,
      currency: "PEN",
      amount: montoCentimos,
    });
    window.Culqi.options({
      lang: "auto",
      installments: false,
      paymentMethods: { tarjeta: true, yape: true },
    });

    window.culqi = () => {
      const culqi = window.Culqi;
      if (!culqi) return;
      if (culqi.token) {
        void confirmarCargo(culqi.token.id);
      } else if (culqi.error) {
        setError(culqi.error.user_message ?? "No se pudo procesar el pago.");
        setProcesando(false);
      }
    };
  }, [scriptListo, publicKey, tituloNegocio, montoCentimos, confirmarCargo]);

  if (!publicKey) {
    return (
      <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Culqi no está configurado todavía (falta <code>NEXT_PUBLIC_CULQI_PUBLIC_KEY</code>).
      </p>
    );
  }

  return (
    <>
      <Script src="https://checkout.culqi.com/js/v4" onReady={() => setScriptListo(true)} />
      <button
        onClick={() => window.Culqi?.open()}
        disabled={!scriptListo || procesando}
        className="btn-primary"
      >
        {procesando ? "Procesando…" : `Pagar S/ ${(montoCentimos / 100).toFixed(2)}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}
