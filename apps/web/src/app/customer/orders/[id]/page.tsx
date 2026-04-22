"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type TicketTransferUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  cpfNormalized?: string;
};

type TicketTransferRequest = {
  id: string;
  ticketId?: string;
  orderId?: string;
  requestedByUserId?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  status?: string;
  responseReason?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  requestedByName?: string | null;
  requestedByEmail?: string | null;
  requestedByCpf?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  fromCpf?: string | null;
  toName?: string | null;
  toEmail?: string | null;
  toCpf?: string | null;
  requestedByUser?: TicketTransferUser | null;
  fromUser?: TicketTransferUser | null;
  toUser?: TicketTransferUser | null;
};

type TicketItem = {
  id: string;
  code?: string;
  status?: string;
  holderName?: string | null;
  holderEmail?: string | null;
  holderCpf?: string | null;
  currentOwnerUserId?: string | null;
  createdAt?: string;
  transferRequests?: TicketTransferRequest[];
};

type OrderItemEntry = {
  id: string;
  quantity?: number;
  unitPrice?: string | number;
  totalPrice?: string | number;
  ticketType?: {
    id?: string;
    name?: string;
    price?: string | number;
  };
  tickets?: TicketItem[];
};

type PaymentItem = {
  id: string;
  method?: string;
  amount?: string | number;
  status?: string;
  createdAt?: string;
};

type CancellationItem = {
  id: string;
  ticketId?: string;
  orderId?: string;
  mode?: string;
  originalAmount?: string | number;
  returnedAmount?: string | number;
  status?: string;
  createdAt?: string;
};

type OrderDetail = {
  id: string;
  customerUserId?: string | null;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string | number;
  status?: string;
  createdAt?: string;
  event?: {
    id?: string;
    name?: string;
    description?: string;
    eventDate?: string;
    startDate?: string;
  };
  items?: OrderItemEntry[];
  payments?: PaymentItem[];
  cancellations?: CancellationItem[];
};

type TransferDetail = {
  id: string;
  ticketId?: string;
  orderId?: string;
  requestedByUserId?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  status?: string;
  responseReason?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  requestedByName?: string | null;
  requestedByEmail?: string | null;
  requestedByCpf?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  fromCpf?: string | null;
  toName?: string | null;
  toEmail?: string | null;
  toCpf?: string | null;
  requestedByUser?: TicketTransferUser | null;
  fromUser?: TicketTransferUser | null;
  toUser?: TicketTransferUser | null;
  order?: {
    id?: string;
    customerUserId?: string | null;
    customerName?: string;
    customerEmail?: string;
    event?: {
      id?: string;
      name?: string;
      description?: string;
      eventDate?: string;
      startDate?: string;
    };
  };
  ticket?: {
    id: string;
    code?: string;
    status?: string;
    holderName?: string | null;
    holderEmail?: string | null;
    holderCpf?: string | null;
    currentOwnerUserId?: string | null;
    orderItem?: {
      id?: string;
      ticketType?: {
        id?: string;
        name?: string;
      };
    };
  };
};

