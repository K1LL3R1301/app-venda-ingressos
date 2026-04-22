"use client";

import Link from "next/link";
import { useState } from "react";

type RegisterResponse = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  authProvider?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

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

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const cpfDigits = onlyDigits(cpf);

    if (!name.trim()) {
      alert("Informe o nome");
      return;
    }

    if (cpfDigits.length !== 11) {
      alert("Informe um CPF válido com 11 dígitos");
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
          name: name.trim(),
          cpf: cpfDigits,
          email: email.trim().toLowerCase(),
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Criar nova conta
        </h1>

        <p className="mb-6 text-center text-gray-600">
          Preencha os dados abaixo para criar sua conta
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Nome"
            className="w-full rounded-xl border p-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="text"
            inputMode="numeric"
            placeholder="CPF"
            className="w-full rounded-xl border p-3"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            maxLength={14}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirmar senha"
            className="w-full rounded-xl border p-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black p-3 text-white"
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