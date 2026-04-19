"use client";

import Link from "next/link";
import { useState } from "react";

type RegisterResponse = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Informe o nome");
      return;
    }

    if (!email.trim()) {
      alert("Informe o email");
      return;
    }

    if (!password.trim()) {
      alert("Informe a senha");
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "CUSTOMER",
        }),
      });

      const rawText = await res.text();

      let data: RegisterResponse = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        alert("A resposta da API não veio em JSON. Veja o console.");
        return;
      }

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : JSON.stringify(data),
        );
        return;
      }

      alert("Conta criada com sucesso");
      window.location.href = "/login";
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      alert("Erro na conexão com a API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          Criar nova conta
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Preencha os dados abaixo para criar sua conta
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            className="w-full border rounded-xl p-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-xl p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full border rounded-xl p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirmar senha"
            className="w-full border rounded-xl p-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-block w-full rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50"
          >
            Voltar para login
          </Link>
        </div>
      </div>
    </div>
  );
}