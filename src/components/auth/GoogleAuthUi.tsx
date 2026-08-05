/* Compartido entre AuthPage.tsx (login/registro de negocios) y
   admin-panel/login/page.tsx — mismo lenguaje visual en los dos logins. */

/* Logo oficial de Google (4 colores) — no hay ícono de marca en lucide-react,
   así que va como SVG inline. */
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.5 0 10.5-2.1 14.2-5.6l-6.6-5.4C29.6 35.7 27 36.6 24 36.6c-5.2 0-9.6-3.4-11.2-8.1l-6.6 5.1C9.6 40.4 16.3 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.5 4.8-4.6 6.3l6.6 5.4C41.4 36 45 30.5 45 24c0-1.4-.1-2.5-.4-3.5z" />
    </svg>
  );
}

/* Divisor "o continúa con..." entre el botón de Google y el formulario de
   email/contraseña. */
export function DivisorO({ texto }: { texto: string }) {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      {texto}
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
