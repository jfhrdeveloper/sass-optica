"use client";

import { useState } from "react";
import { Plus, User, FileText, Pencil, Trash2 } from "lucide-react";
import { useData, type Cita } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { SlideOver } from "@/components/ui/SlideOver";
import { CalendarioMes } from "@/components/calendario/CalendarioMes";
import { CalendarioAgenda } from "@/components/calendario/CalendarioAgenda";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginado } from "@/lib/hooks/usePaginado";
import { DateRangePicker } from "@/components/calendario/DateRangePicker";
import { DatePicker } from "@/components/calendario/DatePicker";
import { TimePicker } from "@/components/calendario/TimePicker";
import { ClienteCombobox } from "@/components/clientes/ClienteCombobox";
import { ESTADOS_CITA, ESTADO_CITA_LABEL, ESTADO_CITA_BADGE, DURACION_CITA_DEFECTO_MIN, sumarMinutosHora, diferenciaMinutos } from "@/lib/citas";
import { WhatsAppIcon } from "@/components/landing/WhatsAppIcon";
import { urlWhatsAppContacto } from "@/lib/contacto";

const VACIO: Partial<Cita> = { estado: "programada" };

/* Convierte una fecha (día del mes clickeado, u hora exacta clickeada en
   la agenda) al formato que espera el input `datetime-local`
   (YYYY-MM-DDTHH:mm) — usa la hora/minuto que ya trae la fecha, así que
   cada vista decide su propia hora por defecto antes de llamar a esto (el
   mes clickea un día entero → 9:00 a. m.; la agenda ya sabe la hora exacta
   de la franja). Se arma a mano con los componentes LOCALES (no
   toISOString, que usa UTC) para no correrse de día según la zona horaria
   del navegador. */
function aInputLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

/* Lunes de la semana que contiene `d` (mismo orden Lunes-primero que usa
   CalendarioMes) — ancla la vista Semana al inicio de semana real en vez
   de a "7 días desde donde estabas parado", que es lo que sí hacen Día/3
   días/5 días. `getDay()` de JS da 0=Domingo, por eso se convierte a un
   índice Lunes=0..Domingo=6 antes de retroceder. */
function inicioSemana(d: Date): Date {
  const r = new Date(d);
  const diaSemanaLunesPrimero = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - diaSemanaLunesPrimero);
  r.setHours(0, 0, 0, 0);
  return r;
}

function sumarDias(fecha: Date, n: number): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}

type Vista = "dia" | "3dias" | "5dias" | "semana" | "mes" | "lista";
const DIAS_POR_VISTA: Record<string, number> = { dia: 1, "3dias": 3, "5dias": 5, semana: 7 };

