import Link from "next/link";
import { ShieldCheck, Smartphone, Ban, MessageCircle } from "lucide-react";
import { FuncionesShowcase } from "@/components/FuncionesShowcase";
import { ThemeToggle } from "@/components/ThemeToggle";

/* Placeholder — reemplazar por el número real de soporte antes de publicar
   (ver pendiente "definir número de WhatsApp real" en docs/pending-task.md).
   Patrón "precio oculto tras WhatsApp" (idea de UX #7, OkVet): evita
   bloquear el lanzamiento de la landing por no tener el precio del plan Pro
   definido en soles todavía (brief §12). */
const WHATSAPP_NUMERO = "51999999999";
const WHATSAPP_MENSAJE = encodeURIComponent("Hola, quiero saber el precio del plan Pro de SaaS Óptica.");

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
  { q: "¿Emiten factura electrónica?", a: "Sí, es una función del plan Pro (SUNAT)." },
];

export default function LandingPage() {
  return (
    <>
      {/* ====== 1. Header ====== */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</span>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 dark:text-slate-300 sm:flex">
            <Link href="#funciones" className="hover:text-slate-900 dark:hover:text-slate-100">Funciones</Link>
            <Link href="#precios" className="hover:text-slate-900 dark:hover:text-slate-100">Precios</Link>
            <Link href="#contacto" className="hover:text-slate-900 dark:hover:text-slate-100">Contacto</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">Iniciar sesión</Link>
            <Link href="/registro" className="btn-primary">Prueba gratis</Link>
          </div>
        </div>
      </header>

      {/* ====== 2. Hero ====== */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          Deja el cuaderno.<br />Gestiona tu <span className="text-primary">óptica</span> en un solo lugar.
        </h1>
        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
          Clientes, citas, recetas, ventas e inventario. Todo en un panel simple, pensado para
          ópticas peruanas de 3 a 10 trabajadores.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/registro" className="btn-primary px-6 py-3 text-base">Prueba gratis 30 días</Link>
          <Link href="#funciones" className="btn-outline px-6 py-3 text-base">Ver funciones</Link>
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
      <section id="funciones" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
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
      <section id="precios" className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Precios</h2>
        <p className="mx-auto mt-1 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
          Empieza gratis. Para el plan Pro, escríbenos y te pasamos el precio al toque.
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Trial</h3>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Gratis <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ 30 días</span></p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              <li>Clientes, citas y recetas</li>
              <li>Ventas e inventario</li>
              <li>Gastos y caja</li>
              <li>Hasta 3 empleados</li>
            </ul>
            <Link href="/registro" className="btn-outline mt-4 block text-center">Empezar gratis</Link>
          </div>
          <div className="card border-primary bg-primary p-6 text-white">
            <h3 className="font-semibold">Pro</h3>
            <p className="mt-1 text-2xl font-semibold">Consulta el precio <span className="text-sm font-normal text-blue-200">por WhatsApp</span></p>
            <ul className="mt-4 space-y-1.5 text-sm text-blue-100">
              <li>Todo lo del plan Trial</li>
              <li>Facturación electrónica SUNAT</li>
              <li>Empleados ilimitados</li>
              <li>Soporte prioritario</li>
            </ul>
            <a
              href={`https://wa.me/${WHATSAPP_NUMERO}?text=${WHATSAPP_MENSAJE}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-primary hover:bg-blue-50"
            >
              <MessageCircle size={16} /> Preguntar precio por WhatsApp
            </a>
          </div>
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
        <Link href="/registro" className="mt-4 inline-block rounded-lg bg-white px-6 py-3 font-medium text-primary-dark hover:bg-blue-50">
          Prueba gratis 30 días
        </Link>
      </section>

      {/* ====== 10. Footer ====== */}
      <footer id="contacto" className="px-6 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={14} /> Datos aislados por negocio</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Smartphone size={14} /> Funciona en cualquier dispositivo</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Ban size={14} /> Sin permanencia</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <Link href="/registro" className="hover:text-slate-600 dark:hover:text-slate-300">Prueba gratis</Link>
          <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-300">Iniciar sesión</Link>
          <span>Términos y condiciones (pendiente)</span>
          <span>Política de privacidad (pendiente)</span>
          <span>WhatsApp de soporte (pendiente)</span>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} SaaS Óptica</p>
      </footer>
    </>
  );
}
