import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieDomain } from "./cookie-domain";

/* ====== Cliente para componentes del lado del navegador ======
   Usa la ANON key. Toda query queda sujeta a RLS. Cookie a nivel de dominio
   padre (ver cookie-domain.ts) para que la sesión creada en el login
   (dominio raíz) sea válida también en el subdominio del negocio.

   `createBrowserClient` revienta en el constructor si la URL/key vienen
   vacías (aún antes de hacer ninguna query) — con placeholders no vacíos en
   vez de "!", el componente no crashea mientras no haya credenciales reales
   (modo mock, o antes de configurar .env.local); cualquier intento real de
   uso simplemente falla al hacer fetch, con un error más manejable. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookieOptions: { domain: sharedCookieDomain(), sameSite: "lax" } }
  );
}
