import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EMAIL_SOPORTE, RAZON_SOCIAL } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Términos y privacidad · SaaS Óptica",
  description: "Términos y condiciones del servicio y política de privacidad y protección de datos personales.",
};

type Tab = "terminos" | "privacidad";

/* Páginas legales en una sola ruta con dos pestañas (`/legal?tab=...`),
   patrón tomado de ferdocs-web. Server Component puro: es texto estático,
   no necesita JS en el cliente — las pestañas son links reales, así que
   funcionan y se pueden compartir/indexar sin hidratación.

   IMPORTANTE: este contenido es una base redactada según la Ley N° 29733
   (Protección de Datos Personales, Perú) y su reglamento, pero NO sustituye
   la revisión de un abogado — es obligatorio hacerla antes de operar con
   clientes reales, sobre todo por el tratamiento de datos de salud
   (graduaciones/recetas ópticas), que la ley clasifica como dato sensible.
   Ver docs/pending-task.md. */
export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activa: Tab = tab === "privacidad" ? "privacidad" : "terminos";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-display text-slate-900 dark:text-slate-100">SaaS Óptica</Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium link">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl text-slate-900 dark:text-slate-100">Términos y privacidad</h1>

        <nav className="mt-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
          {([
            { id: "terminos", label: "Términos y condiciones" },
            { id: "privacidad", label: "Política de privacidad" },
          ] as const).map((t) => (
            <Link
              key={t.id}
              href={`/legal?tab=${t.id}`}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activa === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <article className="mt-8 space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {activa === "terminos" ? <Terminos /> : <Privacidad />}
        </article>
      </main>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-base font-semibold text-slate-900 first:mt-0 dark:text-slate-100">{children}</h2>;
}

function Terminos() {
  return (
    <>
      <p className="text-xs text-slate-400 dark:text-slate-500">Última actualización: julio de 2026</p>

      <H>1. Qué es este servicio</H>
      <p>
        {RAZON_SOCIAL} es un sistema de gestión en la nube para ópticas: permite registrar clientes
        y pacientes, agendar citas, guardar recetas ópticas, controlar inventario, registrar ventas
        y gastos. El servicio se presta por internet, sin instalación de software.
      </p>

      <H>2. Cuenta y responsabilidad del titular</H>
      <p>
        Al registrar una óptica, la persona que crea la cuenta queda como administrador y es
        responsable de los accesos que otorgue a su equipo, así como de la veracidad de la
        información que cargue. Cada negocio es responsable del uso que sus usuarios hagan del
        sistema.
      </p>

      <H>3. Prueba gratuita, planes y pagos</H>
      <p>
        El servicio incluye un periodo de prueba de 30 días sin costo y sin necesidad de tarjeta.
        Al terminar la prueba, para seguir usando el sistema se debe contratar un plan pago. Los
        precios vigentes se publican en la página de inicio e incluyen los impuestos que
        correspondan. Los pagos se procesan a través de una pasarela de pagos externa; {RAZON_SOCIAL}{" "}
        no almacena los datos completos de tu tarjeta.
      </p>

      <H>4. Cancelación</H>
      <p>
        No hay permanencia mínima: puedes cancelar cuando quieras y el servicio seguirá activo
        hasta el final del periodo ya pagado. Las cancelaciones no generan devolución proporcional
        del periodo en curso, salvo que la ley lo exija.
      </p>

      <H>5. Disponibilidad y respaldos</H>
      <p>
        Trabajamos para mantener el servicio disponible de forma continua, pero puede haber
        interrupciones por mantenimiento o por causas ajenas a nosotros. Realizamos respaldos
        periódicos de la información; aun así, recomendamos que cada negocio conserve sus propios
        registros de la información crítica.
      </p>

      <H>6. Uso aceptable</H>
      <p>
        No está permitido usar el sistema para fines ilícitos, cargar información de terceros sin
        su consentimiento, intentar acceder a datos de otros negocios, ni realizar acciones que
        comprometan la seguridad o el funcionamiento del servicio. El incumplimiento puede
        derivar en la suspensión de la cuenta.
      </p>

      <H>7. Límite de responsabilidad</H>
      <p>
        {RAZON_SOCIAL} es una herramienta de gestión: no presta servicios de salud ni sustituye el
        criterio profesional del optometrista. La responsabilidad por las decisiones clínicas y
        comerciales de cada óptica es exclusivamente suya.
      </p>

      <H>8. Cambios en estos términos</H>
      <p>
        Podemos actualizar estos términos. Si el cambio es sustancial, lo avisaremos por correo o
        dentro del sistema con antelación razonable.
      </p>

      <H>9. Contacto</H>
      <p>
        Para cualquier consulta sobre estos términos, escríbenos a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>.
      </p>
    </>
  );
}

function Privacidad() {
  return (
    <>
      <p className="text-xs text-slate-400 dark:text-slate-500">Última actualización: julio de 2026</p>

      <H>1. Quién trata tus datos</H>
      <p>
        {RAZON_SOCIAL} trata los datos personales conforme a la Ley N° 29733, Ley de Protección de
        Datos Personales del Perú, y su reglamento. Puedes contactarnos en{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>.
      </p>

      <H>2. Qué datos tratamos</H>
      <p>
        De la óptica cliente: nombre del negocio, RUC, dirección, teléfono, y los datos de contacto
        de las personas del equipo que usan el sistema. De los pacientes que la óptica registra:
        nombres, documento de identidad, teléfono y su historial de citas, compras y{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">recetas ópticas</strong>.
      </p>

      <H>3. Datos sensibles (graduación y recetas)</H>
      <p>
        La graduación y las recetas ópticas son datos relacionados con la salud y la ley los trata
        como <strong className="font-semibold text-slate-800 dark:text-slate-100">datos sensibles</strong>,
        con protección reforzada. Se usan únicamente para que la óptica pueda atender a su paciente
        y dar seguimiento a sus controles. No se comparten con terceros, no se usan con fines
        publicitarios y no se venden bajo ninguna circunstancia.
      </p>

      <H>4. Roles: quién es responsable de qué</H>
      <p>
        Cada óptica es la responsable del tratamiento de los datos de sus pacientes: decide qué
        registra y para qué. {RAZON_SOCIAL} actúa como encargado del tratamiento, es decir, provee
        la infraestructura y trata esos datos siguiendo las instrucciones de la óptica. Obtener el
        consentimiento del paciente corresponde a la óptica.
      </p>

      <H>5. Aislamiento entre negocios</H>
      <p>
        La información de cada óptica está aislada de la de las demás a nivel de base de datos:
        ningún usuario de un negocio puede acceder a los datos de otro, ni siquiera por error de la
        interfaz. El aislamiento se aplica en el servidor, no solo en la pantalla.
      </p>

      <H>6. Conservación</H>
      <p>
        Conservamos los datos mientras la cuenta esté activa. Si una óptica cancela su cuenta,
        mantenemos su información por un plazo razonable para permitir la reactivación o la
        exportación, y luego se elimina o anonimiza.
      </p>

      <H>7. Tus derechos (ARCO)</H>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>. Si eres
        paciente de una óptica que usa nuestro sistema, lo más directo es solicitarlo a la óptica,
        que es la responsable de tus datos; también podemos canalizar tu pedido hacia ella.
      </p>

      <H>8. Encargados y transferencias</H>
      <p>
        Para prestar el servicio nos apoyamos en proveedores de infraestructura en la nube y de
        procesamiento de pagos, que pueden almacenar información fuera del Perú bajo estándares
        adecuados de seguridad. No transferimos datos a terceros con fines comerciales.
      </p>

      <H>9. Seguridad</H>
      <p>
        Aplicamos cifrado en tránsito, control de acceso por roles, aislamiento por negocio y
        registro de auditoría de las operaciones sensibles. Ningún sistema es infalible: si
        detectáramos un incidente que afecte tus datos, lo comunicaremos conforme a la normativa.
      </p>
    </>
  );
}
