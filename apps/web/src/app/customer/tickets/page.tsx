"use client";

import { useEffect, useMemo, useState } from "react";
import CustomerHeader, {
  type CustomerHeaderUser,
} from "@/components/customer/CustomerHeader";

type EventInfo = {
  id?: string;
  name?: string;
  eventDate?: string;
  startDate?: string;
};

type TicketTypeInfo = {
  id?: string;
  name?: string;
};

type OrderInfo = {
  id?: string;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  event?: EventInfo;
};

type TransferUserInfo = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  cpfNormalized?: string;
};

type TicketTransferRequestItem = {
  id: string;
  status?: string;
  responseReason?: string;
  requestedAt?: string;
  respondedAt?: string;
  requestedByName?: string;
  requestedByEmail?: string;
  requestedByCpf?: string;
  fromName?: string;
  fromEmail?: string;
  fromCpf?: string;
  toName?: string;
  toEmail?: string;
  toCpf?: string;
  ticket?: {
    id: string;
    code?: string;
    status?: string;
    holderName?: string;
    holderEmail?: string;
    holderCpf?: string;
    orderItem?: {
      id?: string;
      ticketType?: TicketTypeInfo;
      order?: OrderInfo;
    };
  };
  order?: OrderInfo;
  requestedByUser?: TransferUserInfo;
  fromUser?: TransferUserInfo;
  toUser?: TransferUserInfo;
};

type TicketItem = {
  id: string;
  code?: string;
  status?: string;
  holderName?: string;
  holderEmail?: string;
  holderCpf?: string;
  createdAt?: string;
  currentOwnerUser?: TransferUserInfo | null;
  orderItem?: {
    id?: string;
    ticketType?: TicketTypeInfo;
    order?: OrderInfo;
  };
  transferRequests?: TicketTransferRequestItem[];
};

type StoredUser = CustomerHeaderUser & {
  cpf?: string;
};

