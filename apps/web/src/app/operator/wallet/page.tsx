"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  getStoredAuthToken,
  getStoredAuthUser,
} from "../../../lib/auth-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/v1";

type StoredUser = {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type WorkDate = {
  id?: string | null;
  date?: string | null;
  amount?: string | number | null;
  functions?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  available?: boolean | null;
  responseNote?: string | null;
  respondedAt?: string | null;
};

type OperatorAssignment = {
  id: string;
  protocol?: string | null;
  status?: string | null;
  workPlanStatus?: string | null;
  paymentStatus?: string | null;
  paymentNotes?: string | null;
  paymentPaidAt?: string | null;
  paymentProofName?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  eventName?: string | null;
  eventDate?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  invitedByName?: string | null;
  invitedByEmail?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  operatorCpf?: string | null;
  operatorCpfNormalized?: string | null;
  workDates?: WorkDate[] | null;
  paymentSummary?: {
    proposedTotal?: number;
    approvedTotal?: number;
    availableDays?: number;
    unavailableDays?: number;
    pendingDays?: number;
    scheduledHours?: number;
  } | null;
  event?: {
    id?: string | null;
    name?: string | null;
    title?: string | null;
    eventDate?: string | null;
    status?: string | null;
  } | null;
};

type WalletMovement = {
  id: string;
  assignmentId?: string;
  type: "CREDIT" | "DEBIT";
  source:
    | "OPERATOR_WORK_AVAILABLE"
    | "OPERATOR_WORK_PENDING"
    | "OPERATOR_PIX_REQUEST"
    | "OPERATOR_TO_CUSTOMER_WALLET";
  status: "AVAILABLE" | "PENDING" | "PIX_REQUESTED" | "TRANSFERRED";
  description: string;
  amount: number;
  eventName?: string;
  producerName?: string;
  createdAt?: string;
  pixKey?: string;
  note?: string;
};

type Filter = "ALL" | "AVAILABLE" | "PENDING" | "PIX_REQUESTS" | "CUSTOMER_WALLET";

function normalizeText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function userStorageKey(user: StoredUser | null) {
  return user?.id || user?.email || "anon";
}

function currentUserId(user?: StoredUser | null) {
  return String(user?.id || user?.sub || "");
}

function assignmentBelongsToUser(assignment: OperatorAssignment, user: StoredUser | null) {
  const userId = currentUserId(user);
  const userEmail = normalizeText(user?.email);
  const userCpf = onlyDigits(user?.cpf);

  const ids = [assignment.operatorUserId].map((value) => String(value || ""));
  const emails = [assignment.operatorEmail].map(normalizeText);
  const cpfs = [assignment.operatorCpf, assignment.operatorCpfNormalized].map(onlyDigits);

  if (userId && ids.includes(userId)) return true;
  if (userEmail && emails.includes(userEmail)) return true;
  if (userCpf && cpfs.includes(userCpf)) return true;

  return false;
}

function toNumber(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(
    String(value ?? "0")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function upper(value?: string | null) {
  return String(value || "").toUpperCase();
}

function safeDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = safeDate(value);
  if (!date) return value || "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function workDates(assignment: OperatorAssignment) {
  return Array.isArray(assignment.workDates) ? assignment.workDates : [];
}

function workDateStatus(date: WorkDate) {
  const explicit = upper(date.status);

  if (explicit) return explicit;
  if (date.available === true) return "AVAILABLE";
  if (date.available === false) return "UNAVAILABLE";

  return "PENDING";
}

function acceptedWorkDate(date: WorkDate) {
  return date.available === true || ["AVAILABLE", "ACCEPTED", "CONFIRMED"].includes(workDateStatus(date));
}

function assignmentEventName(assignment: OperatorAssignment) {
  return (
    assignment.event?.name ||
    assignment.event?.title ||
    assignment.eventTitle ||
    assignment.eventName ||
    "Evento sem nome"
  );
}

function assignmentProducerName(assignment: OperatorAssignment) {
  return (
    assignment.adminName ||
    assignment.invitedByName ||
    assignment.adminEmail ||
    assignment.invitedByEmail ||
    "Produtor"
  );
}

function isProducerPaymentFinalized(assignment: OperatorAssignment) {
  return ["PAID", "COMPLETED", "DONE"].includes(upper(assignment.paymentStatus));
}

function approvedTotal(assignment: OperatorAssignment) {
  const fromSummary = toNumber(assignment.paymentSummary?.approvedTotal);

  if (fromSummary > 0) return fromSummary;

  return workDates(assignment).reduce((sum, date) => {
    if (!acceptedWorkDate(date)) return sum;
    return sum + toNumber(date.amount);
  }, 0);
}

function hasAcceptedWork(assignment: OperatorAssignment) {
  return workDates(assignment).some(acceptedWorkDate) || upper(assignment.status) === "ACTIVE";
}

function operatorMovementKey(user: StoredUser | null) {
  return `astro_operator_wallet_movements_${userStorageKey(user)}`;
}

function customerWalletKey(user: StoredUser | null) {
  return `astro_wallet_withdrawals_${userStorageKey(user)}`;
}

function loadLocalOperatorMovements(user: StoredUser | null): WalletMovement[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(operatorMovementKey(user)) || "[]");
  } catch {
    return [];
  }
}

