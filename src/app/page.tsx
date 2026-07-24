import Link from "next/link";

/* Landing pública (dominio raíz) con la estructura de 10 secciones del brief
   §3. Diseño visual real (paleta/tipografía de marca) sigue pendiente — ver
   docs/pending-task.md: falta decidir marca con la skill ui-ux-pro-max. Esta
   versión ya tiene copy y estructura completos, solo falta el pulido visual
   final. Un solo CTA protagonista ("Prueba gratis") repetido 3 veces. */

const FUNCIONES = [
  { titulo: "Recetas digitales", desc: "Graduación OD/OI, distancia interpupilar y tipo de lente, sin papeles que se pierden." },
  { titulo: "Control de stock", desc: "Armazones, lunas y lentes de contacto con alerta automática de stock mínimo." },
  { titulo: "Agenda de citas", desc: "Turnos por optometrista, con historial de cada paciente a un clic." },
  { titulo: "Ventas con boleta", desc: "Registra la venta, calcula el IGV automático y descuenta el stock solo." },
  { titulo: "Gastos y caja", desc: "Alquiler, sueldos, insumos — todo el gasto del mes en un solo lugar." },
  { titulo: "Roles por empleado", desc: "Administrador, encargado y vendedor: cada uno ve solo lo que le corresponde." },
];

const PASOS = [
  { n: "1", t: "Regístrate en 2 minutos", d: "Nombre de tu óptica, tu email y listo — sin tarjeta de crédito." },
  { n: "2", t: "Carga tu stock y tu equipo", d: "Suma tus productos y a tus empleados con su rol correspondiente." },
  { n: "3", t: "Empieza a atender", d: "Agenda citas, registra ventas y controla tu caja desde el día uno." },
];

