import type { Metadata } from "next";

/* Defensa en profundidad además de robots.ts (que solo bloquea el RASTREO):
   si alguna vez alguien enlaza una URL de /admin-panel/* desde afuera, este
   noindex evita que Google la indexe igual — mismo criterio que
   dashboard/layout.tsx. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Layout raíz del namespace admin-panel — sin guardia (la guardia vive en
   admin-panel/(protegido)/layout.tsx). /login queda fuera de esa guardia a
   propósito: exigir sesión ahí mismo crearía un redirect loop.

   Sin contenedor propio: /login se centra a sí mismo (ver login/page.tsx) y
   (protegido)/ trae su propio AdminShell con sidebar — un wrapper acá
   duplicaría el padding/max-width de ambos. */
export default function AdminPanelRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