type SupportThreadResponse = {
  id: string;
  message?: string;
};

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function onlyDigits(value?: string | null) {
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

function getStatusClasses(status?: string) {
  if (
    status === "PAID" ||
    status === "AVAILABLE" ||
    status === "ACTIVE" ||
    status === "ACCEPTED"
  ) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (
    status === "PENDING" ||
    status === "PENDING_ACCEPTANCE" ||
    status === "TRANSFER_PENDING"
  ) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "PENDING_PAYMENT") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
  }

  if (status === "TRANSFERRED" || status === "TRANSFERIDO") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "CANCELED") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  if (status === "USED") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  if (status === "CREDITED") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "REFUND_REQUESTED") {
    return "bg-orange-50 text-orange-700 border border-orange-200";
  }

  if (status === "NO_REFUND") {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function goTo(path: string) {
  window.location.href = path;
}

export default function CustomerOrderDetailPage() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const [producerTicketOpen, setProducerTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [creatingSupportThread, setCreatingSupportThread] = useState(false);

  const [paying, setPaying] = useState(false);
  const [cancelingOrderMode, setCancelingOrderMode] = useState<
    "" | "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80"
  >("");
  const [cancelingTicketMode, setCancelingTicketMode] = useState<
    "" | "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80"
  >("");

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetCpf, setTransferTargetCpf] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSourceTicket, setTransferSourceTicket] =
    useState<TicketItem | null>(null);

  const [transferActionLoading, setTransferActionLoading] = useState<
    "" | "ACCEPT" | "REJECT" | "CANCEL"
  >("");

  const rawRouteId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  const isTransferPage = rawRouteId.startsWith("transfer_");
  const entityId = isTransferPage ? rawRouteId.replace("transfer_", "") : rawRouteId;

  const currentUserId = currentUser?.id || null;

  async function loadData() {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (rawUser) {
      try {
        setCurrentUser(JSON.parse(rawUser) as StoredUser);
      } catch (error) {
        console.error("Erro ao ler usuário:", error);
      }
    }

    if (!entityId) {
      alert("Registro inválido");
      window.location.href = "/customer/orders";
      return;
    }

    setLoading(true);

    try {
      const url = isTransferPage
        ? `http://localhost:3001/v1/tickets/customer/transfers/${entityId}`
        : `http://localhost:3001/v1/orders/customer/${entityId}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao carregar detalhes",
        );
        window.location.href = "/customer/orders";
        return;
      }

      if (isTransferPage) {
        setTransfer(data as TransferDetail);
        setOrder(null);
      } else {
        setOrder(data as OrderDetail);
        setTransfer(null);
      }
    } catch (error) {
      console.error("CUSTOMER ORDER DETAIL ERROR:", error);
      alert("Erro ao conectar com a API");
      window.location.href = "/customer/orders";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [entityId, isTransferPage]);

  function isTicketCanceled(ticket?: TicketItem | null) {
    return ticket?.status === "CANCELED";
  }

  function isTicketTransferredAway(ticket?: TicketItem | null) {
    if (!ticket || isTransferPage) return false;
    if (!currentUserId) return false;

    return !!ticket.currentOwnerUserId && ticket.currentOwnerUserId !== currentUserId;
  }

  function isTicketTransferPending(ticket?: TicketItem | null) {
    if (!ticket) return false;
    return ticket.status === "TRANSFER_PENDING";
  }

  function canTransferTicket(ticket?: TicketItem | null) {
    if (!ticket || !currentUserId) return false;

    return (
      ticket.currentOwnerUserId === currentUserId &&
      ticket.status === "AVAILABLE"
    );
  }

  function getTicketVisualStatus(ticket?: TicketItem | null) {
    if (!ticket) return "SEM STATUS";
    if (isTicketTransferredAway(ticket)) return "TRANSFERRED";
    return ticket.status || "SEM STATUS";
  }

  function getEventName() {
    if (isTransferPage) {
      return transfer?.order?.event?.name || "Transferência recebida";
    }

    return order?.event?.name || "Evento sem nome";
  }

  function getEventDescription() {
    if (isTransferPage) {
      return (
        transfer?.order?.event?.description ||
        "Este ingresso foi recebido por transferência e agora pertence à sua conta."
      );
    }

    return (
      order?.event?.description ||
      "Abra o evento novamente para ver mais detalhes ou comprar outros ingressos."
    );
  }

  function getEventDate() {
    if (isTransferPage) {
      return transfer?.order?.event?.startDate || transfer?.order?.event?.eventDate;
    }

    return order?.event?.startDate || order?.event?.eventDate;
  }

  function getBackPath() {
    if (isTransferPage) return "/customer/orders";
    if (order?.event?.id) return `/customer/events/${order.event.id}`;
    return "/customer/orders";
  }

  function buildTransferTicket(): TicketItem | null {
    if (!transfer?.ticket) return null;

    return {
      id: transfer.ticket.id,
      code: transfer.ticket.code,
      status: transfer.ticket.status,
      holderName: transfer.ticket.holderName,
      holderEmail: transfer.ticket.holderEmail,
      holderCpf: transfer.ticket.holderCpf,
      currentOwnerUserId: transfer.ticket.currentOwnerUserId,
      transferRequests: [
        {
          id: transfer.id,
          ticketId: transfer.ticketId,
          orderId: transfer.orderId,
          requestedByUserId: transfer.requestedByUserId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          status: transfer.status,
          responseReason: transfer.responseReason,
          requestedAt: transfer.requestedAt,
          respondedAt: transfer.respondedAt,
          requestedByName: transfer.requestedByName,
          requestedByEmail: transfer.requestedByEmail,
          requestedByCpf: transfer.requestedByCpf,
          fromName: transfer.fromName,
          fromEmail: transfer.fromEmail,
          fromCpf: transfer.fromCpf,
          toName: transfer.toName,
          toEmail: transfer.toEmail,
          toCpf: transfer.toCpf,
          requestedByUser: transfer.requestedByUser,
          fromUser: transfer.fromUser,
          toUser: transfer.toUser,
        },
      ],
    };
  }

  async function copyTicketCode(code?: string) {
    if (!code) {
      alert("Código não encontrado");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      alert("Código copiado com sucesso");
    } catch (error) {
      console.error(error);
      alert("Não foi possível copiar o código");
    }
  }

  function handleOpenTicket(ticket: TicketItem) {
    if (isTicketCanceled(ticket)) {
      alert("Este ingresso foi cancelado e não está mais acessível.");
      return;
    }

    if (isTicketTransferPending(ticket)) {
      alert(
        "Este ingresso está aguardando aceite da transferência e não pode ser visualizado agora.",
      );
      return;
    }

    if (isTicketTransferredAway(ticket)) {
      alert(
        "Este ingresso já foi transferido para outra conta e não está mais disponível para você.",
      );
      return;
    }

    setSelectedTicket(ticket);
  }

  function openTransferModal(ticket: TicketItem) {
    if (!canTransferTicket(ticket)) {
      alert("Este ingresso não está disponível para transferência agora.");
      return;
    }

    setTransferSourceTicket(ticket);
    setTransferTargetCpf("");
    setTransferModalOpen(true);
  }

  function closeTransferModal() {
    setTransferModalOpen(false);
    setTransferTargetCpf("");
    setTransferSourceTicket(null);
  }

  async function handleSubmitTransfer(e: FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!transferSourceTicket?.id) {
      alert("Ingresso inválido para transferência");
      return;
    }

    const cpf = onlyDigits(transferTargetCpf);

    if (!cpf) {
      alert("Informe o CPF do destinatário");
      return;
    }

    setTransferSubmitting(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/${transferSourceTicket.id}/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetCpf: cpf,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao criar transferência",
        );
        return;
      }

      alert("Transferência criada com sucesso");
      closeTransferModal();
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CREATE TRANSFER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setTransferSubmitting(false);
    }
  }

  async function handleAcceptTransfer() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined" || !transfer?.id) {
      window.location.href = "/login";
      return;
    }

    setTransferActionLoading("ACCEPT");

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transfer.id}/accept`,
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
      setTransferActionLoading("");
    }
  }

  async function handleRejectTransfer() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined" || !transfer?.id) {
      window.location.href = "/login";
      return;
    }

    const reason = window.prompt(
      "Motivo da recusa (opcional)",
      "Transferência recusada",
    );

    setTransferActionLoading("REJECT");

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transfer.id}/reject`,
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
      setTransferActionLoading("");
    }
  }

  async function handleCancelTransfer() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined" || !transfer?.id) {
      window.location.href = "/login";
      return;
    }

    const confirmed = window.confirm("Cancelar esta transferência pendente?");

    if (!confirmed) return;

    setTransferActionLoading("CANCEL");

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/transfers/${transfer.id}/cancel`,
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
      setTransferActionLoading("");
    }
  }

  async function handleFinishPayment() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!order?.id) {
      alert("Pedido inválido");
      return;
    }

    setPaying(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/payments/customer/${order.id}/finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            method: "PIX",
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao finalizar pagamento",
        );
        return;
      }

      alert("Pagamento finalizado com sucesso");
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("FINALIZE PAYMENT ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancelOrderPending() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!order?.id) {
      alert("Pedido inválido");
      return;
    }

    setCancelingOrderMode("PENDING_SIMPLE");

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/${order.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao cancelar pedido",
        );
        return;
      }

      alert("Pedido cancelado com sucesso");
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CANCEL PENDING ORDER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingOrderMode("");
    }
  }

  async function handleCancelOrder(mode: "REFUND_70" | "WALLET_80") {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!order?.id) {
      alert("Pedido inválido");
      return;
    }

    const message =
      mode === "WALLET_80"
        ? "Cancelar o pedido inteiro e receber 80% em crédito na wallet?"
        : "Cancelar o pedido inteiro e solicitar 70% de estorno?";

    const confirmed = window.confirm(message);

    if (!confirmed) return;

    setCancelingOrderMode(mode);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/${order.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao cancelar pedido",
        );
        return;
      }

      alert(
        mode === "WALLET_80"
          ? "Pedido pago cancelado com 80% de crédito na wallet"
          : "Pedido pago cancelado com solicitação de estorno de 70%",
      );

      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CANCEL ORDER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingOrderMode("");
    }
  }

  async function handleCancelTicketPending() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!selectedTicket?.id) {
      alert("Ingresso inválido");
      return;
    }

    setCancelingTicketMode("PENDING_SIMPLE");

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/tickets/${selectedTicket.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao cancelar ingresso",
        );
        return;
      }

      alert("Ingresso cancelado com sucesso");
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CANCEL PENDING TICKET ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingTicketMode("");
    }
  }

  async function handleCancelTicket(mode: "REFUND_70" | "WALLET_80") {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!selectedTicket?.id) {
      alert("Ingresso inválido");
      return;
    }

    const message =
      mode === "WALLET_80"
        ? "Cancelar este ingresso e receber 80% em crédito na wallet?"
        : "Cancelar este ingresso e solicitar 70% de estorno?";

    const confirmed = window.confirm(message);

    if (!confirmed) return;

    setCancelingTicketMode(mode);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/tickets/${selectedTicket.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao cancelar ingresso",
        );
        return;
      }

      alert(
        mode === "WALLET_80"
          ? "Ingresso pago cancelado com 80% de crédito na wallet"
          : "Ingresso pago cancelado com solicitação de estorno de 70%",
      );

      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CANCEL TICKET ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingTicketMode("");
    }
  }

  function handleTalkToProducer() {
    const baseOrderId = isTransferPage ? transfer?.order?.id : order?.id;

    if (!baseOrderId) {
      alert("Registro inválido");
      return;
    }

    if (isTransferPage) {
      setTicketSubject(`Dúvida sobre transferência #${transfer?.id || ""}`);
    } else {
      setTicketSubject(`Problema no pedido #${order?.id || ""}`);
    }

    setTicketMessage("");
    setProducerTicketOpen(true);
  }

  async function handleSubmitProducerTicket(e: FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const baseOrderId = isTransferPage ? transfer?.order?.id : order?.id;

    if (!baseOrderId) {
      alert("Registro inválido");
      return;
    }

    const subject =
      ticketSubject.trim() ||
      (isTransferPage
        ? `Dúvida sobre transferência #${transfer?.id || ""}`
        : `Problema no pedido #${order?.id || ""}`);

    const message = ticketMessage.trim();

    if (!message) {
      alert("Descreva o problema para abrir o atendimento");
      return;
    }

    setCreatingSupportThread(true);

    try {
      const res = await fetch("http://localhost:3001/v1/support/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: baseOrderId,
          subject,
          message,
        }),
      });

      const data: SupportThreadResponse = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao abrir atendimento",
        );
        return;
      }

      if (!data?.id) {
        alert("Atendimento criado, mas sem id retornado");
        return;
      }

      setProducerTicketOpen(false);
      window.location.href = `/customer/support/${data.id}`;
    } catch (error) {
      console.error("CREATE SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCreatingSupportThread(false);
    }
  }

  function handlePrintTicket(ticket: TicketItem) {
    if (isTicketCanceled(ticket)) {
      alert("Este ingresso foi cancelado e não está mais acessível.");
      return;
    }

    if (isTicketTransferPending(ticket)) {
      alert(
        "Este ingresso está aguardando aceite da transferência e ainda não pode ser impresso.",
      );
      return;
    }

    if (isTicketTransferredAway(ticket)) {
      alert(
        "Este ingresso já foi transferido para outra conta e não pode mais ser impresso aqui.",
      );
      return;
    }

    const eventName = getEventName();
    const eventDate = formatDate(getEventDate());
    const holderName = ticket.holderName || "-";
    const holderEmail = ticket.holderEmail || "-";
    const code = ticket.code || "-";
    const status = getTicketVisualStatus(ticket);

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      alert("Não foi possível abrir a janela de impressão");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ingresso</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f4f7fb;
              margin: 0;
              padding: 32px;
              color: #111827;
            }
            .ticket {
              max-width: 720px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            }
            .hero {
              background: linear-gradient(135deg, #0284c7, #4338ca);
              color: white;
              padding: 32px;
            }
            .hero h1 {
              margin: 12px 0 0;
              font-size: 36px;
            }
            .content {
              padding: 24px 32px 32px;
            }
            .row {
              margin-bottom: 18px;
            }
            .label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 6px;
            }
            .value {
              font-size: 18px;
              font-weight: 700;
              word-break: break-word;
            }
            .code {
              font-family: monospace;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="hero">
              <div>${isTransferPage ? "Transferência recebida" : "Ingresso"}</div>
              <h1>${eventName}</h1>
            </div>
            <div class="content">
              <div class="row">
                <div class="label">Data do evento</div>
                <div class="value">${eventDate}</div>
              </div>
              <div class="row">
                <div class="label">Titular</div>
                <div class="value">${holderName}</div>
              </div>
              <div class="row">
                <div class="label">Email</div>
                <div class="value">${holderEmail}</div>
              </div>
              <div class="row">
                <div class="label">Status</div>
                <div class="value">${status}</div>
              </div>
              <div class="row">
                <div class="label">Código do ingresso</div>
                <div class="value code">${code}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handlePrintReport() {
    if (isTransferPage && transfer) {
      const eventName = transfer.order?.event?.name || "Transferência";
      const eventDate = formatDate(
        transfer.order?.event?.startDate || transfer.order?.event?.eventDate,
      );
      const ticketName = transfer.ticket?.orderItem?.ticketType?.name || "Ingresso";
      const fromName =
        transfer.fromName || transfer.requestedByName || transfer.fromUser?.name || "-";
      const toName = transfer.toName || transfer.toUser?.name || "-";

      const printWindow = window.open("", "_blank", "width=1000,height=800");

      if (!printWindow) {
        alert("Não foi possível abrir a janela de impressão");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório da transferência</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background: #f4f7fb;
                margin: 0;
                padding: 32px;
                color: #111827;
              }
              .sheet {
                max-width: 860px;
                margin: 0 auto;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.08);
              }
              .hero {
                background: linear-gradient(135deg, #10b981, #0ea5e9);
                color: white;
                padding: 32px;
              }
              .hero h1 {
                margin: 12px 0 0;
                font-size: 36px;
              }
              .content {
                padding: 24px 32px 32px;
              }
              .section {
                margin-bottom: 24px;
              }
              .label {
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                margin-bottom: 6px;
              }
              .value {
                font-size: 18px;
                font-weight: 700;
                word-break: break-word;
              }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="hero">
                <div>Relatório da transferência</div>
                <h1>${eventName}</h1>
              </div>
              <div class="content">
                <div class="section grid">
                  <div>
                    <div class="label">Transferência</div>
                    <div class="value">#${transfer.id}</div>
                  </div>
                  <div>
                    <div class="label">Status</div>
                    <div class="value">${transfer.status || "-"}</div>
                  </div>
                  <div>
                    <div class="label">De</div>
                    <div class="value">${fromName}</div>
                  </div>
                  <div>
                    <div class="label">Para</div>
                    <div class="value">${toName}</div>
                  </div>
                  <div>
                    <div class="label">Data do evento</div>
                    <div class="value">${eventDate}</div>
                  </div>
                  <div>
                    <div class="label">Valor da transferência</div>
                    <div class="value">R$ 0,00</div>
                  </div>
                </div>
                <div class="section">
                  <div class="label">Ingresso recebido</div>
                  <div class="value">${ticketName}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    if (!order) return;

    const eventName = order.event?.name || "Pedido";
    const eventDate = formatDate(order.event?.startDate || order.event?.eventDate);
    const customerName = order.customerName || "-";
    const customerEmail = order.customerEmail || "-";
    const totalAmount = formatMoney(order.totalAmount);
    const orderStatus = order.status || "-";

    const itemsHtml =
      order.items?.map((item) => {
        return `
          <div style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;font-size:16px;">${
              item.ticketType?.name || "Ingresso"
            }</div>
            <div style="margin-top:4px;color:#6b7280;">Quantidade: ${
              item.quantity || 0
            }</div>
            <div style="margin-top:4px;color:#111827;font-weight:700;">${formatMoney(
              item.totalPrice,
            )}</div>
          </div>
        `;
      }) || [];

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      alert("Não foi possível abrir a janela de impressão");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f4f7fb;
              margin: 0;
              padding: 32px;
              color: #111827;
            }
            .sheet {
              max-width: 860px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            }
            .hero {
              background: linear-gradient(135deg, #7c3aed, #2563eb);
              color: white;
              padding: 32px;
            }
            .hero h1 {
              margin: 12px 0 0;
              font-size: 36px;
            }
            .content {
              padding: 24px 32px 32px;
            }
            .section {
              margin-bottom: 24px;
            }
            .label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 6px;
            }
            .value {
              font-size: 18px;
              font-weight: 700;
              word-break: break-word;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="hero">
              <div>Relatório da compra</div>
              <h1>${eventName}</h1>
            </div>
            <div class="content">
              <div class="section grid">
                <div>
                  <div class="label">Pedido</div>
                  <div class="value">#${order.id}</div>
                </div>
                <div>
                  <div class="label">Status</div>
                  <div class="value">${orderStatus}</div>
                </div>
                <div>
                  <div class="label">Comprador</div>
                  <div class="value">${customerName}</div>
                </div>
                <div>
                  <div class="label">Email</div>
                  <div class="value">${customerEmail}</div>
                </div>
                <div>
                  <div class="label">Data do evento</div>
                  <div class="value">${eventDate}</div>
                </div>
                <div>
                  <div class="label">Total</div>
                  <div class="value">${totalAmount}</div>
                </div>
              </div>

              <div class="section">
                <div class="label">Itens do pedido</div>
                ${itemsHtml.join("")}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const paidPayments = (order?.payments || []).filter(
    (payment) => payment.status === "PAID",
  );

  const walletPaid = paidPayments
    .filter((payment) => String(payment.method || "").toUpperCase() === "WALLET")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const externalPaid = paidPayments
    .filter((payment) => String(payment.method || "").toUpperCase() !== "WALLET")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const totalPaid = walletPaid + externalPaid;
  const totalAmountNumber = toNumber(order?.totalAmount);
  const remainingAmount = Math.max(0, totalAmountNumber - totalPaid);

  const paymentJourneyLabel =
    walletPaid > 0 && externalPaid === 0 && remainingAmount === 0
      ? "Pago integralmente com wallet"
      : walletPaid > 0 && externalPaid > 0 && remainingAmount === 0
        ? "Pago com wallet e complemento"
        : walletPaid > 0 && remainingAmount > 0
          ? "Wallet aplicada parcialmente"
          : totalPaid > 0 && remainingAmount === 0
            ? "Pago integralmente"
            : "Aguardando pagamento";

  const isPendingOrder = order?.status === "PENDING";
  const isPaidOrder = order?.status === "PAID";
  const showOrderTickets = !!order && order.status !== "PENDING";

  const transferTicket = buildTransferTicket();

  const isIncomingPendingTransfer =
    isTransferPage &&
    transfer?.status === "PENDING_ACCEPTANCE" &&
    transfer?.toUserId === currentUserId;

  const isOutgoingPendingTransfer =
    isTransferPage &&
    (transfer?.status === "PENDING_ACCEPTANCE" ||
      transfer?.status === "PENDING_PAYMENT") &&
    !isIncomingPendingTransfer &&
    (transfer?.requestedByUserId === currentUserId ||
      transfer?.fromUserId === currentUserId);

  const transferCanUseTicket =
    !!transferTicket &&
    transfer?.status === "ACCEPTED" &&
    transferTicket.currentOwnerUserId === currentUserId &&
    transferTicket.status === "AVAILABLE";

  const transferIsBeingRetransferred =
    !!transferTicket &&
    transfer?.status === "ACCEPTED" &&
    transferTicket.currentOwnerUserId === currentUserId &&
    transferTicket.status === "TRANSFER_PENDING";

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-gray-800">
            Carregando detalhes...
          </p>
        </div>
      </main>
    );
  }

  if (!order && !transfer) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-gray-800">
            Registro não encontrado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section
          className={`overflow-hidden rounded-[32px] text-white shadow-sm ${
            isTransferPage
              ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-700"
              : "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700"
          }`}
        >
          <button
            type="button"
            onClick={() => goTo(getBackPath())}
            className="block w-full px-8 pt-8 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              {isTransferPage ? "Transferência" : "Evento"}
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              {getEventName()}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
              {getEventDescription()}
            </p>
          </button>

          <div className="flex flex-wrap gap-3 px-8 pb-8 pt-6">
            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
            >
              Voltar para meus pedidos
            </button>

            {!isTransferPage && order?.event?.id ? (
              <button
                type="button"
                onClick={() => goTo(`/customer/events/${order.event?.id}`)}
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Ver evento
              </button>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              {isTransferPage ? "Status da transferência" : "Status do pedido"}
            </p>
            <div className="mt-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  isTransferPage ? transfer?.status : order?.status,
                )}`}
              >
                {isTransferPage
                  ? transfer?.status || "SEM STATUS"
                  : order?.status || "SEM STATUS"}
              </span>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              {isTransferPage
                ? "Detalhe do ingresso recebido por transferência"
                : paymentJourneyLabel}
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              {isTransferPage ? "Valor da transferência" : "Total da compra"}
            </p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {isTransferPage ? "R$ 0,00" : formatMoney(order?.totalAmount)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              {isTransferPage ? "Total pago" : "Total já pago"}
            </p>
            <h2 className="mt-3 text-3xl font-black text-emerald-600">
              {isTransferPage ? "R$ 0,00" : formatMoney(totalPaid)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              {isTransferPage ? "Restante" : "Valor restante"}
            </p>
            <h2 className="mt-3 text-3xl font-black text-amber-600">
              {isTransferPage ? "R$ 0,00" : formatMoney(remainingAmount)}
            </h2>
          </div>
        </section>

        {!isTransferPage ? (
          <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Relatório da compra
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Pedido</p>
                    <p className="mt-2 break-all font-semibold text-gray-900">
                      #{order?.id}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Compra realizada em</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDate(order?.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Comprador</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {order?.customerName || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="mt-2 break-all font-semibold text-gray-900">
                      {order?.customerEmail || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                    <p className="text-sm text-gray-500">Data do evento</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDate(getEventDate())}
                    </p>
                  </div>
                </div>
              </div>

              {showOrderTickets ? (
                <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Ingressos deste pedido
                  </h2>

                  <div className="mt-5 space-y-5">
                    {order?.items?.length ? (
                      order.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-lg font-bold text-gray-900">
                                {item.ticketType?.name || "Ingresso sem nome"}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                Quantidade: {item.quantity || 0}
                              </p>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-sm text-gray-500">Total do item</p>
                              <p className="mt-1 text-lg font-bold text-gray-900">
                                {formatMoney(item.totalPrice)}
                              </p>
                            </div>
                          </div>

                          {item.tickets?.length ? (
                            <div className="mt-5 grid gap-4">
                              {item.tickets.map((ticket) => {
                                const ticketCanceled = isTicketCanceled(ticket);
                                const ticketTransferPending =
                                  isTicketTransferPending(ticket);
                                const ticketTransferredAway =
                                  isTicketTransferredAway(ticket);
                                const visualStatus = getTicketVisualStatus(ticket);

                                return (
                                  <div
                                    key={ticket.id}
                                    className="rounded-[24px] border border-gray-200 bg-white p-5"
                                  >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                              visualStatus,
                                            )}`}
                                          >
                                            {visualStatus}
                                          </span>
                                        </div>

                                        {ticketCanceled ? (
                                          <>
                                            <p className="mt-4 text-sm font-semibold text-red-600">
                                              Este ingresso foi cancelado e não está mais acessível.
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                              Os botões foram removidos porque este ingresso não pode mais ser usado.
                                            </p>
                                          </>
                                        ) : ticketTransferredAway ? (
                                          <>
                                            <p className="mt-4 text-sm font-semibold text-violet-700">
                                              Este ingresso já foi transferido.
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                              Ele continua aparecendo no histórico deste pedido,
                                              mas não pertence mais a esta conta e não pode mais ser acessado aqui.
                                            </p>
                                          </>
                                        ) : ticketTransferPending ? (
                                          <>
                                            <p className="mt-4 text-sm font-semibold text-amber-700">
                                              Transferência pendente
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                              Este ingresso está aguardando o aceite da outra pessoa.
                                              Enquanto isso, o código e a visualização ficam bloqueados.
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <p className="mt-4 text-sm text-gray-500">
                                              Código do ingresso
                                            </p>
                                            <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                                              {ticket.code || "-"}
                                            </p>
                                          </>
                                        )}
                                      </div>

                                      {!ticketCanceled &&
                                      !ticketTransferPending &&
                                      !ticketTransferredAway ? (
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenTicket(ticket)}
                                            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                                          >
                                            Ver ingresso
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => copyTicketCode(ticket.code)}
                                            className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                          >
                                            Copiar código
                                          </button>
                                        </div>
                                      ) : ticketTransferredAway ? (
                                        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">
                                          Ingresso transferido
                                        </div>
                                      ) : ticketCanceled ? (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                          Ingresso cancelado
                                        </div>
                                      ) : (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                                          Aguardando aceite da transferência
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-gray-500">
                              Nenhum ticket gerado para este item.
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum ingresso encontrado neste pedido.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-amber-800">
                    Ingressos ainda não liberados
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-amber-700">
                    Assim que o pagamento for confirmado, os ingressos deste pedido
                    aparecerão aqui para visualização.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">Pagamento</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Pago com wallet</p>
                        <p className="mt-1 text-xl font-bold text-violet-700">
                          {formatMoney(walletPaid)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Pago por outros meios</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">
                          {formatMoney(externalPaid)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Total já pago</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">
                          {formatMoney(totalPaid)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Restante</p>
                        <p className="mt-1 text-xl font-bold text-amber-700">
                          {formatMoney(remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gray-700">
                      {paymentJourneyLabel}
                    </div>
                  </div>

                  {order?.payments?.length ? (
                    order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Método</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {payment.method || "-"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              payment.status,
                            )}`}
                          >
                            {payment.status || "SEM STATUS"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-gray-500">Valor</p>
                            <p className="mt-1 font-bold text-gray-900">
                              {formatMoney(payment.amount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Data</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                      <p className="text-sm text-gray-500">
                        Nenhum pagamento registrado ainda.
                      </p>
                    </div>
                  )}

                  {remainingAmount > 0 && order?.status !== "CANCELED" ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                          PENDENTE
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-amber-700">
                        {walletPaid > 0
                          ? `Parte do pedido já foi coberta pela wallet. Falta pagar ${formatMoney(
                              remainingAmount,
                            )} para liberar os ingressos.`
                          : `Seu pedido ainda está aguardando confirmação. Falta pagar ${formatMoney(
                              remainingAmount,
                            )} para liberar os ingressos.`}
                      </p>

                      <button
                        type="button"
                        onClick={handleFinishPayment}
                        disabled={paying}
                        className="mt-5 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {paying
                          ? "Finalizando..."
                          : `Finalizar pagamento de ${formatMoney(remainingAmount)}`}
                      </button>
                    </div>
                  ) : null}

                  {remainingAmount === 0 && order?.status === "PAID" ? (
                    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-sm font-semibold text-emerald-800">
                        Este pedido já está totalmente quitado.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        {walletPaid > 0 && externalPaid === 0
                          ? "Pagamento concluído integralmente com saldo da wallet."
                          : walletPaid > 0 && externalPaid > 0
                            ? "Pagamento concluído com combinação de wallet e outro método."
                            : "Pagamento concluído com sucesso."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Opções do pedido
                </h2>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-lg">🖨️</span>
                    <span>Imprimir pedido</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTalkToProducer}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-lg">💬</span>
                    <span>Fale com o produtor</span>
                  </button>

                  {order?.status !== "CANCELED" && isPendingOrder ? (
                    <button
                      type="button"
                      onClick={handleCancelOrderPending}
                      disabled={cancelingOrderMode !== ""}
                      className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-lg">❌</span>
                      <span>
                        {cancelingOrderMode === "PENDING_SIMPLE"
                          ? "Cancelando pedido..."
                          : "Cancelar pedido"}
                      </span>
                    </button>
                  ) : null}

                  {order?.status !== "CANCELED" && isPaidOrder ? (
                    <>
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                        Pedido pago: você pode cancelar com 80% na wallet ou 70% de
                        estorno.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelOrder("REFUND_70")}
                        disabled={cancelingOrderMode !== ""}
                        className="flex w-full items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">↩️</span>
                        <span>
                          {cancelingOrderMode === "REFUND_70"
                            ? "Cancelando pedido..."
                            : "Cancelar pedido com 70% de estorno"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancelOrder("WALLET_80")}
                        disabled={cancelingOrderMode !== ""}
                        className="flex w-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">👛</span>
                        <span>
                          {cancelingOrderMode === "WALLET_80"
                            ? "Cancelando pedido..."
                            : "Cancelar pedido com 80% na wallet"}
                        </span>
                      </button>
                    </>
                  ) : null}

                  {order?.status === "CANCELED" ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      Este pedido já está cancelado.
                    </div>
                  ) : null}
                </div>
              </div>

              {order?.cancellations?.length ? (
                <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Histórico de cancelamentos
                  </h2>

                  <div className="mt-5 space-y-4">
                    {order.cancellations.map((cancellation) => (
                      <div
                        key={cancellation.id}
                        className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              cancellation.status,
                            )}`}
                          >
                            {cancellation.status || "SEM STATUS"}
                          </span>

                          <span className="text-xs text-gray-500">
                            {formatDate(cancellation.createdAt)}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-gray-500">Modo</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {cancellation.mode || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Valor retornado</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {formatMoney(cancellation.returnedAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Relatório da transferência
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Transferência</p>
                    <p className="mt-2 break-all font-semibold text-gray-900">
                      #{transfer?.id}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Recebida em</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDate(transfer?.requestedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Enviado por</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {transfer?.fromName ||
                        transfer?.requestedByName ||
                        transfer?.fromUser?.name ||
                        "-"}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-500">
                      {transfer?.fromEmail ||
                        transfer?.requestedByEmail ||
                        transfer?.fromUser?.email ||
                        "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Recebido por</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {transfer?.toName ||
                        transfer?.toUser?.name ||
                        currentUser?.name ||
                        "-"}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-500">
                      {transfer?.toEmail ||
                        transfer?.toUser?.email ||
                        currentUser?.email ||
                        "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                    <p className="text-sm text-gray-500">Data do evento</p>
                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDate(getEventDate())}
                    </p>
                  </div>
                </div>

                {transfer?.responseReason ? (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-500">Observação</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {transfer.responseReason}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Ingresso recebido
                </h2>

                <div className="mt-5 rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {transfer?.ticket?.orderItem?.ticketType?.name || "Ingresso"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {transferCanUseTicket
                          ? "Este ingresso agora pertence à sua conta"
                          : transferIsBeingRetransferred
                            ? "Este ingresso entrou em uma nova transferência"
                            : "Acompanhe aqui o status do recebimento"}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          transferCanUseTicket
                            ? transfer?.ticket?.status || "AVAILABLE"
                            : transferIsBeingRetransferred
                              ? "TRANSFER_PENDING"
                              : transfer?.status,
                        )}`}
                      >
                        {transferCanUseTicket
                          ? transfer?.ticket?.status || "AVAILABLE"
                          : transferIsBeingRetransferred
                            ? "TRANSFER_PENDING"
                            : transfer?.status || "SEM STATUS"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm text-gray-500">Titular</p>
                      <p className="mt-2 font-semibold text-gray-900">
                        {transfer?.ticket?.holderName || "-"}
                      </p>
                      <p className="mt-1 break-all text-sm text-gray-500">
                        {transfer?.ticket?.holderEmail || "-"}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        CPF: {formatCpf(transfer?.ticket?.holderCpf)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm text-gray-500">Código</p>
                      {transferCanUseTicket ? (
                        <p className="mt-2 break-all font-mono text-sm font-semibold text-gray-900">
                          {transfer?.ticket?.code || "-"}
                        </p>
                      ) : transferIsBeingRetransferred ? (
                        <p className="mt-2 text-sm text-gray-500">
                          O código ficou bloqueado porque este ingresso está sendo
                          transferido novamente.
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">
                          O código só fica disponível após o aceite da transferência.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {transferCanUseTicket && transferTicket ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenTicket(transferTicket)}
                          className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          Ver ingresso
                        </button>

                        <button
                          type="button"
                          onClick={() => copyTicketCode(transfer?.ticket?.code)}
                          className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Copiar código
                        </button>
                      </>
                    ) : isIncomingPendingTransfer ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                        Esta transferência está aguardando sua resposta.
                      </div>
                    ) : transferIsBeingRetransferred ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                        Este ingresso está em processo de retransferência.
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                        Aguarde a conclusão da transferência para liberar o ingresso.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Financeiro da transferência
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-500">Valor da compra</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">
                          R$ 0,00
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Total pago</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">
                          R$ 0,00
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Estorno</p>
                        <p className="mt-1 text-xl font-bold text-orange-700">
                          R$ 0,00
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Restante</p>
                        <p className="mt-1 text-xl font-bold text-amber-700">
                          R$ 0,00
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-gray-700">
                      Este detalhe representa o recebimento da transferência. Não há pagamento novo nesta tela.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Opções da transferência
                </h2>

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-lg">🖨️</span>
                    <span>Imprimir relatório da transferência</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTalkToProducer}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-lg">💬</span>
                    <span>Fale com o produtor</span>
                  </button>

                  {isIncomingPendingTransfer ? (
                    <>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Você pode aceitar ou recusar esta transferência.
                      </div>

                      <button
                        type="button"
                        onClick={handleAcceptTransfer}
                        disabled={transferActionLoading !== ""}
                        className="flex w-full items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">✅</span>
                        <span>
                          {transferActionLoading === "ACCEPT"
                            ? "Aceitando..."
                            : "Aceitar transferência"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRejectTransfer}
                        disabled={transferActionLoading !== ""}
                        className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">❌</span>
                        <span>
                          {transferActionLoading === "REJECT"
                            ? "Recusando..."
                            : "Recusar transferência"}
                        </span>
                      </button>
                    </>
                  ) : null}

                  {isOutgoingPendingTransfer ? (
                    <button
                      type="button"
                      onClick={handleCancelTransfer}
                      disabled={transferActionLoading !== ""}
                      className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-lg">🛑</span>
                      <span>
                        {transferActionLoading === "CANCEL"
                          ? "Cancelando..."
                          : "Cancelar transferência"}
                      </span>
                    </button>
                  ) : null}

                  {transferCanUseTicket && transferTicket ? (
                    <button
                      type="button"
                      onClick={() => openTransferModal(transferTicket)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      <span className="text-lg">🎫</span>
                      <span>Transferir ingresso novamente</span>
                    </button>
                  ) : null}

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    O cancelamento sem estorno da transferência recebida vamos ligar no próximo passo.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {producerTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-lg overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
                    Chat com o produtor
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight">
                    {getEventName()}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setProducerTicketOpen(false)}
                  className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fechar
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmitProducerTicket}
              className="max-h-[78vh] overflow-y-auto p-5"
            >
              <div className="grid gap-4">
                <div className="rounded-[18px] bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Atendimento interno</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    Sua mensagem ficará salva dentro do app e vinculada ao registro base.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-sky-500"
                    placeholder="Ex: Dúvida sobre meu ingresso"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Descreva o problema
                  </label>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="min-h-[140px] w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-sky-500"
                    placeholder="Explique o que aconteceu"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={creatingSupportThread}
                    className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingSupportThread ? "Abrindo..." : "Abrir atendimento"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProducerTicketOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTicket &&
      !isTicketCanceled(selectedTicket) &&
      !isTicketTransferPending(selectedTicket) &&
      !isTicketTransferredAway(selectedTicket) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-lg overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
                    {isTransferPage ? "Ingresso recebido" : "Ingresso"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight">
                    {getEventName()}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-5">
              <div className="grid gap-3">
                <div className="rounded-[18px] bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Código</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                    {selectedTicket.code || "-"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                          getTicketVisualStatus(selectedTicket),
                        )}`}
                      >
                        {getTicketVisualStatus(selectedTicket)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Data do evento</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {formatDate(getEventDate())}
                    </p>
                  </div>
                </div>

                <div className="rounded-[18px] bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Titular</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {selectedTicket.holderName || "-"}
                  </p>
                  <p className="mt-1 break-all text-sm text-gray-500">
                    {selectedTicket.holderEmail || "-"}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    CPF: {formatCpf(selectedTicket.holderCpf)}
                  </p>
                </div>

                <div className="rounded-[18px] border border-gray-200 bg-white p-4">
                  <h4 className="text-sm font-bold text-gray-900">
                    Opções do ingresso
                  </h4>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(selectedTicket)}
                      className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-left text-sm font-semibold text-sky-600 hover:bg-sky-50"
                    >
                      <span>🖨️</span>
                      <span>Imprimir ingresso</span>
                    </button>

                    {canTransferTicket(selectedTicket) ? (
                      <button
                        type="button"
                        onClick={() => openTransferModal(selectedTicket)}
                        className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-left text-sm font-semibold text-sky-600 hover:bg-sky-50"
                      >
                        <span>🎫</span>
                        <span>Transferir ingresso</span>
                      </button>
                    ) : null}

                    {!isTransferPage &&
                    selectedTicket.status !== "CANCELED" &&
                    order?.status !== "CANCELED" &&
                    isPendingOrder ? (
                      <button
                        type="button"
                        onClick={handleCancelTicketPending}
                        disabled={cancelingTicketMode !== ""}
                        className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>❌</span>
                        <span>
                          {cancelingTicketMode === "PENDING_SIMPLE"
                            ? "Cancelando ingresso..."
                            : "Cancelar ingresso"}
                        </span>
                      </button>
                    ) : null}

                    {!isTransferPage &&
                    selectedTicket.status !== "CANCELED" &&
                    order?.status !== "CANCELED" &&
                    isPaidOrder ? (
                      <>
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-xs leading-5 text-violet-800">
                          Ingresso pago: você pode cancelar com 80% na wallet ou
                          70% de estorno.
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelTicket("REFUND_70")}
                          disabled={cancelingTicketMode !== ""}
                          className="flex w-full items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 text-left text-sm font-semibold text-orange-600 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span>↩️</span>
                          <span>
                            {cancelingTicketMode === "REFUND_70"
                              ? "Cancelando ingresso..."
                              : "Cancelar com 70% de estorno"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelTicket("WALLET_80")}
                          disabled={cancelingTicketMode !== ""}
                          className="flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-left text-sm font-semibold text-violet-600 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span>👛</span>
                          <span>
                            {cancelingTicketMode === "WALLET_80"
                              ? "Cancelando ingresso..."
                              : "Cancelar com 80% na wallet"}
                          </span>
                        </button>
                      </>
                    ) : null}

                    {isTransferPage ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                        O cancelamento sem estorno do ingresso transferido vamos ligar no próximo passo.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => copyTicketCode(selectedTicket.code)}
                    className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Copiar código
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {transferModalOpen && transferSourceTicket ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">
                    Transferência
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight">
                    Informar CPF do destinatário
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeTransferModal}
                  className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fechar
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitTransfer} className="p-5">
              <div className="grid gap-4">
                <div className="rounded-[18px] bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Ingresso selecionado</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {isTransferPage
                      ? transfer?.ticket?.orderItem?.ticketType?.name || "Ingresso"
                      : selectedTicket?.id === transferSourceTicket.id
                        ? selectedTicket.holderName || transferSourceTicket.code || "Ingresso"
                        : transferSourceTicket.holderName ||
                          transferSourceTicket.code ||
                          "Ingresso"}
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    Código: {transferSourceTicket.code || "-"}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    CPF do destinatário
                  </label>
                  <input
                    type="text"
                    value={transferTargetCpf}
                    onChange={(e) => setTransferTargetCpf(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-sky-500"
                    placeholder="Digite o CPF que vai receber"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                  O ingresso ficará aguardando aceite da outra pessoa. Enquanto isso,
                  ele entra como <strong>TRANSFER_PENDING</strong>.
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={transferSubmitting}
                    className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferSubmitting ? "Transferindo..." : "Confirmar transferência"}
                  </button>

                  <button
                    type="button"
                    onClick={closeTransferModal}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}