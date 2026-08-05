"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { RAZON_SOCIAL, RUC, ATENCION_100_VIRTUAL } from "@/lib/contacto";
import { construirHtmlConstanciaReclamo, type DatosReclamo, type TipoReclamo, type TipoBien } from "@/lib/reclamos";

/* `tipo`/`bienTipo` sin default (antes "reclamo"/"servicio") — son
   distinciones legales reales del Libro de Reclamaciones (Reclamo ≠ Queja,
   Producto ≠ Servicio), no un detalle de UI: heredarlas en silencio podría
   dejar mal clasificado el reclamo de alguien que nunca tocó esos campos.
   El tipo local afloja esos 2 campos a `| ""` mientras están sin elegir —
   los radios/`<select>` llevan `required`, así que el navegador bloquea el
   submit hasta que ambos tengan un valor real; para cuando `onSubmit` corre,
   ya son válidos. `consumidorDocumentoTipo: "DNI"` SÍ queda: es el
   documento de la enorme mayoría de quienes llenan este formulario, no una
   clasificación legal que cambie el trámite. */
type FormReclamo = Omit<DatosReclamo, "tipo" | "bienTipo"> & { tipo: TipoReclamo | ""; bienTipo: TipoBien | "" };

const VACIO: FormReclamo = {
  tipo: "",
  consumidorNombres: "", consumidorApellidos: "",
  consumidorDocumentoTipo: "DNI", consumidorDocumentoNumero: "",
  consumidorDomicilio: "", consumidorTelefono: "", consumidorEmail: "",
  esMenorEdad: false, apoderadoNombre: "",
  bienTipo: "", bienDescripcion: "",
  montoReclamado: undefined,
  detalle: "", pedido: "",
};

/* Libro de Reclamaciones exigido por INDECOPI (D.S. 011-2011-PCE) — página
   pública, sin login, autocontenida en el propio dominio (la ley prohíbe
   depender de un formulario o archivo externo, ej. Google Drive). El envío
   pega a /api/libro-reclamaciones (service_role, ver esa ruta) y al
   confirmar arma una constancia imprimible en el propio navegador
   (lib/reclamos.ts + window.print()) — es la copia que la ley exige
   entregarle al consumidor, sin depender de un email/PDF externo tampoco. */
export default function LibroReclamacionesPage() {
  const [form, setForm] = useState<FormReclamo>(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ numero: string; fecha: Date } | null>(null);

  function set<K extends keyof FormReclamo>(campo: K, valor: FormReclamo[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/libro-reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "No se pudo registrar tu reclamo."); return; }
      setConfirmacion({ numero: data.numero, fecha: new Date(data.createdAt) });
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function imprimir() {
    if (!confirmacion) return;
    // Cast seguro: solo se llega a `confirmacion` tras un submit exitoso, y
    // el submit nunca corrió sin `tipo`/`bienTipo` reales (radios/`<select>`
    // `required`, ver VACIO más arriba) — para acá `form` ya es un
    // DatosReclamo completo en los hechos, aunque su tipo local sea más laxo.
    const html = construirHtmlConstanciaReclamo(confirmacion.numero, form as DatosReclamo, confirmacion.fecha);
    const ventana = window.open("", "_blank", "width=420,height=640");
    if (!ventana) return;
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium link">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl text-slate-900 dark:text-slate-100">Libro de Reclamaciones</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Conforme al Código de Protección y Defensa del Consumidor. Datos del proveedor:{" "}
          <strong className="text-slate-700 dark:text-slate-300">{RAZON_SOCIAL}</strong> — RUC {RUC}. {ATENCION_100_VIRTUAL}
        </p>

        {confirmacion ? (
          <div className="card mt-8 p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto text-accent" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Reclamo registrado</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              N° <strong>{confirmacion.numero}</strong> · te responderemos a {form.consumidorEmail} en un plazo
              no mayor a 15 días hábiles.
            </p>
            <button onClick={imprimir} className="btn-primary mt-4 gap-1.5">
              <Printer size={16} /> Descargar/Imprimir constancia
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo</legend>
              <div className="flex gap-4">
                {(["reclamo", "queja"] as TipoReclamo[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input required type="radio" name="tipo" className="radio" checked={form.tipo === t} onChange={() => set("tipo", t)} />
                    {t === "reclamo" ? "Reclamo" : "Queja"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Datos del consumidor</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input required placeholder="Nombres" value={form.consumidorNombres} onChange={(e) => set("consumidorNombres", e.target.value)} className="input" />
                <input required placeholder="Apellidos" value={form.consumidorApellidos} onChange={(e) => set("consumidorApellidos", e.target.value)} className="input" />
                <select value={form.consumidorDocumentoTipo} onChange={(e) => set("consumidorDocumentoTipo", e.target.value)} className="select">
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
                <input required placeholder="N° de documento" value={form.consumidorDocumentoNumero} onChange={(e) => set("consumidorDocumentoNumero", e.target.value)} className="input" />
                <input required placeholder="Domicilio" value={form.consumidorDomicilio} onChange={(e) => set("consumidorDomicilio", e.target.value)} className="input sm:col-span-2" />
                <input placeholder="Teléfono (opcional)" value={form.consumidorTelefono ?? ""} onChange={(e) => set("consumidorTelefono", e.target.value)} className="input" />
                <input required type="email" placeholder="Email" value={form.consumidorEmail} onChange={(e) => set("consumidorEmail", e.target.value)} className="input" />
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input type="checkbox" className="checkbox" checked={form.esMenorEdad} onChange={(e) => set("esMenorEdad", e.target.checked)} />
                Soy menor de edad (un padre o apoderado debe completar y firmar este formulario)
              </label>
              {form.esMenorEdad && (
                <input
                  required placeholder="Nombre del padre, madre o apoderado"
                  value={form.apoderadoNombre ?? ""} onChange={(e) => set("apoderadoNombre", e.target.value)}
                  className="input mt-2 w-full"
                />
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Bien contratado</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select required value={form.bienTipo} onChange={(e) => set("bienTipo", e.target.value as TipoBien)} className="select">
                  <option value="" disabled>Elegir…</option>
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                </select>
                <input
                  type="number" step="0.01" min="0" placeholder="Monto reclamado (S/, opcional)"
                  value={form.montoReclamado ?? ""} onChange={(e) => set("montoReclamado", e.target.value ? Number(e.target.value) : undefined)}
                  className="input"
                />
                <input
                  required placeholder="Descripción (ej. Plan Premium, suscripción de julio)"
                  value={form.bienDescripcion} onChange={(e) => set("bienDescripcion", e.target.value)}
                  className="input sm:col-span-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Detalle del reclamo/queja</label>
                <textarea required rows={4} value={form.detalle} onChange={(e) => set("detalle", e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">¿Qué pides como solución?</label>
                <textarea required rows={3} value={form.pedido} onChange={(e) => set("pedido", e.target.value)} className="input w-full" />
              </div>
            </div>

            <button type="submit" disabled={enviando} className="btn-primary w-full">
              {enviando ? "Enviando…" : "Enviar reclamo"}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              El proveedor debe responder en un plazo no mayor a 15 días hábiles.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
