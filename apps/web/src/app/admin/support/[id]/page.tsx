"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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
  assignedUser?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  messages?: SupportMessage[];
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function formatMoney(value?: string | number) {
  const numeric =
    typeof value === "number" ? value : Number(String(value || 0).replace(",", "."));

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isNaN(numeric) ? 0 : numeric);
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
  if (senderType === "ADMIN" || senderType === "OPERATOR" || senderType === "PRODUCER") {
    return "ml-auto bg-slate-900 text-white";
  }

  return "mr-auto border border-gray-200 bg-white text-gray-900";
}

export default function AdminSupportThreadPage() {
  const params = useParams();
  const threadId = String(params.id || "");

  const [thread, setThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [message, setMessage] = useState("");

  async function loadThread(threadIdParam: string) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!threadIdParam) {
      alert("Atendimento inválido");
      window.location.href = "/support";
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/v1/support/admin/${threadIdParam}`,
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
        window.location.href = "/support";
        return;
      }

      setThread(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com a API");
      window.location.href = "/support";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThread(threadId);
  }, [threadId]);

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
        `http://localhost:3001/v1/support/admin/${thread.id}/messages`,
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
      console.error(error);
      alert("Erro ao conectar com a API");
    } finally {
      setSending(false);
    }
  }

  async function handleCloseThread() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!thread?.id) {
      alert("Atendimento inválido");
      return;
    }

    setClosing(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/support/admin/${thread.id}/close`,
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
            : "Erro ao fechar atendimento",
        );
        return;
      }

      setThread(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com a API");
    } finally {
      setClosing(false);
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
        `http://localhost:3001/v1/support/admin/${thread.id}/reopen`,
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
      console.error(error);
      alert("Erro ao conectar com a API");
    } finally {
      setReopening(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
        <p>Carregando atendimento...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
        <p>Atendimento não encontrado.</p>
      </div>
    );
  }

  const organizerName =
    thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";

  const isClosed = thread.status === "CLOSED";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  thread.status,
                )}`}
              >
                {thread.status || "SEM STATUS"}
              </span>

              <span className="text-sm text-gray-500">
                Última interação: {formatDate(thread.lastMessageAt)}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold">
              {thread.subject || "Atendimento"}
            </h1>

            <p className="mt-2 text-gray-600">
              Atendimento interno entre cliente e produtor dentro do app.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/support"
              className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Voltar para atendimentos
            </Link>

            {thread.order?.id ? (
              <Link
                href={`/orders/${thread.order.id}`}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Ver pedido
              </Link>
            ) : null}

            {thread.event?.id ? (
              <Link
                href={`/events/${thread.event.id}`}
                className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Ver evento
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Dados do atendimento</h2>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {thread.customerName || "-"}
                </p>
                <p className="mt-1 break-all text-sm text-gray-500">
                  {thread.customerEmail || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Produtor</p>
                <p className="mt-1 font-semibold text-gray-900">{organizerName}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Evento</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {thread.event?.name || "-"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(thread.event?.eventDate)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Pedido</p>
                <p className="mt-1 font-semibold text-gray-900">
                  #{thread.order?.id || "-"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {thread.order?.status || "-"} •{" "}
                  {formatMoney(thread.order?.totalAmount)}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Responsável</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {thread.assignedUser?.name || "Não atribuído"}
                </p>
                <p className="mt-1 break-all text-sm text-gray-500">
                  {thread.assignedUser?.email || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Criado em</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(thread.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Ações</h2>

            <div className="mt-5 space-y-3">
              {!isClosed ? (
                <button
                  type="button"
                  onClick={handleCloseThread}
                  disabled={closing}
                  className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {closing ? "Fechando..." : "Fechar atendimento"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReopenThread}
                  disabled={reopening}
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reopening ? "Reabrindo..." : "Reabrir atendimento"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Conversa</h2>

          <div className="mt-5 max-h-[560px] space-y-4 overflow-y-auto rounded-3xl bg-gray-50 p-4">
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
                      {item.senderName ||
                        (item.senderType === "CUSTOMER" ? "Cliente" : "Atendente")}
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
                  Responder cliente
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Digite sua resposta"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar resposta"}
                </button>

                <Link
                  href="/support"
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Voltar
                </Link>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Este atendimento está encerrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}