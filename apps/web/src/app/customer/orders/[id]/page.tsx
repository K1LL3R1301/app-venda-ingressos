"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";

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
  mode?: string | null;
  returnOfTransferRequestId?: string | null;
  status?: string;
  responseReason?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  expiresAt?: string | null;
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
  receivedViaTransferRequestId?: string | null;
  receivedViaTransferLocked?: boolean | null;
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
  expiresAt?: string | null;
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
  mode?: string | null;
  returnOfTransferRequestId?: string | null;
  status?: string;
  responseReason?: string | null;
  requestedAt?: string;
  respondedAt?: string | null;
  expiresAt?: string | null;
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
    receivedViaTransferRequestId?: string | null;
    receivedViaTransferLocked?: boolean | null;
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

function formatDate(value?: string | null) {
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

function formatCountdown(ms?: number | null) {
  if (ms === null || ms === undefined) return "--:--";

  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function getCountdownNumberClass(ms?: number | null) {
  if (ms === null || ms === undefined) {
    return "text-slate-700";
  }

  if (ms <= 5 * 60 * 1000) {
    return "text-rose-600";
  }

  return "text-emerald-600";
}

function getStatusLabel(status?: string) {
  const normalized = (status || "").toUpperCase();

  if (normalized === "PAID") return "Pago";
  if (normalized === "PENDING") return "Pendente";
  if (normalized === "PENDING_PAYMENT") return "Aguardando pagamento";
  if (normalized === "AVAILABLE") return "Disponível";
  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "TRANSFER_PENDING") return "Transferência pendente";
  if (normalized === "PENDING_ACCEPTANCE") return "Aguardando aceite";
  if (normalized === "ACCEPTED") return "Aceita";
  if (normalized === "RETURNED") return "Devolvido";
  if (normalized === "UNAVAILABLE") return "Indisponível";
  if (normalized === "REJECTED") return "Recusada";
  if (normalized === "TRANSFERRED") return "Transferido";
  if (normalized === "USED") return "Utilizado";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "REFUND_REQUESTED") return "Estorno solicitado";
  if (normalized === "CREDITED") return "Creditado";
  if (normalized === "NO_REFUND") return "Sem reembolso";

  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  const normalized = (status || "").toUpperCase();

  if (
    normalized === "PAID" ||
    normalized === "AVAILABLE" ||
    normalized === "ACTIVE" ||
    normalized === "ACCEPTED"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "PENDING" ||
    normalized === "PENDING_ACCEPTANCE" ||
    normalized === "TRANSFER_PENDING"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "PENDING_PAYMENT") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "RETURNED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "UNAVAILABLE") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (normalized === "TRANSFERRED" || normalized === "TRANSFERIDO") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "CANCELED" || normalized === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "USED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (normalized === "CREDITED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "REFUND_REQUESTED") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (normalized === "NO_REFUND") {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const rawRouteId = typeof params?.id === "string" ? params.id : "";

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
  const [returningTicket, setReturningTicket] = useState(false);

  const [transferActionLoading, setTransferActionLoading] = useState<
    "" | "ACCEPT" | "REJECT" | "CANCEL"
  >("");

  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const orderExpiredRefreshRef = useRef(false);

  const isTransferPage = rawRouteId.startsWith("transfer_");
  const entityId = isTransferPage ? rawRouteId.replace("transfer_", "") : rawRouteId;
  const currentUserId = currentUser?.id || null;

  const orderItems = order?.items || [];

  const isPendingOrder =
    !isTransferPage &&
    (order?.status === "PENDING" || order?.status === "PENDING_PAYMENT");

  const isPaidOrder = !isTransferPage && order?.status === "PAID";
  const isPendingCountdownExpired =
    isPendingOrder && timeLeftMs !== null && timeLeftMs <= 0;

  const showReleasedTickets = isTransferPage || isPaidOrder;

  function goTo(path: string) {
    window.location.href = path;
  }

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
        setTimeLeftMs(null);
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

  useEffect(() => {
    orderExpiredRefreshRef.current = false;
  }, [order?.id, order?.expiresAt, order?.status, isTransferPage]);

  useEffect(() => {
    if (isTransferPage || !isPendingOrder || !order?.expiresAt) {
      setTimeLeftMs(null);
      return;
    }

    const updateCountdown = () => {
      const expiresAt = new Date(order.expiresAt || "").getTime();

      if (Number.isNaN(expiresAt)) {
        setTimeLeftMs(null);
        return;
      }

      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeftMs(remaining);

      if (remaining <= 0 && !orderExpiredRefreshRef.current) {
        orderExpiredRefreshRef.current = true;
        window.setTimeout(() => {
          loadData();
        }, 1200);
      }
    };

    updateCountdown();

    const interval = window.setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isTransferPage, isPendingOrder, order?.expiresAt]);

  function isTicketCanceled(ticket?: TicketItem | null) {
    return ticket?.status === "CANCELED";
  }

  function isTicketTransferredAway(ticket?: TicketItem | null) {
    if (!ticket || !currentUserId) return false;

    return !!ticket.currentOwnerUserId && ticket.currentOwnerUserId !== currentUserId;
  }

  function isTicketTransferPending(ticket?: TicketItem | null) {
    if (!ticket) return false;
    return ticket.status === "TRANSFER_PENDING";
  }

  function isReturnOnlyTicket(ticket?: TicketItem | null) {
    return ticket?.receivedViaTransferLocked === true;
  }

  function isReturnedTransferRecord() {
    return isTransferPage && (transfer?.status || "").toUpperCase() === "RETURNED";
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

  function getDisplayedTicketStatus(ticket?: TicketItem | null) {
    if (isReturnedTransferRecord()) {
      return "UNAVAILABLE";
    }

    return getTicketVisualStatus(ticket);
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
      "Acompanhe aqui seus ingressos, pagamentos, transferências e cancelamentos."
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
      receivedViaTransferRequestId: transfer.ticket.receivedViaTransferRequestId,
      receivedViaTransferLocked: transfer.ticket.receivedViaTransferLocked,
      transferRequests: [
        {
          id: transfer.id,
          ticketId: transfer.ticketId,
          orderId: transfer.orderId,
          requestedByUserId: transfer.requestedByUserId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          mode: transfer.mode,
          returnOfTransferRequestId: transfer.returnOfTransferRequestId,
          status: transfer.status,
          responseReason: transfer.responseReason,
          requestedAt: transfer.requestedAt,
          respondedAt: transfer.respondedAt,
          expiresAt: transfer.expiresAt,
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

  const flattenedTickets = useMemo(() => {
    if (isTransferPage) {
      const ticket = buildTransferTicket();
      return ticket ? [ticket] : [];
    }

    return orderItems.flatMap((item) => item.tickets || []);
  }, [isTransferPage, orderItems, transfer]);

  const totalTickets = useMemo(() => {
    if (isTransferPage) return flattenedTickets.length;

    return orderItems.reduce((sum, item) => {
      const quantity =
        typeof item.quantity === "number"
          ? item.quantity
          : (item.tickets || []).length;

      return sum + quantity;
    }, 0);
  }, [isTransferPage, flattenedTickets, orderItems]);

  const totalPaid =
    order?.payments?.reduce((sum, payment) => sum + toNumber(payment.amount), 0) || 0;

  const canAcceptTransfer =
    isTransferPage &&
    transfer?.status === "PENDING_ACCEPTANCE" &&
    (!!currentUserId ? transfer?.toUserId === currentUserId : true);

  const canRejectTransfer = canAcceptTransfer;

  const canCancelTransfer =
    isTransferPage &&
    transfer?.status === "PENDING_ACCEPTANCE" &&
    (!!currentUserId
      ? transfer?.requestedByUserId === currentUserId ||
        transfer?.fromUserId === currentUserId
      : true);

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
    if (!showReleasedTickets) {
      alert("Os ingressos serão liberados depois da confirmação do pagamento.");
      return;
    }

    if (isReturnedTransferRecord()) {
      alert("Este ingresso foi devolvido e está indisponível nesta conta.");
      return;
    }

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

  async function handleReturnTicket(ticket: TicketItem) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!ticket.id) {
      alert("Ingresso inválido");
      return;
    }

    const confirmed = window.confirm(
      "Deseja devolver este ingresso para quem enviou originalmente?",
    );

    if (!confirmed) return;

    setReturningTicket(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/tickets/customer/${ticket.id}/transfer`,
        {
          method: "POST",
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
            : "Erro ao devolver ingresso",
        );
        return;
      }

      alert("Ingresso devolvido com sucesso");
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("RETURN TICKET ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setReturningTicket(false);
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

    if (isPendingCountdownExpired) {
      alert("O tempo deste pedido acabou. Atualizando o status...");
      await loadData();
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

      alert("Atendimento aberto com sucesso");
      setProducerTicketOpen(false);
    } catch (error) {
      console.error("CREATE SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCreatingSupportThread(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Carregando detalhes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order && !transfer) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Registro não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const heroTitle = isTransferPage ? "Transferência de ingresso" : "Detalhes do pedido";
  const heroDescription = getEventDescription();
  const eventName = getEventName();
  const eventDate = getEventDate();
  const countdownNumberClass = getCountdownNumberClass(timeLeftMs);

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8 pb-32 xl:pb-8">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 text-white shadow-sm">
          <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] backdrop-blur">
                  {heroTitle}
                </span>

                <span
                  className={`rounded-full border px-4 py-2 text-xs font-semibold ${getStatusClasses(
                    isTransferPage ? transfer?.status : order?.status,
                  )}`}
                >
                  {getStatusLabel(isTransferPage ? transfer?.status : order?.status)}
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                {eventName}
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                {heroDescription}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Data do evento
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatDate(eventDate)}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Registro
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">
                    #{isTransferPage ? transfer?.id : order?.id}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Total de ingressos
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {totalTickets}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
                >
                  Voltar para meus pedidos
                </button>

                <button
                  type="button"
                  onClick={() => goTo(getBackPath())}
                  className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Ir para evento
                </button>
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                  Comprador
                </p>
                <p className="mt-3 text-lg font-black text-white">
                  {isTransferPage
                    ? transfer?.order?.customerName || "Cliente"
                    : order?.customerName || "Cliente"}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {isTransferPage
                    ? transfer?.order?.customerEmail || "-"
                    : order?.customerEmail || "-"}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                  Valor
                </p>
                <p className="mt-3 text-3xl font-black text-white">
                  {isTransferPage ? "Transferência" : formatMoney(order?.totalAmount)}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {isTransferPage
                    ? `Solicitada em ${formatDate(transfer?.requestedAt)}`
                    : `Criado em ${formatDate(order?.createdAt)}`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className={cardClass()}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Status atual
            </p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusClasses(
                  isTransferPage ? transfer?.status : order?.status,
                )}`}
              >
                {getStatusLabel(isTransferPage ? transfer?.status : order?.status)}
              </span>
            </div>
          </div>

          <div className={cardClass()}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Valor pago
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {formatMoney(totalPaid)}
            </p>
          </div>

          <div className={cardClass()}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Ingressos
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">{totalTickets}</p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            {!isTransferPage ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">
                  Itens do pedido
                </h2>

                <div className="mt-6 space-y-4">
                  {orderItems.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className="rounded-[24px] border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Item {itemIndex + 1}
                          </p>
                          <h3 className="mt-2 text-xl font-black text-slate-950">
                            {item.ticketType?.name || "Ingresso"}
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">
                            Quantidade: {item.quantity ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Total
                          </p>
                          <p className="mt-1 text-lg font-black text-slate-950">
                            {formatMoney(item.totalPrice)}
                          </p>
                        </div>
                      </div>

                      {showReleasedTickets ? (
                        (item.tickets || []).length > 0 ? (
                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {(item.tickets || []).map((ticket) => {
                              const visualStatus = getTicketVisualStatus(ticket);

                              return (
                                <button
                                  key={ticket.id}
                                  type="button"
                                  onClick={() => handleOpenTicket(ticket)}
                                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-slate-100"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">
                                        Código {ticket.code || "-"}
                                      </p>
                                      <p className="mt-1 text-sm text-slate-500">
                                        Titular: {ticket.holderName || "Não definido"}
                                      </p>
                                      {isReturnOnlyTicket(ticket) ? (
                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                                          Somente devolução
                                        </p>
                                      ) : null}
                                    </div>

                                    <span
                                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                                        visualStatus,
                                      )}`}
                                    >
                                      {getStatusLabel(visualStatus)}
                                    </span>
                                  </div>

                                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Toque para abrir ações do ingresso
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                            Nenhum ingresso gerado para este item.
                          </div>
                        )
                      ) : (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                          Os ingressos deste pedido serão liberados somente após a
                          confirmação do pagamento.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">
                  Resumo da transferência
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Quem enviou</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {transfer?.fromName || transfer?.requestedByName || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {transfer?.fromEmail || transfer?.requestedByEmail || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Quem recebe</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {transfer?.toName || currentUser?.name || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {transfer?.toEmail || currentUser?.email || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Solicitada em</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(transfer?.requestedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Respondida em</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(transfer?.respondedAt)}
                    </p>
                  </div>
                </div>

                {transfer?.responseReason ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">Motivo / observação</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {transfer.responseReason}
                    </p>
                  </div>
                ) : null}

                {transfer?.ticket ? (
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Ingresso transferido
                        </p>
                        <h3 className="mt-2 text-xl font-black text-slate-950">
                          {transfer.ticket.orderItem?.ticketType?.name || "Ingresso"}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          Código: {transfer.ticket.code || "-"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          getDisplayedTicketStatus(buildTransferTicket()),
                        )}`}
                      >
                        {getStatusLabel(getDisplayedTicketStatus(buildTransferTicket()))}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Titular</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {transfer.ticket.holderName || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">CPF</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {formatCpf(transfer.ticket.holderCpf)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      {isReturnedTransferRecord() ? (
                        <button
                          type="button"
                          disabled
                          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                        >
                          Ingresso indisponível
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const transferTicket = buildTransferTicket();
                            if (transferTicket) {
                              handleOpenTicket(transferTicket);
                            }
                          }}
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Abrir ingresso
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            {(order?.payments || []).length > 0 ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">Pagamentos</h2>

                <div className="mt-6 space-y-3">
                  {(order?.payments || []).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {payment.method || "Pagamento"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-black text-slate-950">
                          {formatMoney(payment.amount)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                            payment.status,
                          )}`}
                        >
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(order?.cancellations || []).length > 0 ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">
                  Histórico de cancelamentos
                </h2>

                <div className="mt-6 space-y-3">
                  {(order?.cancellations || []).map((cancellation) => (
                    <div
                      key={cancellation.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {cancellation.ticketId
                              ? `Ingresso ${cancellation.ticketId}`
                              : "Pedido inteiro"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(cancellation.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                            cancellation.status,
                          )}`}
                        >
                          {getStatusLabel(cancellation.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Modalidade
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {cancellation.mode || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Valor original
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatMoney(cancellation.originalAmount)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            Valor devolvido
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatMoney(cancellation.returnedAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {!isTransferPage &&
            flattenedTickets.some((ticket) => (ticket.transferRequests || []).length > 0) ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">
                  Histórico de transferências
                </h2>

                <div className="mt-6 space-y-4">
                  {flattenedTickets.map((ticket) => {
                    const requests = ticket.transferRequests || [];

                    if (requests.length === 0) return null;

                    return (
                      <div
                        key={`transfers-${ticket.id}`}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          Ingresso {ticket.code || ticket.id}
                        </p>

                        <div className="mt-4 space-y-3">
                          {requests.map((request) => (
                            <button
                              key={request.id}
                              type="button"
                              onClick={() =>
                                goTo(`/customer/orders/transfer_${request.id}`)
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {request.toName ||
                                      request.toEmail ||
                                      request.toCpf ||
                                      "Destinatário"}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {formatDate(request.requestedAt)}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                                    request.status,
                                  )}`}
                                >
                                  {getStatusLabel(request.status)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Ações rápidas
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {isTransferPage ? "Gerenciar transferência" : "Gerenciar pedido"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Escolha a próxima ação sem se perder na jornada.
                </p>
              </div>

              <div className="space-y-3 p-5">
                {isPendingOrder ? (
                <div className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase leading-none tracking-[0.18em] text-slate-500">
                Tempo restante
                </p>
                <p className={`mt-2 text-3xl font-black leading-none ${countdownNumberClass}`}>
                {formatCountdown(timeLeftMs)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                {isPendingCountdownExpired
                ? "O pedido está sendo marcado como expirado."
                : "Pague antes do cronômetro zerar."}
                </p>
                </div>
                ) : null}

                {isPendingOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={handleFinishPayment}
                      disabled={paying || isPendingCountdownExpired}
                      className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPendingCountdownExpired
                        ? "Tempo encerrado"
                        : paying
                          ? "Finalizando..."
                          : "Finalizar pagamento"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelOrderPending}
                      disabled={
                        cancelingOrderMode === "PENDING_SIMPLE" ||
                        isPendingCountdownExpired
                      }
                      className="w-full rounded-2xl border border-rose-200 px-5 py-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingOrderMode === "PENDING_SIMPLE"
                        ? "Cancelando..."
                        : "Cancelar pedido pendente"}
                    </button>
                  </>
                ) : null}

                {isPaidOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCancelOrder("WALLET_80")}
                      disabled={cancelingOrderMode === "WALLET_80"}
                      className="w-full rounded-2xl border border-violet-200 px-5 py-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingOrderMode === "WALLET_80"
                        ? "Processando..."
                        : "Cancelar com 80% em wallet"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelOrder("REFUND_70")}
                      disabled={cancelingOrderMode === "REFUND_70"}
                      className="w-full rounded-2xl border border-orange-200 px-5 py-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingOrderMode === "REFUND_70"
                        ? "Processando..."
                        : "Cancelar com estorno de 70%"}
                    </button>
                  </>
                ) : null}

                {canAcceptTransfer ? (
                  <button
                    type="button"
                    onClick={handleAcceptTransfer}
                    disabled={transferActionLoading === "ACCEPT"}
                    className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferActionLoading === "ACCEPT"
                      ? "Aceitando..."
                      : "Aceitar transferência"}
                  </button>
                ) : null}

                {canRejectTransfer ? (
                  <button
                    type="button"
                    onClick={handleRejectTransfer}
                    disabled={transferActionLoading === "REJECT"}
                    className="w-full rounded-2xl border border-rose-200 px-5 py-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferActionLoading === "REJECT"
                      ? "Recusando..."
                      : "Recusar transferência"}
                  </button>
                ) : null}

                {canCancelTransfer ? (
                  <button
                    type="button"
                    onClick={handleCancelTransfer}
                    disabled={transferActionLoading === "CANCEL"}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferActionLoading === "CANCEL"
                      ? "Cancelando..."
                      : "Cancelar transferência"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleTalkToProducer}
                  className="w-full rounded-2xl border border-sky-200 px-5 py-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  Falar com o produtor
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar para meus pedidos
                </button>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {selectedTicket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Ingresso
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {selectedTicket.code || "Código indisponível"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">{eventName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Titular</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedTicket.holderName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">CPF</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatCpf(selectedTicket.holderCpf)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedTicket.holderEmail || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        getDisplayedTicketStatus(selectedTicket),
                      )}`}
                    >
                      {getStatusLabel(getDisplayedTicketStatus(selectedTicket))}
                    </span>
                  </div>
                </div>
              </div>

              {isReturnOnlyTicket(selectedTicket) ? (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-800">
                  Este ingresso foi recebido por transferência. Ele não pode ser
                  enviado para outra pessoa, apenas devolvido para quem enviou
                  originalmente.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => copyTicketCode(selectedTicket.code)}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Copiar código
                </button>

                {canTransferTicket(selectedTicket) &&
                !isReturnOnlyTicket(selectedTicket) ? (
                  <button
                    type="button"
                    onClick={() => openTransferModal(selectedTicket)}
                    className="rounded-2xl border border-sky-200 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                  >
                    Transferir ingresso
                  </button>
                ) : null}

                {canTransferTicket(selectedTicket) &&
                isReturnOnlyTicket(selectedTicket) ? (
                  <button
                    type="button"
                    onClick={() => handleReturnTicket(selectedTicket)}
                    disabled={returningTicket}
                    className="rounded-2xl border border-violet-200 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {returningTicket ? "Devolvendo..." : "Devolver ingresso"}
                  </button>
                ) : null}

                {isPendingOrder ? (
                  <button
                    type="button"
                    onClick={handleCancelTicketPending}
                    disabled={
                      cancelingTicketMode === "PENDING_SIMPLE" ||
                      isPendingCountdownExpired
                    }
                    className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelingTicketMode === "PENDING_SIMPLE"
                      ? "Cancelando..."
                      : "Cancelar ingresso"}
                  </button>
                ) : null}

                {isPaidOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCancelTicket("WALLET_80")}
                      disabled={cancelingTicketMode === "WALLET_80"}
                      className="rounded-2xl border border-violet-200 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingTicketMode === "WALLET_80"
                        ? "Processando..."
                        : "Cancelar com wallet"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelTicket("REFUND_70")}
                      disabled={cancelingTicketMode === "REFUND_70"}
                      className="rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingTicketMode === "REFUND_70"
                        ? "Processando..."
                        : "Cancelar com estorno"}
                    </button>
                  </>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  QR Code
                </p>
                <p className="mt-4 break-all text-2xl font-black text-slate-950">
                  {selectedTicket.code || selectedTicket.id}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Prévia visual do ingresso. A validação real usa o código assinado do
                  ticket.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {transferModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <form
            onSubmit={handleSubmitTransfer}
            className="w-full max-w-xl rounded-[30px] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Transferência
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Transferir ingresso
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Informe o CPF do destinatário.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTransferModal}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Ingresso</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {transferSourceTicket?.code || transferSourceTicket?.id || "-"}
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  CPF do destinatário
                </span>
                <input
                  type="text"
                  value={transferTargetCpf}
                  onChange={(e) => setTransferTargetCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
              </label>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Depois de criada, a transferência ficará pendente até o destinatário
                aceitar ou recusar.
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transferSubmitting ? "Enviando..." : "Criar transferência"}
                </button>

                <button
                  type="button"
                  onClick={closeTransferModal}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {producerTicketOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <form
            onSubmit={handleSubmitProducerTicket}
            className="w-full max-w-2xl rounded-[30px] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Atendimento
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Falar com o produtor
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Descreva sua dúvida para abrir um atendimento vinculado ao registro.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProducerTicketOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Assunto</span>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Mensagem</span>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  rows={6}
                  placeholder="Explique o que aconteceu..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creatingSupportThread}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingSupportThread ? "Abrindo..." : "Abrir atendimento"}
                </button>

                <button
                  type="button"
                  onClick={() => setProducerTicketOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}