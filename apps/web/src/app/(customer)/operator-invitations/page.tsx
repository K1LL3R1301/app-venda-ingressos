"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Invitation = {
  id: string;
  protocol: string;
  status: string;
  invitationMessage?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  assignedAt?: string | null;
  event?: {
    id: string;
    name: string;
    eventDate?: string | null;
  } | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

function token() {
  return typeof window === "undefined" ? "" : sessionStorage.getItem("astro_session_token") || "";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  const normalized = status.toUpperCase();

  const labels: Record<string, string> = {
    INVITED: "Aguardando sua resposta",
    ACCEPTED: "Aceito, aguardando evento",
    ACTIVE: "Atribuído a evento",
    DECLINED: "Recusado",
  };

  return labels[normalized] || status;
}

export default function OperatorInvitationsPage() {
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const auth = token();

    if (!auth || auth === "undefined") {
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/operator-assignments/me/invitations`, {
        headers: {
          Authorization: `Bearer ${auth}`,
        },
      });

      const result = await response.json().catch(() => []);

      setItems(Array.isArray(result) ? result : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(id: string, action: "accept" | "decline") {
    const auth = token();

    setSavingId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/operator-assignments/${id}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth}`,
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        alert(typeof result?.message === "string" ? result.message : "Erro ao responder convite.");
        return;
      }

      await load();
      alert(action === "accept" ? "Convite aceito." : "Convite recusado.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] space-y-6 px-4 py-6">
      <section
        className="relative overflow-hidden rounded-[34px] text-white shadow-sm"
        style={{
          background:
            "linear-gradient(135deg, #ff6900 0%, #7c2d12 18%, #111827 50%, #020617 100%)",
        }}
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/60 blur-3xl" />
        <div className="absolute inset-0 bg-black/25" />

        <div className="relative z-10 p-7 lg:p-9">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-200">
            Convites de operador
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
            Aceite para atuar como operador.
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/80">
            Quando você aceita, o administrador consegue atribuir você a um evento específico.
          </p>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
              Meus convites
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Solicitações recebidas
            </h2>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Voltar
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Carregando convites...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center">
              <p className="font-black text-slate-950">Nenhum convite encontrado.</p>
              <p className="mt-2 text-sm text-slate-500">
                Quando um administrador convidar você, a solicitação aparece aqui.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-[26px] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                      {statusLabel(item.status)}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      Convite de {item.adminName || item.adminEmail || "administrador"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.invitationMessage ||
                        "Você foi convidado para atuar como operador na plataforma."}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Protocolo: {item.protocol} • Enviado em {formatDate(item.invitedAt)}
                    </p>
                    {item.event || item.eventTitle ? (
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        Evento: {item.event?.name || item.eventTitle} •{" "}
                        {formatDate(item.event?.eventDate || item.eventDate)}
                      </p>
                    ) : null}
                  </div>

                  {item.status === "INVITED" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                      <button
                        type="button"
                        onClick={() => respond(item.id, "accept")}
                        disabled={savingId === item.id}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        Aceitar convite
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(item.id, "decline")}
                        disabled={savingId === item.id}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Recusar
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
