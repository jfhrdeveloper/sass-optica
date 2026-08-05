"use client";

import { useState } from "react";
import { Camera, Clock, MapPin } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { sugerirEstadoAsistencia } from "@/lib/asistencia";
import { archivoABase64 } from "@/lib/archivo";

function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* Flujo de "marcar entrada" compartido entre /dashboard/asistencia y el
   auto-popup al ingresar (AsistenciaPrompt.tsx) — mismo criterio EXACTO que
   tramys-rrhh (ModalAsistencia.tsx): la sede del día solo se pregunta acá
   (la SALIDA la hereda, no se vuelve a preguntar) detrás de un link discreto
   "¿Hoy trabajas en otra sede?" para no molestar al caso común (misma sede
   de siempre); la foto es opcional vía `capture="environment"` (abre la
   cámara trasera en mobile, no la galería). */
export function MarcarEntradaForm({ onMarcado }: { onMarcado?: () => void }) {
  const { marcarAsistencia, sucursales } = useData();
  const { empleado } = useSession();
  const toast = useToast();

  const sedesActivas = sucursales.filter((s) => s.activo);
  const esMultisede = sedesActivas.length > 0;
  const [eligiendoSede, setEligiendoSede] = useState(false);
  const [sedeSel, setSedeSel] = useState(empleado?.sucursalId ?? "");
  const [foto, setFoto] = useState<string | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [marcando, setMarcando] = useState(false);

  async function onElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesandoFoto(true);
    try {
      setFoto(await archivoABase64(file));
    } catch {
      toast("No se pudo procesar la foto.", "error");
    } finally {
      setProcesandoFoto(false);
    }
  }

  async function marcar() {
    if (!empleado) return;
    setMarcando(true);
    const hora = horaActual();
    const estado = sugerirEstadoAsistencia(hora, empleado.horaEntradaEsperada, empleado.toleranciaTardanzaMin);
    // Solo se manda sucursalId si ELIGIÓ una distinta a su sede habitual —
    // si no, la fila queda sin sede propia (hereda el criterio normal de
    // "sin sede fija = todas", igual que el resto de la app).
    const sucursalId = sedeSel && sedeSel !== (empleado.sucursalId ?? "") ? sedeSel : undefined;
    await marcarAsistencia({
      empleadoId: empleado.id, horaEntrada: hora, estado, marcadoPor: "empleado",
      ...(sucursalId ? { sucursalId } : {}),
      ...(foto ? { fotoBase64: foto } : {}),
    });
    setMarcando(false);
    toast(estado === "tarde" ? "Entrada marcada — llegaste tarde." : "Entrada marcada.");
    onMarcado?.();
  }

  return (
    <div className="space-y-3">
      {esMultisede && (
        !eligiendoSede ? (
          <button
            type="button"
            onClick={() => setEligiendoSede(true)}
            className="flex h-11 items-center gap-1.5 text-xs text-slate-500 underline dark:text-slate-400"
          >
            <MapPin size={12} /> ¿Hoy trabajas en otra sede? Elígela
          </button>
        ) : (
          <div>
            <label className="form-label">¿Dónde trabajas hoy?</label>
            <select value={sedeSel} onChange={(e) => setSedeSel(e.target.value)} className="select h-11 w-full sm:h-auto">
              {sedesActivas.map((s) => (
                <option key={s.id} value={s.id}>{s.id === empleado?.sucursalId ? `${s.nombre} (tu sede)` : s.nombre}</option>
              ))}
            </select>
            {sedeSel && sedeSel !== (empleado?.sucursalId ?? "") && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Marcarás como visita en otra sede.</p>
            )}
          </div>
        )
      )}

      {foto ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI en memoria, no un asset de next/image */}
          <img src={foto} alt="" className="h-11 w-11 rounded-lg object-cover" />
          <button type="button" onClick={() => setFoto(null)} className="h-11 text-xs text-red-600 underline dark:text-red-400">
            Quitar foto
          </button>
        </div>
      ) : (
        <label className={`flex h-11 w-fit items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ${procesandoFoto ? "opacity-60" : "cursor-pointer"}`}>
          <Camera size={14} />
          {procesandoFoto ? "Procesando foto…" : "+ Adjuntar foto (opcional)"}
          <input type="file" accept="image/*" capture="environment" disabled={procesandoFoto} onChange={onElegirFoto} className="hidden" />
        </label>
      )}

      <button type="button" onClick={marcar} disabled={marcando || !empleado} className="btn-primary h-11 w-full gap-1.5 sm:h-auto">
        <Clock size={16} /> {marcando ? "Marcando…" : "Marcar entrada"}
      </button>
    </div>
  );
}