function saveLocalOperatorMovements(user: StoredUser | null, movements: WalletMovement[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(operatorMovementKey(user), JSON.stringify(movements));
}

function addCreditToCustomerWallet(user: StoredUser | null, movement: WalletMovement) {
  if (typeof window === "undefined") return;

  try {
    const key = customerWalletKey(user);
    const current = JSON.parse(localStorage.getItem(key) || "[]");

    const customerMovement = {
      id: `OP-CUSTOMER-CREDIT-${Date.now()}`,
      type: "CREDIT",
      source: "OPERATOR_TO_CUSTOMER_WALLET",
      status: "COMPLETED",
      description: "Crédito enviado da wallet do operador",
      amount: movement.amount,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify([customerMovement, ...current]));
  } catch {}
}

function movementsFromAssignments(assignments: OperatorAssignment[]) {
  const result: WalletMovement[] = [];

  for (const assignment of assignments) {
    const value = approvedTotal(assignment);

    if (value <= 0 || !hasAcceptedWork(assignment)) continue;

    const isAvailable = isProducerPaymentFinalized(assignment);

    result.push({
      id: `${isAvailable ? "AVAILABLE" : "PENDING"}-${assignment.id}`,
      assignmentId: assignment.id,
      type: "CREDIT",
      source: isAvailable ? "OPERATOR_WORK_AVAILABLE" : "OPERATOR_WORK_PENDING",
      status: isAvailable ? "AVAILABLE" : "PENDING",
      description: isAvailable
        ? "Produtor finalizou o pagamento. Valor disponível."
        : "Evento/trabalho aceito. Aguardando produtor finalizar o pagamento.",
      amount: value,
      eventName: assignmentEventName(assignment),
      producerName: assignmentProducerName(assignment),
      createdAt: assignment.paymentPaidAt || assignment.eventDate || assignment.event?.eventDate || undefined,
      note: assignment.paymentNotes || undefined,
    });
  }

  return result;
}

function Topbar({ user }: { user: StoredUser | null }) {
  const [open, setOpen] = useState(false);
  const source = String(user?.name || user?.email || "O").trim();
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function logout() {
    clearAuthSession();
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-[9999] border-b border-[#ea5f00] bg-[#ff6900] shadow-sm">
      <div className="mx-auto flex h-[82px] max-w-[1180px] items-center gap-5 px-4">
        <a href="/dashboard" className="flex shrink-0 items-center" aria-label="Astro Ingressos">
          <img
            src="/astro-ingressos-logo.png"
            alt="Astro Ingressos"
            className="h-[56px] w-auto object-contain"
          />
        </a>

        <div className="flex-1" />

        <a
          href="/operator/dashboard"
          className="hidden px-3 py-2 text-sm font-black text-[#19002f] transition hover:opacity-70 md:inline-flex"
        >
          Operador
        </a>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-full bg-white px-3 text-[#19002f] shadow-sm ring-1 ring-black/10"
          >
            <span className="text-xl leading-none">☰</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#19002f] text-sm font-black text-white">
              {initials || "O"}
            </span>
          </button>

          {open ? (
            <div className="absolute right-0 z-[10000] mt-3 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
              <div className="border-b border-neutral-100 px-4 py-4">
                <p className="truncate text-sm font-black text-neutral-950">{user?.name || "Operador"}</p>
                <p className="mt-1 break-all text-xs font-semibold text-neutral-500">
                  {user?.email || "sem e-mail"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">CPF: {user?.cpf || "não informado"}</p>
              </div>

              <div className="p-2">
                <a
                  href="/operator/dashboard"
                  className="flex w-full rounded-xl px-3 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Operadores
                </a>

                <a
                  href="/operator/wallet"
                  className="mt-1 flex w-full rounded-xl bg-neutral-950 px-3 py-3 text-sm font-semibold text-white"
                >
                  Wallet do operador
                </a>

                <a
                  href="/dashboard"
                  className="mt-1 flex w-full rounded-xl px-3 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Tela principal
                </a>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-1 flex w-full rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p> : null}
    </article>
  );
}

function HeroBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {sub ? <p className="mt-1 text-sm font-semibold text-white/60">{sub}</p> : null}
    </div>
  );
}

function statusLabel(status: WalletMovement["status"]) {
  const labels: Record<WalletMovement["status"], string> = {
    AVAILABLE: "Disponível",
    PENDING: "Pendente",
    PIX_REQUESTED: "Pix solicitado",
    TRANSFERRED: "Enviado à wallet customer",
  };

  return labels[status] || status;
}

function sourceLabel(source: WalletMovement["source"]) {
  const labels: Record<WalletMovement["source"], string> = {
    OPERATOR_WORK_AVAILABLE: "Trabalho pago",
    OPERATOR_WORK_PENDING: "Trabalho pendente",
    OPERATOR_PIX_REQUEST: "Solicitação Pix",
    OPERATOR_TO_CUSTOMER_WALLET: "Wallet customer",
  };

  return labels[source] || source;
}

export default function OperatorWalletPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [assignments, setAssignments] = useState<OperatorAssignment[]>([]);
  const [localMovements, setLocalMovements] = useState<WalletMovement[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixAmount, setPixAmount] = useState("");
  const [customerAmount, setCustomerAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    const token = getStoredAuthToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const storedUser = getStoredAuthUser<StoredUser>();
    const role = upper(storedUser?.role);

    setUser(storedUser);
    setLocalMovements(loadLocalOperatorMovements(storedUser));

    if (!["OPERATOR", "SUPER_ADMIN"].includes(role)) {
      setErrorMessage("Esta wallet é exclusiva para operadores.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/operator-assignments/me/invitations`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar wallet");
      }

      const list = Array.isArray(data)
        ? (data as OperatorAssignment[])
        : Array.isArray(data?.items)
          ? (data.items as OperatorAssignment[])
          : Array.isArray(data?.assignments)
            ? (data.assignments as OperatorAssignment[])
            : [];

      setAssignments(list.filter((assignment) => assignmentBelongsToUser(assignment, storedUser)));
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar a wallet do operador. Confira se a API está ligada.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const assignmentMovements = useMemo(() => movementsFromAssignments(assignments), [assignments]);

  const localDebits = useMemo(
    () => localMovements.filter((movement) => movement.type === "DEBIT"),
    [localMovements],
  );

  const allMovements = useMemo(
    () =>
      [...localMovements, ...assignmentMovements].sort((first, second) =>
        String(second.createdAt || "").localeCompare(String(first.createdAt || "")),
      ),
    [localMovements, assignmentMovements],
  );

  const totals = useMemo(() => {
    const paidByProducer = assignmentMovements
      .filter((item) => item.status === "AVAILABLE")
      .reduce((sum, item) => sum + item.amount, 0);

    const pending = assignmentMovements
      .filter((item) => item.status === "PENDING")
      .reduce((sum, item) => sum + item.amount, 0);

    const pixRequested = localMovements
      .filter((item) => item.source === "OPERATOR_PIX_REQUEST")
      .reduce((sum, item) => sum + item.amount, 0);

    const sentToCustomerWallet = localMovements
      .filter((item) => item.source === "OPERATOR_TO_CUSTOMER_WALLET")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalDebited = localDebits.reduce((sum, item) => sum + item.amount, 0);

    return {
      available: Math.max(0, paidByProducer - totalDebited),
      pending,
      pixRequested,
      sentToCustomerWallet,
      paidByProducer,
      totalGenerated: paidByProducer + pending,
    };
  }, [assignmentMovements, localMovements, localDebits]);

  const filtered = useMemo(() => {
    const term = normalizeText(search);

    return allMovements.filter((item) => {
      if (filter === "AVAILABLE" && item.status !== "AVAILABLE") return false;
      if (filter === "PENDING" && item.status !== "PENDING") return false;
      if (filter === "PIX_REQUESTS" && item.source !== "OPERATOR_PIX_REQUEST") return false;
      if (filter === "CUSTOMER_WALLET" && item.source !== "OPERATOR_TO_CUSTOMER_WALLET") return false;

      if (!term) return true;

      return normalizeText(
        `${item.description} ${item.eventName || ""} ${item.producerName || ""} ${item.pixKey || ""} ${item.status}`,
      ).includes(term);
    });
  }, [allMovements, filter, search]);

  function saveMovement(movement: WalletMovement) {
    const next = [movement, ...localMovements];

    setLocalMovements(next);
    saveLocalOperatorMovements(user, next);
  }

  function requestPix(event: FormEvent) {
    event.preventDefault();

    const gross = Math.max(0, toNumber(pixAmount));

    if (gross <= 0 || gross > totals.available) {
      alert("Informe um valor válido dentro do saldo disponível.");
      return;
    }

    if (!pixKey.trim()) {
      alert("Informe a chave Pix.");
      return;
    }

    if (
      !confirm(
        `Confirmar Pix para sua conta bancária?\n\nValor: ${money(gross)}\nChave Pix: ${pixKey.trim()}\n\nNa wallet do operador o Pix é 100% do valor disponível.`,
      )
    ) {
      return;
    }

    const movement: WalletMovement = {
      id: `OP-PIX-${Date.now()}`,
      type: "DEBIT",
      source: "OPERATOR_PIX_REQUEST",
      status: "PIX_REQUESTED",
      description: "Solicitação de Pix para conta bancária do operador",
      amount: gross,
      pixKey: pixKey.trim(),
      createdAt: new Date().toISOString(),
    };

    saveMovement(movement);
    setPixKey("");
    setPixAmount("");

    alert("Solicitação Pix registrada.");
  }

  function transferToCustomerWallet(event: FormEvent) {
    event.preventDefault();

    const value = Math.max(0, toNumber(customerAmount));

    if (value <= 0 || value > totals.available) {
      alert("Informe um valor válido dentro do saldo disponível.");
      return;
    }

    if (
      !confirm(
        `Enviar para sua wallet customer?\n\nValor: ${money(value)}\n\nEsse caminho é só operador -> customer. A wallet customer não envia saldo de volta para a wallet operator.`,
      )
    ) {
      return;
    }

    const movement: WalletMovement = {
      id: `OP-CUSTOMER-${Date.now()}`,
      type: "DEBIT",
      source: "OPERATOR_TO_CUSTOMER_WALLET",
      status: "TRANSFERRED",
      description: "Valor enviado para usar como customer no site",
      amount: value,
      createdAt: new Date().toISOString(),
    };

    saveMovement(movement);
    addCreditToCustomerWallet(user, movement);
    setCustomerAmount("");

    alert("Valor enviado para a wallet customer.");
  }

  const filters: Array<[Filter, string]> = [
    ["ALL", "Tudo"],
    ["AVAILABLE", "Disponível"],
    ["PENDING", "Pendente"],
    ["PIX_REQUESTS", "Solicitações Pix"],
    ["CUSTOMER_WALLET", "Wallet customer"],
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Topbar user={user} />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-black text-slate-600">Carregando wallet do operador...</p>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Topbar user={user} />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">Atenção</p>
            <h1 className="mt-3 text-3xl font-black text-rose-950">{errorMessage}</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Topbar user={user} />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300">
                Wallet do operador
              </p>
              <h1 className="mt-4 text-5xl font-black leading-tight">
                Seus trabalhos, valores e repasses.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75">
                Disponível só entra quando o produtor finalizar o pagamento. Pendente fica enquanto o evento
                ainda está em andamento ou o produtor ainda não pagou. Pix do operador sai com 100% do valor.
              </p>
            </div>

            <div className="grid gap-3">
              <HeroBox label="Operador" value={user?.name || "Operador"} sub={user?.email || ""} />
              <HeroBox label="Disponível agora" value={money(totals.available)} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <Metric
            label="Disponível"
            value={money(totals.available)}
            helper="Produtor já finalizou o pagamento"
          />
          <Metric
            label="Pendente"
            value={money(totals.pending)}
            helper="Evento rolando ou produtor ainda não pagou"
          />
          <Metric
            label="Solicitações Pix"
            value={money(totals.pixRequested)}
            helper="Pedidos para conta bancária"
          />
          <Metric
            label="Wallet customer"
            value={money(totals.sentToCustomerWallet)}
            helper="Enviado para usar no site"
          />
          <Metric
            label="Total gerado"
            value={money(totals.totalGenerated)}
            helper="Disponível + pendente"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                  Extrato do operador
                </p>
                <h2 className="mt-2 text-3xl font-black">Movimentações</h2>
              </div>

              <button
                type="button"
                onClick={load}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {filters.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ${
                    filter === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por evento, produtor, Pix ou status..."
              className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-500"
            />

            <div className="mt-5 grid gap-3">
              {filtered.length ? (
                filtered.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                          {statusLabel(item.status)} • {sourceLabel(item.source)}
                        </p>
                        <h3 className="mt-1 font-black">{item.eventName || item.description}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {item.description}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {item.producerName ? `${item.producerName} • ` : ""}
                          {item.pixKey ? `Pix: ${item.pixKey} • ` : ""}
                          {formatDate(item.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-xl font-black ${item.type === "DEBIT" ? "text-rose-700" : "text-slate-950"}`}>
                          {item.type === "DEBIT" ? "-" : ""}
                          {money(item.amount)}
                        </p>
                        <p className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                          {statusLabel(item.status)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 p-8 text-center">
                  <p className="font-black text-slate-600">Nenhuma movimentação neste filtro.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <form
              onSubmit={requestPix}
              className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                Conta bancária
              </p>
              <h2 className="mt-2 text-3xl font-black">Solicitar Pix</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Na wallet do operador, o Pix para banco devolve 100% do valor disponível.
              </p>

              <label className="mt-5 block text-sm font-black">Valor solicitado</label>
              <input
                value={pixAmount}
                onChange={(event) => setPixAmount(event.target.value)}
                placeholder="Ex: 150,00"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-500"
              />

              <label className="mt-5 block text-sm font-black">Chave Pix</label>
              <input
                value={pixKey}
                onChange={(event) => setPixKey(event.target.value)}
                placeholder="CPF, e-mail, celular ou chave aleatória"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-500"
              />

              <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-950">
                <p>Disponível agora: {money(totals.available)}</p>
                <p>Valor líquido no Pix: {money(toNumber(pixAmount))}</p>
                <p>Após solicitar: {money(Math.max(0, totals.available - toNumber(pixAmount)))}</p>
              </div>

              <button
                type="submit"
                className="mt-5 h-12 w-full rounded-2xl bg-[#ff6900] text-sm font-black text-white disabled:opacity-50"
                disabled={totals.available <= 0}
              >
                Solicitar Pix para banco
              </button>
            </form>

            <form
              onSubmit={transferToCustomerWallet}
              className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                Usar no site
              </p>
              <h2 className="mt-2 text-3xl font-black">Enviar para wallet customer</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Envia saldo da wallet operator para a wallet customer do mesmo usuário. O caminho contrário
                não existe: customer não envia saldo para operator.
              </p>

              <label className="mt-5 block text-sm font-black">Valor para usar no site</label>
              <input
                value={customerAmount}
                onChange={(event) => setCustomerAmount(event.target.value)}
                placeholder="Ex: 50,00"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-500"
              />

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
                <p>Disponível agora: {money(totals.available)}</p>
                <p>Enviado para customer: {money(toNumber(customerAmount))}</p>
                <p>Depois do envio: {money(Math.max(0, totals.available - toNumber(customerAmount)))}</p>
              </div>

              <button
                type="submit"
                className="mt-5 h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-50"
                disabled={totals.available <= 0}
              >
                Enviar para wallet customer
              </button>
            </form>

            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-950">
              <p className="font-black">Regra importante</p>
              <p className="mt-2">
                Wallet customer pode ter regra diferente para reembolso bancário, como devolver 60%.
                Wallet operator usa 100% para Pix. Não há transferência customer → operator.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}