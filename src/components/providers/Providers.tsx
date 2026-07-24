"use client";

import { DataProvider } from "@/components/providers/DataProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

/* Orden importa: SessionProvider busca el empleado activo DENTRO del store
   de DataProvider, así que DataProvider debe envolver por fuera. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <SessionProvider>{children}</SessionProvider>
    </DataProvider>
  );
}
