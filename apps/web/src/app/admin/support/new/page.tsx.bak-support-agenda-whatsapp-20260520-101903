"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import { getStoredAuthUser } from "../../../../lib/auth-client";
import { createSupportTicketReal } from "../../../../lib/support-api-workflow";

type StoredUser = { id?: string; name?: string; email?: string; role?: string };

function fallbackUser(): StoredUser {
  return { id: "admin-local", name: "Produtor/Admin", email: "admin@local.test", role: "ADMIN" };
}

function readInitialParams() {
  if (typeof window === "undefined") {
    return { eventId: "", eventName: "" };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    eventId: params.get("eventId") || "",
    eventName: params.get("eventName") || "",
  };
}

export default function NewAdminSupportPage() {
  const initial = readInitialParams();

  const [form, setForm] = useState({
    eventId: initial.eventId,
    eventName: initial.eventName,
    customerName: "",
    title: "",
    message: "",
    priority: "NORMAL",
    targetType: "PRODUCER",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = readInitialParams();
    setForm((current) => ({
      ...current,
      eventId: current.eventId || next.eventId,
      eventName: current.eventName || next.eventName,
    }));
  }, []);

  async function submit() {
    if (!form.title.trim() || !form.message.trim()) {
      alert("Informe título e mensagem.");
      return;
    }

    setSaving(true);

    try {
      const user = getStoredAuthUser<StoredUser>() || fallbackUser();

      const ticket = await createSupportTicketReal({
        title: form.title,
        category: form.targetType === "SUPER_ADMIN" ? "Suporte técnico" : "Atendimento",
        message: form.message,
        priority: form.priority as any,
        sourceType: "PRODUCER",
        targetType: "ALL" as any,
        currentOwnerType: form.targetType === "SUPER_ADMIN" ? "SUPER_ADMIN" : "PRODUCER",
        eventId: form.eventId || undefined,
        eventName: form.eventName || undefined,
        customerName: form.customerName || undefined,
        producerName: user.name || "Produtor/Admin",
        producerEmail: user.email,
        createdByRole: "PRODUCER",
        createdByName: user.name || "Produtor/Admin",
        createdByEmail: user.email,
      } as any);

      const eventQuery = form.eventId ? `eventId=${encodeURIComponent(form.eventId)}` : "";
      const ticketQuery = ticket?.id ? `ticket=${encodeURIComponent(ticket.id)}` : "";
      const query = [eventQuery, ticketQuery].filter(Boolean).join("&");

      window.location.href = `/admin/support${query ? `?${query}` : ""}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível abrir o chamado.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <a href={form.eventId ? `/admin/support?eventId=${encodeURIComponent(form.eventId)}` : "/admin/support"} className="text-sm font-black text-orange-600">
          ← Voltar para suporte
        </a>

        <section className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">Novo chamado</p>
          <h1 className="mt-2 text-3xl font-black">Abrir chamado</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            A abertura ficou separada da central. Depois de abrir, você volta direto para o chat do evento.
          </p>

          <div className="mt-6 grid gap-3">
            <input value={form.eventId} onChange={(event) => setForm((current) => ({ ...current, eventId: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" placeholder="ID do evento" />
            <input value={form.eventName} onChange={(event) => setForm((current) => ({ ...current, eventName: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" placeholder="Nome do evento" />
            <input value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" placeholder="Cliente relacionado, se houver" />
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" placeholder="Título do chamado" />
            <select value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none">
              <option value="PRODUCER">Atendimento normal do evento</option>
              <option value="SUPER_ADMIN">Problema técnico para Suporte Site</option>
            </select>
            <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none">
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none" placeholder="Mensagem inicial" />

            <button type="button" onClick={submit} disabled={saving} className="rounded-2xl bg-orange-600 px-5 py-4 text-sm font-black text-white disabled:opacity-50">
              {saving ? "Abrindo..." : "Abrir chamado"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}