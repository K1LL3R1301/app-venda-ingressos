"use client";

import { useEffect, useState } from "react";

type DashboardSummary = {
  events?: number;
  orders?: number;
};

export default function OperatorDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/dashboard/operator", {
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
              : "Erro ao carregar dashboard",
          );
          return;
        }

        setSummary(result);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p>Carregando dashboard do operador...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8">
        <p>Não foi possível carregar o dashboard do operador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <h1 className="text-3xl font-bold">Dashboard Operator</h1>
        <p className="text-gray-600 mt-2">
          Área de operação para gerenciar eventos e pedidos atribuídos.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-2">Eventos atribuídos</p>
          <h2 className="text-3xl font-bold">{summary.events ?? 0}</h2>
        </div>

        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-2">Pedidos</p>
          <h2 className="text-3xl font-bold">{summary.orders ?? 0}</h2>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => (window.location.href = "/operator/events")}
            className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Ver eventos
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/operator/orders")}
            className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Ver pedidos
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/operator/checkin")}
            className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Check-in manual
          </button>
        </div>
      </section>
    </div>
  );
}