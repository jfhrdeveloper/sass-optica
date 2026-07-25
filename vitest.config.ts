import { defineConfig } from "vitest/config";
import path from "node:path";

/* Tests de lógica pura (sin DOM ni Supabase): el entorno `node` alcanza y es
   mucho más rápido que jsdom. Si más adelante se testean componentes React,
   habrá que sumar jsdom + @testing-library. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    /* Espeja el alias `@/*` de tsconfig.json — sin esto los imports
       `@/lib/...` de los tests no resuelven. */
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
