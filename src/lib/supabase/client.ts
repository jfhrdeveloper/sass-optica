import { createBrowserClient } from "@supabase/ssr";
import { sharedCookieDomain } from "./cookie-domain";

/* ====== Cliente para componentes del lado del navegador ======
   Usa la ANON key. Toda query queda sujeta a RLS. Cookie a nivel de dominio
   padre (ver cookie-domain.ts) para que la sesión creada en el login
   (dominio raíz) sea válida también en el subdominio del negocio. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { domain: sharedCookieDomain(), sameSite: "lax" } }
  );
}
