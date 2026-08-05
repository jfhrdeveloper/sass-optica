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
      <form onSubmit={onSubmitValidado} noValidate>
        {paso === 1 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Datos básicos</p>
            <div>
              <label className="form-label">Nombres <span className="text-red-500">*</span></label>
              <input placeholder="Ej. María" required value={form.nombres ?? ""} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Apellidos</label>
              <input placeholder="Ej. Gonzáles" value={form.apellidos ?? ""} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Tipo de documento</label>
                <select value={form.documentoTipo ?? "DNI"} onChange={(e) => setForm({ ...form, documentoTipo: e.target.value })} className="select h-11 w-full sm:h-auto">
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="RUC">RUC</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="form-label">N.º de documento</label>
                <input placeholder="Ej. 12345678" value={form.documentoNumero ?? ""} onChange={(e) => setForm({ ...form, documentoNumero: e.target.value })} className="input h-11 w-full sm:h-auto" />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500"><span className="text-red-500">*</span> Campo obligatorio</p>
            <button type="button" disabled={!form.nombres} onClick={() => setPaso(2)} className="btn-primary mt-2 h-11 w-full sm:h-auto">
              Siguiente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">Contacto y notas</p>
            <div>
              <label className="form-label">Teléfono</label>
              <input placeholder="Ej. 987654321" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                placeholder="Ej. maria@correo.com" type="email" value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={emailInvalido}
                className={`input h-11 w-full sm:h-auto ${emailInvalido ? "border-red-400 dark:border-red-500/60" : ""}`}
              />
              {emailInvalido && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Ese correo no parece válido.</p>}
            </div>
            <div>
              <label className="form-label">Fecha de nacimiento</label>
              <DatePicker etiqueta="Fecha de nacimiento" placeholder="Elegir fecha" valor={form.fechaNacimiento ?? ""} onChange={(v) => setForm({ ...form, fechaNacimiento: v || undefined })} />
            </div>
            <div>
              <label className="form-label">Dirección</label>
              <input placeholder="Ej. Av. Los Álamos 123" value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input h-11 w-full sm:h-auto" />
            </div>
            <div>
              <label className="form-label">Notas</label>
              <textarea placeholder="Cualquier detalle adicional" value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input w-full" rows={3} />
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setPaso(1)} className="btn-outline h-11 flex-1 sm:h-auto">Atrás</button>
              <button type="submit" disabled={guardando || emailInvalido} className="btn-primary h-11 flex-1 sm:h-auto">
                {editandoId ? "Guardar cambios" : "Agregar cliente"}
              </button>
            </div>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
