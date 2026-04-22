"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type SupportMessage = {
  id: string;
  senderUserId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  senderType?: string;
  message?: string;
  createdAt?: string;
};

type SupportThread = {
  id: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt?: string;
  customerName?: string | null;
  customerEmail?: string;
  event?: {
    id?: string;
    name?: string;
    eventDate?: string;
  } | null;
  order?: {
    id?: string;
    status?: string;
    totalAmount?: string | number;
  } | null;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
  } | null;
  messages?: SupportMessage[];
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function getStatusClasses(status?: string) {
  if (status === "OPEN") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "CUSTOMER_REPLY") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
  }

  if (status === "PRODUCER_REPLY") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "CLOSED") {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function getSenderBubbleClasses(senderType?: string) {
  if (senderType === "CUSTOMER") {
    return "ml-auto bg-sky-600 text-white";
  }

  return "mr-auto bg-white border border-gray-200 text-gray-900";
}

export default function CustomerSupportThreadPage() {
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [message, setMessage] = useState("");

  const threadId = useMemo(() => {
    if (typeof window === "undefined") return "";

    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  async function loadThread(threadIdParam: string) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!threadIdParam) {
      alert("Atendimento inválido");
      window.location.href = "/customer/orders";
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/v1/support/customer/${threadIdParam}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao carregar atendimento",
        );
        window.location.href = "/customer/orders";
        return;
      }

      setThread(data);
    } catch (error) {
      console.error("SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
      window.location.href = "/customer/orders";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThread(threadId);
  }, [threadId]);

  function goTo(path: string) {
    window.location.href = path;
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!thread?.id) {
      alert("Atendimento inválido");
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      alert("Digite uma mensagem");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/support/customer/${thread.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: trimmedMessage,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao enviar mensagem",
        );
        return;
      }

      setThread(data);
      setMessage("");
    } catch (error) {
      console.error("SEND SUPPORT MESSAGE ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setSending(false);
    }
  }

  async function handleReopenThread() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!thread?.id) {
      alert("Atendimento inválido");
      return;
    }

    setReopening(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/support/customer/${thread.id}/reopen`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao reabrir atendimento",
        );
        return;
      }

      setThread(data);
    } catch (error) {
      console.error("REOPEN SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setReopening(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            Carregando atendimento...
          </div>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            Atendimento não encontrado.
          </div>
        </div>
      </div>
    );
  }

  const organizerName =
    thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";

  const isClosed = thread.status === "CLOSED";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Atendimento
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          {thread.subject || "Suporte"}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
              thread.status,
            )} bg-white`}
          >
            {thread.status || "SEM STATUS"}
          </span>

          <span className="text-sm text-white/85">
            Evento: {thread.event?.name || "-"}
          </span>

          <span className="text-sm text-white/85">
            Pedido: #{thread.order?.id || "-"}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => goTo("/customer/orders")}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          >
            Voltar para pedidos
          </button>

          {thread.order?.id ? (
            <button
              type="button"
              onClick={() => goTo(`/customer/orders/${thread.order?.id}`)}
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Ver pedido
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Dados do atendimento
            </h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Produtor</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {organizerName}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Evento</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {thread.event?.name || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Pedido</p>
                <p className="mt-1 font-semibold text-gray-900">
                  #{thread.order?.id || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Criado em</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(thread.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Última interação</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(thread.lastMessageAt)}
                </p>
              </div>
            </div>
          </div>

          {isClosed ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-amber-800">
                Atendimento encerrado
              </h2>
              <p className="mt-3 text-sm leading-6 text-amber-700">
                Você pode reabrir este atendimento e continuar a conversa.
              </p>

              <button
                type="button"
                onClick={handleReopenThread}
                disabled={reopening}
                className="mt-5 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reopening ? "Reabrindo..." : "Reabrir atendimento"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Conversa</h2>

          <div className="mt-5 max-h-[520px] space-y-4 overflow-y-auto rounded-[24px] bg-gray-50 p-4">
            {thread.messages?.length ? (
              thread.messages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[85%] rounded-[22px] px-4 py-3 shadow-sm ${getSenderBubbleClasses(
                    item.senderType,
                  )}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-80">
                    <span className="font-semibold">
                      {item.senderType === "CUSTOMER"
                        ? item.senderName || "Você"
                        : item.senderName || "Produtor"}
                    </span>
                    <span>•</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {item.message || ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-gray-500">
                Nenhuma mensagem ainda.
              </div>
            )}
          </div>

          {!isClosed ? (
            <form onSubmit={handleSendMessage} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nova mensagem
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Digite sua mensagem para o produtor"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </button>

                {thread.order?.id ? (
                  <button
                    type="button"
                    onClick={() => goTo(`/customer/orders/${thread.order?.id}`)}
                    className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Voltar ao pedido
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Este atendimento está encerrado.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}