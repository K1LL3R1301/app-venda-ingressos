"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type ValidationCheckin = {
  id?: string;
  ticketId?: string;
  gate?: string;
  operatorName?: string;
  checkedAt?: string;
};

type ValidationResult = {
  valid?: boolean;
  reason?: string;
  ticket?: {
    id?: string;
    code?: string;
    status?: string;
    holderName?: string;
    holderCpf?: string;
    usedAt?: string;
    lastCheckin?: ValidationCheckin | null;
  };
  order?: {
    id?: string;
    status?: string;
  };
  event?: {
    id?: string;
    name?: string;
    startDate?: string;
    eventDate?: string;
  };
  ticketType?: {
    id?: string;
    name?: string;
  };
  checkin?: ValidationCheckin;
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value?: string | null) {
  const digits = onlyDigits(value);

  if (!digits) return "-";
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

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID") return "Pago";
  if (normalized === "PENDING") return "Pendente";
  if (normalized === "PENDING_PAYMENT") return "Aguardando pagamento";
  if (normalized === "AVAILABLE") return "Disponível";
  if (normalized === "USED") return "Utilizado";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "TRANSFER_PENDING") return "Transferência pendente";
  if (normalized === "TRANSFERRED") return "Transferido";
  if (normalized === "UNAVAILABLE") return "Indisponível";

  return status || "-";
}

function getResultTheme(result?: ValidationResult | null) {
  if (!result) {
    return {
      border: "border-slate-200",
      bg: "bg-white",
      badge: "bg-slate-100 text-slate-700",
      title: "Aguardando validação",
      icon: "◌",
    };
  }

  if (result.valid) {
    return {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      badge: "bg-emerald-600 text-white",
      title: "Ingresso válido",
      icon: "✓",
    };
  }

  return {
    border: "border-rose-200",
    bg: "bg-rose-50",
    badge: "bg-rose-600 text-white",
    title: "Ingresso inválido",
    icon: "×",
  };
}

