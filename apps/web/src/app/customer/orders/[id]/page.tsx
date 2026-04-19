"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TicketItem = {
  id: string;
  code?: string;
  status?: string;
  holderName?: string;
  holderEmail?: string;
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

type OrderItem = {
  id: string;
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
  };
  items?: OrderItemEntry[];
  payments?: PaymentItem[];
  cancellations?: CancellationItem[];
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

function getStatusClasses(status?: string) {
  if (status === "PAID") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "PENDING") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "CANCELED") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  if (status === "USED") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  if (status === "ACTIVE" || status === "AVAILABLE") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
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

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function getInitial(user: StoredUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

export default function CustomerOrderDetailPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelingOrderMode, setCancelingOrderMode] = useState<
    "" | "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80"
  >("");
  const [cancelingTicketMode, setCancelingTicketMode] = useState<
    "" | "PENDING_SIMPLE" | "REFUND_70" | "WALLET_80"
  >("");

  const orderId = useMemo(() => {
    if (typeof window === "undefined") return "";

    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  async function loadOrder(orderIdParam: string) {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!orderIdParam) {
      alert("Pedido inválido");
      window.location.href = "/customer/orders";
      return;
    }

    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser) as StoredUser;
        setUser(parsedUser);
      } catch (error) {
        console.error("Erro ao ler usuário do localStorage:", error);
      }
    }

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/customer/${orderIdParam}`,
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
            : "Erro ao carregar pedido",
        );
        window.location.href = "/customer/orders";
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error("CUSTOMER ORDER DETAIL ERROR:", error);
      alert("Erro ao conectar com a API");
      window.location.href = "/customer/orders";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder(orderId);
  }, [orderId]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function goTo(path: string) {
    window.location.href = path;
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
      await loadOrder(order.id);
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
      await loadOrder(order.id);
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
      await loadOrder(order.id);
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

      if (order?.id) {
        await loadOrder(order.id);
      }
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
      if (order?.id) {
        await loadOrder(order.id);
      }
    } catch (error) {
      console.error("CANCEL TICKET ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCancelingTicketMode("");
    }
  }

  function handleTalkToProducer() {
    alert("Contato com o produtor vamos ligar no próximo passo.");
  }

  function handleTransferTicket() {
    alert("Transferência de ingresso vamos implementar no próximo passo.");
  }

  function handlePrintTicket(ticket: TicketItem) {
    const eventName = order?.event?.name || "Ingresso";
    const eventDate = formatDate(order?.event?.eventDate);
    const holderName = ticket.holderName || order?.customerName || "-";
    const holderEmail = ticket.holderEmail || order?.customerEmail || "-";
    const code = ticket.code || "-";
    const status = ticket.status || "-";

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
              <div>Ingresso</div>
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

  function handlePrintOrder() {
    if (!order) return;

    const eventName = order.event?.name || "Pedido";
    const eventDate = formatDate(order.event?.eventDate);
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
              <div>Relatório do pedido</div>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando pedido...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Pedido não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const paidPayments = (order.payments || []).filter(
    (payment) => payment.status === "PAID",
  );

  const walletPaid = paidPayments
    .filter((payment) => String(payment.method || "").toUpperCase() === "WALLET")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const externalPaid = paidPayments
    .filter((payment) => String(payment.method || "").toUpperCase() !== "WALLET")
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const totalPaid = walletPaid + externalPaid;
  const totalAmountNumber = toNumber(order.totalAmount);
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

  const showTickets = order.status !== "PENDING";
  const activeTicketsCount =
    order.items?.reduce((sum, item) => {
      const count =
        item.tickets?.filter((ticket) => ticket.status !== "CANCELED").length ||
        0;
      return sum + count;
    }, 0) || 0;

  const isPendingOrder = order.status === "PENDING";
  const isPaidOrder = order.status === "PAID";

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
          >
            Sympla
          </button>

          <nav className="ml-auto hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="text-sm font-semibold text-sky-600"
            >
              Meus pedidos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/wallet")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Wallet
            </button>
          </nav>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-12 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 shadow-sm hover:bg-gray-50"
            >
              <span className="text-lg">☰</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {getInitial(user)}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="mt-1 text-xs break-all text-gray-500">
                    {user?.email || "-"}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => goTo("/customer/dashboard")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Início
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/orders")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus pedidos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/tickets")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus ingressos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/wallet")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Wallet
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 text-white shadow-sm">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="block w-full px-8 pt-8 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              Evento
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              {order.event?.name || "Evento sem nome"}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
              {order.event?.description ||
                "Abra o evento novamente para ver mais detalhes ou comprar outros ingressos."}
            </p>
          </button>

          <div className="flex flex-wrap gap-3 px-8 pb-8 pt-6">
            <button
              type="button"
              onClick={() => goTo("/customer/dashboard")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
            >
              Ver evento
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Voltar para meus pedidos
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Status do pedido</p>
            <div className="mt-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  order.status,
                )}`}
              >
                {order.status || "SEM STATUS"}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500">{paymentJourneyLabel}</p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total da compra</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {formatMoney(order.totalAmount)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total já pago</p>
            <h2 className="mt-3 text-3xl font-black text-emerald-600">
              {formatMoney(totalPaid)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Valor restante</p>
            <h2 className="mt-3 text-3xl font-black text-amber-600">
              {formatMoney(remainingAmount)}
            </h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Relatório da compra
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Pedido</p>
                  <p className="mt-2 font-semibold text-gray-900 break-all">
                    #{order.id}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Compra realizada em</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Comprador</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {order.customerName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="mt-2 break-all font-semibold text-gray-900">
                    {order.customerEmail || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <p className="text-sm text-gray-500">Data do evento</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(order.event?.eventDate)}
                  </p>
                </div>
              </div>
            </div>

            {showTickets ? (
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900">
                  Ingressos deste pedido
                </h2>

                <div className="mt-5 space-y-5">
                  {order.items?.length ? (
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
                            {item.tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="rounded-[24px] border border-gray-200 bg-white p-5"
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                          ticket.status,
                                        )}`}
                                      >
                                        {ticket.status || "SEM STATUS"}
                                      </span>
                                    </div>

                                    <p className="mt-4 text-sm text-gray-500">
                                      Código do ingresso
                                    </p>
                                    <p className="mt-1 break-all font-mono text-sm font-semibold text-gray-900">
                                      {ticket.code || "-"}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTicket(ticket)}
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
                                </div>
                              </div>
                            ))}
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

                {order.payments?.length ? (
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

                {remainingAmount > 0 && order.status !== "CANCELED" ? (
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

                {remainingAmount === 0 && order.status === "PAID" ? (
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
                  onClick={handlePrintOrder}
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
                  <span className="text-lg">✉️</span>
                  <span>Fale com o produtor</span>
                </button>

                {order.status !== "CANCELED" && isPendingOrder ? (
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

                {order.status !== "CANCELED" && isPaidOrder ? (
                  <>
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                      Pedido pago: você pode cancelar com 80% na wallet ou 70%
                      de estorno.
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

                {order.status === "CANCELED" ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    Este pedido já está cancelado.
                  </div>
                ) : null}
              </div>
            </div>

            {order.cancellations?.length ? (
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
      </main>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                    Visualização do ingresso
                  </p>
                  <h3 className="mt-3 text-3xl font-black">
                    {order.event?.name || "Ingresso"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-[24px] bg-gray-50 p-5">
                <p className="text-sm text-gray-500">Código</p>
                <p className="mt-2 break-all font-mono text-sm font-semibold text-gray-900">
                  {selectedTicket.code || "-"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        selectedTicket.status,
                      )}`}
                    >
                      {selectedTicket.status || "SEM STATUS"}
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Data do evento</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formatDate(order.event?.eventDate)}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] bg-gray-50 p-5">
                <p className="text-sm text-gray-500">Titular</p>
                <p className="mt-2 font-semibold text-gray-900">
                  {selectedTicket.holderName || order.customerName || "-"}
                </p>
                <p className="mt-1 text-sm text-gray-500 break-all">
                  {selectedTicket.holderEmail || order.customerEmail || "-"}
                </p>
              </div>

              <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                <h4 className="text-base font-bold text-gray-900">
                  Opções do ingresso
                </h4>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => handlePrintTicket(selectedTicket)}
                    className="flex w-full items-center gap-3 text-left text-sm font-semibold text-sky-600 hover:text-sky-700"
                  >
                    <span className="text-lg">🖨️</span>
                    <span>IMPRIMIR INGRESSO</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTransferTicket}
                    className="flex w-full items-center gap-3 text-left text-sm font-semibold text-sky-600 hover:text-sky-700"
                  >
                    <span className="text-lg">🎫</span>
                    <span>TRANSFERIR INGRESSO</span>
                  </button>

                  {selectedTicket.status !== "CANCELED" &&
                  order.status !== "CANCELED" &&
                  isPendingOrder ? (
                    <button
                      type="button"
                      onClick={handleCancelTicketPending}
                      disabled={cancelingTicketMode !== ""}
                      className="flex w-full items-center gap-3 text-left text-sm font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="text-lg">❌</span>
                      <span>
                        {cancelingTicketMode === "PENDING_SIMPLE"
                          ? "CANCELANDO INGRESSO..."
                          : "CANCELAR INGRESSO"}
                      </span>
                    </button>
                  ) : null}

                  {selectedTicket.status !== "CANCELED" &&
                  order.status !== "CANCELED" &&
                  isPaidOrder ? (
                    <>
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                        Ingresso pago: você pode cancelar com 80% na wallet ou
                        70% de estorno.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancelTicket("REFUND_70")}
                        disabled={cancelingTicketMode !== ""}
                        className="flex w-full items-center gap-3 text-left text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">↩️</span>
                        <span>
                          {cancelingTicketMode === "REFUND_70"
                            ? "CANCELANDO INGRESSO..."
                            : "CANCELAR COM 70% DE ESTORNO"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancelTicket("WALLET_80")}
                        disabled={cancelingTicketMode !== ""}
                        className="flex w-full items-center gap-3 text-left text-sm font-semibold text-violet-600 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="text-lg">👛</span>
                        <span>
                          {cancelingTicketMode === "WALLET_80"
                            ? "CANCELANDO INGRESSO..."
                            : "CANCELAR COM 80% NA WALLET"}
                        </span>
                      </button>
                    </>
                  ) : null}

                  {selectedTicket.status === "CANCELED" || order.status === "CANCELED" ? (
                    <div className="text-sm font-semibold text-gray-500">
                      Este ingresso não pode mais ser cancelado.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => copyTicketCode(selectedTicket.code)}
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Copiar código
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}