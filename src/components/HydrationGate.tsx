"use client";

import { useData } from "@/components/providers/DataProvider";
import { useSession } from "@/components/providers/SessionProvider";

/* Muestra un skeleton simple hasta que DataProvider y SessionProvider estén
   `ready` — evita parpadeos de "sin datos" mientras cargan Auth + el store. */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const d = useData();
  const s = useSession();

  if (!d.ready || !s.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
