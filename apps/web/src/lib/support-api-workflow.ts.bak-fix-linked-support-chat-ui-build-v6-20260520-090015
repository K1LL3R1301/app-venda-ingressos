// @ts-nocheck

import { getStoredAuthToken, getStoredAuthUser } from "./auth-client";
import {
  addSupportMessage,
  createSupportTicket,
  forwardSupportToSuperAdmin,
  getVisibleSupportTickets,
  resolveSupportTicket,
  returnSupportFromSuperAdmin,
  seedSupportTicketForEvent,
  type SupportOwnerType,
  type SupportTicket,
} from "./support-workflow";

export type SupportTargetType = "ALL" | "CUSTOMER" | "PRODUCER" | "OPERATOR" | "SUPER_ADMIN";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

function canUseApi() {
  return typeof window !== "undefined" && Boolean(getStoredAuthToken());
}

function apiHeaders() {
  const token = getStoredAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path: string, init: RequestInit = {}) {
  if (!canUseApi()) {
    throw new Error("Sem sessão para usar API.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...apiHeaders(),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Erro ${response.status}`;

    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {}

    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function safeRole(role?: string): SupportOwnerType | "CUSTOMER" {
  const value = String(role || "").toUpperCase();

  if (value === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (value === "OPERATOR") return "OPERATOR";
  if (value === "CUSTOMER") return "CUSTOMER";

  return "PRODUCER";
}

function normalizeStatus(status?: string) {
  const value = String(status || "OPEN").toUpperCase();

  if (value === "PRODUCER_REPLY") return "IN_PROGRESS";
  if (value === "CUSTOMER_REPLY") return "IN_PROGRESS";
  if (value === "RETURNED_TO_PRODUCER") return "RETURNED_TO_PRODUCER";
  if (value === "RETURNED_TO_OPERATOR") return "RETURNED_TO_OPERATOR";
  if (value === "FORWARDED_TO_SUPER_ADMIN") return "FORWARDED_TO_SUPER_ADMIN";
  if (value === "CLOSED") return "CLOSED";
  if (value === "RESOLVED") return "RESOLVED";

  return value || "OPEN";
}

function normalizeTarget(target?: string): SupportTargetType {
  const value = String(target || "ALL").toUpperCase();

  if (["CUSTOMER", "PRODUCER", "OPERATOR", "SUPER_ADMIN"].includes(value)) {
    return value as SupportTargetType;
  }

  return "ALL";
}

function mapApiTicket(thread: any): SupportTicket {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const history = Array.isArray(thread?.supportHistory) ? thread.supportHistory : [];

  return {
    id: String(thread?.id || ""),
    protocol: String(thread?.protocol || thread?.id || "ASTRO-SUP"),
    title: String(thread?.subject || thread?.title || "Chamado"),
    category: String(thread?.category || "Atendimento"),
    priority: (thread?.priority || "NORMAL") as any,
    status: normalizeStatus(thread?.status) as any,
    currentOwnerType: (thread?.currentOwnerType || "PRODUCER") as SupportOwnerType,
    eventId: thread?.eventId || thread?.event?.id || undefined,
    eventName: thread?.event?.name || thread?.eventName || undefined,
    customerName: thread?.customerName || undefined,
    customerEmail: thread?.customerEmail || undefined,
    producerName: thread?.producerName || thread?.organizer?.tradeName || undefined,
    producerEmail: thread?.producerEmail || undefined,
    operatorName: thread?.operatorName || undefined,
    operatorEmail: thread?.operatorEmail || undefined,
    sourceType: safeRole(thread?.sourceType),
    participants: Array.isArray(thread?.participants) ? thread.participants : [],
    createdAt: String(thread?.createdAt || new Date().toISOString()),
    updatedAt: String(thread?.updatedAt || thread?.lastMessageAt || new Date().toISOString()),
    messages: messages.map((message: any) => ({
      id: String(message?.id || `${thread?.id}-msg-${Math.random()}`),
      kind: String(message?.kind || "MESSAGE") as any,
      authorRole: safeRole(message?.senderType),
      authorName: String(message?.senderName || message?.senderEmail || "Sistema"),
      authorEmail: message?.senderEmail || undefined,
      targetType: normalizeTarget(message?.targetType),
      text: String(message?.message || ""),
      createdAt: String(message?.createdAt || new Date().toISOString()),
      internal: Boolean(message?.internal),
      metadata: message?.metadata || undefined,
    })),
    history: history.map((item: any) => ({
      id: String(item?.id || `${thread?.id}-his-${Math.random()}`),
      action: String(item?.action || "Atualização"),
      from: item?.from,
      to: item?.to,
      byName: String(item?.byName || item?.byEmail || "Sistema"),
      byEmail: item?.byEmail || undefined,
      note: item?.note || undefined,
      createdAt: String(item?.createdAt || new Date().toISOString()),
    })),
  };
}

export function supportTargetLabel(target?: string) {
  const map: Record<string, string> = {
    ALL: "Todos do chamado",
    CUSTOMER: "Cliente",
    PRODUCER: "Produtor/Admin",
    OPERATOR: "Operador",
    SUPER_ADMIN: "Super Admin",
  };

  return map[String(target || "ALL").toUpperCase()] || "Todos do chamado";
}

export async function getVisibleSupportTicketsReal(params: {
  role: SupportOwnerType;
  userEmail?: string;
  eventId?: string | null;
}): Promise<SupportTicket[]> {
  try {
    const scope =
      params.role === "SUPER_ADMIN"
        ? "super"
        : params.role === "OPERATOR"
          ? "operator"
          : "admin";

    const data = await apiFetch(`/support/linked/${scope}`);
    const tickets = Array.isArray(data) ? data.map(mapApiTicket) : [];

    return tickets.filter((ticket) => {
      if (params.eventId && ticket.eventId && ticket.eventId !== params.eventId) {
        return false;
      }

      return true;
    });
  } catch {
    return getVisibleSupportTickets(params);
  }
}

export async function createSupportTicketReal(input: Parameters<typeof createSupportTicket>[0] & {
  sourceType?: "CUSTOMER" | "PRODUCER" | "OPERATOR" | "SUPER_ADMIN";
  targetType?: SupportTargetType;
}) {
  try {
    const user = getStoredAuthUser<any>();
    const data = await apiFetch("/support/linked", {
      method: "POST",
      body: JSON.stringify({
        eventId: input.eventId || undefined,
        title: input.title,
        message: input.message,
        category: input.category || "Atendimento",
        priority: input.priority || "NORMAL",
        sourceType: input.sourceType || input.createdByRole || "PRODUCER",
        currentOwnerType: input.currentOwnerType || input.targetType || "PRODUCER",
        targetType: input.targetType || input.currentOwnerType || "PRODUCER",
        customerName: input.customerName || (input.sourceType === "CUSTOMER" ? input.createdByName : undefined),
        customerEmail: input.customerEmail || (input.sourceType === "CUSTOMER" ? input.createdByEmail : undefined),
        producerName: input.producerName || (input.sourceType === "PRODUCER" ? input.createdByName || user?.name : undefined),
        producerEmail: input.producerEmail || (input.sourceType === "PRODUCER" ? input.createdByEmail || user?.email : undefined),
        operatorName: input.operatorName || (input.sourceType === "OPERATOR" ? input.createdByName || user?.name : undefined),
        operatorEmail: input.operatorEmail || (input.sourceType === "OPERATOR" ? input.createdByEmail || user?.email : undefined),
      }),
    });

    return mapApiTicket(data);
  } catch {
    return createSupportTicket(input);
  }
}

export async function addSupportMessageReal(
  ticketId: string,
  actor: { role: SupportOwnerType | "CUSTOMER"; name: string; email?: string },
  text: string,
  options: { targetType?: SupportTargetType; internal?: boolean } = {},
) {
  try {
    const data = await apiFetch(`/support/linked/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        message: text,
        targetType: options.targetType || "ALL",
        internal: Boolean(options.internal),
      }),
    });

    return mapApiTicket(data);
  } catch {
    return addSupportMessage(ticketId, actor, text);
  }
}

export async function forwardSupportToSuperAdminReal(
  ticketId: string,
  actor: { role: "PRODUCER" | "OPERATOR"; name: string; email?: string },
  reason: string,
) {
  try {
    const data = await apiFetch(`/support/linked/${ticketId}/forward-super`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });

    return mapApiTicket(data);
  } catch {
    return forwardSupportToSuperAdmin(ticketId, actor, reason);
  }
}

export async function returnSupportFromSuperAdminReal(
  ticketId: string,
  target: "PRODUCER" | "OPERATOR" | "CUSTOMER",
  actor: { name: string; email?: string },
  response: string,
) {
  try {
    const data = await apiFetch(`/support/linked/${ticketId}/return`, {
      method: "POST",
      body: JSON.stringify({ target, response }),
    });

    return mapApiTicket(data);
  } catch {
    if (target === "CUSTOMER") {
      return addSupportMessage(ticketId, { role: "SUPER_ADMIN", name: actor.name, email: actor.email }, response);
    }

    return returnSupportFromSuperAdmin(ticketId, target, actor, response);
  }
}

export async function resolveSupportTicketReal(
  ticketId: string,
  actor: { role: SupportOwnerType; name: string; email?: string },
  response: string,
  options: { targetType?: SupportTargetType } = {},
) {
  try {
    const data = await apiFetch(`/support/linked/${ticketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        response,
        status: "RESOLVED",
        targetType: options.targetType || "ALL",
      }),
    });

    return mapApiTicket(data);
  } catch {
    return resolveSupportTicket(ticketId, actor, response);
  }
}

export async function seedSupportTicketForEventReal(input: {
  eventId?: string | null;
  eventName?: string | null;
  producerName?: string | null;
  producerEmail?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
}) {
  try {
    const tickets = await getVisibleSupportTicketsReal({
      role: "OPERATOR",
      userEmail: input.operatorEmail || undefined,
      eventId: input.eventId || null,
    });

    const exists = tickets.some(
      (ticket) =>
        ticket.eventId === String(input.eventId || "") &&
        ticket.title === "Atendimento operacional do evento",
    );

    if (exists) return null;

    return createSupportTicketReal({
      title: "Atendimento operacional do evento",
      category: "Operação",
      message:
        "Chamado criado para centralizar atendimentos deste evento. Responda aqui ou encaminhe ao Super Admin se for problema técnico do site.",
      priority: "NORMAL",
      sourceType: "PRODUCER",
      targetType: "OPERATOR",
      currentOwnerType: "OPERATOR",
      eventId: input.eventId || undefined,
      eventName: input.eventName || "Evento não informado",
      producerName: input.producerName || "Produtor/Admin",
      producerEmail: input.producerEmail || undefined,
      operatorName: input.operatorName || "Operador",
      operatorEmail: input.operatorEmail || undefined,
      createdByRole: "PRODUCER",
      createdByName: input.producerName || "Produtor/Admin",
      createdByEmail: input.producerEmail || undefined,
    });
  } catch {
    return seedSupportTicketForEvent(input);
  }
}