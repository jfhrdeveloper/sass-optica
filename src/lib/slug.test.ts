import { describe, expect, it } from "vitest";
import { generarSlug, validarFormatoSlug, esReservado, SUBDOMINIOS_RESERVADOS } from "@/lib/slug";

/* El slug ES el subdominio del negocio y NO se puede cambiar después del
   registro (bloqueado por trigger en la DB — ver supabase-schema.sql), así
   que un slug mal generado es un error permanente para ese cliente. De ahí
   que sea lo primero que vale la pena testear. */

describe("generarSlug", () => {
  it("pasa a minúsculas y une con guiones", () => {
    expect(generarSlug("Óptica Los Olivos")).toBe("optica-los-olivos");
  });

  it("quita tildes sin romper la letra base", () => {
    expect(generarSlug("Visión Perú")).toBe("vision-peru");
  });

  it("convierte la ñ en n (no la borra)", () => {
    expect(generarSlug("Óptica Peña")).toBe("optica-pena");
  });

  it("descarta símbolos que no son válidos en un subdominio", () => {
    expect(generarSlug("Óptica O'Higgins & Cía.")).toBe("optica-ohiggins-cia");
  });

  it("colapsa espacios repetidos en un solo guion", () => {
    expect(generarSlug("Óptica    Central")).toBe("optica-central");
  });

  it("no deja guiones al principio ni al final", () => {
    const slug = generarSlug("  -- Óptica Central -- ");
    expect(slug.startsWith("-")).toBe(false);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("en formato 'junto' elimina los espacios en vez de poner guiones", () => {
    expect(generarSlug("Óptica Los Olivos", "junto")).toBe("opticalosolivos");
  });

  it("lo que genera siempre pasa la validación de formato", () => {
    const nombres = ["Óptica Los Olivos", "Visión Perú", "Óptica Peña", "La Óptica 24/7"];
    for (const nombre of nombres) {
      expect(validarFormatoSlug(generarSlug(nombre)).valido).toBe(true);
    }
  });
});

describe("validarFormatoSlug", () => {
  it("acepta un slug normal", () => {
    expect(validarFormatoSlug("optica-central").valido).toBe(true);
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(validarFormatoSlug("ab").valido).toBe(false);
  });

  it("rechaza más de 30 caracteres", () => {
    expect(validarFormatoSlug("a".repeat(31)).valido).toBe(false);
  });

  it("acepta exactamente 3 y 30 caracteres (los bordes son válidos)", () => {
    expect(validarFormatoSlug("abc").valido).toBe(true);
    expect(validarFormatoSlug("a".repeat(30)).valido).toBe(true);
  });

  it("rechaza mayúsculas", () => {
    expect(validarFormatoSlug("Optica").valido).toBe(false);
  });

  it("rechaza guion al inicio o al final", () => {
    expect(validarFormatoSlug("-optica").valido).toBe(false);
    expect(validarFormatoSlug("optica-").valido).toBe(false);
  });

  it("rechaza espacios y caracteres especiales", () => {
    expect(validarFormatoSlug("optica central").valido).toBe(false);
    expect(validarFormatoSlug("optica_central").valido).toBe(false);
    expect(validarFormatoSlug("óptica").valido).toBe(false);
  });

  it("siempre devuelve un mensaje de error cuando no es válido", () => {
    for (const malo of ["ab", "Optica", "-x-", "optica central"]) {
      const r = validarFormatoSlug(malo);
      expect(r.valido).toBe(false);
      expect(r.error).toBeTruthy();
    }
  });
});

describe("subdominios reservados", () => {
  it("rechaza los reservados aunque el formato sea válido", () => {
    for (const reservado of SUBDOMINIOS_RESERVADOS) {
      /* Solo los que pasarían el formato: los cortos (ftp, api, dev) igual
         caen por longitud, y eso ya lo cubre el bloque de arriba. */
      if (reservado.length >= 3) {
        expect(esReservado(reservado)).toBe(true);
        expect(validarFormatoSlug(reservado).valido).toBe(false);
      }
    }
  });

  it("'admin' está reservado — es el subdominio del panel del SaaS", () => {
    expect(esReservado("admin")).toBe(true);
  });

  it("no marca como reservado un nombre normal", () => {
    expect(esReservado("optica-central")).toBe(false);
  });
});
