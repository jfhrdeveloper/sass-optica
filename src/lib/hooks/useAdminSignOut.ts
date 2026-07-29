import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isMockMode, MOCK_ADMIN_COOKIE } from "@/lib/mock/mock-mode";

/* Cerrar sesión del admin-panel — compartido entre AdminNav.tsx (sidebar de
   escritorio) y AdminMobileHeader.tsx (mobile), para no duplicar la rama de
   modo mock en los dos lugares. */
export function useAdminSignOut(): () => Promise<void> {
  const router = useRouter();
  return async function signOut() {
    if (isMockMode()) {
      document.cookie = `${MOCK_ADMIN_COOKIE}=; path=/; max-age=0`;
      router.replace("/admin-panel/login");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };
}
