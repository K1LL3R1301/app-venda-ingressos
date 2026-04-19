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
    role?: string;
    status?: string;
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
      role?: string;
      status?: string;
    };
  };
  message?: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function getRedirectPathByRole(role?: string) {
    if (role === "ADMIN") return "/dashboard";
    if (role === "OPERATOR") return "/operator/dashboard";
    if (role === "CUSTOMER") return "/customer/dashboard";
    return "/dashboard";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
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

      window.location.href = getRedirectPathByRole(user?.role);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Erro na conexão com a API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Login 🔐</h1>
        <p className="text-center text-gray-600 mb-6">
          Entre para acessar a plataforma
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-xl"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-3">Ainda não tem conta?</p>

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