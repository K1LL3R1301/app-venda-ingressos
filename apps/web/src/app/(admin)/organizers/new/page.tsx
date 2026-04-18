"use client";

import Link from "next/link";
import { useState } from "react";

export default function NewOrganizerPage() {
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!tradeName.trim()) {
      alert("Informe o nome fantasia do organizador");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tradeName: tradeName.trim(),
          legalName: legalName.trim() || undefined,
          document: document.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
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

      alert("Organizador criado com sucesso 🏢");
      window.location.href = "/organizers";
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Novo organizador 🏢</h1>
          <p className="text-gray-600 mt-1">
            Cadastre o organizador responsável pelos eventos
          </p>
        </div>

        <Link
          href="/organizers"
          className="bg-white border px-4 py-2 rounded"
        >
          Voltar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nome fantasia *
          </label>
          <input
            type="text"
            className="w-full border rounded p-3"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Ex: Gabriel Eventos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Razão social
          </label>
          <input
            type="text"
            className="w-full border rounded p-3"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Ex: Gabriel Eventos LTDA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Documento
          </label>
          <input
            type="text"
            className="w-full border rounded p-3"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Ex: 00.000.000/0001-00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            className="w-full border rounded p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex: contato@empresa.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Telefone
          </label>
          <input
            type="text"
            className="w-full border rounded p-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: (11) 99999-9999"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white px-5 py-3 rounded"
        >
          {saving ? "Salvando..." : "Criar organizador"}
        </button>
      </form>
    </div>
  );
}