function onlyDigits(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value?: string | null) {
  const digits = onlyDigits(value);

  if (!digits) return "-";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9, 11)}`;
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

function getStatusClasses(status?: string) {
  if (status === "AVAILABLE" || status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "TRANSFER_PENDING" || status === "PENDING_ACCEPTANCE") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "PENDING_PAYMENT") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
  }

  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  if (status === "CANCELED") {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  if (status === "USED") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function getEventDate(ticket?: TicketItem | null) {
  return (
    ticket?.orderItem?.order?.event?.startDate ||
    ticket?.orderItem?.order?.event?.eventDate
  );
}

function goTo(path: string) {
  window.location.href = path;
}

export default function CustomerTicketsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadData() {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser) as StoredUser);
      } catch (error) {
        console.error("Erro ao ler usuário:", error);
      }
    }

    try {
      const [ticketsRes, incomingRes, outgoingRes] = await Promise.all([
        fetch("http://localhost:3001/v1/tickets/customer", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("http://localhost:3001/v1/tickets/customer/transfers/incoming", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("http://localhost:3001/v1/tickets/customer/transfers/outgoing", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const ticketsData = await ticketsRes.json();
      const incomingData = await incomingRes.json();
      const outgoingData = await outgoingRes.json();

      if (!ticketsRes.ok) {
        alert(
          typeof ticketsData?.message === "string"
            ? ticketsData.message
            : "Erro ao carregar ingressos",
        );
        return;
      }

      if (!incomingRes.ok) {
        alert(
          typeof incomingData?.message === "string"
            ? incomingData.message
            : "Erro ao carregar transferências recebidas",
        );
        return;
      }

      if (!outgoingRes.ok) {
        alert(
          typeof outgoingData?.message === "string"
            ? outgoingData.message
            : "Erro ao carregar transferências enviadas",
        );
        return;
      }

      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setIncomingTransfers(Array.isArray(incomingData) ? incomingData : []);
      setOutgoingTransfers(Array.isArray(outgoingData) ? outgoingData : []);
    } catch (error) {
      console.error("CUSTOMER TICKETS ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const myOwnedTickets = useMemo(() => {
    const userId = user?.id;

    return tickets.filter((ticket) => {
      if (!userId) return true;
      return ticket.currentOwnerUser?.id === userId;
    });
  }, [tickets, user]);

  const filteredOwnedTickets = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return myOwnedTickets;

    return myOwnedTickets.filter((ticket) => {
      const joined = [
        ticket.id,
        ticket.code,
        ticket.status,
        ticket.holderName,
        ticket.holderEmail,
        ticket.holderCpf,
        ticket.orderItem?.ticketType?.name,
        ticket.orderItem?.order?.event?.name,
        ticket.orderItem?.order?.id,
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [myOwnedTickets, search]);

  const filteredIncomingTransfers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return incomingTransfers;

    return incomingTransfers.filter((transfer) => {
      const joined = [
        transfer.id,
        transfer.status,
        transfer.ticket?.code,
        transfer.ticket?.holderName,
        transfer.ticket?.holderEmail,
        transfer.ticket?.holderCpf,
        transfer.ticket?.orderItem?.ticketType?.name,
        transfer.ticket?.orderItem?.order?.event?.name,
        transfer.requestedByName,
        transfer.requestedByEmail,
        transfer.requestedByCpf,
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [incomingTransfers, search]);

  const filteredOutgoingTransfers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return outgoingTransfers;

    return outgoingTransfers.filter((transfer) => {
      const joined = [
        transfer.id,
        transfer.status,
        transfer.ticket?.code,
        transfer.ticket?.holderName,
        transfer.ticket?.holderEmail,
        transfer.ticket?.holderCpf,
        transfer.ticket?.orderItem?.ticketType?.name,
        transfer.ticket?.orderItem?.order?.event?.name,
        transfer.toName,
        transfer.toEmail,
        transfer.toCpf,
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [outgoingTransfers, search]);

  async function handleAcceptTransfer(transferRequestId: string) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setProcessingId(transferRequestId);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transferRequestId}/accept`,
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
            : "Erro ao aceitar transferência",
        );
        return;
      }

      alert("Transferência aceita com sucesso");
      await loadData();
    } catch (error) {
      console.error("ACCEPT TRANSFER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectTransfer(transferRequestId: string) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const reason = window.prompt(
      "Motivo da recusa (opcional)",
      "Transferência recusada",
    );

    setProcessingId(transferRequestId);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transferRequestId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: reason || "Transferência recusada",
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao recusar transferência",
        );
        return;
      }

      alert("Transferência recusada");
      await loadData();
    } catch (error) {
      console.error("REJECT TRANSFER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleCancelTransfer(transferRequestId: string) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const confirmed = window.confirm(
      "Cancelar esta transferência pendente?",
    );

    if (!confirmed) return;

    setProcessingId(transferRequestId);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transferRequestId}/cancel`,
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
            : "Erro ao cancelar transferência",
        );
        return;
      }

      alert("Transferência cancelada");
      await loadData();
    } catch (error) {
      console.error("CANCEL TRANSFER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <CustomerHeader
          user={user}
          activeNav="orders"
          showSearch
          searchPlaceholder="Buscar em meus tickets e transferências"
          searchValue={search}
          onSearchChange={setSearch}
        />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando seus tickets...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <CustomerHeader
        user={user}
        activeNav="orders"
        showSearch
        searchPlaceholder="Buscar em meus tickets e transferências"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Área do cliente
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Meus tickets
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
            Aqui você acompanha seus ingressos, transferências recebidas,
            transferências enviadas e o histórico de aceite ou recusa.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Ingressos comigo</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {myOwnedTickets.length}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Recebidas aguardando resposta</p>
            <h2 className="mt-3 text-3xl font-black text-amber-600">
              {incomingTransfers.length}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Transferências enviadas</p>
            <h2 className="mt-3 text-3xl font-black text-sky-600">
              {outgoingTransfers.length}
            </h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Transferências recebidas
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Aceite ou recuse os ingressos que chegaram para sua conta
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {filteredIncomingTransfers.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    Nenhuma transferência recebida aguardando resposta.
                  </div>
                ) : (
                  filteredIncomingTransfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="rounded-[24px] border border-amber-100 bg-amber-50 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            transfer.status,
                          )}`}
                        >
                          {transfer.status || "SEM STATUS"}
                        </span>

                        <span className="text-xs text-gray-500">
                          {formatDate(transfer.requestedAt)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Evento</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {transfer.ticket?.orderItem?.order?.event?.name || "-"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatDate(
                              transfer.ticket?.orderItem?.order?.event?.startDate ||
                                transfer.ticket?.orderItem?.order?.event?.eventDate,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Ingresso</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {transfer.ticket?.orderItem?.ticketType?.name || "-"}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500">
                            Código: {transfer.ticket?.code || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Enviado por</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {transfer.fromName ||
                              transfer.requestedByName ||
                              transfer.fromUser?.name ||
                              "-"}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500">
                            {transfer.fromEmail ||
                              transfer.requestedByEmail ||
                              transfer.fromUser?.email ||
                              "-"}
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            CPF:{" "}
                            {formatCpf(
                              transfer.fromCpf ||
                                transfer.requestedByCpf ||
                                transfer.fromUser?.cpfNormalized,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">
                            Titular que vai receber
                          </p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {transfer.toName || transfer.toUser?.name || "-"}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500">
                            {transfer.toEmail || transfer.toUser?.email || "-"}
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            CPF:{" "}
                            {formatCpf(
                              transfer.toCpf || transfer.toUser?.cpfNormalized,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
                        Ao aceitar, o ingresso passa a ficar na sua conta. Ao
                        recusar, ele volta para quem comprou.
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleAcceptTransfer(transfer.id)}
                          disabled={processingId === transfer.id}
                          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === transfer.id
                            ? "Processando..."
                            : "Aceitar transferência"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectTransfer(transfer.id)}
                          disabled={processingId === transfer.id}
                          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === transfer.id
                            ? "Processando..."
                            : "Recusar transferência"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Meus ingressos
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Ingressos que já estão com você de verdade
              </p>

              <div className="mt-5 space-y-4">
                {filteredOwnedTickets.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    Você ainda não possui ingressos na sua conta.
                  </div>
                ) : (
                  filteredOwnedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-[24px] border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-gray-900">
                            {ticket.orderItem?.ticketType?.name || "Ingresso"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {ticket.orderItem?.order?.event?.name || "-"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            ticket.status,
                          )}`}
                        >
                          {ticket.status || "SEM STATUS"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Código</p>
                          <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                            {ticket.code || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Data do evento</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatDate(getEventDate(ticket))}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">Titular</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {ticket.holderName || "-"}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500">
                            {ticket.holderEmail || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-sm text-gray-500">CPF do titular</p>
                          <p className="mt-1 font-semibold text-gray-900">
                            {formatCpf(ticket.holderCpf)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {ticket.orderItem?.order?.id ? (
                          <button
                            type="button"
                            onClick={() =>
                              goTo(`/customer/orders/${ticket.orderItem?.order?.id}`)
                            }
                            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                          >
                            Abrir pedido
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            if (!ticket.code) {
                              alert("Código do ingresso não encontrado");
                              return;
                            }

                            navigator.clipboard
                              .writeText(ticket.code)
                              .then(() => alert("Código copiado com sucesso"))
                              .catch(() =>
                                alert("Não foi possível copiar o código"),
                              );
                          }}
                          className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          Copiar código
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Transferências enviadas
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Histórico do que você mandou para outras pessoas
              </p>

              <div className="mt-5 space-y-4">
                {filteredOutgoingTransfers.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    Nenhuma transferência enviada encontrada.
                  </div>
                ) : (
                  filteredOutgoingTransfers.map((transfer) => {
                    const canCancel =
                      transfer.status === "PENDING_PAYMENT" ||
                      transfer.status === "PENDING_ACCEPTANCE";

                    return (
                      <div
                        key={transfer.id}
                        className="rounded-[24px] border border-gray-200 bg-gray-50 p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              transfer.status,
                            )}`}
                          >
                            {transfer.status || "SEM STATUS"}
                          </span>

                          <span className="text-xs text-gray-500">
                            {formatDate(transfer.requestedAt)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm text-gray-500">Evento</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {transfer.ticket?.orderItem?.order?.event?.name || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {formatDate(
                                transfer.ticket?.orderItem?.order?.event?.startDate ||
                                  transfer.ticket?.orderItem?.order?.event
                                    ?.eventDate,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm text-gray-500">Ingresso</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {transfer.ticket?.orderItem?.ticketType?.name || "-"}
                            </p>
                            <p className="mt-1 break-all text-sm text-gray-500">
                              Código: {transfer.ticket?.code || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm text-gray-500">Enviado para</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {transfer.toName || transfer.toUser?.name || "-"}
                            </p>
                            <p className="mt-1 break-all text-sm text-gray-500">
                              {transfer.toEmail || transfer.toUser?.email || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                              CPF:{" "}
                              {formatCpf(
                                transfer.toCpf || transfer.toUser?.cpfNormalized,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm text-gray-500">Resposta</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {transfer.respondedAt
                                ? formatDate(transfer.respondedAt)
                                : "Aguardando"}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {transfer.responseReason || "-"}
                            </p>
                          </div>
                        </div>

                        {transfer.status === "ACCEPTED" ? (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            Transferência finalizada com sucesso.
                          </div>
                        ) : null}

                        {transfer.status === "REJECTED" ? (
                          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                            Transferência recusada. O ingresso voltou para o
                            comprador/origem.
                          </div>
                        ) : null}

                        {canCancel ? (
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => handleCancelTransfer(transfer.id)}
                              disabled={processingId === transfer.id}
                              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {processingId === transfer.id
                                ? "Processando..."
                                : "Cancelar transferência"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Como funciona
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  1. O comprador paga o pedido
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  2. O ingresso fica pendente para a outra pessoa aceitar
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  3. Se aceitar, o ingresso passa para a conta dela
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  4. Se recusar, o ingresso volta para quem comprou
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Ver meus pedidos
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/support")}
                  className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Ir para suporte
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}