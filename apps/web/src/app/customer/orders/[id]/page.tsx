"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  sectorMapImageUrl?: string;
  gallery?: string[];
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
    media?: EventMedia | null;
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
      media?: EventMedia | null;
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
    month: "short",
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
  if (ms === null || ms === undefined) return "text-slate-700";
  if (ms <= 5 * 60 * 1000) return "text-rose-600";

  return "text-emerald-600";
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

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
  const normalized = String(status || "").toUpperCase();

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

  if (normalized === "RETURNED" || normalized === "TRANSFERRED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "UNAVAILABLE" || normalized === "USED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (normalized === "CANCELED" || normalized === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "CREDITED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "REFUND_REQUESTED") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

function normalizeCancelMode(mode: "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80") {
  if (mode === "PENDING_SIMPLE") {
    return {
      title: "Cancelar pedido pendente",
      confirm: "Deseja cancelar este pedido pendente?",
      description: "O pedido será cancelado sem estorno, pois ainda não foi pago.",
    };
  }

  if (mode === "REFUND_70") {
    return {
      title: "Solicitar reembolso",
      confirm: "Deseja solicitar reembolso de 70%?",
      description: "O pedido será marcado com solicitação de reembolso.",
    };
  }

  return {
    title: "Receber crédito na wallet",
    confirm: "Deseja receber 80% em crédito na wallet?",
    description: "O valor aprovado será convertido em crédito na wallet.",
  };
}

function SmallInfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
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
  const entityId = isTransferPage
    ? rawRouteId.replace("transfer_", "")
    : rawRouteId;
  const currentUserId = currentUser?.id || null;

  const orderItems = order?.items || [];
  const payments = order?.payments || [];
  const cancellations = order?.cancellations || [];

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
    return isTransferPage && String(transfer?.status || "").toUpperCase() === "RETURNED";
  }

  function canTransferTicket(ticket?: TicketItem | null) {
    if (!ticket || !currentUserId) return false;

    return ticket.currentOwnerUserId === currentUserId && ticket.status === "AVAILABLE";
  }

  function getTicketVisualStatus(ticket?: TicketItem | null) {
    if (!ticket) return "SEM STATUS";
    if (isTicketTransferredAway(ticket)) return "TRANSFERRED";

    return ticket.status || "SEM STATUS";
  }

  function getDisplayedTicketStatus(ticket?: TicketItem | null) {
    if (isReturnedTransferRecord()) return "UNAVAILABLE";

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

  function getEventImageFromMedia(media?: EventMedia | null) {
    return (
      media?.bannerImageUrl ||
      media?.coverImageUrl ||
      media?.mobileBannerUrl ||
      media?.thumbnailUrl ||
      media?.gallery?.[0] ||
      ""
    );
  }

  function getCurrentEventImage() {
    if (isTransferPage) {
      return getEventImageFromMedia(transfer?.order?.event?.media);
    }

    return getEventImageFromMedia(order?.event?.media);
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
    payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0) || 0;

  const totalAmount = isTransferPage ? 0 : toNumber(order?.totalAmount);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);

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

  function buildTicketPayload(ticket: TicketItem) {
    const payload = {
      ticketId: ticket.id,
      code: ticket.code || ticket.id,
      orderId: isTransferPage ? transfer?.order?.id : order?.id,
      eventId: isTransferPage ? transfer?.order?.event?.id : order?.event?.id,
      eventName: getEventName(),
      holderName: ticket.holderName || "",
      holderCpf: onlyDigits(ticket.holderCpf),
      status: getDisplayedTicketStatus(ticket),
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify(payload);
  }

  function handlePrintDigitalTicket() {
    window.print();
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

    if (cpf.length !== 11) {
      alert("Informe o CPF do destinatário com 11 dígitos");
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

      alert("Pagamento confirmado com sucesso");
      await loadData();
    } catch (error) {
      console.error("FINISH PAYMENT ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancelOrder(mode: "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80") {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!order?.id) {
      alert("Pedido inválido");
      return;
    }

    const info = normalizeCancelMode(mode);
    const confirmed = window.confirm(info.confirm);

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
          body: JSON.stringify({
            mode,
            reason: info.title,
          }),
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

      alert("Pedido atualizado com sucesso");
      await loadData();
    } catch (error) {
      console.error("CANCEL ORDER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingOrderMode("");
    }
  }

  async function handleCancelTicket(
    ticket: TicketItem,
    mode: "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80",
  ) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!ticket?.id) {
      alert("Ingresso inválido");
      return;
    }

    const info = normalizeCancelMode(mode);
    const confirmed = window.confirm(
      `${info.confirm}\n\nIngresso: ${ticket.code || ticket.id}`,
    );

    if (!confirmed) return;

    setCancelingTicketMode(mode);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/tickets/${ticket.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode,
            reason: info.title,
          }),
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

      alert("Ingresso atualizado com sucesso");
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      console.error("CANCEL TICKET ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingTicketMode("");
    }
  }

  async function handleCreateSupportThread(e: FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const supportOrderId = isTransferPage ? transfer?.order?.id : order?.id;

    if (!supportOrderId) {
      alert("Pedido não encontrado para abrir suporte");
      return;
    }

    if (ticketSubject.trim().length < 3) {
      alert("Informe um assunto com pelo menos 3 caracteres");
      return;
    }

    if (ticketMessage.trim().length < 3) {
      alert("Informe uma mensagem com pelo menos 3 caracteres");
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
          orderId: supportOrderId,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
        }),
      });

      const data: SupportThreadResponse = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao falar com o produtor",
        );
        return;
      }

      alert("Solicitação enviada com sucesso");
      setProducerTicketOpen(false);
      setTicketSubject("");
      setTicketMessage("");

      if (data.id) {
        window.location.href = `/customer/support/${data.id}`;
      }
    } catch (error) {
      console.error("CREATE SUPPORT THREAD ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCreatingSupportThread(false);
    }
  }

  const ticketTypeByTicketId = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of orderItems) {
      for (const ticket of item.tickets || []) {
        map.set(ticket.id, item.ticketType?.name || "Ingresso");
      }
    }

    if (transfer?.ticket?.id) {
      map.set(
        transfer.ticket.id,
        transfer.ticket.orderItem?.ticketType?.name || "Ingresso transferido",
      );
    }

    return map;
  }, [orderItems, transfer]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <section className={cardClass()}>
            <p className="text-sm font-semibold text-slate-700">
              Carregando detalhes...
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!order && !transfer) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <section className={cardClass()}>
            <p className="text-sm font-semibold text-slate-700">
              Pedido não encontrado.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const currentEventImage = getCurrentEventImage();

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <div className="mx-auto max-w-[1180px] px-4 pb-14 pt-7">
        <section className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Página inicial
          </button>
          <span>&gt;</span>
          <button
            type="button"
            onClick={() => goTo("/customer/orders")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Meus pedidos
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">
            {isTransferPage ? "Transferência" : "Detalhes do pedido"}
          </span>
        </section>

        <section className="overflow-hidden rounded-[30px] bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_390px]">
            <div className="relative min-h-[280px] overflow-hidden bg-slate-950 p-7 text-white md:p-9">
              {currentEventImage ? (
                <img
                  src={currentEventImage}
                  alt={getEventName()}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800" />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/30" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_30%)]" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                    {isTransferPage ? "Transferência" : "Detalhes do pedido"}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClasses(
                      isTransferPage ? transfer?.status : order?.status,
                    )}`}
                  >
                    {getStatusLabel(isTransferPage ? transfer?.status : order?.status)}
                  </span>
                </div>

                <h1 className="mt-5 max-w-3xl text-[36px] font-black leading-tight md:text-[54px]">
                  {getEventName()}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90">
                  {getEventDescription()}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goTo(getBackPath())}
                    className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
                  >
                    {isTransferPage ? "Voltar para meus pedidos" : "Ir para evento"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProducerTicketOpen(true)}
                    className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20"
                  >
                    Falar com o produtor
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-3 p-5 md:p-6">
              {isPendingOrder ? (
                <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Tempo restante
                  </p>
                  <p
                    className={`mt-2 text-4xl font-black ${getCountdownNumberClass(
                      timeLeftMs,
                    )}`}
                  >
                    {formatCountdown(timeLeftMs)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Finalize o pagamento antes do cronômetro zerar.
                  </p>
                </div>
              ) : null}

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Registro
                </p>
                <p className="mt-2 break-all text-sm font-black text-slate-950">
                  {isTransferPage ? transfer?.id : order?.id}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Data do evento
                </p>
                <p className="mt-2 text-sm font-black text-slate-950">
                  {formatDate(getEventDate())}
                </p>
              </div>

              {!isTransferPage ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Comprador
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {order?.customerName || "-"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {order?.customerEmail || "-"}
                  </p>
                </div>
              ) : (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Transferência
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    De: {transfer?.fromName || transfer?.fromUser?.name || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Para: {transfer?.toName || transfer?.toUser?.name || "-"}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <SmallInfoCard
            label="Status"
            value={getStatusLabel(isTransferPage ? transfer?.status : order?.status)}
            detail="Estado atual do registro"
          />

          <SmallInfoCard
            label="Ingressos"
            value={String(totalTickets)}
            detail={showReleasedTickets ? "Liberados para consulta" : "Liberam após pagamento"}
          />

          <SmallInfoCard
            label="Valor total"
            value={isTransferPage ? "R$ 0,00" : formatMoney(order?.totalAmount)}
            detail={isTransferPage ? "Recebido por transferência" : "Valor do pedido"}
          />

          <SmallInfoCard
            label="Valor pago"
            value={isTransferPage ? "R$ 0,00" : formatMoney(totalPaid)}
            detail={!isTransferPage && remainingAmount > 0 ? `${formatMoney(remainingAmount)} restante` : "Sem pendência"}
          />
        </section>

        <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className={cardClass()}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {showReleasedTickets ? "Ingressos" : "Itens do pedido"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {showReleasedTickets
                      ? "Veja os ingressos liberados, titulares, código e ações disponíveis."
                      : "Os ingressos deste pedido serão liberados após a confirmação do pagamento."}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                    isTransferPage ? transfer?.status : order?.status,
                  )}`}
                >
                  {getStatusLabel(isTransferPage ? transfer?.status : order?.status)}
                </span>
              </div>

              {!showReleasedTickets ? (
                <div className="mt-6 space-y-4">
                  {orderItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-[22px] border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Item {index + 1}
                          </p>
                          <h3 className="mt-2 text-xl font-black text-slate-950">
                            {item.ticketType?.name || "Ingresso"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Quantidade: {item.quantity || item.tickets?.length || 0}
                          </p>
                        </div>

                        <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Total
                          </p>
                          <p className="mt-1 text-lg font-black text-slate-950">
                            {formatMoney(item.totalPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Os ingressos deste item serão liberados somente após a
                        confirmação do pagamento.
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {flattenedTickets.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Nenhum ingresso encontrado.
                    </div>
                  ) : (
                    flattenedTickets.map((ticket, index) => {
                      const status = getDisplayedTicketStatus(ticket);
                      const ticketTypeName = ticketTypeByTicketId.get(ticket.id) || "Ingresso";

                      return (
                        <div
                          key={ticket.id}
                          className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                Ingresso {index + 1}
                              </p>
                              <h3 className="mt-2 text-xl font-black text-slate-950">
                                {ticketTypeName}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                Titular: {ticket.holderName || "-"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                CPF: {formatCpf(ticket.holderCpf)}
                              </p>
                            </div>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                                status,
                              )}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="rounded-[16px] bg-slate-50 p-4">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Código
                              </p>
                              <p className="mt-1 break-all text-sm font-black text-slate-950">
                                {ticket.code || ticket.id}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenTicket(ticket)}
                                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
                              >
                                Ver ingresso
                              </button>

                              <button
                                type="button"
                                onClick={() => copyTicketCode(ticket.code || ticket.id)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Copiar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>

            {!isTransferPage && payments.length > 0 ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">Pagamentos</h2>

                <div className="mt-5 space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="grid gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-black text-slate-950">
                          {payment.method || "Pagamento"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Criado em {formatDate(payment.createdAt)}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-black text-slate-950">
                          {formatMoney(payment.amount)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${getStatusClasses(
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

            {!isTransferPage && cancellations.length > 0 ? (
              <section className={cardClass()}>
                <h2 className="text-2xl font-black text-slate-950">
                  Cancelamentos e créditos
                </h2>

                <div className="mt-5 space-y-3">
                  {cancellations.map((cancellation) => (
                    <div
                      key={cancellation.id}
                      className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">
                            {cancellation.mode || "Solicitação"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Criado em {formatDate(cancellation.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                            cancellation.status,
                          )}`}
                        >
                          {getStatusLabel(cancellation.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[16px] bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Valor original
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMoney(cancellation.originalAmount)}
                          </p>
                        </div>

                        <div className="rounded-[16px] bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Valor retornado
                          </p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMoney(cancellation.returnedAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className={cardClass()}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Ações rápidas
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Gerenciar
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Escolha uma ação disponível para este registro.
              </p>

              <div className="mt-6 space-y-3">
                {isPendingOrder ? (
                  <>
                    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Tempo restante
                      </p>
                      <p
                        className={`mt-2 text-3xl font-black ${getCountdownNumberClass(
                          timeLeftMs,
                        )}`}
                      >
                        {formatCountdown(timeLeftMs)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pague antes do cronômetro zerar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinishPayment}
                      disabled={paying || isPendingCountdownExpired}
                      className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {paying ? "Finalizando..." : "Finalizar pagamento"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelOrder("PENDING_SIMPLE")}
                      disabled={!!cancelingOrderMode}
                      className="w-full rounded-xl border border-rose-200 bg-white px-5 py-4 text-sm font-black text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                      onClick={() => handleCancelOrder("REFUND_70")}
                      disabled={!!cancelingOrderMode}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-black text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Solicitar reembolso 70%
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelOrder("WALLET_80")}
                      disabled={!!cancelingOrderMode}
                      className="w-full rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-black text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Receber 80% na wallet
                    </button>
                  </>
                ) : null}

                {canAcceptTransfer ? (
                  <button
                    type="button"
                    onClick={handleAcceptTransfer}
                    disabled={!!transferActionLoading}
                    className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    disabled={!!transferActionLoading}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                    disabled={!!transferActionLoading}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-black text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferActionLoading === "CANCEL"
                      ? "Cancelando..."
                      : "Cancelar transferência"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setProducerTicketOpen(true)}
                  className="w-full rounded-xl border border-sky-200 bg-white px-5 py-4 text-sm font-black text-sky-700 hover:bg-sky-50"
                >
                  Falar com o produtor
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Voltar para meus pedidos
                </button>
              </div>
            </section>

            {!isTransferPage ? (
              <section className={cardClass()}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Financeiro
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total do pedido</span>
                    <span className="font-black text-slate-950">
                      {formatMoney(order?.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Valor pago</span>
                    <span className="font-black text-emerald-700">
                      {formatMoney(totalPaid)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-slate-500">Restante</span>
                    <span className="font-black text-slate-950">
                      {formatMoney(remainingAmount)}
                    </span>
                  </div>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </div>

      {selectedTicket ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
    <div className="max-h-[94vh] w-full max-w-[880px] overflow-y-auto rounded-[34px] bg-white shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
      <div className="relative overflow-hidden rounded-t-[34px] bg-slate-950 text-white print:rounded-none">
        {currentEventImage ? (
          <img
            src={currentEventImage}
            alt={getEventName()}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.26),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                Ingresso digital
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                {ticketTypeByTicketId.get(selectedTicket.id) || "Ingresso"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/90 md:text-base">
                {getEventName()}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-black text-white shadow-sm">
                  {formatDate(getEventDate())}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-xl font-black text-white shadow-sm transition hover:bg-white/25 print:hidden"
              aria-label="Fechar ingresso"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="grid bg-white md:grid-cols-[350px_1fr]">
        <section className="border-b border-slate-200 bg-slate-50 p-6 md:border-b-0 md:border-r">
          <div className="mx-auto max-w-[286px]">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  QR Code
                </p>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                  Válido
                </span>
              </div>

              <div className="mt-4 flex justify-center rounded-[24px] bg-white p-3">
                <QRCodeSVG
                  value={buildTicketPayload(selectedTicket)}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Código do ingresso
              </p>

              <p className="mt-3 break-all text-base font-black leading-6 text-slate-950">
                {selectedTicket.code || selectedTicket.id}
              </p>
            </div>

            <div className="mt-5 rounded-[22px] border border-sky-100 bg-sky-50 p-4 text-center">
              <p className="text-xs font-semibold leading-5 text-sky-800">
                Apresente este QR Code na entrada do evento. Ele é único e fica
                vinculado ao titular do ingresso.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 md:p-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Dados do titular
            </p>

            <div className="mt-6 grid gap-4">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Nome
                </p>

                <p className="mt-3 text-3xl font-black leading-tight text-slate-950">
                  {selectedTicket.holderName || "-"}
                </p>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  CPF
                </p>

                <p className="mt-3 text-2xl font-black leading-tight text-slate-950">
                  {formatCpf(selectedTicket.holderCpf)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base font-black text-amber-800">
                !
              </span>

              <div>
                <p className="text-sm font-black text-amber-950">
                  Proteja seu ingresso
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Não compartilhe este QR Code publicamente. Se o ingresso for
                  transferido ou cancelado, o acesso pode mudar automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 print:hidden md:grid-cols-2">
            <button
              type="button"
              onClick={() => copyTicketCode(selectedTicket.code || selectedTicket.id)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Copiar código
            </button>

            <button
              type="button"
              onClick={handlePrintDigitalTicket}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              Imprimir ingresso
            </button>

            {canTransferTicket(selectedTicket) ? (
              <button
                type="button"
                onClick={() => openTransferModal(selectedTicket)}
                className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 shadow-sm transition hover:bg-sky-100"
              >
                Transferir ingresso
              </button>
            ) : null}

            {isReturnOnlyTicket(selectedTicket) ? (
              <button
                type="button"
                onClick={() => handleReturnTicket(selectedTicket)}
                disabled={returningTicket}
                className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {returningTicket ? "Devolvendo..." : "Devolver ingresso"}
              </button>
            ) : null}

            {isPaidOrder && selectedTicket.status === "AVAILABLE" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCancelTicket(selectedTicket, "REFUND_70")}
                  disabled={!!cancelingTicketMode}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-black text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reembolso 70%
                </button>

                <button
                  type="button"
                  onClick={() => handleCancelTicket(selectedTicket, "WALLET_80")}
                  disabled={!!cancelingTicketMode}
                  className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Crédito 80%
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  </div>
) : null}

      {transferModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form
            onSubmit={handleSubmitTransfer}
            className="w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Transferência
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Enviar ingresso
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Informe o CPF da pessoa que receberá este ingresso.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTransferModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                CPF do destinatário
              </label>
              <input
                value={transferTargetCpf}
                onChange={(event) => setTransferTargetCpf(formatCpf(event.target.value))}
                maxLength={14}
                inputMode="numeric"
                placeholder="000.000.000-00"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={transferSubmitting}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {transferSubmitting ? "Enviando..." : "Criar transferência"}
            </button>
          </form>
        </div>
      ) : null}

      {producerTicketOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form
            onSubmit={handleCreateSupportThread}
            className="w-full max-w-[620px] rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Suporte
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Falar com o produtor
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Abra uma solicitação vinculada a este pedido.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProducerTicketOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Assunto
              </label>
              <input
                value={ticketSubject}
                onChange={(event) => setTicketSubject(event.target.value)}
                placeholder="Ex: Dúvida sobre meu ingresso"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Mensagem
              </label>
              <textarea
                value={ticketMessage}
                onChange={(event) => setTicketMessage(event.target.value)}
                rows={5}
                placeholder="Descreva sua solicitação..."
                className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={creatingSupportThread}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creatingSupportThread ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}