"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import { getStoredAuthUser } from "../../../../lib/auth-client";
import { createSupportTicketReal } from "../../../../lib/support-api-workflow";

type StoredUser = { id?: string; name?: string; email?: string; role?: string };
type EventContext = { eventId: string; eventName: string; assignmentId: string };

function fallbackUser(): StoredUser {
  return { id: "operator-local", name: "Operador", email: "operador@local.test", role: "OPERATOR" };
}

function readEventContext(): EventContext {
  if (typeof window === "undefined") {
    return { eventId: "", eventName: "", assignmentId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId") || "";
  const eventName =
    params.get("eventName") ||
    localStorage.getItem(`operator-event-name-${eventId}`) ||
    localStorage.getItem("operator-selected-event-name") ||
    "";
  const assignmentId = params.get("assignmentId") || "";

  if (eventId && eventName) {
    localStorage.setItem(`operator-event-name-${eventId}`, eventName);
    localStorage.setItem("operator-selected-event-id", eventId);
    localStorage.setItem("operator-selected-event-name", eventName);
  }

  return { eventId, eventName, assignmentId };
}

export default function NewOperatorSupportPage() {
  const [context, setContext] = useState<EventContext>({ eventId: "", eventName: "", assignmentId: "" });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const canSubmit = Boolean(context.eventId && title.trim() && message.trim() && !saving);

  useEffect(() => {
    const nextContext = readEventContext();
    setContext(nextContext);
    setLoaded(true);
  }, []);

  async function submit() {
    if (!context.eventId) {
      alert("Entre pelo botão Suporte do evento.");
      return;
    }

    if (!title.trim()) {
      alert("Informe o título do problema.");
      return;
    }

    if (!message.trim()) {
      alert("Descreva o problema técnico.");
      return;
    }

    setSaving(true);

    try {
      const user = getStoredAuthUser<StoredUser>() || fallbackUser();
      const eventName = context.eventName || context.eventId;

      const ticket = await createSupportTicketReal({
        title: title.trim(),
        category: "Suporte técnico",
        message: message.trim(),
        priority: "NORMAL" as any,
        sourceType: "OPERATOR",
        targetType: "ALL" as any,
        currentOwnerType: "SUPER_ADMIN",
        eventId: context.eventId,
        eventName,
        operatorName: user.name || "Operador",
        operatorEmail: user.email,
        createdByRole: "OPERATOR",
        createdByName: user.name || "Operador",
        createdByEmail: user.email,
      } as any);

      const params = new URLSearchParams();
      params.set("eventId", context.eventId);
      params.set("eventName", eventName);

      if (context.assignmentId) {
        params.set("assignmentId", context.assignmentId);
      }

      if (ticket?.id) {
        params.set("ticket", ticket.id);
      }

      window.location.href = `/operator/support?${params.toString()}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível abrir chamado técnico.");
      setSaving(false);
    }
  }

  if (loaded && !context.eventId) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Evento obrigatório</p>
          <h1 className="mt-2 text-3xl font-black text-amber-950">Entre pelo suporte do evento</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
            Para criar chamado técnico, abra primeiro o evento na agenda do operador e clique em Suporte. Assim o chamado fica ligado ao evento correto.
          </p>
          <a href="/operator/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Voltar para agenda do operador
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <a
          href={`/operator/support?eventId=${encodeURIComponent(context.eventId || "")}&eventName=${encodeURIComponent(context.eventName || "")}${context.assignmentId ? `&assignmentId=${encodeURIComponent(context.assignmentId)}` : ""}`}
          className="text-sm font-black text-blue-600"
        >
          ← Voltar para suporte do evento
        </a>

        <section className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Chamado técnico</p>
          <h1 className="mt-2 text-3xl font-black">Abrir chamado com Suporte Site</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Este chamado será criado somente para o evento que o operador está atendendo agora.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700/70">Evento atual</p>
            <p className="mt-2 break-all text-sm font-black text-slate-950">ID: {context.eventId || "carregando..."}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">Nome: {context.eventName || "Evento selecionado"}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Título do problema *"
            />

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Descrição do problema técnico *"
            />

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Abrindo..." : "Abrir chamado técnico"}
            </button>

            <p className="text-xs font-bold text-slate-400">
              Para criar chamado em outro evento, volte para a agenda e entre no suporte daquele outro evento.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}