const FAQ = [
  { q: "¿Necesito instalar algo?", a: "No. Funciona desde el navegador, en tu computadora, tablet o celular." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin permanencia ni penalidad." },
  { q: "¿Mis datos están seguros?", a: "Cada óptica tiene su información completamente aislada de las demás, protegida a nivel de base de datos." },
  { q: "¿Emiten factura electrónica?", a: "Sí, es una función del plan Pro (SUNAT)." },
];

export default function LandingPage() {
  return (
    <>
      {/* ====== 1. Header ====== */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold">SaaS Óptica</span>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <Link href="#funciones">Funciones</Link>
            <Link href="#precios">Precios</Link>
            <Link href="#contacto">Contacto</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm underline">Iniciar sesión</Link>
            <Link href="/registro" className="rounded bg-black px-3 py-1.5 text-sm text-white">Prueba gratis</Link>
          </div>
        </div>
      </header>

      {/* ====== 2. Hero ====== */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold leading-tight">
          Deja el cuaderno. Gestiona tu óptica en un solo lugar.
        </h1>
        <p className="max-w-xl text-neutral-600">
          Clientes, citas, recetas, ventas e inventario — todo en un panel simple, pensado para
          ópticas peruanas de 3 a 10 trabajadores.
        </p>
        <Link href="/registro" className="rounded bg-black px-6 py-3 text-white">
          Prueba gratis 30 días
        </Link>
        <p className="text-xs text-neutral-500">Sin tarjeta de crédito · Cancela cuando quieras</p>
        <div className="mt-6 w-full max-w-2xl rounded-lg border bg-neutral-50 p-8 text-sm text-neutral-400">
          [ mockup del dashboard — pendiente de diseño real ]
        </div>
      </section>

      {/* ====== 3. Prueba social ====== */}
      <section className="border-y bg-neutral-50 px-6 py-6 text-center text-sm text-neutral-600">
        Diseñado específicamente para ópticas peruanas — no es un ERP genérico adaptado a la fuerza.
      </section>

      {/* ====== 4. Problema → Solución ====== */}
      <section className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">¿Se te pierde el control de stock?</h3>
            <p className="mt-1 text-sm text-neutral-600">Sabe al instante cuántas lunas y armazones te quedan, con aviso antes de que se agoten.</p>
          </div>
          <div className="rounded border bg-neutral-50 p-6 text-center text-xs text-neutral-400">[ captura: inventario ]</div>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="order-2 rounded border bg-neutral-50 p-6 text-center text-xs text-neutral-400 sm:order-1">[ captura: agenda ]</div>
          <div className="order-1 sm:order-2">
            <h3 className="font-semibold">¿Turnos desordenados o por WhatsApp?</h3>
            <p className="mt-1 text-sm text-neutral-600">Agenda todas las citas en un calendario simple, con la receta del paciente a la mano.</p>
          </div>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">¿No sabes cuánto ganaste este mes?</h3>
            <p className="mt-1 text-sm text-neutral-600">Ventas y gastos en un solo lugar, con el total del mes siempre a la vista.</p>
          </div>
          <div className="rounded border bg-neutral-50 p-6 text-center text-xs text-neutral-400">[ captura: caja/gastos ]</div>
        </div>
      </section>

      {/* ====== 5. Funciones ====== */}
      <section id="funciones" className="border-t bg-neutral-50 px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Todo lo que tu óptica necesita</h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONES.map((f) => (
            <div key={f.titulo} className="rounded border bg-white p-5">
              <h3 className="font-medium">{f.titulo}</h3>
              <p className="mt-1 text-sm text-neutral-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 6. Cómo funciona ====== */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Cómo funciona</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.n} className="text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm text-white">{p.n}</div>
              <h3 className="mt-2 font-medium">{p.t}</h3>
              <p className="mt-1 text-sm text-neutral-600">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 7. Precios ====== */}
      <section id="precios" className="border-t bg-neutral-50 px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Precios</h2>
        <p className="mx-auto mt-1 max-w-md text-center text-sm text-neutral-600">
          Precio exacto en soles pendiente de definir (ver brief-saas-proyecto.md §12).
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
          <div className="rounded border bg-white p-6">
            <h3 className="font-semibold">Trial</h3>
            <p className="mt-1 text-2xl font-semibold">Gratis <span className="text-sm font-normal text-neutral-500">/ 30 días</span></p>
            <ul className="mt-4 space-y-1 text-sm text-neutral-600">
              <li>Clientes, citas y recetas</li>
              <li>Ventas e inventario</li>
              <li>Gastos y caja</li>
              <li>Hasta 3 empleados</li>
            </ul>
            <Link href="/registro" className="mt-4 block rounded bg-black px-4 py-2 text-center text-sm text-white">Empezar gratis</Link>
          </div>
          <div className="rounded border bg-white p-6">
            <h3 className="font-semibold">Pro</h3>
            <p className="mt-1 text-2xl font-semibold">Por definir <span className="text-sm font-normal text-neutral-500">/ mes</span></p>
            <ul className="mt-4 space-y-1 text-sm text-neutral-600">
              <li>Todo lo del plan Trial</li>
              <li>Facturación electrónica SUNAT</li>
              <li>Empleados ilimitados</li>
              <li>Soporte prioritario</li>
            </ul>
            <Link href="/registro" className="mt-4 block rounded border px-4 py-2 text-center text-sm">Empezar prueba gratis</Link>
          </div>
        </div>
      </section>

      {/* ====== 8. FAQ ====== */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Preguntas frecuentes</h2>
        <div className="mt-8 space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b pb-4">
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-1 text-sm text-neutral-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 9. CTA final ====== */}
      <section className="border-t bg-black px-6 py-16 text-center text-white">
        <h2 className="text-2xl font-semibold">Deja el cuaderno hoy mismo</h2>
        <Link href="/registro" className="mt-4 inline-block rounded bg-white px-6 py-3 text-black">
          Prueba gratis 30 días
        </Link>
      </section>

      {/* ====== 10. Footer ====== */}
      <footer id="contacto" className="px-6 py-8 text-center text-xs text-neutral-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/registro">Prueba gratis</Link>
          <Link href="/login">Iniciar sesión</Link>
          <span>Términos y condiciones (pendiente)</span>
          <span>Política de privacidad (pendiente)</span>
          <span>WhatsApp de soporte (pendiente)</span>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} SaaS Óptica</p>
      </footer>
    </>
  );
}
