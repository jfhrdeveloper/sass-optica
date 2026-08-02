"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/* `BarcodeDetector` es una API nativa del navegador (Chrome/Edge/Android,
   sin soporte en Safari/Firefox todavía) — se usa así en vez de sumar una
   librería (zxing/quagga/html5-qrcode) porque cubre el caso real del
   proyecto (mostrador con celular Android, ver docs/architecture.md) sin
   una dependencia nueva. TypeScript todavía no la tiene en `lib.dom.d.ts`
   en todas las versiones, así que se declara acá el shape mínimo que se usa. */
interface BarcodeDetectorResult { rawValue: string }
interface BarcodeDetectorInstance { detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]> }
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorInstance;

function soportaEscaneo(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onDetectado: (codigo: string) => void;
}

/* Modal centrado (mismo patrón que ConfirmDialog.tsx) que abre la cámara
   trasera del celular y detecta un código de barras en vivo — pensado para
   Stock (buscar un producto) y Ventas (agregar un ítem) sin escribir el
   código a mano. Se detiene solo apenas encuentra uno, no hace falta que
   el usuario confirme nada. */
export function EscanerCodigoBarras({ abierto, onCerrar, onDetectado }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectandoRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (!soportaEscaneo()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- BarcodeDetector solo existe en `window`, no hay forma de saberlo antes de montar en el cliente
      setError("Tu navegador no soporta escaneo de códigos de barras. Probá con Chrome/Edge en Android, o escribí el código a mano.");
      return;
    }
    setError(null);
    let activo = true;
    let intervalo: ReturnType<typeof setInterval> | undefined;

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!activo) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] });

        intervalo = setInterval(async () => {
          if (!videoRef.current || detectandoRef.current) return;
          detectandoRef.current = true;
          try {
            const resultados = await detector.detect(videoRef.current);
            if (resultados[0]?.rawValue) onDetectado(resultados[0].rawValue);
          } catch {
            // Frame sin decodificar (movimiento, fuera de foco) — se reintenta solo en el próximo tick.
          } finally {
            detectandoRef.current = false;
          }
        }, 300);
      } catch {
        if (activo) setError("No se pudo acceder a la cámara. Revisá los permisos del navegador.");
      }
    }
    void iniciar();

    return () => {
      activo = false;
      if (intervalo) clearInterval(intervalo);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [abierto, onDetectado]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCerrar(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onCerrar} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Camera size={16} /> Escanear código de barras
          </h3>
          <button onClick={onCerrar} aria-label="Cerrar" className="row-icon-btn">
            <X size={16} />
          </button>
        </div>
        {error ? (
          <p className="p-5 text-sm text-slate-500 dark:text-slate-400">{error}</p>
        ) : (
          <div className="relative aspect-square w-full bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          </div>
        )}
      </div>
    </div>
  );
}