function InfoBox({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-black ${
          muted ? "text-slate-500" : "text-slate-950"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

export default function AdminValidationPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [tokenText, setTokenText] = useState("");
  const [gate, setGate] = useState("Entrada principal");
  const [markAsUsed, setMarkAsUsed] = useState(true);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");

  const resultTheme = useMemo(() => getResultTheme(result), [result]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!rawUser) {
      setForbidden(true);
      setLoadingAuth(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as StoredUser;
      const role = String(parsedUser.role || "").toUpperCase();

      setUser(parsedUser);

      if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "OPERATOR") {
        setForbidden(true);
      }
    } catch (err) {
      console.error("Erro ao ler usuário:", err);
      setForbidden(true);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  function clearForm() {
    setTokenText("");
    setResult(null);
    setError("");
  }

  async function handleValidate(e: FormEvent) {
    e.preventDefault();

    const authToken = localStorage.getItem("token");
    const cleanToken = tokenText.trim();

    setError("");
    setResult(null);

    if (!authToken || authToken === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!cleanToken) {
      setError("Cole ou leia o token do QR Code antes de validar.");
      return;
    }

    setValidating(true);

    try {
      const res = await fetch("http://localhost:3001/v1/tickets/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: cleanToken,
          gate: gate.trim() || "Entrada principal",
          markAsUsed,
        }),
      });

      const data: ValidationResult = await res.json();

      if (!res.ok) {
        setResult({
          valid: false,
          reason:
            typeof data?.message === "string"
              ? data.message
              : data?.reason || "Erro ao validar ingresso.",
        });
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("VALIDATE TICKET ERROR:", err);
      setError("Erro ao conectar com a API de validação.");
    } finally {
      setValidating(false);
    }
  }

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-[1180px] rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Carregando validação...
          </p>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-[760px] rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl font-black text-rose-600">
            ×
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            Acesso não permitido
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Esta tela é exclusiva para contas ADMIN e OPERATOR.
          </p>

          <button
            type="button"
            onClick={() => goTo("/admin/dashboard")}
            className="mt-6 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.25),transparent_32%)]" />

        <div className="relative z-10 mx-auto max-w-[1180px] px-4 py-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
                Operação de portaria
              </p>

              <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                Validar ingresso
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                Cole o token lido do QR Code para consultar ou confirmar a
                entrada do participante.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                Operador
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {user?.name || user?.email || "Operador"}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {String(user?.role || "").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => goTo("/admin/dashboard")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
            >
              Painel admin
            </button>

            <button
              type="button"
              onClick={() => goTo("/orders")}
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
            >
              Meus pedidos
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1180px] gap-7 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
                Leitura do QR
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Token do ingresso
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                No teste manual, cole aqui o conteúdo lido do QR Code.
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                markAsUsed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {markAsUsed ? "Marca como usado" : "Somente consulta"}
            </span>
          </div>

          <form onSubmit={handleValidate} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-black text-slate-700">
                Token do QR Code
              </label>

              <textarea
                value={tokenText}
                onChange={(event) => setTokenText(event.target.value)}
                rows={7}
                placeholder="Cole aqui o token começando com tkt_v1..."
                className="w-full resize-none rounded-[24px] border border-slate-300 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Entrada / portão
                </label>

                <input
                  value={gate}
                  onChange={(event) => setGate(event.target.value)}
                  placeholder="Ex: Entrada principal"
                  className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={markAsUsed}
                  onChange={(event) => setMarkAsUsed(event.target.checked)}
                  className="h-5 w-5 accent-slate-950"
                />
                <span className="text-sm font-black text-slate-700">
                  Confirmar entrada
                </span>
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={validating}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {validating
                  ? "Validando..."
                  : markAsUsed
                    ? "Validar e liberar entrada"
                    : "Consultar ingresso"}
              </button>

              <button
                type="button"
                onClick={clearForm}
                disabled={validating}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpar
              </button>
            </div>
          </form>
        </section>

        <aside className={`rounded-[32px] border p-6 shadow-sm ${resultTheme.border} ${resultTheme.bg}`}>
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl font-black ${resultTheme.badge}`}
            >
              {resultTheme.icon}
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Resultado
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {resultTheme.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {result?.reason ||
                  "Faça uma leitura para ver os dados do ingresso aqui."}
              </p>
            </div>
          </div>

          {result ? (
            <div className="mt-6 space-y-4">
              <InfoBox label="Evento" value={result.event?.name || "-"} />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <InfoBox
                  label="Ingresso"
                  value={result.ticketType?.name || "Ingresso"}
                />

                <InfoBox
                  label="Status"
                  value={getStatusLabel(result.ticket?.status)}
                />
              </div>

              <InfoBox
                label="Titular"
                value={result.ticket?.holderName || "-"}
              />

              <InfoBox
                label="CPF"
                value={formatCpf(result.ticket?.holderCpf)}
              />

              <InfoBox
                label="Código"
                value={result.ticket?.code || "-"}
                muted
              />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <InfoBox
                  label="Data do evento"
                  value={formatDate(
                    result.event?.startDate || result.event?.eventDate,
                  )}
                />

                <InfoBox
                  label="Check-in"
                  value={formatDate(
                    result.checkin?.checkedAt ||
                      result.ticket?.lastCheckin?.checkedAt ||
                      result.ticket?.usedAt,
                  )}
                />
              </div>

              {result.checkin || result.ticket?.lastCheckin ? (
                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Operação
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-950">
                    {result.checkin?.gate ||
                      result.ticket?.lastCheckin?.gate ||
                      gate ||
                      "Entrada principal"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Operador:{" "}
                    {result.checkin?.operatorName ||
                      result.ticket?.lastCheckin?.operatorName ||
                      user?.name ||
                      user?.email ||
                      "-"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm font-semibold text-slate-500">
              O resultado da validação vai aparecer aqui.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
