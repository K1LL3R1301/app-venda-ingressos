"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type StoredUser = {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type OrganizerInfo = {
  id?: string | null;
  tradeName?: string | null;
  legalName?: string | null;
  name?: string | null;
  email?: string | null;
};

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  category?: string | null;
  startDate?: string | null;
  eventDate?: string | null;
  endDate?: string | null;
  organizerId?: string | null;
  organizer?: OrganizerInfo | null;
  location?: {
    venueName?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
  } | null;
};

type WorkDate = {
  id?: string | null;
  date?: string | null;
  amount?: string | number | null;
  functions?: string | null;
  status?: string | null;
  available?: boolean | null;
  responseNote?: string | null;
  respondedAt?: string | null;
};

type OperatorAssignment = {
  id: string;
  status?: string | null;
  eventId?: string | null;
  event?: EventItem | null;
  eventTitle?: string | null;
  eventName?: string | null;
  organizerId?: string | null;
  organizer?: OrganizerInfo | null;
  invitedByUserId?: string | null;
  invitedByName?: string | null;
  invitedByEmail?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  operatorUserId?: string | null;
  customerUserId?: string | null;
  userId?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  cpf?: string | null;
  notes?: string | null;
  finalNotes?: string | null;
  workDates?: WorkDate[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type InviterGroup = {
  id: string;
  name: string;
  email: string;
  assignments: OperatorAssignment[];
};

type ValidationRecord = {
  id: string;
  eventId: string;
  assignmentId: string;
  token: string;
  result: "APPROVED" | "REJECTED" | "OFFLINE";
  reason: string;
  createdAt: string;
};

type SupportRequest = {
  id: string;
  assignmentId: string;
  eventId: string;
  subject: string;
  message: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
};

type LocalResponses = Record<string, Record<string, { available: boolean; note: string; respondedAt: string }>>;

type OperatorData = {
  user: StoredUser | null;
  assignments: OperatorAssignment[];
  loading: boolean;
  error: string;
};

type OperatorSection = "overview" | "validation" | "support" | "reports";

function normalizeText(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function currentUserId(user?: StoredUser | null) {
  return String(user?.id || user?.sub || "");
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
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

function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getAssignmentEvent(assignment?: OperatorAssignment | null): EventItem | null {
  return assignment?.event || null;
}

function getEventName(event?: EventItem | null, assignment?: OperatorAssignment | null) {
  return (
    event?.name ||
    event?.title ||
    assignment?.eventTitle ||
    assignment?.eventName ||
    event?.slug ||
    event?.id ||
    "Evento não informado"
  );
}

function getEventDate(event?: EventItem | null) {
  return event?.startDate || event?.eventDate || event?.endDate || null;
}

function getEventLocation(event?: EventItem | null) {
  return [event?.location?.venueName, event?.location?.city, event?.location?.state].filter(Boolean).join(" • ") || "Local não informado";
}

function getStatusLabel(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  const labels: Record<string, string> = {
    ACCEPTED: "Aceito",
    ASSIGNED: "Atribuído",
    ACTIVE: "Ativo",
    CONFIRMED: "Confirmado",
    PENDING: "Pendente",
    PROPOSAL_SENT: "Proposta enviada",
    AVAILABLE: "Disponível",
    UNAVAILABLE: "Indisponível",
    DECLINED: "Recusado",
    REJECTED: "Recusado",
    COMPLETED: "Concluído",
  };

  return labels[normalized] || status || "Pendente";
}

function organizerFromAssignment(assignment: OperatorAssignment): OrganizerInfo | null {
  return assignment.organizer || assignment.event?.organizer || null;
}

function getOrganizerNameFromInfo(info?: OrganizerInfo | null) {
  return info?.tradeName || info?.legalName || info?.name || info?.email || "";
}

function getInviterName(assignment: OperatorAssignment) {
  const organizer = organizerFromAssignment(assignment);

  return (
    assignment.invitedByName ||
    assignment.adminName ||
    getOrganizerNameFromInfo(organizer) ||
    assignment.invitedByEmail ||
    assignment.adminEmail ||
    organizer?.email ||
    "Quem convidou"
  );
}

function getInviterEmail(assignment: OperatorAssignment) {
  const organizer = organizerFromAssignment(assignment);
  return assignment.invitedByEmail || assignment.adminEmail || organizer?.email || "";
}

function getInviterId(assignment: OperatorAssignment) {
  const organizer = organizerFromAssignment(assignment);

  return String(
    assignment.invitedByUserId ||
      assignment.organizerId ||
      organizer?.id ||
      assignment.invitedByEmail ||
      assignment.adminEmail ||
      organizer?.email ||
      getInviterName(assignment),
  );
}

function getWorkDates(assignment?: OperatorAssignment | null): WorkDate[] {
  return Array.isArray(assignment?.workDates) ? assignment.workDates : [];
}

function workDateKey(workDate: WorkDate, index: number) {
  return String(workDate.id || workDate.date || index);
}

function workDateAmount(workDate: WorkDate) {
  return toNumber(workDate.amount);
}

function workDateStatus(workDate: WorkDate, local?: { available: boolean }) {
  if (local) return local.available ? "AVAILABLE" : "UNAVAILABLE";
  const status = String(workDate.status || "").toUpperCase();
  if (status) return status;
  if (workDate.available === true) return "AVAILABLE";
  if (workDate.available === false) return "UNAVAILABLE";
  return "PENDING";
}

function assignmentTotal(assignment?: OperatorAssignment | null, localResponses?: LocalResponses) {
  if (!assignment) return 0;

  return getWorkDates(assignment).reduce((sum, date, index) => {
    const key = workDateKey(date, index);
    const local = localResponses?.[assignment.id]?.[key];
    const status = workDateStatus(date, local);

    if (["UNAVAILABLE", "DECLINED", "REJECTED"].includes(status)) return sum;

    return sum + workDateAmount(date);
  }, 0);
}

function confirmedDays(assignment?: OperatorAssignment | null, localResponses?: LocalResponses) {
  if (!assignment) return 0;

  return getWorkDates(assignment).filter((date, index) => {
    const key = workDateKey(date, index);
    const local = localResponses?.[assignment.id]?.[key];
    return workDateStatus(date, local) === "AVAILABLE";
  }).length;
}

function pendingDays(assignment?: OperatorAssignment | null, localResponses?: LocalResponses) {
  if (!assignment) return 0;

  return getWorkDates(assignment).filter((date, index) => {
    const key = workDateKey(date, index);
    const local = localResponses?.[assignment.id]?.[key];
    return workDateStatus(date, local) === "PENDING";
  }).length;
}

function isAcceptedAssignment(assignment: OperatorAssignment) {
  const status = String(assignment.status || "").toUpperCase();
  return ["ACCEPTED", "ASSIGNED", "CONFIRMED", "PROPOSAL_ACCEPTED", "ACTIVE"].includes(status);
}

function getLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setLocalJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function responseStorageKey(user?: StoredUser | null) {
  return `astro_operator_responses_${currentUserId(user) || user?.email || "anon"}`;
}

function validationStorageKey(user?: StoredUser | null) {
  return `astro_operator_validations_${currentUserId(user) || user?.email || "anon"}`;
}

function supportStorageKey(user?: StoredUser | null) {
  return `astro_operator_support_${currentUserId(user) || user?.email || "anon"}`;
}

async function fetchJson(path: string, token: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : `Falha ao carregar ${path}`);
  }

  return data;
}

function arrayFromApi(data: unknown): OperatorAssignment[] {
  if (Array.isArray(data)) return data as OperatorAssignment[];
  if (Array.isArray((data as { items?: unknown[] })?.items)) return (data as { items: OperatorAssignment[] }).items;
  if (Array.isArray((data as { assignments?: unknown[] })?.assignments)) return (data as { assignments: OperatorAssignment[] }).assignments;
  if (Array.isArray((data as { data?: unknown[] })?.data)) return (data as { data: OperatorAssignment[] }).data;
  return [];
}

function assignmentBelongsToUser(assignment: OperatorAssignment, user: StoredUser | null) {
  const userId = currentUserId(user);
  const userEmail = normalizeText(user?.email);
  const userCpf = String(user?.cpf || "").replace(/\D/g, "");

  const assignmentIds = [
    assignment.operatorUserId,
    assignment.customerUserId,
    assignment.userId,
  ].map((value) => String(value || ""));

  const assignmentEmails = [
    assignment.operatorEmail,
    assignment.customerEmail,
    assignment.userEmail,
  ].map(normalizeText);

  const assignmentCpf = String(assignment.cpf || "").replace(/\D/g, "");

  if (userId && assignmentIds.includes(userId)) return true;
  if (userEmail && assignmentEmails.includes(userEmail)) return true;
  if (userCpf && assignmentCpf === userCpf) return true;

  return false;
}

function useOperatorData(): OperatorData {
  const [state, setState] = useState<OperatorData>({
    user: null,
    assignments: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      let user: StoredUser | null = null;

      try {
        user = rawUser ? (JSON.parse(rawUser) as StoredUser) : null;
      } catch {
        user = null;
      }

      const role = String(user?.role || "").toUpperCase();

      if (!["OPERATOR", "ADMIN", "SUPER_ADMIN"].includes(role)) {
        setState({
          user,
          assignments: [],
          loading: false,
          error: "Esta área é exclusiva para operadores vinculados a eventos.",
        });
        return;
      }

      const paths = [
        "/operator-assignments/me",
        "/operator-assignments/my",
        "/operator-assignments/operator/me",
        "/operator-assignments",
      ];

      let loaded: OperatorAssignment[] = [];
      let lastError = "";

      for (const path of paths) {
        try {
          const data = await fetchJson(path, token);
          loaded = arrayFromApi(data);
          if (loaded.length > 0 || path === "/operator-assignments") break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      const scoped = loaded.filter((assignment) => assignmentBelongsToUser(assignment, user));

      setState({
        user,
        assignments: scoped.length > 0 ? scoped : loaded.filter(isAcceptedAssignment),
        loading: false,
        error: loaded.length === 0 && lastError ? "" : "",
      });
    }

    load();
  }, []);

  return state;
}

function useOperatorLocalState(user: StoredUser | null) {
  const [responses, setResponses] = useState<LocalResponses>({});
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);

  useEffect(() => {
    setResponses(getLocalJson<LocalResponses>(responseStorageKey(user), {}));
    setValidations(getLocalJson<ValidationRecord[]>(validationStorageKey(user), []));
    setSupportRequests(getLocalJson<SupportRequest[]>(supportStorageKey(user), []));
  }, [user?.id, user?.email]);

  function saveResponses(next: LocalResponses) {
    setResponses(next);
    setLocalJson(responseStorageKey(user), next);
  }

  function saveValidations(next: ValidationRecord[]) {
    setValidations(next);
    setLocalJson(validationStorageKey(user), next);
  }

  function saveSupportRequests(next: SupportRequest[]) {
    setSupportRequests(next);
    setLocalJson(supportStorageKey(user), next);
  }

  return {
    responses,
    saveResponses,
    validations,
    saveValidations,
    supportRequests,
    saveSupportRequests,
  };
}

function buildInviterGroups(assignments: OperatorAssignment[]) {
  const map = new Map<string, InviterGroup>();

  assignments.forEach((assignment) => {
    const id = getInviterId(assignment);
    const current = map.get(id);

    if (current) {
      current.assignments.push(assignment);
    } else {
      map.set(id, {
        id,
        name: getInviterName(assignment),
        email: getInviterEmail(assignment),
        assignments: [assignment],
      });
    }
  });

  return Array.from(map.values()).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

function getDefaultAssignment(groups: InviterGroup[], selectedInviterId: string, selectedAssignmentId: string) {
  const inviter = groups.find((group) => group.id === selectedInviterId) || groups[0] || null;
  const assignment =
    inviter?.assignments.find((item) => item.id === selectedAssignmentId) ||
    inviter?.assignments[0] ||
    groups[0]?.assignments[0] ||
    null;

  return {
    inviter,
    assignment,
  };
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Shell({
  data,
  title,
  eyebrow,
  description,
  children,
}: {
  data: OperatorData;
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  if (data.loading) {
    return (
      <main className="min-h-screen bg-[#f4f4f5]">
        <Topbar user={data.user} />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-black text-slate-600">Carregando tela de operadores...</p>
          </div>
        </section>
      </main>
    );
  }

  if (data.error) {
    return (
      <main className="min-h-screen bg-[#f4f4f5]">
        <Topbar user={data.user} />
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 p-8 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">Acesso bloqueado</p>
            <h1 className="mt-3 text-3xl font-black text-rose-950">{data.error}</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f5] text-slate-950">
      <Topbar user={data.user} />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="overflow-hidden rounded-[34px] bg-slate-950 p-7 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">{eyebrow}</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70">{description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HeroMetric label="Quem convidou" value={buildInviterGroups(data.assignments).length} />
              <HeroMetric label="Eventos" value={data.assignments.length} />
              <HeroMetric label="Dias confirmados" value={data.assignments.reduce((sum, assignment) => sum + confirmedDays(assignment), 0)} />
              <HeroMetric label="Previsto" value={money(data.assignments.reduce((sum, assignment) => sum + assignmentTotal(assignment), 0))} />
            </div>
          </div>
        </section>

        {children}
      </section>
    </main>
  );
}

function Topbar({ user }: { user: StoredUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const role = String(user?.role || "OPERATOR").toUpperCase();
  const source = String(user?.name || user?.email || "O").trim();
  const pieces = source.split(/\s+/).filter(Boolean);
  const initials =
    pieces.length <= 1
      ? source.slice(0, 1).toUpperCase()
      : `${pieces[0].slice(0, 1)}${pieces[pieces.length - 1].slice(0, 1)}`.toUpperCase();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
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

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-11 items-center gap-2 rounded-full bg-white px-3 text-[#19002f] shadow-sm ring-1 ring-black/10"
            aria-label="Abrir menu"
          >
            <span className="text-xl leading-none">☰</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#19002f] text-sm font-black text-white">
              {initials || "O"}
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-[10000] mt-3 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
              <div className="border-b border-neutral-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-neutral-950">
                      {user?.name || "Operador"}
                    </p>
                    <p className="mt-1 break-all text-xs font-semibold text-neutral-500">
                      {user?.email || "sem e-mail"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      CPF: {user?.cpf || "não informado"}
                    </p>
                  </div>

                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                    {role}
                  </span>
                </div>
              </div>

              <div className="px-2 pb-2 pt-1">
                <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
                  Operação
                </p>

                <div className="mt-2 space-y-1">
                  <a
                    href="/operator/dashboard"
                    className="flex w-full items-center justify-between rounded-xl bg-neutral-950 px-3 py-3 text-left text-sm font-semibold text-white transition"
                  >
                    <span>Operadores</span>
                  </a>
                </div>
              </div>

              <div className="border-t border-neutral-100 p-2">
                <a
                  href="/dashboard"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950"
                >
                  <span>Tela principal</span>
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
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


function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "dark" | "green" | "amber" | "orange";
}) {
  const classes = {
    default: "border-slate-200 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    green: "border-emerald-100 bg-emerald-50 text-emerald-950",
    amber: "border-amber-100 bg-amber-50 text-amber-950",
    orange: "border-orange-200 bg-orange-50 text-orange-950",
  }[tone];

  return (
    <article className={`rounded-[26px] border p-5 shadow-sm ${classes}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] opacity-60">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {helper ? <p className="mt-2 text-sm font-semibold opacity-65">{helper}</p> : null}
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
    </section>
  );
}

function InviterCard({
  group,
  active,
  onClick,
}: {
  group: InviterGroup;
  active: boolean;
  onClick: () => void;
}) {
  const total = group.assignments.reduce((sum, item) => sum + assignmentTotal(item), 0);
  const pending = group.assignments.reduce((sum, item) => sum + pendingDays(item), 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[26px] border p-5 text-left shadow-sm transition ${
        active ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-200"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Operador/organizador</p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">{group.name}</h3>
      {group.email ? <p className="mt-1 text-sm font-semibold text-slate-500">{group.email}</p> : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Eventos</p>
          <p className="mt-1 font-black">{group.assignments.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pend.</p>
          <p className="mt-1 font-black">{pending}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Valor</p>
          <p className="mt-1 font-black">{money(total)}</p>
        </div>
      </div>
    </button>
  );
}

function AssignmentEventCard({
  assignment,
  active,
  responses,
  onClick,
}: {
  assignment: OperatorAssignment;
  active: boolean;
  responses: LocalResponses;
  onClick: () => void;
}) {
  const event = getAssignmentEvent(assignment);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-orange-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? "text-orange-300" : "text-orange-600"}`}>
            {getStatusLabel(assignment.status)}
          </p>
          <h3 className="mt-2 text-xl font-black">{getEventName(event, assignment)}</h3>
          <p className={`mt-1 text-xs font-semibold ${active ? "text-white/60" : "text-slate-500"}`}>
            {formatDate(getEventDate(event))} • {getEventLocation(event)}
          </p>
        </div>
        <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-950">
          {money(assignmentTotal(assignment, responses))}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <span className={`rounded-xl px-3 py-2 text-center text-xs font-black ${active ? "bg-white/10" : "bg-slate-50"}`}>
          {getWorkDates(assignment).length} datas
        </span>
        <span className={`rounded-xl px-3 py-2 text-center text-xs font-black ${active ? "bg-white/10" : "bg-slate-50"}`}>
          {confirmedDays(assignment, responses)} posso
        </span>
        <span className={`rounded-xl px-3 py-2 text-center text-xs font-black ${active ? "bg-white/10" : "bg-slate-50"}`}>
          {pendingDays(assignment, responses)} pend.
        </span>
      </div>
    </button>
  );
}

function SectionTabs({
  section,
  onChange,
}: {
  section: OperatorSection;
  onChange: (section: OperatorSection) => void;
}) {
  const items: Array<{ id: OperatorSection; label: string }> = [
    { id: "overview", label: "Resumo" },
    { id: "validation", label: "Validação" },
    { id: "support", label: "Suporte" },
    { id: "reports", label: "Relatórios" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
            section === item.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

async function trySendAvailability(
  token: string | null,
  assignmentId: string,
  workDate: WorkDate,
  available: boolean,
  note: string,
) {
  if (!token) return false;

  const paths = [
    `/operator-assignments/${assignmentId}/work-dates/${workDate.id || dateOnly(workDate.date)}/availability`,
    `/operator-assignments/${assignmentId}/availability`,
    `/operator-assignments/${assignmentId}/respond-work-date`,
  ];

  for (const path of paths) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dateId: workDate.id,
          date: workDate.date,
          available,
          status: available ? "AVAILABLE" : "UNAVAILABLE",
          responseNote: note,
        }),
      });

      if (response.ok) return true;
    } catch {
      // tenta proximo endpoint
    }
  }

  return false;
}

function EventOverview({
  assignment,
  responses,
  onResponsesChange,
}: {
  assignment: OperatorAssignment;
  responses: LocalResponses;
  onResponsesChange: (responses: LocalResponses) => void;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const event = getAssignmentEvent(assignment);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const dates = getWorkDates(assignment);

  async function respond(workDate: WorkDate, index: number, available: boolean) {
    const key = workDateKey(workDate, index);
    const note = notes[key] || "";

    const next = {
      ...responses,
      [assignment.id]: {
        ...(responses[assignment.id] || {}),
        [key]: {
          available,
          note,
          respondedAt: new Date().toISOString(),
        },
      },
    };

    onResponsesChange(next);
    await trySendAvailability(token, assignment.id, workDate, available, note);
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Evento atribuído</p>
            <h2 className="mt-2 text-3xl font-black">{getEventName(event, assignment)}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{formatDate(getEventDate(event))} • {getEventLocation(event)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{assignment.finalNotes || assignment.notes || "Sem observações adicionais."}</p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Previsto</p>
            <p className="text-xl font-black">{money(assignmentTotal(assignment, responses))}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <MetricCard label="Datas" value={dates.length} helper="Escala proposta" />
          <MetricCard label="Confirmadas" value={confirmedDays(assignment, responses)} helper="Você marcou posso" tone="green" />
          <MetricCard label="Pendentes" value={pendingDays(assignment, responses)} helper="Aguardam resposta" tone="amber" />
          <MetricCard label="Status" value={getStatusLabel(assignment.status)} helper="Vínculo" tone="orange" />
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-black">Datas, valores e funções</h3>

        {dates.length ? (
          <div className="mt-5 grid gap-3">
            {dates.map((date, index) => {
              const key = workDateKey(date, index);
              const local = responses[assignment.id]?.[key];
              const status = workDateStatus(date, local);

              return (
                <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 lg:grid-cols-[150px_1fr_120px_300px] lg:items-center">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Data</p>
                      <p className="mt-1 font-black">{formatShortDate(date.date)}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Funções</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{date.functions || "Função não informada"}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Valor</p>
                      <p className="mt-1 font-black">{money(workDateAmount(date))}</p>
                    </div>

                    <div className="space-y-2">
                      <input
                        value={notes[key] || local?.note || date.responseNote || ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder="Observação da resposta"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => respond(date, index, true)}
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            status === "AVAILABLE" ? "bg-[#ff6900] text-white" : "bg-white text-emerald-700 ring-1 ring-emerald-200"
                          }`}
                        >
                          Posso
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(date, index, false)}
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            status === "UNAVAILABLE" ? "bg-rose-600 text-white" : "bg-white text-rose-700 ring-1 ring-rose-200"
                          }`}
                        >
                          Não posso
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Evento sem datas informadas" description="O admin ainda não enviou a escala detalhada deste evento." />
        )}
      </section>
    </section>
  );
}

function ValidationSection({
  assignment,
  validations,
  onSave,
}: {
  assignment: OperatorAssignment;
  validations: ValidationRecord[];
  onSave: (records: ValidationRecord[]) => void;
}) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const event = getAssignmentEvent(assignment);
  const records = validations.filter((record) => record.assignmentId === assignment.id);

  async function validateToken() {
    const cleanToken = token.trim();

    if (!cleanToken) {
      setStatus("Digite ou leia um QR/token.");
      return;
    }

    const tokenValue = localStorage.getItem("token");
    let result: ValidationRecord["result"] = "OFFLINE";
    let reason = "Registrado localmente. Integração real de check-in pode ser ligada ao endpoint depois.";

    const paths = ["/checkins", "/validation/checkin", "/tickets/validate"];

    for (const path of paths) {
      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: tokenValue ? `Bearer ${tokenValue}` : "",
          },
          body: JSON.stringify({
            token: cleanToken,
            qrCode: cleanToken,
            code: cleanToken,
            eventId: event?.id || assignment.eventId,
            assignmentId: assignment.id,
          }),
        });

        if (response.ok) {
          result = "APPROVED";
          reason = "Validado pela API.";
          break;
        }

        if (response.status === 409) {
          result = "REJECTED";
          reason = "Ingresso duplicado ou já utilizado.";
          break;
        }
      } catch {
        // segue offline
      }
    }

    const record: ValidationRecord = {
      id: `VAL-${Date.now()}`,
      eventId: event?.id || assignment.eventId || "",
      assignmentId: assignment.id,
      token: cleanToken,
      result,
      reason,
      createdAt: new Date().toISOString(),
    };

    onSave([record, ...validations]);
    setToken("");
    setStatus(`${result === "APPROVED" ? "Aprovado" : result === "REJECTED" ? "Recusado" : "Offline"}: ${reason}`);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Validação</p>
        <h2 className="mt-2 text-2xl font-black">{getEventName(event, assignment)}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">{getEventLocation(event)}</p>

        <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">QR/token</label>
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") validateToken();
          }}
          placeholder="Cole ou digite o token do ingresso"
          className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        />

        <button type="button" onClick={validateToken} className="mt-4 h-14 w-full rounded-2xl bg-slate-950 text-sm font-black text-white">
          Validar ingresso
        </button>

        {status ? <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-black text-orange-800">{status}</p> : null}
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Aprovados" value={records.filter((record) => record.result === "APPROVED").length} tone="green" />
          <MetricCard label="Recusados" value={records.filter((record) => record.result === "REJECTED").length} tone="amber" />
          <MetricCard label="Offline" value={records.filter((record) => record.result === "OFFLINE").length} tone="orange" />
        </div>

        <div className="mt-5 space-y-3">
          {records.length ? (
            records.map((record) => (
              <article key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{record.token}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(record.createdAt)} • {record.reason}</p>
                  </div>
                  <p className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">{record.result}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Nenhuma validação ainda" description="As leituras deste evento aparecem aqui." />
          )}
        </div>
      </section>
    </section>
  );
}

function SupportSection({
  assignment,
  requests,
  onSave,
}: {
  assignment: OperatorAssignment;
  requests: SupportRequest[];
  onSave: (requests: SupportRequest[]) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const event = getAssignmentEvent(assignment);
  const eventRequests = requests.filter((request) => request.assignmentId === assignment.id);

  function createRequest() {
    if (!subject.trim() || !message.trim()) return;

    const request: SupportRequest = {
      id: `SUP-${Date.now()}`,
      assignmentId: assignment.id,
      eventId: event?.id || assignment.eventId || "",
      subject: subject.trim(),
      message: message.trim(),
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };

    onSave([request, ...requests]);
    setSubject("");
    setMessage("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Suporte</p>
        <h2 className="mt-2 text-2xl font-black">{getEventName(event, assignment)}</h2>

        <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Assunto</label>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Ex: problema com leitor QR"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        />

        <label className="mt-5 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Mensagem</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Descreva o problema para o administrador."
          className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
        />

        <button type="button" onClick={createRequest} className="mt-4 h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white">
          Criar chamado
        </button>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Chamados do evento</h2>
        <div className="mt-5 space-y-3">
          {eventRequests.length ? (
            eventRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{request.subject}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{request.message}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{formatDate(request.createdAt)}</p>
                  </div>
                  <p className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">{request.status}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Nenhum chamado aberto" description="Abra um chamado se precisar de ajuda do admin ou super admin." />
          )}
        </div>
      </section>
    </section>
  );
}

function ReportsSection({
  assignment,
  responses,
  validations,
  supportRequests,
  user,
}: {
  assignment: OperatorAssignment;
  responses: LocalResponses;
  validations: ValidationRecord[];
  supportRequests: SupportRequest[];
  user: StoredUser | null;
}) {
  const event = getAssignmentEvent(assignment);
  const dates = getWorkDates(assignment);
  const records = validations.filter((record) => record.assignmentId === assignment.id);
  const support = supportRequests.filter((request) => request.assignmentId === assignment.id);

  function exportReport() {
    downloadCsv("relatorio-operador.csv", [
      ["Operador", user?.name || assignment.operatorName || assignment.customerName || "Operador"],
      ["Email", user?.email || assignment.operatorEmail || assignment.customerEmail || ""],
      ["Evento", getEventName(event, assignment)],
      ["Quem convidou", getInviterName(assignment)],
      ["Local", getEventLocation(event)],
      ["Valor a receber", assignmentTotal(assignment, responses).toFixed(2).replace(".", ",")],
      [],
      ["Data", "Funções", "Valor", "Status"],
      ...dates.map((date, index) => {
        const key = workDateKey(date, index);
        return [
          formatShortDate(date.date),
          date.functions || "",
          workDateAmount(date).toFixed(2).replace(".", ","),
          getStatusLabel(workDateStatus(date, responses[assignment.id]?.[key])),
        ];
      }),
      [],
      ["Check-ins aprovados", records.filter((record) => record.result === "APPROVED").length],
      ["Check-ins recusados", records.filter((record) => record.result === "REJECTED").length],
      ["Check-ins offline", records.filter((record) => record.result === "OFFLINE").length],
      ["Chamados", support.length],
    ]);
  }

  return (
    <section className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Dias aceitos" value={confirmedDays(assignment, responses)} helper="Disponibilidade confirmada" tone="green" />
        <MetricCard label="Total a receber" value={money(assignmentTotal(assignment, responses))} helper="Com base nos dias aceitos" tone="orange" />
        <MetricCard label="Check-ins" value={records.length} helper="Registros locais/API" />
        <MetricCard label="Chamados" value={support.length} helper="Suporte aberto" tone="amber" />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Relatório do evento</p>
            <h2 className="mt-2 text-3xl font-black">{getEventName(event, assignment)}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{getEventLocation(event)} • {getInviterName(assignment)}</p>
          </div>

          <button type="button" onClick={exportReport} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Exportar CSV
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {dates.map((date, index) => {
            const key = workDateKey(date, index);
            const response = responses[assignment.id]?.[key];

            return (
              <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[160px_1fr_140px_160px] md:items-center">
                  <p className="font-black">{formatShortDate(date.date)}</p>
                  <p className="text-sm font-semibold text-slate-600">{date.functions || "Função não informada"}</p>
                  <p className="font-black">{money(workDateAmount(date))}</p>
                  <p className="rounded-full bg-white px-3 py-2 text-center text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    {getStatusLabel(workDateStatus(date, response))}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export function OperatorHubPage() {
  const data = useOperatorData();
  const local = useOperatorLocalState(data.user);
  const [selectedInviterId, setSelectedInviterId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [section, setSection] = useState<OperatorSection>("overview");
  const [search, setSearch] = useState("");

  const groups = useMemo(() => buildInviterGroups(data.assignments), [data.assignments]);
  const filteredGroups = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return groups;

    return groups.filter((group) => {
      const haystack = [
        group.name,
        group.email,
        ...group.assignments.map((assignment) => getEventName(getAssignmentEvent(assignment), assignment)),
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(term);
    });
  }, [groups, search]);

  useEffect(() => {
    if (!selectedInviterId && filteredGroups[0]?.id) {
      setSelectedInviterId(filteredGroups[0].id);
    }
  }, [filteredGroups, selectedInviterId]);

  const { inviter, assignment } = getDefaultAssignment(filteredGroups, selectedInviterId, selectedAssignmentId);

  useEffect(() => {
    if (assignment && selectedAssignmentId !== assignment.id) {
      setSelectedAssignmentId(assignment.id);
    }
  }, [assignment, selectedAssignmentId]);

  return (
    <Shell
      data={data}
      eyebrow="Operador"
      title="Quem te convidou, eventos atribuídos e operação."
      description="Primeiro escolha quem te convidou. Depois escolha o evento atribuído. Dentro do evento ficam resumo, validação, suporte e relatório."
    >
      {data.assignments.length === 0 ? (
        <EmptyState
          title="Nenhum convite ou evento atribuído"
          description="Quando um admin/produtor vincular você a um evento, ele aparece nesta tela."
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar quem convidou ou evento..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none"
              />
            </section>

            <section className="space-y-3">
              {filteredGroups.map((group) => (
                <InviterCard
                  key={group.id}
                  group={group}
                  active={inviter?.id === group.id}
                  onClick={() => {
                    setSelectedInviterId(group.id);
                    setSelectedAssignmentId(group.assignments[0]?.id || "");
                    setSection("overview");
                  }}
                />
              ))}
            </section>
          </aside>

          <section className="space-y-5">
            {inviter ? (
              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Eventos atribuídos por</p>
                <h2 className="mt-2 text-3xl font-black">{inviter.name}</h2>
                {inviter.email ? <p className="mt-1 text-sm font-semibold text-slate-500">{inviter.email}</p> : null}

                <div className="mt-5 grid gap-3">
                  {inviter.assignments.map((item) => (
                    <AssignmentEventCard
                      key={item.id}
                      assignment={item}
                      responses={local.responses}
                      active={assignment?.id === item.id}
                      onClick={() => {
                        setSelectedAssignmentId(item.id);
                        setSection("overview");
                      }}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {assignment ? (
              <>
                <SectionTabs section={section} onChange={setSection} />

                {section === "overview" ? (
                  <EventOverview assignment={assignment} responses={local.responses} onResponsesChange={local.saveResponses} />
                ) : null}

                {section === "validation" ? (
                  <ValidationSection assignment={assignment} validations={local.validations} onSave={local.saveValidations} />
                ) : null}

                {section === "support" ? (
                  <SupportSection assignment={assignment} requests={local.supportRequests} onSave={local.saveSupportRequests} />
                ) : null}

                {section === "reports" ? (
                  <ReportsSection
                    assignment={assignment}
                    responses={local.responses}
                    validations={local.validations}
                    supportRequests={local.supportRequests}
                    user={data.user}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState title="Selecione um evento" description="Escolha quem te convidou e depois um evento para abrir as opções." />
            )}
          </section>
        </section>
      )}
    </Shell>
  );
}

export default OperatorHubPage;
