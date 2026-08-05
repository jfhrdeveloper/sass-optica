"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { EMAIL_SOPORTE, RAZON_SOCIAL } from "@/lib/contacto";
import { reiniciarConsentimientoCookies } from "@/lib/analytics/cookie-consent";

type TabId = "terminos" | "privacidad" | "cookies" | "proteccion";

type Seccion = { id: string; titulo: string; cuerpo: React.ReactNode };

/* Botón propio (no un link de texto): borra la elección guardada y recarga,
   para que AnalyticsProvider.tsx (montado en el layout raíz, sin relación
   directa con este árbol) vuelva a leer el estado limpio y muestre el
   banner de nuevo — ver cookie-consent.ts. */
function CambiarPreferenciaCookies() {
  return (
    <div>
      <p>
        Si aceptaste o rechazaste las cookies de analítica y quieres volver a elegir, puedes
        reiniciar tu preferencia:
      </p>
      <button onClick={reiniciarConsentimientoCookies} className="btn-outline mt-3">
        Cambiar mi preferencia de cookies
      </button>
    </div>
  );
}

/* Contenido migrado tal cual de la versión anterior de esta página (2 tabs
   sin sub-índice) — solo se partió cada `H + p` en un objeto `{ id, titulo,
   cuerpo }` para poder generar el sidebar de ferdocs-web (sub-secciones con
   scroll-to-section) sin duplicar el texto legal. */
const TERMINOS: Seccion[] = [
  {
    id: "term-1",
    titulo: "1. Qué es este servicio",
    cuerpo: (
      <p>
        {RAZON_SOCIAL} es un sistema de gestión en la nube para ópticas: permite registrar clientes
        y pacientes, agendar citas, guardar recetas ópticas, controlar inventario, registrar ventas
        y gastos. El servicio se presta por internet, sin instalación de software.
      </p>
    ),
  },
  {
    id: "term-2",
    titulo: "2. Cuenta y responsabilidad del titular",
    cuerpo: (
      <p>
        Al registrar una óptica, la persona que crea la cuenta queda como administrador y es
        responsable de los accesos que otorgue a su equipo, así como de la veracidad de la
        información que cargue. Cada negocio es responsable del uso que sus usuarios hagan del
        sistema.
      </p>
    ),
  },
  {
    id: "term-3",
    titulo: "3. Plan gratuito, planes pagos y pagos",
    cuerpo: (
      <p>
        El servicio incluye un plan gratuito permanente, sin costo y sin necesidad de tarjeta, con
        los límites de uso publicados en la página de inicio. Para levantar esos límites se puede
        contratar un plan pago en cualquier momento. Los precios vigentes se publican en la página
        de inicio e incluyen los impuestos que correspondan. Los pagos se procesan a través de una
        pasarela de pagos externa; {RAZON_SOCIAL} no almacena los datos completos de tu tarjeta.
      </p>
    ),
  },
  {
    id: "term-4",
    titulo: "4. Cancelación",
    cuerpo: (
      <p>
        No hay permanencia mínima: puedes cancelar cuando quieras y el servicio seguirá activo
        hasta el final del periodo ya pagado. Las cancelaciones no generan devolución proporcional
        del periodo en curso, salvo que la ley lo exija.
      </p>
    ),
  },
  {
    id: "term-5",
    titulo: "5. Disponibilidad y respaldos",
    cuerpo: (
      <p>
        Trabajamos para mantener el servicio disponible de forma continua, pero puede haber
        interrupciones por mantenimiento o por causas ajenas a nosotros. Realizamos respaldos
        periódicos de la información; aun así, recomendamos que cada negocio conserve sus propios
        registros de la información crítica.
      </p>
    ),
  },
  {
    id: "term-6",
    titulo: "6. Uso aceptable",
    cuerpo: (
      <p>
        No está permitido usar el sistema para fines ilícitos, cargar información de terceros sin
        su consentimiento, intentar acceder a datos de otros negocios, ni realizar acciones que
        comprometan la seguridad o el funcionamiento del servicio. El incumplimiento puede
        derivar en la suspensión de la cuenta.
      </p>
    ),
  },
  {
    id: "term-7",
    titulo: "7. Límite de responsabilidad",
    cuerpo: (
      <p>
        {RAZON_SOCIAL} es una herramienta de gestión: no presta servicios de salud ni sustituye el
        criterio profesional del optometrista. La responsabilidad por las decisiones clínicas y
        comerciales de cada óptica es exclusivamente suya.
      </p>
    ),
  },
  {
    id: "term-8",
    titulo: "8. Cambios en estos términos",
    cuerpo: (
      <p>
        Podemos actualizar estos términos. Si el cambio es sustancial, lo avisaremos por correo o
        dentro del sistema con antelación razonable.
      </p>
    ),
  },
  {
    id: "term-9",
    titulo: "9. Contacto",
    cuerpo: (
      <p>
        Para cualquier consulta sobre estos términos, escríbenos a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>.
      </p>
    ),
  },
];

