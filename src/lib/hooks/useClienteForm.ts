"use client";

import { useState } from "react";
import { useData, type Cliente } from "@/components/providers/DataProvider";
import { useToast } from "@/components/providers/ToastProvider";

const VACIO: Partial<Cliente> = { nombres: "", apellidos: "", documentoTipo: "DNI" };

/* Estado + acciones del formulario de alta/edición de cliente, sacado de
   clientes/page.tsx para poder reusarlo también desde clientes/[id]/page.tsx
   (el botón "Editar" de la ficha) sin duplicar el wizard de 2 pasos. */
export function useClienteForm() {
  const { addCliente, updateCliente } = useData();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Cliente>>(VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);

  function nuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setPaso(1);
    setAbierto(true);
  }

  function editar(c: Cliente) {
    setEditandoId(c.id);
    setForm(c);
    setPaso(1);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditandoId(null);
    setForm(VACIO);
    setPaso(1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombres) return;
    setGuardando(true);
    if (editandoId) {
      await updateCliente(editandoId, form);
      toast("Cambios guardados.");
    } else {
      await addCliente(form);
      toast("Cliente agregado.");
    }
    setGuardando(false);
    cerrar();
  }

  return { form, setForm, editandoId, abierto, paso, setPaso, guardando, nuevo, editar, cerrar, onSubmit };
}

export type ClienteFormState = ReturnType<typeof useClienteForm>;
