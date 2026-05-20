// @ts-nocheck
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  sessions?: Array<{ date?: string | null; startDate?: string | null; eventDate?: string | null }>;
  dates?: Array<string | { date?: string | null; startDate?: string | null; eventDate?: string | null }>;
  schedules?: Array<{ date?: string | null; startDate?: string | null; eventDate?: string | null }>;
  occurrences?: Array<{ date?: string | null; startDate?: string | null; eventDate?: string | null }>;
};

type WorkDate = {
  id: string;
  date: string;
  amount: number;
  functions: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  available: boolean | null;
  responseNote?: string | null;
};

type Assignment = {
  id: string;
  protocol?: string | null;
  status?: string | null;
  workPlanStatus?: string | null;
  paymentStatus?: string | null;
  paymentProofName?: string | null;
  paymentProofDataUrl?: string | null;
  paymentNotes?: string | null;
  operatorUserId?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  operatorCpf?: string | null;
  operatorCpfNormalized?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  notes?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  assignedAt?: string | null;
  workPlanRespondedAt?: string | null;
  workDates?: WorkDate[];
  paymentSummary?: {
    proposedDays?: number;
    availableDays?: number;
    unavailableDays?: number;
    pendingDays?: number;
    proposedTotal?: number;
    approvedTotal?: number;
    scheduledHours?: number;
  };
  operationalSummary?: {
    ticketsValidated?: number;
    supportThreadsHandled?: number;
    supportMessagesHandled?: number;
  };
  operator?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    cpf?: string | null;
    role?: string | null;
  } | null;
  event?: {
    id?: string | null;
    name?: string | null;
    eventDate?: string | null;
    status?: string | null;
  } | null;
};

type AssignForm = {
  eventId: string;
  notes: string;
  canValidateTickets: boolean;
  canAnswerSupport: boolean;
  workDates: Array<{
    date: string;
    amount: string;
    functions: string;
    startTime: string;
    endTime: string;
  }>;
};

