import Link from "next/link";
import { ShieldCheck, Smartphone, Ban, MessageCircle } from "lucide-react";
import { FuncionesShowcase } from "@/components/FuncionesShowcase";
import { PreciosSection } from "@/components/PreciosSection";
import { LandingHeader } from "@/components/LandingHeader";
import { AvisoTransparencia } from "@/components/AvisoTransparencia";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { CreditoJFHR } from "@/components/CreditoJFHR";
import { EMAIL_SOPORTE, urlWhatsApp } from "@/lib/contacto";

/* Landing pública (dominio raíz), estructura de 10 secciones del brief §3.
   Paleta y estilo tomados del análisis de diseno-referencia/ (competidores
   reales del rubro salud/clínicas en LatAm: HCMedic, Dentalink, OkVet,
   CitaPro) — azul primario + acento verde, cards rounded-xl, CTA sólido +
   outline. Ver docs/pending-task.md para el detalle de la decisión. */

const PASOS = [
  { n: "1", t: "Regístrate en 2 minutos", d: "Nombre de tu óptica, tu email y listo. Sin tarjeta de crédito." },
  { n: "2", t: "Carga tu stock y tu equipo", d: "Suma tus productos y a tus empleados con su rol correspondiente." },
  { n: "3", t: "Empieza a atender", d: "Agenda citas, registra ventas y controla tu caja desde el día uno." },
];

