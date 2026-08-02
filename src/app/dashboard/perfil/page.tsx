"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { isMockMode } from "@/lib/mock/mock-mode";
import { prepararImagen, ImagenInvalidaError } from "@/lib/imagen";
import { nombreRol } from "@/lib/roles";

/* Perfil PERSONAL del empleado logueado — distinto de "Perfil del negocio"
   (AjustesPage), que es del tenant y solo ve el administrador. Se llega acá
   únicamente desde el menú de cuenta (DashboardTopbar.tsx), no desde el
   sidebar: no es un módulo de negocio, es la cuenta de quien está adentro,
   así que cualquier rol la ve igual. */
export default function PerfilPage() {
  const { updateEmpleado } = useData();
  /* `useSession().empleado` ya sale de `DataProvider.empleados` buscado por
     el id autenticado (ver SessionProvider.tsx) — es el mismo objeto en
     vivo, no hace falta volver a buscarlo acá. */
  const { empleado: yo } = useSession();
  const toast = useToast();
  const mock = isMockMode();

  const [form, setForm] = useState({ nombres: yo?.nombres ?? "", apellidos: yo?.apellidos ?? "" });
  const [guardando, setGuardando] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [quitandoAvatar, setQuitandoAvatar] = useState(false);

  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  async function guardarDatos(e: React.FormEvent) {
    e.preventDefault();
    if (!yo) return;
    setGuardando(true);
    await updateEmpleado(yo.id, { nombres: form.nombres, apellidos: form.apellidos });
    setGuardando(false);
    toast("Perfil actualizado.");
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !yo) return;
    setSubiendoAvatar(true);
    try {
      const dataUrl = await prepararImagen(file);
      await updateEmpleado(yo.id, { avatarBase64: dataUrl });
      toast("Foto actualizada.");
    } catch (err) {
      toast(err instanceof ImagenInvalidaError ? err.message : "No se pudo procesar la imagen.", "error");
    } finally {
      setSubiendoAvatar(false);
    }
  }

  /* `avatarBase64: ""` (no `undefined`) — mismo motivo que quitarLogo() en
     dashboard/ajustes/page.tsx: empleadoToRow solo incluye el campo en el
     patch si es distinto de `undefined`. */
  async function quitarAvatar() {
    if (!yo) return;
    setQuitandoAvatar(true);
    await updateEmpleado(yo.id, { avatarBase64: "" });
    setQuitandoAvatar(false);
    toast("Foto quitada.");
  }

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    setErrorClave(null);
    if (nuevaClave.length < 8) { setErrorClave("La contraseña debe tener al menos 8 caracteres."); return; }
    if (nuevaClave !== confirmarClave) { setErrorClave("Las contraseñas no coinciden."); return; }

    if (mock) {
      toast("Modo mock activo — no se cambian contraseñas reales.", "error");
      return;
    }

    setCambiandoClave(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });
    setCambiandoClave(false);
    if (error) {
      setErrorClave("No se pudo cambiar la contraseña. Intenta de nuevo.");
      return;
    }
    setNuevaClave("");
    setConfirmarClave("");
    toast("Contraseña actualizada.");
  }

  return (
    <main>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Mi perfil</h1>

      <div className="card mt-4 space-y-4 p-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Foto y datos</h2>

        <div className="flex items-center gap-4">
          {yo?.avatarBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={yo.avatarBase64} alt="" className="h-14 w-14 rounded-full border border-slate-200 object-cover dark:border-slate-800" />
          ) : (
            <div className="row-avatar h-14 w-14">
              <UserRound size={22} />
            </div>
          )}
          <div className="flex flex-col items-start gap-1.5">
            <label className={`btn-outline cursor-pointer ${subiendoAvatar ? "pointer-events-none opacity-50" : ""}`}>
              {subiendoAvatar ? "Procesando…" : "Cambiar foto"}
              <input type="file" accept="image/*" onChange={onAvatar} disabled={subiendoAvatar} className="hidden" />
            </label>
            {yo?.avatarBase64 && (
              <button type="button" onClick={quitarAvatar} disabled={quitandoAvatar} className="link-danger text-xs disabled:opacity-50">
                {quitandoAvatar ? "Quitando…" : "Quitar foto"}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={guardarDatos} className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="perfil-nombres">Nombres</label>
              <input
                id="perfil-nombres" value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="perfil-apellidos">Apellidos</label>
              <input
                id="perfil-apellidos" value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>
          <button type="submit" disabled={guardando} className="btn-primary">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <dl className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Email</dt>
            <dd className="text-slate-700 dark:text-slate-200">{yo?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Rol</dt>
            <dd className="text-slate-700 dark:text-slate-200">{yo ? nombreRol(yo.rol) : "—"}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={cambiarClave} className="card mt-4 space-y-3 p-4">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">Cambiar contraseña</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="perfil-clave-nueva">Contraseña nueva</label>
            <input
              id="perfil-clave-nueva" type="password" autoComplete="new-password" minLength={8}
              value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)}
              className="input mt-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="perfil-clave-confirmar">Confirmar contraseña</label>
            <input
              id="perfil-clave-confirmar" type="password" autoComplete="new-password" minLength={8}
              value={confirmarClave} onChange={(e) => setConfirmarClave(e.target.value)}
              className="input mt-1 w-full"
            />
          </div>
        </div>
        {errorClave && <p className="text-sm text-red-600 dark:text-red-400">{errorClave}</p>}
        <button type="submit" disabled={cambiandoClave} className="btn-outline">
          {cambiandoClave ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </form>
    </main>
  );
}