type PaymentForm = {
  paymentNotes: string;
  paymentProofName: string;
  paymentProofDataUrl: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

function authToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("astro_session_token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function personKey(assignment: Assignment) {
  return (
    assignment.operator?.id ||
    assignment.operatorUserId ||
    assignment.operatorEmail ||
    assignment.operatorCpfNormalized ||
    assignment.operatorCpf ||
    assignment.id
  );
}

function personName(assignment?: Assignment | null) {
  return assignment?.operator?.name || assignment?.operatorName || "Pessoa sem nome";
}

function personEmail(assignment?: Assignment | null) {
  return assignment?.operator?.email || assignment?.operatorEmail || "-";
}

function personCpf(assignment?: Assignment | null) {
  return assignment?.operator?.cpf || assignment?.operatorCpf || assignment?.operatorCpfNormalized || "-";
}

function status(assignment: Assignment) {
  return String(assignment.status || "").toUpperCase();
}

function money(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
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

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(safeValue);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


function normalizeTime(value?: string | null) {
  if (!value) return "";

  const clean = String(value).trim();

  const direct = clean.match(/^(\d{2}):(\d{2})/);
  if (direct) return `${direct[1]}:${direct[2]}`;

  if (!clean.includes("T") && !clean.match(/\d{2}:\d{2}/)) return "";

  const date = new Date(clean);

  if (!Number.isNaN(date.getTime())) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const embedded = clean.match(/(\d{2}):(\d{2})/);
  if (embedded) return `${embedded[1]}:${embedded[2]}`;

  return "";
}

function timeToMinutes(value?: string | null) {
  const time = normalizeTime(value);

  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function getEventTimeWindow(event?: EventItem | null) {
  if (!event) {
    return {
      startTime: "",
      endTime: "",
      hasCompleteWindow: false,
      crossesMidnight: false,
    };
  }

  const startTime =
    normalizeTime(event.startTime) ||
    normalizeTime(event.startDate) ||
    normalizeTime(event.eventDate) ||
    normalizeTime(event.date);

  const endTime =
    normalizeTime(event.endTime) ||
    normalizeTime(event.endDate);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return {
    startTime,
    endTime,
    hasCompleteWindow: startMinutes !== null && endMinutes !== null,
    crossesMidnight:
      startMinutes !== null &&
      endMinutes !== null &&
      endMinutes <= startMinutes,
  };
}

function formatEventTimeWindow(event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  if (!window.startTime && !window.endTime) return "Horário do evento não cadastrado.";
  if (window.startTime && !window.endTime) return `Início do evento: ${window.startTime}. Cadastre também o horário final.`;
  if (!window.startTime && window.endTime) return `Fim do evento: ${window.endTime}. Cadastre também o horário inicial.`;

  return `Horário do evento: ${window.startTime} às ${window.endTime}.`;
}

function isWorkTimeInsideEvent(startTime: string, endTime: string, event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  if (!window.hasCompleteWindow) return false;

  const eventStart = timeToMinutes(window.startTime);
  let eventEnd = timeToMinutes(window.endTime);
  let workStart = timeToMinutes(startTime);
  let workEnd = timeToMinutes(endTime);

  if (eventStart === null || eventEnd === null || workStart === null || workEnd === null) {
    return false;
  }

  if (window.crossesMidnight) {
    eventEnd += 24 * 60;

    if (workStart < eventStart) workStart += 24 * 60;
    if (workEnd <= workStart) workEnd += 24 * 60;

    return workStart >= eventStart && workEnd <= eventEnd && workEnd > workStart;
  }

  return workStart >= eventStart && workEnd <= eventEnd && workEnd > workStart;
}

function canUseHtmlTimeLimit(event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  return window.hasCompleteWindow && !window.crossesMidnight;
}

function getWorkIntervalForEvent(
  startTime: string,
  endTime: string,
  event?: EventItem | null,
) {
  const window = getEventTimeWindow(event);
  const eventStart = timeToMinutes(window.startTime);
  let start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (start === null || end === null) return null;

  if (window.crossesMidnight && eventStart !== null) {
    if (start < eventStart) start += 24 * 60;
    if (end <= start) end += 24 * 60;
  }

  if (!window.crossesMidnight && end <= start) {
    return null;
  }

  return { start, end };
}

function hasOverlappingWorkPeriods(
  periods: AssignForm["workDates"],
  event?: EventItem | null,
) {
  const byDate = new Map<string, Array<{ index: number; start: number; end: number }>>();

  periods.forEach((period, index) => {
    if (!period.date || !period.startTime || !period.endTime) return;

    const interval = getWorkIntervalForEvent(period.startTime, period.endTime, event);

    if (!interval) return;

    const current = byDate.get(period.date) || [];

    current.push({
      index,
      start: interval.start,
      end: interval.end,
    });

    byDate.set(period.date, current);
  });

  for (const [, items] of byDate) {
    const sorted = [...items].sort((a, b) => a.start - b.start);

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (current.start < previous.end) {
        return true;
      }
    }
  }

  return false;
}

function periodLabelByDate(workDates: AssignForm["workDates"], date: string, index: number) {
  const sameDateBefore = workDates
    .slice(0, index + 1)
    .filter((item) => item.date === date).length;

  return sameDateBefore > 1 ? `Período ${sameDateBefore}` : "Período 1";
}
function eventName(event: EventItem) {
  return event.name || event.title || "Evento sem nome";
}

function onlyDate(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function extractEventDates(event?: EventItem | null) {
  if (!event) return [];

  const candidates: Array<string | null | undefined> = [
    event.eventDate,
    event.startDate,
    event.date,
  ];

  for (const key of ["sessions", "dates", "schedules", "occurrences"] as const) {
    const value = event[key];

    if (!Array.isArray(value)) continue;

    for (const item of value) {
      if (typeof item === "string") {
        candidates.push(item);
      } else {
        candidates.push(item?.date, item?.startDate, item?.eventDate);
      }
    }
  }

  return candidates
    .map((item) => onlyDate(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .sort();
}

function getEventById(events: EventItem[], eventId: string) {
  return events.find((event) => event.id === eventId) || null;
}

function emptyForm(): AssignForm {
  return {
    eventId: "",
    notes: "",
    canValidateTickets: true,
    canAnswerSupport: true,
    workDates: [
      {
        date: "",
        amount: "",
        functions: "",
        startTime: "",
        endTime: "",
      },
    ],
  };
}

function getDefaultWorkDatesForEvent(event: EventItem | null): AssignForm["workDates"] {
  const dates = extractEventDates(event);

  const window = getEventTimeWindow(event);

  return dates.map((date) => ({
    date,
    amount: "",
    functions: "",
    startTime: window.startTime || "",
    endTime: window.endTime || "",
  }));
}

function assignmentTime(assignment: Assignment) {
  const value =
    assignment.assignedAt ||
    assignment.workPlanRespondedAt ||
    assignment.acceptedAt ||
    assignment.invitedAt ||
    assignment.eventDate ||
    "";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWaitingResponse(assignment: Assignment) {
  const workPlanStatus = String(assignment.workPlanStatus || "").toUpperCase();

  return (
    status(assignment) === "INVITED" ||
    status(assignment) === "SCHEDULE_PENDING" ||
    workPlanStatus === "PENDING_OPERATOR_RESPONSE" ||
    (assignment.workDates || []).some((item) => item.available === null)
  );
}

function isClosedEvent(assignment: Assignment) {
  const eventDate = assignment.event?.eventDate || assignment.eventDate;

  if (!eventDate) return false;

  const date = new Date(eventDate);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function isActiveEvent(assignment: Assignment) {
  return status(assignment) === "ACTIVE" && !isClosedEvent(assignment);
}

function canReceiveWork(assignment: Assignment) {
  return ["ACCEPTED", "SCHEDULE_PENDING", "ACTIVE"].includes(status(assignment));
}

function statusLabel(assignment: Assignment) {
  const current = status(assignment);

  if (current === "INVITED") return "Aguardando aceite inicial";
  if (current === "ACCEPTED") return "Pessoa disponível";
  if (current === "SCHEDULE_PENDING") return "Aguardando resposta";
  if (current === "ACTIVE") return "Evento ativo";
  if (current === "DECLINED") return "Recusado";

  return current || "Sem status";
}

async function parseApiError(response: Response) {
  const text = await response.text().catch(() => "");

  try {
    const json = JSON.parse(text);

    if (Array.isArray(json?.message)) return json.message.join("\n");
    if (typeof json?.message === "string") return json.message;
    if (typeof json?.error === "string") return json.error;
  } catch {}

  return text || `Erro ${response.status}`;
}

export default function OperatorPersonPage() {
  const params = useParams<{ id: string }>();
  const personId = decodeURIComponent(String(params?.id || ""));

  const [events, setEvents] = useState<EventItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [form, setForm] = useState<AssignForm>(emptyForm());
  const [paymentForms, setPaymentForms] = useState<Record<string, PaymentForm>>({});
  const [filter, setFilter] = useState<"ALL" | "WAITING" | "ACTIVE" | "CLOSED">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingProposal, setSavingProposal] = useState(false);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    const token = authToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [eventsResponse, assignmentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/events`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/operator-assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!eventsResponse.ok) {
        setErrorMessage(await parseApiError(eventsResponse));
        return;
      }

      if (!assignmentsResponse.ok) {
        setErrorMessage(await parseApiError(assignmentsResponse));
        return;
      }

      const eventsJson = await eventsResponse.json().catch(() => []);
      const assignmentsJson = await assignmentsResponse.json().catch(() => []);

      setEvents(Array.isArray(eventsJson) ? eventsJson : []);
      setAssignments(Array.isArray(assignmentsJson) ? assignmentsJson : []);
    } catch {
      setErrorMessage("Não foi possível conectar na API. Confirme se o backend está ligado na porta 3001.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [personId]);

  const personAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => personKey(assignment) === personId || assignment.id === personId)
      .sort((a, b) => assignmentTime(b) - assignmentTime(a));
  }, [assignments, personId]);

  const person = personAssignments[0] || null;
  const baseAssignment =
    personAssignments.find(canReceiveWork) ||
    personAssignments.find((assignment) => status(assignment) !== "DECLINED") ||
    personAssignments[0] ||
    null;

  const waiting = personAssignments.filter(isWaitingResponse);
  const active = personAssignments.filter(isActiveEvent);
  const closed = personAssignments.filter(isClosedEvent);

  const filteredAssignments = personAssignments.filter((assignment) => {
    if (filter === "WAITING") return isWaitingResponse(assignment);
    if (filter === "ACTIVE") return isActiveEvent(assignment);
    if (filter === "CLOSED") return isClosedEvent(assignment);
    return true;
  });

  const totalToPay = personAssignments.reduce(
    (sum, assignment) => sum + Number(assignment.paymentSummary?.approvedTotal || 0),
    0,
  );

  const totalPaid = personAssignments
    .filter((assignment) => assignment.paymentStatus === "PAID")
    .reduce((sum, assignment) => sum + Number(assignment.paymentSummary?.approvedTotal || 0), 0);

  const totalPending = Math.max(0, totalToPay - totalPaid);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = new Date(a.eventDate || a.startDate || 0).getTime();
      const bDate = new Date(b.eventDate || b.startDate || 0).getTime();
      return bDate - aDate;
    });
  }, [events]);

  const selectedEvent = getEventById(events, form.eventId);
  const selectedEventDates = extractEventDates(selectedEvent);
  const selectedEventTimeWindow = getEventTimeWindow(selectedEvent);
  const canLimitTimeInput = canUseHtmlTimeLimit(selectedEvent);

  function patchForm(patch: Partial<AssignForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleEventChange(eventId: string) {
    const selectedEvent = getEventById(events, eventId);

    patchForm({
      eventId,
      workDates: getDefaultWorkDatesForEvent(selectedEvent),
    });
  }

  function patchWorkDate(index: number, patch: Partial<AssignForm["workDates"][number]>) {
    patchForm({
      workDates: form.workDates.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function addWorkDate() {
    if (!form.eventId) {
      alert("Selecione um evento antes de adicionar horários.");
      return;
    }

    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    const lastDate = form.workDates[form.workDates.length - 1]?.date;
    const nextDate = lastDate && selectedEventDates.includes(lastDate) ? lastDate : selectedEventDates[0];

    patchForm({
      workDates: [
        ...form.workDates,
        {
          date: nextDate,
          amount: "",
          functions: "",
          startTime: selectedEventTimeWindow.startTime || "",
          endTime: selectedEventTimeWindow.endTime || "",
        },
      ],
    });
  }
  function removeWorkDate(index: number) {
    patchForm({
      workDates: form.workDates.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  async function sendProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = authToken();

    if (!baseAssignment) {
      alert("Nenhum vínculo encontrado para essa pessoa. Volte e envie o convite primeiro.");
      return;
    }

    if (!canReceiveWork(baseAssignment)) {
      alert("A pessoa ainda precisa aceitar o convite inicial antes de receber proposta de evento.");
      return;
    }

    if (!form.eventId) {
      alert("Selecione o evento.");
      return;
    }

    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    if (!selectedEventTimeWindow.hasCompleteWindow) {
      alert("Este evento precisa ter horário inicial e horário final cadastrados para enviar proposta.");
      return;
    }

    if (form.workDates.some((item) => !item.date || !selectedEventDates.includes(item.date) || !item.amount || !item.functions.trim())) {
      alert("Preencha data, valor e funções em todos os dias.");
      return;
    }

    if (form.workDates.some((item) => !item.startTime || !item.endTime)) {
      alert("Preencha horário inicial e final em todos os dias.");
      return;
    }

    if (form.workDates.some((item) => !isWorkTimeInsideEvent(item.startTime, item.endTime, selectedEvent))) {
      alert(`Os horários precisam ficar dentro do horário do evento: ${selectedEventTimeWindow.startTime} às ${selectedEventTimeWindow.endTime}.`);
      return;
    }

    if (hasOverlappingWorkPeriods(form.workDates, selectedEvent)) {
      alert("Existem horários sobrepostos na mesma data. Separe os períodos sem cruzar horários, por exemplo: 20:00-21:00 e 22:00-23:59.");
      return;
    }

    setSavingProposal(true);

    try {
      const response = await fetch(`${API_BASE_URL}/operator-assignments/${baseAssignment.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        alert(await parseApiError(response));
        return;
      }

      setForm(emptyForm());
      await load();
      alert("Proposta enviada. A pessoa precisa aceitar ou recusar as datas.");
    } catch {
      alert("Erro ao enviar proposta. Confira se a API está ligada.");
    } finally {
      setSavingProposal(false);
    }
  }

  function getPaymentForm(id: string) {
    return (
      paymentForms[id] || {
        paymentNotes: "",
        paymentProofName: "",
        paymentProofDataUrl: "",
      }
    );
  }

  function patchPaymentForm(id: string, patch: Partial<PaymentForm>) {
    setPaymentForms((current) => ({
      ...current,
      [id]: {
        ...getPaymentForm(id),
        ...patch,
      },
    }));
  }

  function handleProofFile(assignmentId: string, file?: File | null) {
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Use um comprovante de até 4 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      patchPaymentForm(assignmentId, {
        paymentProofName: file.name,
        paymentProofDataUrl: String(reader.result || ""),
      });
    };

    reader.readAsDataURL(file);
  }

  async function markAsPaid(assignment: Assignment) {
    const token = authToken();
    const paymentForm = getPaymentForm(assignment.id);

    if (!paymentForm.paymentProofDataUrl && !assignment.paymentProofDataUrl) {
      const proceed = confirm("Marcar como pago sem anexar comprovante?");
      if (!proceed) return;
    }

    setSavingPaymentId(assignment.id);

    try {
      const response = await fetch(`${API_BASE_URL}/operator-assignments/${assignment.id}/payment/mark-paid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentForm),
      });

      if (!response.ok) {
        alert(await parseApiError(response));
        return;
      }

      await load();
      alert("Pagamento marcado como pago.");
    } catch {
      alert("Erro ao marcar pagamento. Confira se a API está ligada.");
    } finally {
      setSavingPaymentId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-[1180px] rounded-[30px] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
          Carregando ficha da pessoa...
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-[1180px] rounded-[30px] border border-red-200 bg-red-50 p-8 text-sm font-bold text-red-700 shadow-sm">
          {errorMessage}
        </div>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-[1180px] rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black">Pessoa não encontrada</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Volte para a lista e abra a ficha novamente.
          </p>
          <Link
            href="/admin/operators"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Voltar para pessoas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-[1180px] space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/operators"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black shadow-sm hover:bg-slate-50"
          >
            Voltar para pessoas
          </Link>

          <button
            type="button"
            onClick={load}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Atualizar ficha
          </button>
        </div>

        <section className="rounded-[34px] bg-gradient-to-br from-[#24120c] to-[#020617] p-7 text-white shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-300">
            Ficha da pessoa
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black md:text-4xl">{personName(person)}</h1>
              <p className="mt-2 text-sm font-semibold text-white/70">
                {personEmail(person)} • CPF: {personCpf(person)}
              </p>
              <p className="mt-2 text-xs font-bold text-white/50">
                Base: {baseAssignment?.protocol || baseAssignment?.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Fichas", personAssignments.length],
                ["Aguardando", waiting.length],
                ["Ativos", active.length],
                ["Encerrados", closed.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
                  <p className="mt-2 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            ["Tem que pagar", money(totalToPay), "Total aprovado nos trabalhos."],
            ["Já pagou", money(totalPaid), "Total marcado como pago."],
            ["Pendente", money(totalPending), "Saldo em aberto."],
          ].map(([label, value, description]) => (
            <div key={String(label)} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={sendProposal} className="rounded-[30px] border border-orange-200 bg-orange-50/50 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">Nova proposta</p>
            <h2 className="mt-3 text-2xl font-black">Convidar para evento</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Envie um novo trabalho para essa pessoa. Isso cria uma ficha nova e mantém o histórico antigo.
            </p>

            <label className="mt-6 block text-sm font-black">Evento</label>
            <select
              value={form.eventId}
              onChange={(event) => handleEventChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
            >
              <option value="">Selecione um evento</option>
              {sortedEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {eventName(event)} {event.eventDate ? `• ${formatDateOnly(event.eventDate)}` : ""}
                </option>
              ))}
            </select>

            {form.eventId ? (
              <div className="mt-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
                {selectedEventDates.length > 0
                  ? `Datas disponíveis deste evento: ${selectedEventDates.map((date) => formatDateOnly(date)).join(", ")} • ${formatEventTimeWindow(selectedEvent)} • Você pode adicionar mais de um período na mesma data.`
                  : "Este evento não possui datas cadastradas."}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-black">Datas, horários, valores e funções</p>
              <button
                type="button"
                onClick={addWorkDate}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
              >
                + Horário
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {form.workDates.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                  Selecione um evento com datas cadastradas para montar os períodos de trabalho.
                </div>
              ) : null}

              {form.workDates.map((workDate, index) => (
                <div key={index} className="rounded-2xl border border-orange-200 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                      {periodLabelByDate(form.workDates, workDate.date, index)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Cada linha é um turno/período separado.
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      value={workDate.date}
                      onChange={(event) => patchWorkDate(index, { date: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    >
                      {selectedEventDates.length === 0 ? (
                        <option value="">Evento sem datas cadastradas</option>
                      ) : (
                        selectedEventDates.map((date) => (
                          <option
                            key={date}
                            value={date}
                          >
                            {formatDateOnly(date)}
                          </option>
                        ))
                      )}
                    </select>

                    <input
                      value={workDate.amount}
                      onChange={(event) => patchWorkDate(index, { amount: event.target.value })}
                      placeholder="Valor por período"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />

                    <input
                      type="time"
                      value={workDate.startTime}
                      min={canLimitTimeInput ? selectedEventTimeWindow.startTime : undefined}
                      max={canLimitTimeInput ? selectedEventTimeWindow.endTime : undefined}
                      onChange={(event) => patchWorkDate(index, { startTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />

                    <input
                      type="time"
                      value={workDate.endTime}
                      min={canLimitTimeInput ? selectedEventTimeWindow.startTime : undefined}
                      max={canLimitTimeInput ? selectedEventTimeWindow.endTime : undefined}
                      onChange={(event) => patchWorkDate(index, { endTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <p className="mt-2 text-[11px] font-bold text-slate-500">
                    Permitido somente entre {selectedEventTimeWindow.startTime || "--:--"} e {selectedEventTimeWindow.endTime || "--:--"}.
                  </p>

                  <textarea
                    value={workDate.functions}
                    onChange={(event) => patchWorkDate(index, { functions: event.target.value })}
                    placeholder="Funções do operador nesse período"
                    className="mt-2 min-h-[70px] w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  />

                  {form.workDates.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeWorkDate(index)}
                      className="mt-2 text-xs font-black text-red-600"
                    >
                      Remover período
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <label className="mt-5 block text-sm font-black">Observações</label>
            <textarea
              value={form.notes}
              onChange={(event) => patchForm({ notes: event.target.value })}
              placeholder="Ex: entrada pelo portão lateral, chegar 1h antes, uniforme preto."
              className="mt-2 min-h-[100px] w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500"
            />

            <div className="mt-4 grid gap-2 text-sm font-bold">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.canValidateTickets}
                  onChange={(event) => patchForm({ canValidateTickets: event.target.checked })}
                />
                Pode validar ingressos/check-in
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.canAnswerSupport}
                  onChange={(event) => patchForm({ canAnswerSupport: event.target.checked })}
                />
                Pode responder suporte
              </label>
            </div>

            <button
              disabled={savingProposal}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
            >
              {savingProposal ? "Enviando..." : "Enviar proposta para essa pessoa"}
            </button>
          </form>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">Histórico</p>
                <h2 className="mt-3 text-2xl font-black">Eventos e trabalhos da pessoa</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Cada proposta aparece como uma ficha separada.
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as any)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
              >
                <option value="ALL">Todos</option>
                <option value="WAITING">Aguardando resposta</option>
                <option value="ACTIVE">Evento ativo</option>
                <option value="CLOSED">Evento encerrado</option>
              </select>
            </div>

            <div className="mt-5 space-y-4">
              {filteredAssignments.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  Nenhuma ficha nesse filtro.
                </div>
              ) : (
                filteredAssignments.map((assignment) => {
                  const approvedTotal = Number(assignment.paymentSummary?.approvedTotal || 0);
                  const paid = assignment.paymentStatus === "PAID";

                  return (
                    <article key={assignment.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {assignment.protocol || assignment.id}
                          </p>
                          <h3 className="mt-2 text-xl font-black">
                            {assignment.event?.name || assignment.eventTitle || "Sem evento atribuído"}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {formatDate(assignment.event?.eventDate || assignment.eventDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700">
                            {statusLabel(assignment)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-2 text-xs font-black ${
                              paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {paid ? "Pago" : "Pagamento pendente"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        {[
                          ["Dias aprovados", assignment.paymentSummary?.availableDays || 0],
                          ["Horas", assignment.paymentSummary?.scheduledHours || 0],
                          ["Valor aprovado", money(approvedTotal)],
                          ["Validações", assignment.operationalSummary?.ticketsValidated || 0],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-2xl bg-white p-4">
                            <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                            <p className="mt-2 text-lg font-black">{value}</p>
                          </div>
                        ))}
                      </div>

                      {(assignment.workDates || []).length > 0 ? (
                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            Datas da ficha
                          </p>
                          <div className="mt-3 grid gap-2">
                            {(assignment.workDates || []).map((workDate) => (
                              <div
                                key={workDate.id}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold"
                              >
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <span>
                                    {formatDateOnly(workDate.date)} • {workDate.startTime || "--:--"} às{" "}
                                    {workDate.endTime || "--:--"}
                                  </span>
                                  <span>
                                    {workDate.available === true
                                      ? "Aceitou"
                                      : workDate.available === false
                                        ? "Recusou"
                                        : "Aguardando"}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {workDate.functions} • {money(workDate.amount)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
                        <textarea
                          value={getPaymentForm(assignment.id).paymentNotes}
                          onChange={(event) =>
                            patchPaymentForm(assignment.id, { paymentNotes: event.target.value })
                          }
                          placeholder="Observação do pagamento"
                          className="min-h-[90px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500"
                        />

                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) => handleProofFile(assignment.id, event.target.files?.[0])}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                          />
                          <button
                            type="button"
                            disabled={savingPaymentId === assignment.id || paid}
                            onClick={() => markAsPaid(assignment)}
                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                          >
                            {paid
                              ? "Já está pago"
                              : savingPaymentId === assignment.id
                                ? "Salvando..."
                                : "Marcar como pago"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}