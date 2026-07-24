/* Layout raíz del namespace admin-panel — sin guardia (la guardia vive en
   admin-panel/(protegido)/layout.tsx). /login queda fuera de esa guardia a
   propósito: exigir sesión ahí mismo crearía un redirect loop. */
export default function AdminPanelRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl p-6">{children}</div>;
}
