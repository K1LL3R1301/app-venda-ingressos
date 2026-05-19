"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { clearAuthSession, setAuthSession } from "../../lib/auth-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

type ApiUser = {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
  status?: string;
  authProvider?: string;
};

type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  jwt?: string;
  user?: ApiUser;
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    jwt?: string;
    user?: ApiUser;
  };
  message?: string | string[];
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

function getMessage(data: LoginResponse) {
  if (Array.isArray(data.message)) return data.message.join(" ");
  if (typeof data.message === "string") return data.message;

  return "Nao foi possivel entrar. Confira CPF, senha e se a API esta rodando.";
}

function getToken(data: LoginResponse) {
  return (
    data.access_token ||
    data.accessToken ||
    data.token ||
    data.jwt ||
    data.data?.access_token ||
    data.data?.accessToken ||
    data.data?.token ||
    data.data?.jwt ||
    ""
  );
}

export default function LoginPage() {
  const submittingRef = useRef(false);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Pronto para login.");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    clearAuthSession();
    setStatusMessage("Sessao antiga limpa. Clique em Entrar ou pressione Enter.");
  }, []);

  function finishWithError(status: string, message: string) {
    submittingRef.current = false;
    setLoading(false);
    setStatusMessage(status);
    setErrorMessage(message);
  }

  async function runLogin(origin: string) {
    if (submittingRef.current) {
      setStatusMessage(`Login ja esta em andamento (${origin}).`);
      return;
    }

    submittingRef.current = true;
    setErrorMessage("");

    const cpfDigits = onlyDigits(cpf);

    if (cpfDigits.length !== 11) {
      finishWithError("CPF invalido.", "Informe um CPF valido com 11 digitos.");
      return;
    }

    if (!password.trim()) {
      finishWithError("Senha nao informada.", "Informe sua senha.");
      return;
    }

    setLoading(true);
    setStatusMessage(`Clique recebido por ${origin}. Enviando para API...`);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cpf: cpfDigits,
          password,
        }),
      });

      setStatusMessage(`API respondeu HTTP ${response.status}. Lendo JSON...`);

      const rawText = await response.text();
      let data: LoginResponse = {};

      try {
        data = rawText ? (JSON.parse(rawText) as LoginResponse) : {};
      } catch {
        finishWithError(
          "Resposta da API nao e JSON.",
          "A resposta da API nao veio em JSON. Veja o terminal da API.",
        );
        return;
      }

      if (!response.ok) {
        finishWithError("Login recusado pela API.", getMessage(data));
        return;
      }

      const token = getToken(data);
      const user = data.user || data.data?.user;

      if (!token || typeof token !== "string") {
        finishWithError(
          "Token nao retornado pela API.",
          `Token nao retornado pela API: ${JSON.stringify(data)}`,
        );
        return;
      }

      setAuthSession(token, user);

      setStatusMessage("Login OK. Sessao salva. Indo para /dashboard...");
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      finishWithError(
        "Erro de conexao com a API.",
        "Erro na conexao com a API. Confirme se o backend esta rodando na porta 3001.",
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runLogin("submit");
  }

  function handleButtonPointer(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    void runLogin("botao");
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void runLogin("enter");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">Login 🔐</h1>
        <p className="mb-6 text-center text-gray-600">
          Entre com seu CPF para acessar a plataforma
        </p>

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-700">
          Status: {statusMessage}
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="CPF"
            className="w-full rounded-xl border p-3"
            value={cpf}
            onChange={(event) => setCpf(formatCpf(event.target.value))}
            onKeyDown={handleInputKeyDown}
            maxLength={14}
          />

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />

          <button
            type="submit"
            onPointerDown={handleButtonPointer}
            disabled={loading}
            className="relative z-10 w-full rounded-xl bg-black p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="mb-3 text-sm text-gray-600">Ainda nao tem conta?</p>

          <Link
            href="/register"
            className="inline-block w-full rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50"
          >
            Criar nova conta
          </Link>

          <p className="mt-4 text-[10px] font-semibold text-gray-400">
            auth-unified-session-v1
          </p>
        </div>
      </div>
    </div>
  );
}