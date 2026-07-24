import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sharedCookieDomain } from "./cookie-domain";

/* ====== Cliente para Server Components y Server Actions ======
   ANON key + cookies de la sesión. Sujeto a RLS como el usuario actual.
   Cookie a nivel de dominio padre — ver cookie-domain.ts. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: sharedCookieDomain(), sameSite: "lax" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* setAll desde un Server Component: ignorable (lo refresca el middleware). */
          }
        },
      },
    }
  );
}
