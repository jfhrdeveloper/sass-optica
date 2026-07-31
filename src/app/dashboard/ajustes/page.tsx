"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SettingsTabs, TABS_AJUSTES } from "@/components/dashboard/SettingsTabs";
import { ColorWell } from "@/components/ui/ColorWell";
import { prepararImagen, ImagenInvalidaError } from "@/lib/imagen";

const COLOR_DEFECTO = "#2563eb";

/* Ruta protegida a nivel de proxy (rutasSoloAdministrador) — solo
   administrador llega hasta aquí. "Desactivar negocio" en vez de un
   DELETE real: negocios.activo=false ya hace que el proxy bloquee el
   acceso de todo el equipo (mismo camino que un negocio suspendido por
   impago) — reversible por soporte, mucho menos destructivo que borrar
   filas con cascade. */
export default function AjustesPage() {
  const { negocio, updateNegocio } = useData();
  const { signOut } = useSession();
  const toast = useToast();
  const [form, setForm] = useState({
    nombre: negocio?.nombre ?? "", ruc: negocio?.ruc ?? "",
    telefono: negocio?.telefono ?? "", direccion: negocio?.direccion ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [colorPrimario, setColorPrimario] = useState(negocio?.colorPrimario ?? COLOR_DEFECTO);
  const [confirmando, setConfirmando] = useState(false);
  const [desactivando, setDesactivando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  async function guardarDatos(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await updateNegocio(form);
    setGuardando(false);
  }

  async function guardarColor() {
    await updateNegocio({ colorPrimario });
  }

  /* `prepararImagen` valida tipo/tamaño y redimensiona a 512px antes de
     codificar — antes esto era un FileReader crudo que guardaba el archivo
     tal cual llegara (una foto de celular sin comprimir podía pesar 20MB en
     base64), y `negocios.logo_url` se lee en CADA carga del dashboard. */
  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo tras un error
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const dataUrl = await prepararImagen(file);
      await updateNegocio({ logoUrl: dataUrl });
      toast("Logo actualizado.");
    } catch (err) {
      toast(err instanceof ImagenInvalidaError ? err.message : "No se pudo procesar la imagen.", "error");
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function desactivarNegocio() {
    setDesactivando(true);
    await updateNegocio({ activo: false });
    signOut();
  }

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ajustes</h1>
      <SettingsTabs tabs={TABS_AJUSTES} />

      <form onSubmit={guardarDatos} className="card mt-4 space-y-3 p-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Datos del negocio</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input placeholder="Nombre del negocio" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input text-sm" />
          <input placeholder="RUC" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} className="input text-sm" />
          <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input text-sm" />
          <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input text-sm" />
        </div>
        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <div className="card mt-4 space-y-4 p-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Personalización de marca</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Logo y color de acento. Se ven en todo el panel: los botones y resaltados usan este color.
        </p>

        <div className="flex items-center gap-4">
          {negocio?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={negocio.logoUrl} alt="Logo del negocio" className="h-14 w-14 rounded-lg border border-slate-200 dark:border-slate-800 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">Sin logo</div>
          )}
          <label className={`btn-outline cursor-pointer ${subiendoLogo ? "pointer-events-none opacity-50" : ""}`}>
            {subiendoLogo ? "Procesando…" : "Subir logo"}
            <input type="file" accept="image/*" onChange={onLogo} disabled={subiendoLogo} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG o WebP. Máximo 8MB.</p>

        <div className="flex items-center gap-3">
          <ColorWell valor={colorPrimario} onChange={setColorPrimario} />
          <span className="text-sm text-slate-500 dark:text-slate-400">{colorPrimario}</span>
          <button onClick={guardarColor} className="btn-outline ml-auto">Aplicar color</button>
        </div>
      </div>

      <div className="card mt-6 border-red-200 p-4 dark:border-red-500/20">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle size={18} />
          <h2 className="font-medium">Zona de peligro</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Desactivar tu negocio bloquea el acceso de todo el equipo, tuyo incluido, de inmediato. Es reversible:
          escríbele a soporte y lo reactivamos.
        </p>
        {!confirmando ? (
          <button onClick={() => setConfirmando(true)} className="btn-outline mt-3 border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10">
            Desactivar negocio
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={desactivarNegocio} disabled={desactivando}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {desactivando ? "Desactivando…" : "Sí, desactivar de todas formas"}
            </button>
            <button onClick={() => setConfirmando(false)} className="text-sm font-medium link-muted">Cancelar</button>
          </div>
        )}
      </div>
    </main>
  );
}