const PRIVACIDAD: Seccion[] = [
  {
    id: "priv-1",
    titulo: "1. Quién trata tus datos",
    cuerpo: (
      <p>
        {RAZON_SOCIAL} trata los datos personales conforme a la Ley N° 29733, Ley de Protección de
        Datos Personales del Perú, y su reglamento. Puedes contactarnos en{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>.
      </p>
    ),
  },
  {
    id: "priv-2",
    titulo: "2. Qué datos tratamos",
    cuerpo: (
      <p>
        De la óptica cliente: nombre del negocio, RUC, dirección, teléfono, y los datos de contacto
        de las personas del equipo que usan el sistema. De los pacientes que la óptica registra:
        nombres, documento de identidad, teléfono y su historial de citas, compras y{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">recetas ópticas</strong>.
      </p>
    ),
  },
  {
    id: "priv-3",
    titulo: "3. Datos sensibles (graduación y recetas)",
    cuerpo: (
      <p>
        La graduación y las recetas ópticas son datos relacionados con la salud y la ley los trata
        como <strong className="font-semibold text-slate-800 dark:text-slate-100">datos sensibles</strong>,
        con protección reforzada. Se usan únicamente para que la óptica pueda atender a su paciente
        y dar seguimiento a sus controles. No se comparten con terceros, no se usan con fines
        publicitarios y no se venden bajo ninguna circunstancia.
      </p>
    ),
  },
  {
    id: "priv-4",
    titulo: "4. Roles: quién es responsable de qué",
    cuerpo: (
      <p>
        Cada óptica es la responsable del tratamiento de los datos de sus pacientes: decide qué
        registra y para qué. {RAZON_SOCIAL} actúa como encargado del tratamiento, es decir, provee
        la infraestructura y trata esos datos siguiendo las instrucciones de la óptica. Obtener el
        consentimiento del paciente corresponde a la óptica.
      </p>
    ),
  },
  {
    id: "priv-5",
    titulo: "5. Aislamiento entre negocios",
    cuerpo: (
      <p>
        La información de cada óptica está aislada de la de las demás a nivel de base de datos:
        ningún usuario de un negocio puede acceder a los datos de otro, ni siquiera por error de la
        interfaz. El aislamiento se aplica en el servidor, no solo en la pantalla.
      </p>
    ),
  },
  {
    id: "priv-6",
    titulo: "6. Conservación",
    cuerpo: (
      <p>
        Conservamos los datos mientras la cuenta esté activa. Si una óptica cancela su cuenta,
        mantenemos su información por un plazo razonable para permitir la reactivación o la
        exportación, y luego se elimina o anonimiza.
      </p>
    ),
  },
  {
    id: "priv-7",
    titulo: "7. Tus derechos (ARCO)",
    cuerpo: (
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>. Si eres
        paciente de una óptica que usa nuestro sistema, lo más directo es solicitarlo a la óptica,
        que es la responsable de tus datos; también podemos canalizar tu pedido hacia ella.
      </p>
    ),
  },
  {
    id: "priv-8",
    titulo: "8. Derecho a la portabilidad",
    cuerpo: (
      <p>
        Como administrador de una óptica, puedes solicitar tus datos y los de tu negocio en un
        formato estructurado y de uso común, para llevarlos a otro proveedor si lo decides.
        Escríbenos a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a> para
        coordinar la exportación.
      </p>
    ),
  },
  {
    id: "priv-9",
    titulo: "9. Encargados y transferencias",
    cuerpo: (
      <p>
        Para prestar el servicio nos apoyamos en proveedores de infraestructura en la nube y de
        procesamiento de pagos, que pueden almacenar información fuera del Perú bajo estándares
        adecuados de seguridad. No transferimos datos a terceros con fines comerciales.
      </p>
    ),
  },
  {
    id: "priv-10",
    titulo: "10. Seguridad",
    cuerpo: (
      <p>
        Aplicamos cifrado en tránsito, control de acceso por roles, aislamiento por negocio y
        registro de auditoría de las operaciones sensibles. Ningún sistema es infalible: si
        detectáramos un incidente que afecte tus datos, lo comunicaremos conforme a la normativa.
      </p>
    ),
  },
];

/* La Ley 29733 (y su reglamento, D.S. 016-2024-JUS) exige consentimiento
   previo/expreso solo para cookies que van más allá de lo estrictamente
   necesario (analítica, marketing, ubicación) — las estrictamente
   necesarias para prestar el servicio (mantener la sesión iniciada) están
   exceptuadas. Desde que se sumó PostHog (analítica en páginas públicas,
   ver AnalyticsProvider.tsx), sí hay algo opcional que aceptar/rechazar —
   por eso ahora existe el banner. Vercel Analytics NO cuenta como cookie no
   esencial: no usa cookies ni guarda identificadores, es tráfico anónimo
   agregado y se descarta a las 24h, así que no requiere este mismo
   consentimiento. */
const COOKIES: Seccion[] = [
  {
    id: "cook-1",
    titulo: "1. Qué es una cookie",
    cuerpo: (
      <p>
        Una cookie es un pequeño archivo que un sitio guarda en tu navegador para recordar
        información entre visitas, por ejemplo que iniciaste sesión.
      </p>
    ),
  },
  {
    id: "cook-2",
    titulo: "2. Cookies estrictamente necesarias",
    cuerpo: (
      <p>
        La cookie de sesión que crea nuestro proveedor de autenticación cuando inicias sesión o te
        registras es{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">
          estrictamente necesaria
        </strong>{" "}
        para que el sistema te reconozca como usuario logueado; sin ella no podrías usar el
        dashboard. No pedimos tu permiso para esta cookie porque la ley la exceptúa: es
        indispensable para el servicio que pediste. La preferencia de tema claro/oscuro se guarda
        en tu navegador (localStorage), no en una cookie.
      </p>
    ),
  },
  {
    id: "cook-3",
    titulo: "3. Cookies de analítica (opcionales)",
    cuerpo: (
      <p>
        Usamos <strong className="font-semibold text-slate-800 dark:text-slate-100">PostHog</strong>{" "}
        para entender cómo se navega esta página pública (qué se hace clic, en qué parte del
        proceso de registro se detiene alguien) y así mejorarla — nunca dentro del panel del
        sistema (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">/dashboard</code>),
        donde se muestra información de tus pacientes. PostHog guarda cookies con un identificador
        anónimo (sin tu nombre ni datos de contacto) por hasta 1 año, para reconocer visitas
        repetidas. Estas cookies{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">
          solo se activan si aceptas el aviso
        </strong>{" "}
        que aparece la primera vez que visitas la página — si lo rechazas, nunca se cargan.
      </p>
    ),
  },
  {
    id: "cook-4",
    titulo: "4. Cookies que NO usamos",
    cuerpo: (
      <p>
        No usamos cookies de publicidad ni de redes sociales, ni compartimos tu navegación con
        terceros con fines comerciales.
      </p>
    ),
  },
  {
    id: "cook-5",
    titulo: "5. Cómo eliminarlas",
    cuerpo: (
      <p>
        Puedes borrar cualquier cookie desde la configuración de tu navegador en cualquier momento.
        Borrar la cookie de sesión te cerrará la sesión; borrar las de PostHog solo hace que la
        próxima visita se cuente como nueva.
      </p>
    ),
  },
  {
    id: "cook-6",
    titulo: "6. Cambiar tu preferencia",
    cuerpo: <CambiarPreferenciaCookies />,
  },
  {
    id: "cook-7",
    titulo: "7. Contacto",
    cuerpo: (
      <p>
        Para cualquier consulta sobre cookies, escríbenos a{" "}
        <a href={`mailto:${EMAIL_SOPORTE}`} className="link font-medium">{EMAIL_SOPORTE}</a>.
      </p>
    ),
  },
];

/* Tercera pestaña, más técnica que "Política de privacidad": esa cubre el
   marco legal (Ley 29733, ARCO, encargados); esta explica CÓMO se protegen
   los datos en la práctica, con los mecanismos reales del sistema (no
   promesas genéricas) — ver docs/architecture.md y docs/supabase-schema.sql
   para cada afirmación (RLS + middleware, audit_log con trigger security
   definer, papelera con purga a los 30 días vía pg_cron). */
const PROTECCION: Seccion[] = [
  {
    id: "prot-1",
    titulo: "1. Aislamiento real, no solo de pantalla",
    cuerpo: (
      <p>
        Cada consulta a la base de datos se filtra por el negocio al que perteneces, a nivel del
        propio servidor de PostgreSQL (Row Level Security), y no solo en la interfaz. Esto se suma a
        un segundo filtro independiente en el servidor de la aplicación: aunque alguien lograra
        manipular la pantalla, la base de datos seguiría bloqueando el acceso a información de otro
        negocio.
      </p>
    ),
  },
  {
    id: "prot-2",
    titulo: "2. Ninguna clave maestra sale del servidor",
    cuerpo: (
      <p>
        Tu navegador nunca tiene acceso a la clave con privilegios totales de la base de datos. Las
        operaciones que la requieren (por ejemplo, crear una cuenta nueva) se ejecutan únicamente
        en nuestro servidor, nunca desde el código que corre en tu computadora.
      </p>
    ),
  },
  {
    id: "prot-3",
    titulo: "3. Registro de auditoría a prueba de manipulación",
    cuerpo: (
      <p>
        Cada operación sensible (crear, editar o borrar clientes, ventas, recetas, etc.) queda
        registrada automáticamente por un disparador de base de datos, no por código que alguien
        podría olvidar llamar o alterar. Ni siquiera un administrador puede escribir directamente
        en ese registro: solo el propio sistema lo hace.
      </p>
    ),
  },
  {
    id: "prot-4",
    titulo: "4. Roles y delegación de accesos financieros",
    cuerpo: (
      <p>
        Dentro de tu equipo, los roles de administrador, encargado y trabajador limitan qué puede
        ver y hacer cada persona. Los módulos con información financiera (caja, gastos, ganancias)
        se habilitan uno por uno para quien lo necesite, sin tener que subirlo de rol.
      </p>
    ),
  },
  {
    id: "prot-5",
    titulo: "5. Papelera con recuperación, no borrado inmediato",
    cuerpo: (
      <p>
        Al eliminar un cliente desde el sistema, el registro no desaparece al instante: queda en una
        papelera por 30 días, disponible para restaurarlo si fue un error. Pasado ese plazo, un
        proceso automático lo elimina de forma definitiva.
      </p>
    ),
  },
  {
    id: "prot-6",
    titulo: "6. Datos sensibles de salud",
    cuerpo: (
      <p>
        Las graduaciones y recetas ópticas son datos de salud y la Ley N° 29733 las clasifica como{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">datos sensibles</strong>,
        con protección reforzada. Se usan únicamente para que la óptica atienda a su paciente y le
        dé seguimiento a sus controles.
      </p>
    ),
  },
  {
    id: "prot-7",
    titulo: "7. Qué no hacemos",
    cuerpo: (
      <p>
        No vendemos tus datos ni los de tus pacientes, no los compartimos con terceros con fines
        comerciales y no los usamos para publicidad. Se tratan exclusivamente para prestarte el
        servicio que contrataste.
      </p>
    ),
  },
  {
    id: "prot-8",
    titulo: "8. Más detalle",
    cuerpo: (
      <p>
        Este resumen no reemplaza el detalle legal completo: para eso están las pestañas{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">Política de privacidad</strong> y{" "}
        <strong className="font-semibold text-slate-800 dark:text-slate-100">Términos y condiciones</strong>.
      </p>
    ),
  },
];

const TABS: { id: TabId; label: string; secciones: Seccion[] }[] = [
  { id: "terminos", label: "Términos y condiciones", secciones: TERMINOS },
  { id: "privacidad", label: "Política de privacidad", secciones: PRIVACIDAD },
  { id: "cookies", label: "Política de cookies", secciones: COOKIES },
  { id: "proteccion", label: "Protección de datos", secciones: PROTECCION },
];

/* Sidebar con sub-índice por sección — patrón tomado de ferdocs-web
   (src/app/legal/page.tsx de ese proyecto). A diferencia de ferdocs, acá NO
   hay expand/collapse independiente del tab activo: con solo 4 pestañas
   (sin "Info", que no aplica aquí) el sub-índice de la pestaña activa
   simplemente se muestra siempre — un toggle aparte sería un control de más
   para tan pocas opciones.

   `LazyMotion` propio (no el de LandingMotionProvider.tsx, que solo envuelve
   la landing): esta página vive fuera de ese árbol, así que arma su propio
   punto de carga con `domAnimation` para no arrastrar el bundle de
   framer-motion a rutas que no lo piden, igual que hace la landing. */
export function LegalHub({ tabInicial }: { tabInicial: TabId }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(tabInicial);

  function irATab(id: TabId) {
    setActiveTab(id);
    router.replace(`/legal?tab=${id}`, { scroll: false });
  }

  function irASeccion(id: TabId, subId: string) {
    if (activeTab !== id) {
      irATab(id);
      setTimeout(() => scrollASeccion(subId), 50);
    } else {
      scrollASeccion(subId);
    }
  }

  function scrollASeccion(subId: string) {
    document.getElementById(subId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const tabActual = TABS.find((t) => t.id === activeTab)!;

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col gap-10 md:flex-row md:items-start">
        <aside className="w-full shrink-0 md:sticky md:top-24 md:w-64">
          <nav className="flex flex-col gap-1 border-b border-slate-200 pb-4 dark:border-slate-800 md:border-b-0 md:pb-0">
            {TABS.map((tab) => {
              const activo = tab.id === activeTab;
              return (
                <div key={tab.id}>
                  <button
                    onClick={() => irATab(tab.id)}
                    className={`relative w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      activo
                        ? "text-primary"
                        : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {activo && (
                      <m.span
                        layoutId="legal-tab-pill"
                        className="absolute inset-0 rounded-lg bg-primary-light"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span className="relative">{tab.label}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {activo && (
                      <m.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="mb-2 mt-1 space-y-0.5 overflow-hidden border-l border-slate-200 pl-3 dark:border-slate-800"
                      >
                        {tab.secciones.map((s) => (
                          <li key={s.id}>
                            <button
                              onClick={() => irASeccion(tab.id, s.id)}
                              className="w-full rounded px-2 py-1.5 text-left text-xs text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
                            >
                              {s.titulo}
                            </button>
                          </li>
                        ))}
                      </m.ul>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </aside>

        <AnimatePresence mode="wait" initial={false}>
          <m.article
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="min-w-0 flex-1 space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
          >
            <p className="text-xs text-slate-500 dark:text-slate-500">Última actualización: agosto de 2026</p>
            {tabActual.secciones.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">{s.titulo}</h2>
                {s.cuerpo}
              </section>
            ))}
          </m.article>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
