"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderDetails = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  status?: string;
  totalAmount?: string | number;
  createdAt?: string;
  updatedAt?: string;
  items?: Array<{
    id: string;
    quantity?: number;
    unitPrice?: string | number;
    totalPrice?: string | number;
    ticketType?: {
      id: string;
      name?: string;
      description?: string;
      event?: {
        id: string;
        name?: string;
      };
    };
    tickets?: Array<{
      id: string;
      code?: string;
      status?: string;
      holderName?: string;
      holderEmail?: string;
      createdAt?: string;
      checkins?: Array<{
        id: string;
        checkedAt?: string;
      }>;
    }>;
  }>;
  payments?: Array<{
    id: string;
    amount?: string | number;
    method?: string;
    status?: string;
    createdAt?: string;
  }>;
};

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = String(params.id);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/v1/orders/${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          alert(
            typeof result?.message === "string"
              ? result.message
              : "Erro ao carregar pedido",
          );
          return;
        }

        setOrder(result);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  async function handleCancelOrder() {
    if (!order) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja cancelar este pedido?",
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setCanceling(true);

    try {
      const res = await fetch(
        `http://localhost:3001/v1/orders/${order.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : JSON.stringify(result),
        );
        return;
      }

      alert("Pedido cancelado com sucesso 🚫");

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: result?.order?.status || result?.status || "CANCELED",
            }
          : prev,
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setCanceling(false);
    }
  }

  async function handleCheckin(ticketId: string, code?: string) {
    if (!code) {
      alert("Ticket sem código");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setCheckingInId(ticketId);

    try {
      const res = await fetch("http://localhost:3001/v1/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : JSON.stringify(result),
        );
        return;
      }

      alert("Check-in realizado com sucesso ✅");

      setOrder((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          items: prev.items?.map((item) => ({
            ...item,
            tickets: item.tickets?.map((ticket) =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    status: "USED",
                    checkins: [
                      {
                        id: result?.checkin?.id || crypto.randomUUID(),
                        checkedAt: result?.checkin?.checkedAt || new Date().toISOString(),
                      },
                      ...(ticket.checkins || []),
                    ],
                  }
                : ticket,
            ),
          })),
        };
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setCheckingInId(null);
    }
  }

  const eventName = useMemo(() => {
    return order?.items?.[0]?.ticketType?.event?.name || "-";
  }, [order]);

  const eventId = useMemo(() => {
    return order?.items?.[0]?.ticketType?.event?.id || "";
  }, [order]);

  function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("pt-BR");
  }

  function getLastCheckin(ticket?: {
    checkins?: Array<{ checkedAt?: string }>;
  }) {
    return ticket?.checkins?.[0]?.checkedAt
      ? formatDate(ticket.checkins[0].checkedAt)
      : "-";
  }

  function canRegisterPayment() {
    return order?.status !== "PAID" && order?.status !== "CANCELED";
  }

  function canCancel() {
    return order?.status !== "CANCELED";
  }

  function canCheckin(ticket?: { status?: string }) {
    return order?.status === "PAID" && ticket?.status === "AVAILABLE";
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Carregando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Pedido não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Detalhe do pedido 🧾</h1>
            <p className="text-gray-600 mt-1">
              Visualize tudo sobre uma compra
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={eventId ? `/events/${eventId}` : "/orders"}
              className="bg-white border px-4 py-2 rounded"
            >
              Voltar
            </Link>

            {canRegisterPayment() && (
              <Link
                href={`/orders/${order.id}/payment`}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Registrar pagamento
              </Link>
            )}

            {canCancel() && (
              <button
                onClick={handleCancelOrder}
                disabled={canceling}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                {canceling ? "Cancelando..." : "Cancelar pedido"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow p-6 xl:col-span-2">
          <h2 className="text-xl font-bold mb-4">Resumo do pedido</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p>
              <strong>ID:</strong> {order.id}
            </p>
            <p>
              <strong>Status:</strong> {order.status || "-"}
            </p>
            <p>
              <strong>Cliente:</strong> {order.customerName || "-"}
            </p>
            <p>
              <strong>Email:</strong> {order.customerEmail || "-"}
            </p>
            <p>
              <strong>Evento:</strong> {eventName}
            </p>
            <p>
              <strong>Total:</strong> {order.totalAmount ?? "-"}
            </p>
            <p>
              <strong>Criado em:</strong> {formatDate(order.createdAt)}
            </p>
            <p>
              <strong>Atualizado em:</strong> {formatDate(order.updatedAt)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Pagamentos</h2>

          {order.payments && order.payments.length > 0 ? (
            <div className="space-y-3">
              {order.payments.map((payment) => (
                <div key={payment.id} className="border rounded-xl p-4 text-sm">
                  <p>
                    <strong>Método:</strong> {payment.method || "-"}
                  </p>
                  <p>
                    <strong>Valor:</strong> {payment.amount ?? "-"}
                  </p>
                  <p>
                    <strong>Status:</strong> {payment.status || "-"}
                  </p>
                  <p>
                    <strong>Data:</strong> {formatDate(payment.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>Nenhum pagamento registrado.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Itens do pedido</h2>

        {!order.items || order.items.length === 0 ? (
          <p>Nenhum item encontrado.</p>
        ) : (
          <div className="space-y-6">
            {order.items.map((item) => (
              <div key={item.id} className="border rounded-2xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                  <p>
                    <strong>Ingresso:</strong> {item.ticketType?.name || "-"}
                  </p>
                  <p>
                    <strong>Quantidade:</strong> {item.quantity ?? "-"}
                  </p>
                  <p>
                    <strong>Preço unitário:</strong> {item.unitPrice ?? "-"}
                  </p>
                  <p>
                    <strong>Total do item:</strong> {item.totalPrice ?? "-"}
                  </p>
                </div>

                <h3 className="font-semibold mb-3">Tickets gerados</h3>

                {!item.tickets || item.tickets.length === 0 ? (
                  <p>Nenhum ticket gerado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-3">Código</th>
                          <th className="py-3">Status</th>
                          <th className="py-3">Titular</th>
                          <th className="py-3">Email</th>
                          <th className="py-3">Último check-in</th>
                          <th className="py-3">Criado em</th>
                          <th className="py-3">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.tickets.map((ticket) => (
                          <tr key={ticket.id} className="border-b align-top">
                            <td className="py-3 font-mono text-sm">
                              {ticket.code || "-"}
                            </td>
                            <td className="py-3">{ticket.status || "-"}</td>
                            <td className="py-3">{ticket.holderName || "-"}</td>
                            <td className="py-3">{ticket.holderEmail || "-"}</td>
                            <td className="py-3">{getLastCheckin(ticket)}</td>
                            <td className="py-3">
                              {formatDate(ticket.createdAt)}
                            </td>
                            <td className="py-3">
                              {canCheckin(ticket) ? (
                                <button
                                  onClick={() =>
                                    handleCheckin(ticket.id, ticket.code)
                                  }
                                  disabled={checkingInId === ticket.id}
                                  className="bg-black text-white px-3 py-2 rounded"
                                >
                                  {checkingInId === ticket.id
                                    ? "Validando..."
                                    : "Fazer check-in"}
                                </button>
                              ) : (
                                <span className="text-gray-400">
                                  Sem ação
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}