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
  event?: {
    id: string;
    name?: string;
  };
  items?: Array<{
    id: string;
    quantity?: number;
    ticketType?: {
      id: string;
      name?: string;
      price?: string | number;
    };
    tickets?: Array<{
      id: string;
      code?: string;
      status?: string;
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

export default function OrderPaymentPage() {
  const params = useParams();
  const orderId = String(params.id);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [method, setMethod] = useState("PIX");
  const [amount, setAmount] = useState("");

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
          alert(typeof result?.message === "string" ? result.message : "Erro ao carregar pedido");
          return;
        }

        setOrder(result);
        setAmount(String(result?.totalAmount ?? ""));
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  const totalTickets = useMemo(() => {
    if (!order?.items?.length) return 0;

    return order.items.reduce((sum, item) => sum + (item.tickets?.length || 0), 0);
  }, [order]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!amount.trim()) {
      alert("Informe o valor do pagamento");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          amount: amount.replace(",", "."),
          method,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(typeof result?.message === "string" ? result.message : JSON.stringify(result));
        return;
      }

      alert("Pagamento registrado com sucesso 💳");

      if (order?.event?.id) {
        window.location.href = `/events/${order.event.id}`;
      } else {
        window.location.href = `/orders/${orderId}`;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Carregando pagamento...</p>
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
        <h1 className="text-3xl font-bold">Registrar pagamento 💳</h1>
        <p className="text-gray-600 mt-1">
          Pedido <strong>{order.id}</strong>
        </p>
        <p className="text-gray-600 mt-1">
          Evento: <strong>{order.event?.name || "-"}</strong>
        </p>
      </div>

      {order.status === "PAID" ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-700">
            Este pedido já está pago.
          </p>
        </div>
      ) : order.status === "CANCELED" ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700">
            Não é possível pagar um pedido cancelado.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow">
          <div>
            <label className="block text-sm font-medium mb-2">
              Método de pagamento
            </label>
            <select
              className="w-full border rounded p-3"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="PIX">PIX</option>
              <option value="CARD">Cartão</option>
              <option value="CASH">Dinheiro</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Valor</label>
            <input
              type="text"
              className="w-full border rounded p-3"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 160.00"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-5 py-3 rounded w-full"
          >
            {saving ? "Salvando..." : "Confirmar pagamento"}
          </button>
        </form>
      )}
    </div>
  );
}