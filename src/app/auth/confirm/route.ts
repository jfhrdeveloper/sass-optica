import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ================= CONFIRMACIÓN DE ENLACE DE EMAIL =================
   Destino de los enlaces de invitación y recuperación (flujo token_hash).
   Vive en el dominio raíz (igual que /login) — verifica el OTP en el
   servidor (deja la sesión en cookies, con dominio compartido con los
   subdominios) y redirige a la página donde el usuario define su contraseña.

   Por qué token_hash y NO el flujo `?code` (PKCE): la invitación la genera el
   admin en el servidor, así que el navegador del invitado NUNCA tiene el
   `code_verifier` que PKCE necesita → el canje fallaba y salía "enlace vencido".
   `verifyOtp({ token_hash })` no depende del verifier. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/login/nueva-clave";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  /* Token ausente/expirado/ya usado → la página de nueva clave mostrará el aviso. */
  return NextResponse.redirect(new URL("/login/nueva-clave?error=1", origin));
}
