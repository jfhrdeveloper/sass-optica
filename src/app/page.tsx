import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Smartphone, Ban, ChevronDown } from "lucide-react";
import { FuncionesShowcase } from "@/components/landing/FuncionesShowcase";
import { PreciosSection } from "@/components/landing/PreciosSection";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { Reveal } from "@/components/landing/Reveal";
import { LandingMotionProvider } from "@/components/landing/LandingMotionProvider";
import { WhatsAppFab } from "@/components/landing/WhatsAppFab";
import { WhatsAppIcon } from "@/components/landing/WhatsAppIcon";
import { TransitionLink } from "@/components/landing/PageTransition";
import { EMAIL_SOPORTE, RAZON_SOCIAL, urlWhatsApp } from "@/lib/contacto";
import { PLANES } from "@/lib/precios";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

/* Datos estructurados (schema.org) para resultados enriquecidos en Google —
   Organization + SoftwareApplication (con los planes reales de
   lib/precios.ts, no montos escritos a mano) + FAQPage (reusa el mismo
   array FAQ que ya renderiza el acordeón, una sola fuente). */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: RAZON_SOCIAL,
      url: SITE_URL,
      email: EMAIL_SOPORTE,
    },
    {
      "@type": "SoftwareApplication",
      name: RAZON_SOCIAL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: "Sistema de gestión para ópticas: clientes, citas, recetas, ventas, inventario y facturación electrónica SUNAT.",
      offers: [
        { "@type": "Offer", name: "Gratis", price: "0", priceCurrency: "PEN" },
        ...PLANES.map((p) => ({ "@type": "Offer", name: p.nombre, price: p.mensual.toFixed(2), priceCurrency: "PEN" })),
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <LandingMotionProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* ====== 1. Header ====== */}
      <LandingHeader />

      {/* ====== 2. Hero ====== */}
      {/* `pt-32`: el header es `fixed` (ver LandingHeader.tsx), no ocupa
          espacio en el flujo — sin este padding el hero arrancaría debajo
          de la píldora flotante. Animación de entrada (stagger de carga)
          movida a `HeroSection.tsx` — es la única sección animada al
          MONTAR en vez de al hacer scroll, porque es lo primero que se ve. */}
      <HeroSection />

      {/* ====== 3. Prueba social ====== */}
      {/* Card semitransparente en vez de franja completa — mismo lenguaje
          visual que la píldora flotante del header (bg blanco translúcido +
          backdrop-blur + borde sutil), para que no se sienta como una barra
          de aviso sino como un elemento flotante más dentro del hero. */}
      <Reveal as="section" className="px-6 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/60 bg-white/70 px-6 py-5 text-center shadow-md shadow-black/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Hecho a la medida de tus necesidades. Un sistema fácil de usar, sin menús enredados
            ni funciones que no necesitas.
          </p>
        </div>
      </Reveal>

      {/* ====== 4. Problema → Solución ====== */}
      {/* Cada fila se revela por separado (no la sección entera de una)
          con un pequeño delay creciente — el mismo efecto escalonado del
          hero, pero disparado por scroll en vez de al cargar. */}
      <section className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <Reveal className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿Se te pierde el control de stock?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Sabe al instante cuántas lunas y armazones te quedan, con aviso antes de que se agoten.</p>
          </div>
          <div className="card bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500">[ captura: inventario ]</div>
        </Reveal>
        <Reveal delay={0.1} className="grid items-center gap-4 sm:grid-cols-2">
          <div className="card order-2 bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500 sm:order-1">[ captura: agenda ]</div>
          <div className="order-1 sm:order-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿Turnos desordenados o por WhatsApp?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Agenda todas las citas en un calendario simple, con la receta del paciente a la mano.</p>
          </div>
        </Reveal>
        <Reveal delay={0.2} className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">¿No sabes cuánto ganaste este mes?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ventas y gastos en un solo lugar, con el total del mes siempre a la vista.</p>
          </div>
          <div className="card bg-slate-50 dark:bg-slate-900 p-6 text-center text-xs text-slate-400 dark:text-slate-500">[ captura: caja/gastos ]</div>
        </Reveal>
      </section>

      {/* ====== 5. Funciones ====== */}
      {/* Solo se envuelven los contenedores propios de esta página
          (encabezado + wrapper de `FuncionesShowcase`) — el componente en
          sí no se toca, ya trae su propia lógica de pestañas. */}
      <section id="funciones" className="scroll-mt-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Todo lo que necesitas</p>
          <h2 className="mt-2 text-2xl text-slate-900 dark:text-slate-100">Una plataforma para gestionar toda tu óptica.</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Deja el cuaderno, el WhatsApp y la hoja de cálculo. Clientes, citas, recetas, ventas y gastos, todo en un panel simple.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <FuncionesShowcase />
        </Reveal>
      </section>

      {/* ====== 6. Cómo funciona ====== */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Cómo funciona</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PASOS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.12} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{p.n}</div>
              <h3 className="mt-2 font-medium text-slate-900 dark:text-slate-100">{p.t}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ====== 7. Precios ====== */}
      <section id="precios" className="scroll-mt-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-16">
        <Reveal as="div" className="mx-auto max-w-md text-center">
          <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Precios</h2>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Empieza gratis, para siempre. Sin tarjeta de crédito, sin compromiso.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <PreciosSection />
        </Reveal>
      </section>

      {/* ====== 8. FAQ — acordeón nativo ======
          `<details>` + `<summary>` en vez de divs con estado: el teclado, el
          estado para lectores de pantalla y el Ctrl+F del navegador vienen
          gratis (ver .accordion-item en globals.css). El `name` compartido
          es lo que hace que solo una respuesta quede abierta a la vez —
          sin una línea de JavaScript. */}
      <Reveal as="section" className="mx-auto w-[450px] max-w-full px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">Preguntas frecuentes</h2>
        <div className="mt-8">
          {FAQ.map((f) => (
            <details key={f.q} name="faq" className="accordion-item group border-b border-slate-200 dark:border-slate-800">
              <summary className="flex items-center justify-between gap-4 py-4 font-medium text-slate-900 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-100">
                {f.q}
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                />
              </summary>
              {/* `max-w-[44ch]`: sin esto la respuesta ocupaba TODO el ancho de
                  la fila (~538px) contra los ~200px que mide el texto de la
                  pregunta — al expandir aparecía un bloque casi 3 veces más
                  ancho que su propio título y se sentía como un brinco. Ojo con
                  el valor: `58ch` resolvía justo a 538px acá, o sea que no
                  acotaba nada; `1ch` ≈ 9.3px con esta tipografía.

                  `min-h-[calc(2lh+1rem)]`: reserva SIEMPRE el alto de 2 líneas
                  (`lh` = una línea), que es lo que mide la respuesta más larga,
                  MÁS el `pb-4`. El `+1rem` no es opcional: con `box-sizing:
                  border-box` (el default de Tailwind) el `min-height` incluye el
                  padding, así que `2lh` a secas dejaba las respuestas de una
                  línea en 40px y las de dos en 56px. Igualadas, cambiar de una
                  pregunta a otra no mueve nada de lo que está debajo. */}
              <p className="min-h-[calc(2lh+1rem)] max-w-[44ch] pb-4 text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </Reveal>

      {/* ====== 9. CTA final ====== */}
      <Reveal as="section" className="border-t border-slate-200 dark:border-slate-800 bg-primary-dark px-6 py-16 text-center text-white">
        <h2 className="text-2xl font-semibold">Deja el cuaderno hoy mismo</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Únete a las ópticas peruanas que ya modernizaron su administración.
        </p>
        <TransitionLink
          href="/registro"
          className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-medium text-primary-dark shadow-lg shadow-blue-950/30 transition-all hover:scale-105 hover:bg-blue-50"
        >
          Crear cuenta gratis
        </TransitionLink>
        <p className="mt-3 text-xs text-white/70">Sin tarjeta de crédito · Gratis para siempre</p>
      </Reveal>

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
                <li><TransitionLink href="/registro" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Crear cuenta gratis</TransitionLink></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Cuenta</h3>
              <ul className="space-y-2.5 text-sm">
                <li><TransitionLink href="/login" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Iniciar sesión</TransitionLink></li>
                <li><TransitionLink href="/registro" className="link-underline text-slate-500 hover:text-primary dark:text-slate-400">Crear mi óptica</TransitionLink></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Soporte</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={urlWhatsApp()} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex items-center gap-1.5 text-slate-500 hover:text-primary dark:text-slate-400">
                    <WhatsAppIcon size={15} className="shrink-0" /> WhatsApp
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

              {/* Badge del Libro de Reclamaciones (INDECOPI) — mismo PNG
                 (con transparencia real) que usa sass-combate, para que el
                 badge sea visualmente idéntico entre los SaaS del usuario. */}
              <Link href="/libro-reclamaciones" className="mt-5 inline-block transition-opacity hover:opacity-80">
                <Image src="/libro-reclamaciones.png" alt="Libro de Reclamaciones" width={160} height={124} />
              </Link>
            </div>
          </div>

          <hr className="my-8 border-slate-200 dark:border-slate-800" />

          <div className="flex flex-col items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} SaaS Óptica</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/legal?tab=terminos" className="link-underline transition-colors hover:text-primary">Términos y condiciones</Link>
              <Link href="/legal?tab=privacidad" className="link-underline transition-colors hover:text-primary">Política de privacidad</Link>
              <Link href="/legal?tab=proteccion" className="link-underline transition-colors hover:text-primary">Protección de datos</Link>
              <Link href="/libro-reclamaciones" className="link-underline transition-colors hover:text-primary">Libro de Reclamaciones</Link>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppFab />
    </LandingMotionProvider>
  );
}
