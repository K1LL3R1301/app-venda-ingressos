"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

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

const API_BASE_URL = "http://localhost:3001/v1";

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function getStatusLabel(status?: string) {
  if (status === "OPEN") return "Novo";
  if (status === "CUSTOMER_REPLY") return "Cliente aguardando";
  if (status === "PRODUCER_REPLY") return "Respondido";
  if (status === "CLOSED") return "Fechado";
  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  if (status === "OPEN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CUSTOMER_REPLY") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "PRODUCER_REPLY") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "CLOSED") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getSenderBubbleClasses(senderType?: string) {
  if (senderType === "ADMIN" || senderType === "OPERATOR" || senderType === "PRODUCER") {
    return "ml-auto border-slate-950 bg-slate-950 text-white";
  }

  return "mr-auto border-slate-200 bg-white text-slate-900";
}

function getSenderLabel(item: SupportMessage) {
  if (item.senderType === "CUSTOMER") return item.senderName || "Cliente";
  if (item.senderType === "PRODUCER") return item.senderName || "Produtor";
  if (item.senderType === "ADMIN") return item.senderName || "Atendimento";
  if (item.senderType === "OPERATOR") return item.senderName || "Operador";
  return item.senderName || "Atendimento";
}

function getQuickReply(kind: string) {
  if (kind === "refund") {
    return "Olá! Verificamos sua solicitação de reembolso. O estorno elegível será processado conforme as regras do pedido e ficará disponível na sua wallet quando concluído.";
  }

  if (kind === "ticket") {
    return "Olá! Conferimos seus ingressos e QR Codes. Acesse Meus ingressos, abra o pedido e selecione o QR Code correspondente para usar na entrada.";
  }

  if (kind === "transfer") {
    return "Olá! Para transferir o ingresso, abra o QR Code desejado em Meus ingressos e use a opção Transferir. O destinatário precisa informar dados válidos.";
  }

  if (kind === "closed") {
    return "Olá! Como não identificamos pendências neste atendimento, vamos encerrar o chamado. Se precisar, você pode reabrir a conversa pelo app.";
  }

  return "Olá! Recebemos sua mensagem e estamos verificando os detalhes do pedido.";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

export default function AdminSupportThreadPage() {
  const params = useParams();
  const threadId = String(params.id || "");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [thread, setThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [message, setMessage] = useState("");

  async function loadThread(threadIdParam: string, silent = false) {
    const token = sessionStorage.getItem("astro_session_token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!threadIdParam) {
      alert("Atendimento inválido");
      window.location.href = "/admin/support";
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/support/admin/${threadIdParam}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        if (!silent) {
          alert(typeof data?.message === "string" ? data.message : "Erro ao carregar atendimento");
          window.location.href = "/admin/support";
        }
        return;
      }

      setThread(data);
    } catch (error) {
      console.error("ADMIN SUPPORT THREAD ERROR:", error);
      if (!silent) alert("Erro ao conectar com a API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThread(threadId);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages?.length]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();

    const token = sessionStorage.getItem("astro_session_token");

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
      const res = await fetch(`${API_BASE_URL}/support/admin/${thread.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(typeof data?.message === "string" ? data.message : "Erro ao enviar mensagem");
        return;
      }

      setThread(data);
      setMessage("");
    } catch (error) {
      console.error("SEND ADMIN SUPPORT MESSAGE ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setSending(false);
    }
  }

  async function handleCloseThread() {
    const token = sessionStorage.getItem("astro_session_token");

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
      const res = await fetch(`${API_BASE_URL}/support/admin/${thread.id}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(typeof data?.message === "string" ? data.message : "Erro ao fechar atendimento");
        return;
      }

      setThread(data);
    } catch (error) {
      console.error("CLOSE SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setClosing(false);
    }
  }

  async function handleReopenThread() {
    const token = sessionStorage.getItem("astro_session_token");

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
      const res = await fetch(`${API_BASE_URL}/support/admin/${thread.id}/reopen`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(typeof data?.message === "string" ? data.message : "Erro ao reabrir atendimento");
        return;
      }

      setThread(data);
    } catch (error) {
      console.error("REOPEN ADMIN SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setReopening(false);
    }
  }

  const sortedMessages = useMemo(() => {
    return [...(thread?.messages || [])].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return aTime - bTime;
    });
  }, [thread?.messages]);

  if (loading) {
    return (
      <div className={cardClass()}>
        <p className="text-lg font-semibold text-slate-800">Carregando atendimento...</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={cardClass()}>
        <p className="text-lg font-semibold text-slate-800">Atendimento não encontrado.</p>
        <Link href="/admin/support" className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
          Voltar para atendimentos
        </Link>
      </div>
    );
  }

  const organizerName = thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";
  const isClosed = thread.status === "CLOSED";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-sm">
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(thread.status)}`}>{getStatusLabel(thread.status)}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Ticket #{thread.id.slice(0, 8)}</span>
            {!thread.assignedUser?.id ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Sem responsável</span>
            ) : null}
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">{thread.subject || "Atendimento"}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
            Mesa de atendimento operacional com dados do cliente, pedido, evento e conversa registrada.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Cliente</p>
              <p className="mt-2 font-black">{thread.customerName || "-"}</p>
              <p className="mt-1 break-all text-xs text-white/60">{thread.customerEmail || "-"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Evento</p>
              <p className="mt-2 font-black">{thread.event?.name || "-"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Pedido</p>
              <p className="mt-2 break-all font-black">#{thread.order?.id || "-"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Última interação</p>
              <p className="mt-2 font-black">{formatDate(thread.lastMessageAt || thread.updatedAt)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin/support" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
              Voltar para fila
            </Link>
            {thread.order?.id ? (
              <Link href={`/orders/${thread.order.id}`} className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                Ver pedido
              </Link>
            ) : null}
            {thread.event?.id ? (
              <Link href={`/events/${thread.event.id}`} className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                Ver evento
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-6">
          <div className={cardClass()}>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">Contexto</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Dados do atendimento</h2>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Cliente</p>
                <p className="mt-2 font-black text-slate-950">{thread.customerName || "-"}</p>
                <p className="mt-1 break-all text-sm text-slate-500">{thread.customerEmail || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Produtor</p>
                <p className="mt-2 font-black text-slate-950">{organizerName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Evento</p>
                <p className="mt-2 font-black text-slate-950">{thread.event?.name || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDate(thread.event?.eventDate)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pedido</p>
                <p className="mt-2 break-all font-black text-slate-950">#{thread.order?.id || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">{thread.order?.status || "-"} • {formatMoney(thread.order?.totalAmount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Responsável</p>
                <p className="mt-2 font-black text-slate-950">{thread.assignedUser?.name || "Não atribuído"}</p>
                <p className="mt-1 break-all text-sm text-slate-500">{thread.assignedUser?.email || "-"}</p>
              </div>
            </div>
          </div>

          <div className={cardClass()}>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">Ações</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Status</h2>
            <div className="mt-5 space-y-3">
              {!isClosed ? (
                <button
                  type="button"
                  onClick={handleCloseThread}
                  disabled={closing}
                  className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {closing ? "Fechando..." : "Fechar atendimento"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReopenThread}
                  disabled={reopening}
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reopening ? "Reabrindo..." : "Reabrir atendimento"}
                </button>
              )}
              <button
                type="button"
                onClick={() => loadThread(thread.id, true)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Atualizar dados
              </button>
            </div>
          </div>
        </aside>

        <section className={cardClass()}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">Conversa</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Atendimento ao cliente</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(thread.status)}`}>{getStatusLabel(thread.status)}</span>
          </div>

          <div className="mt-5 max-h-[620px] space-y-4 overflow-y-auto rounded-[28px] bg-slate-50 p-4">
            {sortedMessages.length ? (
              sortedMessages.map((item) => (
                <div key={item.id} className={`max-w-[88%] rounded-[24px] border px-4 py-3 shadow-sm ${getSenderBubbleClasses(item.senderType)}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-80">
                    <span className="font-black">{getSenderLabel(item)}</span>
                    <span>•</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{item.message || ""}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">Nenhuma mensagem ainda.</div>
            )}
            <div ref={bottomRef} />
          </div>

          {!isClosed ? (
            <form onSubmit={handleSendMessage} className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Respostas rápidas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { id: "refund", label: "Reembolso" },
                    { id: "ticket", label: "QR Code" },
                    { id: "transfer", label: "Transferência" },
                    { id: "closed", label: "Encerrar" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMessage(getQuickReply(item.id))}
                      className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-800">Responder cliente</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[150px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50"
                  placeholder="Digite sua resposta"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar resposta"}
                </button>
                <Link href="/admin/support" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Voltar para fila
                </Link>
              </div>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Este atendimento está encerrado.</div>
          )}
        </section>
      </section>
    </div>
  );
}
