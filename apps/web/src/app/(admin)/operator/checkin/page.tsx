"use client";

import { useState } from "react";

type CheckinResult = {
  message?: string;
  ticket?: {
    id: string;
    code?: string;
    status?: string;
    holderName?: string;
    holderEmail?: string;
    usedAt?: string;
    orderItem?: {
      id: string;
      order?: {
        id: string;
        customerName?: string;
        customerEmail?: string;
        event?: {
          id: string;
          name?: string;
        };
      };
      ticketType?: {
        id: string;
        name?: string;
      };
    };
  };
  checkin?: {
    id: string;
    checkedAt?: string;
    gate?: string;
    operatorName?: string;
  };
};

export default function OperatorCheckinPage() {
  const [code, setCode] = useState("");
  const [gate, setGate] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!code.trim()) {
      alert("Informe o código do ticket");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("http://localhost:3001/v1/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          gate: gate.trim() || undefined,
          operatorName: operatorName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : JSON.stringify(data)
        );
        return;
      }

      setResult(data);
      alert("Check-in realizado com sucesso ✅");
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  }

  return (
    <div className="p-8 space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
        <h1 className="text-3xl font-bold">Check-in do OPERATOR ✅</h1>
        <p className="text-gray-600 mt-1">
          Valide tickets apenas dos eventos atribuídos a você
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 max-w-3xl">
        <form onSubmit={handleCheckin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Código do ticket *
            </label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Cole ou digite o código do ticket"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Portão</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              placeholder="Ex: Portão A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Operador</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-5 py-3 rounded-xl w-full"
          >
            {loading ? "Validando..." : "Realizar check-in"}
          </button>
        </form>
      </div>

      {result && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 max-w-3xl">
          <h2 className="text-xl font-bold mb-4">Resultado do check-in</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Mensagem:</strong> {result.message || "-"}
            </p>
            <p>
              <strong>Evento:</strong>{" "}
              {result.ticket?.orderItem?.order?.event?.name || "-"}
            </p>
            <p>
              <strong>Cliente do pedido:</strong>{" "}
              {result.ticket?.orderItem?.order?.customerName || "-"}
            </p>
            <p>
              <strong>Portador:</strong> {result.ticket?.holderName || "-"}
            </p>
            <p>
              <strong>Email do portador:</strong>{" "}
              {result.ticket?.holderEmail || "-"}
            </p>
            <p>
              <strong>Tipo de ingresso:</strong>{" "}
              {result.ticket?.orderItem?.ticketType?.name || "-"}
            </p>
            <p>
              <strong>Código do ticket:</strong> {result.ticket?.code || "-"}
            </p>
            <p>
              <strong>Status do ticket:</strong> {result.ticket?.status || "-"}
            </p>
            <p>
              <strong>Check-in em:</strong>{" "}
              {formatDate(result.checkin?.checkedAt)}
            </p>
            <p>
              <strong>Portão:</strong> {result.checkin?.gate || "-"}
            </p>
            <p>
              <strong>Operador:</strong> {result.checkin?.operatorName || "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}