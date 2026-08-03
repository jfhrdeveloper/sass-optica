/* ================= POSTHOG (analítica de producto/marketing) ================= */
/* Solo se activa si hay NEXT_PUBLIC_POSTHOG_KEY configurada (vacío a propósito
   hasta crear la cuenta real, mismo patrón que Supabase/Culqi en .env.local) Y
   el visitante ya aceptó cookies (ver AnalyticsProvider.tsx) — nunca se carga
   por defecto. Import dinámico: así el bundle de posthog-js no se descarga en
   ninguna página mientras no haya consentimiento, ni en /dashboard o
   /admin-panel, donde nunca se inicializa (ver AnalyticsProvider.tsx). */
let inicializado = false;

export async function initPosthog() {
  if (inicializado) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const posthog = (await import("posthog-js")).default;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    /* Sin grabación de sesión por defecto: aunque esta pestaña ya está
       restringida a páginas públicas (sin datos de pacientes), grabar video
       de sesión es una decisión aparte con más superficie de riesgo — se
       activa manualmente desde el panel de PostHog el día que se decida,
       no por defecto desde acá. */
    disable_session_recording: true,
  });
  inicializado = true;
}

export function posthogActivo() {
  return inicializado;
}