export default function CitasPage() {
  const { citas, clientes, recetas, negocio, addCita, updateCita, deleteCita, addReceta } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Cita>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  /* Fecha, hora de inicio y hora de fin del formulario, separadas del resto
     de `form` — DatePicker habla en "YYYY-MM-DD" y TimePicker en "HH:mm";
     se combinan recién al enviar (o al abrir el form para editar, ver
     `editar()`): `fechaHora` = fecha+inicio, `duracionMin` = fin - inicio.
     Mantenerlas sueltas evita sincronizarlas con `form` vía efecto solo
     para poder mostrarlas por separado. */
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("");
  const [horaFinCita, setHoraFinCita] = useState("");

  /* Al mover la hora de inicio, la de fin la sigue para mantener la misma
     duración que ya tenía (o DURACION_CITA_DEFECTO_MIN si estaba vacía) —
     así no queda una hora de fin anterior a la de inicio sin que el usuario
     se dé cuenta. */
  function cambiarHoraInicio(hora: string) {
    const duracionPrevia = horaCita && horaFinCita ? Math.max(diferenciaMinutos(horaCita, horaFinCita), DURACION_CITA_DEFECTO_MIN) : DURACION_CITA_DEFECTO_MIN;
    setHoraCita(hora);
    setHoraFinCita(hora ? sumarMinutosHora(hora, duracionPrevia) : "");
  }
  const [recetaAbierta, setRecetaAbierta] = useState<string | null>(null);
  const [receta, setReceta] = useState<Record<string, string>>({});

  /* Mes por defecto (más útil de un vistazo para agendar) — Lista sigue
     disponible para cuando hace falta buscar por estado o rango de fechas,
     algo que ningún calendario resuelve bien. Los filtros de estado/fecha
     solo aplican a Lista. Día/3 días/5 días/Semana son la vista de agenda
     tipo Google Calendar (CalendarioAgenda) — todas comparten una sola
     fecha ancla (`fecha`) en vez de tener cada una su propio estado, así
     cambiar de vista no te saca de dónde estabas parado en el calendario. */
  const [vista, setVista] = useState<Vista>("mes");
  const [fecha, setFecha] = useState(() => new Date());
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const nombreCliente = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : "—";
  };

  /* Recordatorio de cita por WhatsApp — reduce el ausentismo real de una
     óptica pyme, que hoy no tiene ningún aviso previo. Es manual a
     propósito (un clic antes de irse el día anterior): automatizarlo
     necesitaría un cron + un número de negocio verificado en la API de
     WhatsApp Business, fuera de alcance de este MVP. */
  function esManana(fechaHora: string): boolean {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return fechaHora.slice(0, 10) === manana.toISOString().slice(0, 10);
  }

  function urlRecordatorio(c: Cita): string | null {
    const cliente = clientes.find((cl) => cl.id === c.clienteId);
    if (!cliente?.telefono) return null;
    const hora = new Date(c.fechaHora).toLocaleString("es-PE", {
      timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
    });
    const mensaje = `Hola ${cliente.nombres}, te recordamos tu cita en ${negocio?.nombre ?? "nuestra óptica"} el ${hora}${c.motivo ? ` (${c.motivo})` : ""}. ¡Te esperamos!`;
    return urlWhatsAppContacto(cliente.telefono, mensaje);
  }

  /* `fechaHora` opcional: viene prellenada cuando se abre desde un click en
     un día del calendario (ver aInputLocal más arriba); el botón "Agendar
     cita" de la cabecera llama a nueva() sin argumento y arranca vacío. */
  function nueva(fechaHora?: string, duracionMin?: number) {
    setEditandoId(null);
    setForm(fechaHora ? { ...VACIO, fechaHora, duracionMin } : VACIO);
    const hInicio = fechaHora ? fechaHora.slice(11, 16) : "";
    setFechaCita(fechaHora ? fechaHora.slice(0, 10) : "");
    setHoraCita(hInicio);
    setHoraFinCita(hInicio ? sumarMinutosHora(hInicio, duracionMin ?? DURACION_CITA_DEFECTO_MIN) : "");
    setAbierto(true);
  }
  function editar(c: Cita) {
    setEditandoId(c.id);
    setForm(c);
    const hInicio = c.fechaHora.slice(11, 16);
    setFechaCita(c.fechaHora.slice(0, 10));
    setHoraCita(hInicio);
    setHoraFinCita(sumarMinutosHora(hInicio, c.duracionMin ?? DURACION_CITA_DEFECTO_MIN));
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
    setFechaCita("");
    setHoraCita("");
    setHoraFinCita("");
  }

  /* Cliente sin historial previo (aparte de la cita que se está editando,
     si aplica) — se lo marca "Nuevo" en el combobox de ClienteCombobox. */
  function esClienteNuevo(clienteId: string): boolean {
    return !citas.some((c) => c.clienteId === clienteId && c.id !== editandoId);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fechaHora = fechaCita && horaCita ? `${fechaCita}T${horaCita}` : undefined;
    const duracionMin = horaCita && horaFinCita ? diferenciaMinutos(horaCita, horaFinCita) : undefined;
    if (!form.clienteId || !fechaHora || !duracionMin || duracionMin <= 0) return;
    setGuardando(true);
    const datos = { ...form, fechaHora, duracionMin };
    if (editandoId) {
      await updateCita(editandoId, datos);
      toast("Cambios guardados.");
    } else {
      await addCita(datos);
      toast("Cita agendada.");
    }
    setGuardando(false);
    cerrar();
  }

  async function eliminar(c: Cita) {
    await deleteCita(c.id);
    /* Deshacer = volver a crear la cita (deleteCita no es soft-delete como
       clientes) — el mapper de escritura (citaToRow) ignora `id`, así que
       pasar `c` tal cual es seguro: nunca pisa el id nuevo que genera la DB. */
    toast("Cita eliminada.", "info", { label: "Deshacer", onClick: () => { void addCita(c); } });
  }

  async function guardarReceta(citaId: string, clienteId: string) {
    await addReceta({
      clienteId, citaId, tipo: "lejos",
      odEsfera: receta.odEsfera ? Number(receta.odEsfera) : undefined,
      odCilindro: receta.odCilindro ? Number(receta.odCilindro) : undefined,
      odEje: receta.odEje ? Number(receta.odEje) : undefined,
      odAdicion: receta.odAdicion ? Number(receta.odAdicion) : undefined,
      oiEsfera: receta.oiEsfera ? Number(receta.oiEsfera) : undefined,
      oiCilindro: receta.oiCilindro ? Number(receta.oiCilindro) : undefined,
      oiEje: receta.oiEje ? Number(receta.oiEje) : undefined,
      oiAdicion: receta.oiAdicion ? Number(receta.oiAdicion) : undefined,
      dip: receta.dip ? Number(receta.dip) : undefined,
    });
    setRecetaAbierta(null);
    setReceta({});
    toast("Receta guardada.");
  }

  /** Última receta guardada de un cliente (para comparar progresión al
   *  registrar una nueva) — la más reciente por fecha, sin importar la cita
   *  a la que quedó enlazada. */
  function recetaAnterior(clienteId: string) {
    return recetas
      .filter((r) => r.clienteId === clienteId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  }

  const filtradas = citas
    .filter((c) => filtroEstado === "todos" || c.estado === filtroEstado)
    .filter((c) => !desde || c.fechaHora.slice(0, 10) >= desde)
    .filter((c) => !hasta || c.fechaHora.slice(0, 10) <= hasta)
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const { pagina, setPagina, totalPaginas, visibles } = usePaginado(filtradas);

  return (
    <main>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Citas</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Vista de citas"
          variante="opciones"
          valor={vista}
          onChange={(v) => setVista(v as Vista)}
          opciones={[
            { valor: "dia", label: "Día" },
            { valor: "3dias", label: "3 días" },
            { valor: "5dias", label: "5 días" },
            { valor: "semana", label: "Semana" },
            { valor: "mes", label: "Mes" },
            { valor: "lista", label: "Lista" },
          ]}
        />

        {vista === "lista" && (
          <>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="select text-sm">
              <option value="todos">Todos los estados</option>
              {ESTADOS_CITA.map((s) => <option key={s} value={s}>{ESTADO_CITA_LABEL[s]}</option>)}
            </select>
            <DateRangePicker desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </>
        )}
        <button onClick={() => nueva()} className="btn-primary ml-auto gap-1.5">
          <Plus size={16} /> Agendar cita
        </button>
      </div>

      {vista === "mes" ? (
        <div className="mt-4">
          <CalendarioMes
            mesActual={fecha}
            onCambiarMes={(delta) => setFecha((f) => new Date(f.getFullYear(), f.getMonth() + delta, 1))}
            onIrAHoy={() => setFecha(new Date())}
            citas={citas}
            nombreCliente={nombreCliente}
            onClickDia={(dia) => { const d = new Date(dia); d.setHours(9, 0, 0, 0); nueva(aInputLocal(d)); }}
            onClickCita={(cita) => editar(cita)}
          />
        </div>
      ) : vista !== "lista" ? (
        <div className="mt-4">
          <CalendarioAgenda
            fechaAncla={vista === "semana" ? inicioSemana(fecha) : fecha}
            dias={DIAS_POR_VISTA[vista]}
            onNavegar={(delta) => setFecha((f) => sumarDias(f, delta))}
            onIrAHoy={() => setFecha(new Date())}
            citas={citas}
            nombreCliente={nombreCliente}
            onClickSlot={(hora, duracionMin) => nueva(aInputLocal(hora), duracionMin)}
            onClickCita={(cita) => editar(cita)}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibles.map((c) => (
            <div key={c.id} className="card p-3 text-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="row-avatar shrink-0"><User size={16} /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{nombreCliente(c.clienteId)}</span>
                      <span className={`badge ${ESTADO_CITA_BADGE[c.estado] ?? "badge-neutral"}`}>{ESTADO_CITA_LABEL[c.estado] ?? c.estado}</span>
                      {c.estado === "programada" && esManana(c.fechaHora) && (
                        <span className="badge badge-warning">Mañana</span>
                      )}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {/* suppressHydrationWarning: Intl puede formatear con espacios Unicode
                          distintos entre el ICU de Node (SSR) y el del navegador (mismo texto
                          visible, whitespace interno distinto) — falso positivo conocido de
                          React, no un bug real. */}
                      <span suppressHydrationWarning>{new Date(c.fechaHora).toLocaleString("es-PE", { timeZone: "America/Lima" })}</span> {c.motivo ? `· ${c.motivo}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {c.estado === "programada" && urlRecordatorio(c) && (
                    <a
                      href={urlRecordatorio(c)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Recordar cita por WhatsApp"
                      aria-label={`Recordar por WhatsApp a ${nombreCliente(c.clienteId)}`}
                      className="row-icon-btn text-[#25D366]"
                    >
                      <WhatsAppIcon size={15} />
                    </a>
                  )}
                  <button onClick={() => setRecetaAbierta(recetaAbierta === c.id ? null : c.id)} title="Receta" aria-label="Ver receta de esta cita" className="row-icon-btn">
                    <FileText size={15} />
                  </button>
                  <button onClick={() => editar(c)} title="Editar" aria-label="Editar cita" className="row-icon-btn">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => eliminar(c)} title="Eliminar" aria-label="Eliminar cita" className="row-icon-btn row-icon-btn-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {recetaAbierta === c.id && (
                <div className="mt-3 border-t pt-3 text-xs">
                  {(() => {
                    const anterior = recetaAnterior(c.clienteId);
                    if (!anterior) return null;
                    return (
                      <div className="mb-3 rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
                        <p className="mb-1.5 font-medium text-slate-500 dark:text-slate-400">
                          Receta anterior ({new Date(anterior.fecha).toLocaleDateString("es-PE", { timeZone: "America/Lima" })})
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-600 dark:text-slate-300">
                          <span>OD: {anterior.odEsfera ?? "—"} / {anterior.odCilindro ?? "—"} / {anterior.odEje ?? "—"}° · Ad. {anterior.odAdicion ?? "—"}</span>
                          <span>OI: {anterior.oiEsfera ?? "—"} / {anterior.oiCilindro ?? "—"} / {anterior.oiEje ?? "—"}° · Ad. {anterior.oiAdicion ?? "—"}</span>
                          {anterior.dip != null && <span className="col-span-full">DIP: {anterior.dip} mm</span>}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <span className="col-span-full font-medium">OD (ojo derecho)</span>
                    <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, odEsfera: e.target.value })} className="input text-sm" />
                    <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, odCilindro: e.target.value })} className="input text-sm" />
                    <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, odEje: e.target.value })} className="input text-sm" />
                    <input placeholder="Adición" onChange={(e) => setReceta({ ...receta, odAdicion: e.target.value })} className="input text-sm" />
                    <span className="col-span-full mt-1 font-medium">OI (ojo izquierdo)</span>
                    <input placeholder="Esfera" onChange={(e) => setReceta({ ...receta, oiEsfera: e.target.value })} className="input text-sm" />
                    <input placeholder="Cilindro" onChange={(e) => setReceta({ ...receta, oiCilindro: e.target.value })} className="input text-sm" />
                    <input placeholder="Eje" onChange={(e) => setReceta({ ...receta, oiEje: e.target.value })} className="input text-sm" />
                    <input placeholder="Adición" onChange={(e) => setReceta({ ...receta, oiAdicion: e.target.value })} className="input text-sm" />
                    <input placeholder="DIP (mm)" onChange={(e) => setReceta({ ...receta, dip: e.target.value })} className="input text-sm col-span-2" />
                    <button onClick={() => guardarReceta(c.id, c.clienteId)} className="btn-primary col-span-full text-sm">
                      Guardar receta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtradas.length === 0 && <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Sin citas para este filtro.</p>}
          <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
        </div>
      )}

      <SlideOver abierto={abierto} onClose={cerrar} titulo={editandoId ? "Editar cita" : "Agendar cita"}>
        <form onSubmit={onSubmit} className="space-y-3">
          <ClienteCombobox
            clientes={clientes}
            clienteId={form.clienteId ?? ""}
            onChange={(id) => setForm({ ...form, clienteId: id })}
            esNuevo={esClienteNuevo}
          />
          <DatePicker etiqueta="Fecha de la cita" placeholder="Fecha" valor={fechaCita} onChange={setFechaCita} />
          <div className="grid grid-cols-2 gap-2">
            <TimePicker etiqueta="Hora de inicio" placeholder="Hora de inicio" valor={horaCita} onChange={cambiarHoraInicio} />
            <TimePicker etiqueta="Hora de fin" placeholder="Hora de fin" valor={horaFinCita} onChange={setHoraFinCita} />
          </div>
          {horaCita && horaFinCita && diferenciaMinutos(horaCita, horaFinCita) <= 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">La hora de fin debe ser posterior a la de inicio.</p>
          )}
          <input placeholder="Motivo" value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="input w-full text-sm" />
          <select value={form.estado ?? "programada"} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="select w-full text-sm">
            {ESTADOS_CITA.map((s) => <option key={s} value={s}>{ESTADO_CITA_LABEL[s]}</option>)}
          </select>
          <button
            type="submit"
            disabled={guardando || !form.clienteId || !fechaCita || !horaCita || !horaFinCita || diferenciaMinutos(horaCita, horaFinCita) <= 0}
            className="btn-primary w-full"
          >
            {editandoId ? "Guardar cambios" : "Agendar cita"}
          </button>
        </form>
      </SlideOver>
    </main>
  );
}
