// @ts-nocheck
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

type Assignment = {
  id: string;
  status?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  eventName?: string | null;
  operatorUserId?: string | null;
  operatorEmail?: string | null;
  operatorCpf?: string | null;
  operatorCpfNormalized?: string | null;
  permissions?: {
    canValidateTickets?: boolean | null;
    canAnswerSupport?: boolean | null;
  } | null;
  canValidateTickets?: boolean | null;
  event?: {
    id?: string | null;
    name?: string | null;
    title?: string | null;
    eventDate?: string | null;
  } | null;
};

type TicketLike = {
  id: string;
  code: string;
  customer: string;
  order: string;
  status: string;
  raw: any;
};

type CheckinRecord = {
  id: string;
  code: string;
  ticketId?: string;
  customer?: string;
  order?: string;
  at: string;
  operatorName?: string;
};

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

function currentUserId(user?: StoredUser | null) {
  return String(user?.id || user?.sub || "");
}

function assignmentBelongsToUser(assignment: Assignment, user: StoredUser | null) {
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

function getAssignmentEventId(assignment?: Assignment | null) {
  return String(assignment?.eventId || assignment?.event?.id || "");
}

function getAssignmentEventName(assignment?: Assignment | null) {
  return (
    assignment?.event?.name ||
    assignment?.event?.title ||
    assignment?.eventTitle ||
    assignment?.eventName ||
    "Evento"
  );
}

function canValidate(assignment?: Assignment | null) {
  return (
    assignment?.permissions?.canValidateTickets ??
    assignment?.canValidateTickets ??
    true
  ) !== false;
}

function localKey(assignmentId: string) {
  return `astro_operator_checkins_${assignmentId}`;
}

function loadLocalCheckins(assignmentId: string): CheckinRecord[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(assignmentId)) || "[]");
  } catch {
    return [];
  }
}

function saveLocalCheckins(assignmentId: string, records: CheckinRecord[]) {
  localStorage.setItem(localKey(assignmentId), JSON.stringify(records));
}

function codeFromTicket(item: any) {
  return String(
    item?.qrCode ||
      item?.qr_code ||
      item?.code ||
      item?.ticketCode ||
      item?.ticket_code ||
      item?.token ||
      item?.id ||
      "",
  );
}

function ticketStatus(item: any) {
  return String(item?.status || item?.ticketStatus || "VÁLIDO");
}

function ticketsFromOrders(orders: any[]) {
  const tickets: TicketLike[] = [];

  for (const order of orders) {
    const orderId = String(order?.id || order?.code || order?.protocol || "");
    const customer =
      order?.customerName ||
      order?.buyerName ||
      order?.user?.name ||
      order?.customer?.name ||
      order?.email ||
      order?.customerEmail ||
      "Cliente";

    const orderTickets = Array.isArray(order?.tickets)
      ? order.tickets
      : Array.isArray(order?.items)
        ? order.items
        : [];

    if (orderTickets.length === 0) {
      tickets.push({
        id: orderId || `order-${tickets.length}`,
        code: String(order?.qrCode || order?.code || order?.protocol || orderId),
        customer,
        order: orderId || "-",
        status: String(order?.status || "PEDIDO"),
        raw: order,
      });
      continue;
    }

    for (const ticket of orderTickets) {
      const code = codeFromTicket(ticket);

      tickets.push({
        id: String(ticket?.id || code || `${orderId}-${tickets.length}`),
        code,
        customer: ticket?.participantName || ticket?.name || customer,
        order: orderId || "-",
        status: ticketStatus(ticket),
        raw: ticket,
      });
    }
  }

  return tickets.filter((ticket) => ticket.code);
}

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
        <a href="/operator/dashboard" className="flex shrink-0 items-center" aria-label="Astro Ingressos">
          <img
            src="/astro-ingressos-logo.png"
            alt="Astro Ingressos"
            className="h-[56px] w-auto object-contain"
          />
        </a>

        <div className="flex-1" />

        <a href="/operator/dashboard" className="hidden px-3 py-2 text-sm font-black text-[#19002f] md:inline-flex">
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
              </div>

              <div className="p-2">
                <a
                  href="/operator/dashboard"
                  className="flex w-full rounded-xl bg-neutral-950 px-3 py-3 text-sm font-semibold text-white"
                >
                  Voltar ao operador
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

