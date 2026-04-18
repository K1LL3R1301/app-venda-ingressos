"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      console.log("LOGIN RAW RESPONSE:", rawText);

      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        alert("A resposta da API não veio em JSON. Veja o console.");
        return;
      }

      console.log("LOGIN JSON RESPONSE:", data);

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : JSON.stringify(data)
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

      if (!token || typeof token !== "string") {
        alert(`Token não retornado pela API: ${JSON.stringify(data)}`);
        return;
      }

      localStorage.removeItem("token");
      localStorage.setItem("token", token);

      setTimeout(() => {
        router.push("/dashboard");
      }, 100);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Erro na conexão com a API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Login 🔐</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}