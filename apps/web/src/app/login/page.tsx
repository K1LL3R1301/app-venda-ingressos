"use client";

import Link from "next/link";
import { useState } from "react";

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  jwt?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    cpf?: string;
    role?: string;
    status?: string;
    authProvider?: string;
  };
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    jwt?: string;
    user?: {
      id: string;
      name?: string;
      email?: string;
      cpf?: string;
      role?: string;
      status?: string;
      authProvider?: string;
    };
  };
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

export default function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function getDefaultRedirectPath() {
    return "/customer/dashboard";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const cpfDigits = onlyDigits(cpf);

    if (cpfDigits.length !== 11) {
      alert("Informe um CPF válido com 11 dígitos");
      return;
    }

    if (!password.trim()) {
      alert("Informe sua senha");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cpf: cpfDigits,
          password,
        }),
      });

      const rawText = await res.text();

      let data: LoginResponse = {};
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

      const token =
        data.access_token ||
        data.accessToken ||
        data.token ||
        data.jwt ||
        data?.data?.access_token ||
        data?.data?.accessToken ||
        data?.data?.token ||
        data?.data?.jwt;

      const user = data.user || data?.data?.user;

      if (!token || typeof token !== "string") {
        alert(`Token não retornado pela API: ${JSON.stringify(data)}`);
        return;
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      window.location.href = getDefaultRedirectPath();
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Erro na conexão com a API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">Login 🔐</h1>
        <p className="mb-6 text-center text-gray-600">
          Entre com seu CPF para acessar a plataforma
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
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
            type="password"
            placeholder="Senha"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black p-3 text-white"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="mb-3 text-sm text-gray-600">Ainda não tem conta?</p>

          <Link
            href="/register"
            className="inline-block w-full rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50"
          >
            Criar nova conta
          </Link>
        </div>
      </div>
    </div>
  );
}