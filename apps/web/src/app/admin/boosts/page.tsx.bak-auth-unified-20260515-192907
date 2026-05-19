"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type Placement = "MAIN_CAROUSEL" | "PUBLICITY_BANNER" | "SECTION_SPOT";

type BoostRequest = {
  id: string;
  protocol: string;
  eventTitle: string;
  eventDate: string;
  placement: Placement;
  placementLabel: string;
  periodDays: number;
  unitPriceCents: number;
  cycles: number;
  totalAmountCents: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentProofText?: string;
  status: string;
  moderatorNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const placements: Array<{
  id: Placement;
  title: string;
  price: number;
  periodDays: number;
  label: string;
  description: string;
}> = [
  {
    id: "MAIN_CAROUSEL",
    title: "Carrossel principal",
    price: 250,
    periodDays: 15,
    label: "R$ 250 / 15 dias",
    description:
      "Impulsiona o evento no carrossel principal da página inicial até a data do evento.",
  },
  {
    id: "PUBLICITY_BANNER",
    title: "Banner de publicidade",
    price: 100,
    periodDays: 30,
    label: "R$ 100 / mês",
    description:
      "Coloca o evento no espaço de publicidade entre os blocos da página inicial.",
  },
  {
    id: "SECTION_SPOT",
    title: "Espaços das seções",
    price: 100,
    periodDays: 30,
    label: "R$ 100 / mês",
    description:
      "Prioriza o evento nos espaços de vitrine, seções e coleções do site.",
  },
];

function formatMoneyFromCents(value?: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function calculateEstimate(eventDate: string, placement: Placement) {
  const plan = placements.find((item) => item.id === placement) || placements[0];

  if (!eventDate) {
    return {
      cycles: 1,
      total: plan.price,
      plan,
    };
  }

  const today = new Date();
  const end = new Date(`${eventDate}T23:59:59`);

  today.setHours(0, 0, 0, 0);

  const days = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const cycles = Math.max(1, Math.ceil(days / plan.periodDays));

  return {
    cycles,
    total: cycles * plan.price,
    plan,
  };
}

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Reprovado";
  if (status === "PAID_PENDING_REVIEW") return "Pago, aguardando aprovação";

  return status;
}

function getStatusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "REJECTED") return "bg-red-50 text-red-700 ring-red-100";

  return "bg-orange-50 text-[#19002f] ring-orange-100";
}

export default function AdminBoostsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventId, setEventId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [placement, setPlacement] = useState<Placement>("MAIN_CAROUSEL");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofText, setPaymentProofText] = useState("");
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState<BoostRequest[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const role = String(user?.role || "").toUpperCase();
  const canRequestBoost = role === "ADMIN" || role === "SUPER_ADMIN";

  const estimate = useMemo(
    () => calculateEstimate(eventDate, placement),
    [eventDate, placement],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    try {
      setUser(rawUser ? (JSON.parse(rawUser) as StoredUser) : null);
    } catch {
      setUser(null);
    }

    loadMine();
  }, []);

  async function loadMine() {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_BASE_URL}/promotion-boosts/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (response.ok && Array.isArray(data)) {
        setRequests(data);
      }
    } catch {
      // a lista é auxiliar; se falhar, o formulário continua funcionando
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!eventTitle.trim() || !eventDate) {
      setError("Informe o nome do evento e a data do evento.");
      return;
    }

    const token = localStorage.getItem("token");

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/promotion-boosts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventTitle,
          eventId,
          eventDate,
          placement,
          paymentMethod,
          paymentReference,
          paymentProofText,
          notes,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Não foi possível enviar a solicitação.");
      }

      setSuccess(`Solicitação enviada. Protocolo: ${data.protocol}`);
      setEventTitle("");
      setEventId("");
      setPaymentReference("");
      setPaymentProofText("");
      setNotes("");

      await loadMine();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user && !canRequestBoost) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] px-4 py-10 text-neutral-950">
        <section className="mx-auto max-w-[900px] rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
            Impulsionamento
          </p>
          <h1 className="mt-3 text-[34px] font-black">Acesso restrito</h1>
          <p className="mt-3 text-sm leading-7 text-neutral-500">
            Apenas contas admin podem solicitar impulsionamento de eventos.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-[1180px]">
        <section className="mb-6 rounded-[28px] bg-gradient-to-r from-orange-500 via-orange-700 to-[#19002f] p-8 text-white shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">
            Impulsionamento de eventos
          </p>
          <h1 className="mt-3 text-[42px] font-black leading-tight md:text-[52px]">
            Escolha onde seu evento vai aparecer.
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/82">
            O admin informa o pagamento e envia a solicitação. O super admin confere o valor pago e aprova ou reprova o impulsionamento no site.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit} className="rounded-[24px] bg-white p-6 shadow-sm">
            {error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Nome do evento
                </span>
                <input
                  required
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Ex: Rodeio Jaguariúna 2026"
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  ID do evento, opcional
                </span>
                <input
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  placeholder="Cole o ID se quiser vincular"
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Data do evento
                </span>
                <input
                  required
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Forma de pagamento
                </span>
                <input
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  placeholder="Pix, transferência, cartão manual..."
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>
            </div>

            <h2 className="mt-7 text-[24px] font-black">Local do impulsionamento</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {placements.map((item) => {
                const active = placement === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlacement(item.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#19002f] bg-orange-50 ring-4 ring-orange-100"
                        : "border-neutral-200 bg-white hover:border-orange-300"
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
                      {item.label}
                    </p>
                    <h3 className="mt-2 text-[18px] font-black">{item.title}</h3>
                    <p className="mt-2 text-xs font-semibold leading-5 text-neutral-500">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Referência do pagamento
                </span>
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="ID Pix, comprovante, transação..."
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Observações
                </span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex: campanha para final de semana"
                  className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-bold outline-none focus:border-[#19002f]"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                Texto do comprovante
              </span>
              <textarea
                value={paymentProofText}
                onChange={(event) => setPaymentProofText(event.target.value)}
                placeholder="Cole aqui dados do comprovante ou observação para o super admin conferir o pagamento."
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#19002f]"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 rounded-xl bg-[#19002f] px-7 py-4 text-sm font-black text-white hover:bg-[#2a0648] disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar para aprovação"}
            </button>
          </form>

          <aside className="rounded-[24px] bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">
              Resumo automático
            </p>
            <h2 className="mt-3 text-[30px] font-black">
              {estimate.plan.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-neutral-500">
              {estimate.plan.description}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Ciclos até o evento
                </p>
                <p className="mt-2 text-[28px] font-black">{estimate.cycles}</p>
              </div>

              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  Total a pagar
                </p>
                <p className="mt-2 text-[28px] font-black">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(estimate.total)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold leading-5 text-neutral-500">
              O pedido só entra no site depois que o super admin aprovar.
            </p>
          </aside>
        </section>

        <section className="mt-7 rounded-[24px] bg-white p-6 shadow-sm">
          <h2 className="text-[24px] font-black">Meus impulsionamentos</h2>

          {requests.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-neutral-500">
              Nenhum pedido enviado ainda.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {requests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-neutral-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-600">
                        {request.protocol}
                      </p>
                      <h3 className="mt-1 text-[18px] font-black">{request.eventTitle}</h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        {request.placementLabel} • {request.cycles} ciclo(s) •{" "}
                        {formatMoneyFromCents(request.totalAmountCents)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-2 text-xs font-black ring-1 ${getStatusClass(request.status)}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>

                  {request.moderatorNote ? (
                    <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm font-semibold text-neutral-600">
                      {request.moderatorNote}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