export default function OperatorCheckinPage() {
  const [query, setQuery] = useState({ assignmentId: "", eventId: "" });
  const [user, setUser] = useState<StoredUser | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setQuery({
      assignmentId: params.get("assignmentId") || "",
      eventId: params.get("eventId") || "",
    });
  }, []);

  async function load() {
    const token = getStoredAuthToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!query.assignmentId) return;

    const storedUser = getStoredAuthUser<StoredUser>();
    setUser(storedUser);
    setLoading(true);
    setErrorMessage("");

    try {
      const assignmentsResponse = await fetch(`${API_BASE_URL}/operator-assignments/me/invitations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const assignmentsJson = await assignmentsResponse.json().catch(() => []);

      if (!assignmentsResponse.ok) {
        throw new Error(assignmentsJson?.message || "Erro ao carregar ficha do operador");
      }

      const list = Array.isArray(assignmentsJson)
        ? assignmentsJson
        : Array.isArray(assignmentsJson?.items)
          ? assignmentsJson.items
          : [];

      const found = list.find((item: Assignment) => item.id === query.assignmentId);

      if (!found || !assignmentBelongsToUser(found, storedUser)) {
        setErrorMessage("Esta ficha não pertence à sua conta.");
        return;
      }

      if (!canValidate(found)) {
        setErrorMessage("O produtor não liberou check-in para esta ficha.");
        return;
      }

      const eventId = query.eventId || getAssignmentEventId(found);

      if (!eventId || eventId !== getAssignmentEventId(found)) {
        setErrorMessage("Evento inválido para esta ficha.");
        return;
      }

      setAssignment(found);
      setRecords(loadLocalCheckins(found.id));

      const ordersResponse = await fetch(`${API_BASE_URL}/orders/event/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (ordersResponse.ok) {
        const ordersJson = await ordersResponse.json().catch(() => []);
        setOrders(Array.isArray(ordersJson) ? ordersJson : []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível abrir o check-in. Confira se a API está ligada.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query.assignmentId, query.eventId]);

  const tickets = useMemo(() => ticketsFromOrders(orders), [orders]);

  const validatedCodes = useMemo(() => {
    return new Set(records.map((item) => item.code.trim().toLowerCase()));
  }, [records]);

  function validateTicket(event: FormEvent) {
    event.preventDefault();

    if (!assignment) return;

    const target = code.trim();

    if (!target) {
      setMessage("Informe o QR Code, código do ingresso ou código do pedido.");
      return;
    }

    const normalized = target.toLowerCase();

    if (validatedCodes.has(normalized)) {
      setMessage("Ingresso já validado neste evento.");
      return;
    }

    const ticket = tickets.find((item) => {
      const values = [
        item.code,
        item.id,
        item.order,
        item.raw?.qrCode,
        item.raw?.ticketCode,
        item.raw?.code,
      ].map((value) => String(value || "").trim().toLowerCase());

      return values.includes(normalized);
    });

    if (!ticket) {
      setMessage("Código não encontrado nos ingressos deste evento.");
      return;
    }

    const nextRecord: CheckinRecord = {
      id: `checkin-${Date.now()}`,
      code: ticket.code,
      ticketId: ticket.id,
      customer: ticket.customer,
      order: ticket.order,
      at: new Date().toISOString(),
      operatorName: user?.name || user?.email || "Operador",
    };

    const next = [nextRecord, ...records];
    setRecords(next);
    saveLocalCheckins(assignment.id, next);
    setCode("");
    setMessage(`Entrada liberada: ${ticket.customer}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Topbar user={user} />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-black text-slate-600">Carregando check-in do evento...</p>
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
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">Acesso bloqueado</p>
            <h1 className="mt-3 text-3xl font-black text-rose-950">{errorMessage}</h1>
            <a
              href="/operator/dashboard"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Voltar ao operador
            </a>
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
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-emerald-300">
            Check-in do operador
          </p>
          <h1 className="mt-4 text-5xl font-black leading-tight">
            {getAssignmentEventName(assignment)}
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/75">
            Esta validação está limitada ao evento e à ficha liberada pelo produtor.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Ingressos encontrados" value={String(tickets.length)} />
          <Metric label="Validados aqui" value={String(records.length)} />
          <Metric label="Pendentes" value={String(Math.max(0, tickets.length - records.length))} />
          <Metric label="Evento" value={getAssignmentEventName(assignment)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={validateTicket} className="h-fit rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">Validação</p>
            <h2 className="mt-2 text-3xl font-black">Ler ingresso</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Digite ou cole o QR Code/código do ingresso deste evento.
            </p>

            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
              placeholder="Código ou QR Code"
              className="mt-5 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              className="mt-4 h-12 w-full rounded-2xl bg-emerald-700 text-sm font-black text-white"
            >
              Validar entrada
            </button>

            {message ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
                {message}
              </div>
            ) : null}

            <a
              href="/operator/dashboard"
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 text-sm font-black hover:bg-slate-50"
            >
              Voltar para a ficha
            </a>
          </form>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
              Ingressos deste evento
            </p>
            <h2 className="mt-2 text-3xl font-black">Lista operacional</h2>

            <div className="mt-5 grid gap-3">
              {tickets.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  Nenhum ingresso retornado pela API para este evento.
                </div>
              ) : (
                tickets.map((ticket) => {
                  const used = validatedCodes.has(ticket.code.toLowerCase());

                  return (
                    <article
                      key={ticket.id}
                      className={`rounded-2xl border p-4 ${
                        used ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Pedido {ticket.order}
                          </p>
                          <h3 className="mt-1 font-black">{ticket.customer}</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Código: {ticket.code}
                          </p>
                        </div>

                        <span className={`rounded-full px-3 py-2 text-xs font-black ${
                          used ? "bg-emerald-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                        }`}>
                          {used ? "Validado" : ticket.status}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black">Histórico de validações</h2>

          <div className="mt-5 grid gap-3">
            {records.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                Nenhuma entrada validada ainda.
              </p>
            ) : (
              records.map((record) => (
                <article key={record.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-black text-emerald-950">{record.customer || record.code}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {formatDate(record.at)} • {record.operatorName}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}