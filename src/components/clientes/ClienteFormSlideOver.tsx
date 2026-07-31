"use client";

import { SlideOver } from "@/components/ui/SlideOver";
import { Stepper } from "@/components/ui/Stepper";
import { DatePicker } from "@/components/calendario/DatePicker";
import type { ClienteFormState } from "@/lib/hooks/useClienteForm";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Wizard de alta/edición de cliente — compartido entre clientes/page.tsx
   (botón "Nuevo cliente" y la columna Editar) y clientes/[id]/page.tsx (el
   botón "Editar" de la ficha), para no mantener el mismo formulario en dos
   archivos. Todo el estado vive en useClienteForm(). */
export function ClienteFormSlideOver({ estado }: { estado: ClienteFormState }) {
  const { form, setForm, editandoId, abierto, paso, setPaso, guardando, cerrar, onSubmit } = estado;
  const emailInvalido = Boolean(form.email) && !REGEX_EMAIL.test(form.email!);

  function onSubmitValidado(e: React.FormEvent) {
    e.preventDefault();
    if (emailInvalido) return;
    onSubmit(e);
  }

  return (
    <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar cliente" : "Nuevo cliente"}>
      <Stepper paso={paso} total={2} />
      {/* noValidate: la validación de email es propia (mensaje inline con el
          resto del design system), no el tooltip nativo del navegador. */}
      <form onSubmit={onSubmitValidado} noValidate className="flex h-full flex-col">
        {paso === 1 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Datos básicos</p>
            <input placeholder="Nombres" required value={form.nombres ?? ""} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="input w-full text-sm" />
            <input placeholder="Apellidos" value={form.apellidos ?? ""} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="input w-full text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.documentoTipo ?? "DNI"} onChange={(e) => setForm({ ...form, documentoTipo: e.target.value })} className="select text-sm">
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="RUC">RUC</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
              <input placeholder="N.º de documento" value={form.documentoNumero ?? ""} onChange={(e) => setForm({ ...form, documentoNumero: e.target.value })} className="input text-sm" />
            </div>
            <button type="button" disabled={!form.nombres} onClick={() => setPaso(2)} className="btn-primary mt-2 w-full">
              Siguiente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Contacto y notas</p>
            <input placeholder="Teléfono" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input w-full text-sm" />
            <div>
              <input
                placeholder="Email" type="email" value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={emailInvalido}
                className={`input w-full text-sm ${emailInvalido ? "border-red-400 dark:border-red-500/60" : ""}`}
              />
              {emailInvalido && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Ese correo no parece válido.</p>}
            </div>
            <DatePicker etiqueta="Fecha de nacimiento" placeholder="Fecha de nacimiento" valor={form.fechaNacimiento ?? ""} onChange={(v) => setForm({ ...form, fechaNacimiento: v || undefined })} />
            <input placeholder="Dirección" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input w-full text-sm" />
            <textarea placeholder="Notas" value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input w-full text-sm" rows={3} />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setPaso(1)} className="btn-outline flex-1">Atrás</button>
              <button type="submit" disabled={guardando || emailInvalido} className="btn-primary flex-1">
                {editandoId ? "Guardar cambios" : "Agregar cliente"}
              </button>
            </div>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
