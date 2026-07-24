import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompletarRegistroForm } from "@/components/auth/CompletarRegistroForm";

/* Paso final de "Registrarse con Google" (ver /auth/callback/route.ts): la
   cuenta de Google ya existe en Supabase, con una fila `empleados` mínima
   (negocio_id NULL, la crea el trigger handle_new_user() del schema), pero
   todavía sin óptica. Defensa en profundidad además de proxy.ts: si alguien
   llega acá sin sesión, o ya completó el alta antes, no le mostramos el
   formulario. */
export default async function CompletarRegistroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/registro");

  const { data: empleado } = await supabase
    .from("empleados").select("negocio_id").eq("id", user.id).maybeSingle();
  if (empleado?.negocio_id) redirect("/login");

  return <CompletarRegistroForm email={user.email ?? ""} />;
}