const FAQ = [
  { q: "¿Necesito instalar algo?", a: "No. Funciona desde el navegador, en tu computadora, tablet o celular." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin permanencia ni penalidad." },
  { q: "¿Mis datos están seguros?", a: "Sí. Cada óptica tiene su información completamente separada de las demás. Nadie de otro negocio puede verla." },
  { q: "¿Emiten factura electrónica?", a: "Sí, es una función del plan Premium (SUNAT)." },
];

export default function LandingPage() {
  return (
    <>
      {/* ====== 1. Header ====== */}
      <LandingHeader />

      {/* ====== 2. Hero ====== */}
      {/* `pt-32`: el header es `fixed` (ver LandingHeader.tsx), no ocupa
          espacio en el flujo — sin este padding el hero arrancaría debajo
          de la píldora flotante. */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 pb-20 pt-32 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Software para ópticas peruanas</p>
        <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          Deja el cuaderno.<br />Gestiona tu <span className="text-primary">óptica</span> en un solo lugar.
        </h1>
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
          Clientes, citas, recetas, ventas e inventario. Todo en un panel simple, pensado para
          ópticas peruanas de 3 a 10 trabajadores.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/registro" className="btn-primary px-6 py-3 text-base">Prueba gratis 30 días</Link>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">Sin tarjeta de crédito · Cancela cuando quieras</p>
        <div className="card mt-6 w-full max-w-2xl bg-slate-50 dark:bg-slate-900 p-8 text-sm text-slate-400 dark:text-slate-500">
          [ mockup del dashboard, pendiente de capturas reales ]
        </div>
      </section>

      {/* ====== 3. Prueba social ====== */}
      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Diseñado para ópticas peruanas. No es un ERP genérico adaptado a la fuerza.
      </section>

      {/* ====== 4. Problema → Solución ====== */}
      <section className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿Se te pierde el control de stock?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sabe al instante cuántas lunas y armazones te quedan, con aviso antes de que se agoten.</p>
          </div>
          <div className="card bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500">[ captura: inventario ]</div>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="card order-2 bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500 sm:order-1">[ captura: agenda ]</div>
          <div className="order-1 sm:order-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿Turnos desordenados o por WhatsApp?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Agenda todas las citas en un calendario simple, con la receta del paciente a la mano.</p>
          </div>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿No sabes cuánto ganaste este mes?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ventas y gastos en un solo lugar, con el total del mes siempre a la vista.</p>
          </div>
          <div className="card bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500">[ captura: caja/gastos ]</div>
        </div>
      </section>

      {/* ====== 5. Funciones ====== */}
      <section id="funciones" className="scroll-mt-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Todo lo que necesitas</p>
          <h2 className="mt-2 text-2xl text-slate-900 dark:text-slate-100">Una plataforma para gestionar toda tu óptica.</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Deja el cuaderno, el WhatsApp y la hoja de cálculo. Clientes, citas, recetas, ventas y gastos, todo en un panel simple.
          </p>
        </div>
        <div className="mt-10">
          <FuncionesShowcase />
        </div>
      </section>

      {/* ====== 6. Cómo funciona ====== */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Cómo funciona</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.n} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{p.n}</div>
              <h3 className="mt-2 font-medium text-slate-900 dark:text-slate-100">{p.t}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 7. Precios ====== */}
      <section id="precios" className="scroll-mt-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Precios</h2>
        <p className="mx-auto mt-1 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
          Prueba gratis 30 días. Sin tarjeta de crédito, sin compromiso.
        </p>
        <div className="mt-8">
          <PreciosSection />
        </div>
      </section>

      {/* ====== 8. FAQ ====== */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">{f.q}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 9. CTA final ====== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-primary-dark px-6 py-16 text-center text-white">
        <h2 className="text-2xl font-semibold">Deja el cuaderno hoy mismo</h2>
        <Link href="/registro" className="mt-4 inline-block rounded-full bg-white px-6 py-3 font-medium text-primary-dark transition-colors hover:bg-blue-50">
          Prueba gratis 30 días
        </Link>
      </section>

      {/* ====== 10. Footer ======
          Estructura de 4 columnas + barra inferior, patrón tomado de
          ferdocs-web (src/components/layout/Footer.tsx de ese proyecto).
          Solo se enlaza a rutas que EXISTEN — legal/soporte siguen sin
          construirse, así que van como texto plano marcado, no como links
          rotos (ver docs/pending-task.md). */}
      {/* `pb-24` en móvil: el botón flotante de WhatsApp (WhatsAppFab) se
          apoya abajo a la derecha y tapaba los links legales de la última
          fila. En `sm:` hacia arriba el ancho alcanza y no hace falta. */}
      <footer id="contacto" className="scroll-mt-24 border-t border-slate-200 bg-white px-6 pb-24 pt-16 dark:border-slate-800 dark:bg-slate-950 sm:pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="font-display text-lg text-slate-900 dark:text-slate-100">SaaS Óptica</span>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Mini-ERP para ópticas peruanas. Clientes, citas, recetas, ventas e inventario
                en un solo panel, sin instalar nada.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Producto</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="#funciones" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Funciones</Link></li>
                <li><Link href="#precios" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Precios</Link></li>
                <li><Link href="/registro" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Prueba gratis 30 días</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Cuenta</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/login" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Iniciar sesión</Link></li>
                <li><Link href="/registro" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Crear mi óptica</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Soporte</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={urlWhatsApp()} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex items-center gap-1.5 text-slate-500 hover:text-primary dark:text-slate-400">
                    <MessageCircle size={15} className="shrink-0" /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href={`mailto:${EMAIL_SOPORTE}`} className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">
                    {EMAIL_SOPORTE}
                  </a>
                </li>
              </ul>
              <ul className="mt-5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" /> Datos aislados por negocio</li>
                <li className="flex items-start gap-2"><Smartphone size={14} className="mt-0.5 shrink-0 text-accent" /> Funciona en cualquier dispositivo</li>
                <li className="flex items-start gap-2"><Ban size={14} className="mt-0.5 shrink-0 text-accent" /> Sin permanencia</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <AvisoTransparencia />
          </div>

          <hr className="my-8 border-slate-200 dark:border-slate-800" />

          <div className="flex flex-col items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 sm:flex-row">
            <div className="flex flex-col items-center gap-1 sm:items-start">
              <p>© {new Date().getFullYear()} SaaS Óptica</p>
              <CreditoJFHR />
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/legal?tab=terminos" className="transition-colors hover:text-primary">Términos y condiciones</Link>
              <Link href="/legal?tab=privacidad" className="transition-colors hover:text-primary">Política de privacidad</Link>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppFab />
    </>
  );
}
