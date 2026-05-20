import { expect, Page, test } from "@playwright/test";

const EVENT = {
  id: "evt-suporte-visual-001",
  name: "Infantil Seed 487",
  startDate: "2026-06-20T19:00:00.000Z",
  eventDate: "2026-06-20T19:00:00.000Z",
  status: "PUBLISHED",
  location: {
    venueName: "Teatro Seed 002",
    city: "Campinas",
    state: "SP",
  },
};

const ORDER = {
  id: "order-suporte-visual-001",
  status: "PAID",
  totalAmount: 330,
  event: EVENT,
};

const ASSIGNMENT = {
  id: "assign-suporte-visual-001",
  status: "ACCEPTED",
  eventId: EVENT.id,
  eventName: EVENT.name,
  eventTitle: EVENT.name,
  operatorUserId: "operator-visual",
  operatorEmail: "operador@teste.local",
  canAnswerSupport: true,
  permissions: {
    canValidateTickets: true,
    canAnswerSupport: true,
  },
  event: EVENT,
};

type VisualUser = {
  id: string;
  sub?: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "OPERATOR" | "SUPER_ADMIN";
};

const USERS = {
  customer: {
    id: "customer-visual",
    name: "Cliente Visual",
    email: "cliente@teste.local",
    role: "CUSTOMER",
  } satisfies VisualUser,
  producer: {
    id: "producer-visual",
    name: "Produtor Visual",
    email: "produtor@teste.local",
    role: "ADMIN",
  } satisfies VisualUser,
  operator: {
    id: "operator-visual",
    sub: "operator-visual",
    name: "Operador Visual",
    email: "operador@teste.local",
    role: "OPERATOR",
  } satisfies VisualUser,
  superAdmin: {
    id: "super-visual",
    name: "Suporte Site",
    email: "super@teste.local",
    role: "SUPER_ADMIN",
  } satisfies VisualUser,
};

function nowIso() {
  return new Date().toISOString();
}

function initialTickets() {
  return [
    {
      id: "sup-visual-customer-open",
      protocol: "ASTRO-SUP-VISUAL-001",
      title: "Dúvida sobre entrada do evento",
      subject: "Dúvida sobre entrada do evento",
      category: "Atendimento",
      status: "OPEN",
      currentOwnerType: "PRODUCER",
      sourceType: "CUSTOMER",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      order: ORDER,
      orderId: ORDER.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-001",
          text: "Oi, quero confirmar qual portão devo usar.",
          message: "Oi, quero confirmar qual portão devo usar.",
          authorRole: "CUSTOMER",
          senderType: "CUSTOMER",
          senderName: USERS.customer.name,
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
    {
      id: "sup-visual-forwarded",
      protocol: "ASTRO-SUP-VISUAL-002",
      title: "Problema técnico no leitor de QR Code",
      subject: "Problema técnico no leitor de QR Code",
      category: "Suporte técnico",
      status: "FORWARDED_TO_SUPER_ADMIN",
      currentOwnerType: "SUPER_ADMIN",
      sourceType: "OPERATOR",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      operatorName: USERS.operator.name,
      operatorEmail: USERS.operator.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-002",
          text: "O app de validação está oscilando no portão 2.",
          message: "O app de validação está oscilando no portão 2.",
          authorRole: "OPERATOR",
          senderType: "OPERATOR",
          senderName: USERS.operator.name,
          targetType: "ALL",
          createdAt: nowIso(),
        },
        {
          id: "msg-visual-003",
          text: "Encaminhado ao Suporte Site por Operador Visual.\n\nJustificativa: Falha técnica no app de leitura.",
          message: "Encaminhado ao Suporte Site por Operador Visual.\n\nJustificativa: Falha técnica no app de leitura.",
          authorRole: "OPERATOR",
          senderType: "OPERATOR",
          senderName: USERS.operator.name,
          kind: "FORWARD",
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
    {
      id: "sup-visual-closed",
      protocol: "ASTRO-SUP-VISUAL-003",
      title: "Chamado já resolvido",
      subject: "Chamado já resolvido",
      category: "Atendimento",
      status: "RESOLVED",
      currentOwnerType: "PRODUCER",
      sourceType: "CUSTOMER",
      targetType: "ALL",
      eventId: EVENT.id,
      eventName: EVENT.name,
      event: EVENT,
      customerName: USERS.customer.name,
      customerEmail: USERS.customer.email,
      producerName: USERS.producer.name,
      producerEmail: USERS.producer.email,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessageAt: nowIso(),
      messages: [
        {
          id: "msg-visual-004",
          text: "Chamado encerrado por Produtor/Admin.",
          message: "Chamado encerrado por Produtor/Admin.",
          authorRole: "PRODUCER",
          senderType: "PRODUCER",
          senderName: USERS.producer.name,
          kind: "SYSTEM",
          targetType: "ALL",
          createdAt: nowIso(),
        },
      ],
    },
  ];
}

let tickets = initialTickets();

function asCustomerThread(ticket: any) {
  return {
    ...ticket,
    subject: ticket.subject || ticket.title,
    lastMessageAt: ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt,
    organizer: {
      id: "producer-visual",
      tradeName: "Produtor Visual",
      legalName: "Produtor Visual LTDA",
    },
    order: ORDER,
    messages: (ticket.messages || []).map((message: any) => ({
      ...message,
      message: message.message || message.text,
      senderType: message.senderType || message.authorRole,
      senderName: message.senderName || message.authorName,
    })),
  };
}

function extractTicketIdFromUrl(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.reverse().find((part) => part.startsWith("sup-visual")) || "";
}

async function installSession(page: Page, user: VisualUser) {
  await page.addInitScript(({ token, storedUser }) => {
    sessionStorage.setItem("astro_session_token", token);
    sessionStorage.setItem("astro_session_user", JSON.stringify(storedUser));
    localStorage.setItem("astro_session_token", token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("operator-selected-event-id", "evt-suporte-visual-001");
    localStorage.setItem("operator-selected-event-name", "Infantil Seed 487");
    localStorage.setItem("operator-event-name-evt-suporte-visual-001", "Infantil Seed 487");
  }, {
    token: `visual-token-${user.role.toLowerCase()}`,
    storedUser: user,
  });
}

async function mockSupportApi(page: Page) {
  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    function json(data: unknown, status = 200) {
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    }

    if (path.includes("/events/admin-scope")) {
      return json([EVENT]);
    }

    if (path.includes("/orders/customer")) {
      return json([ORDER]);
    }

    if (path.includes("/operator-assignments")) {
      return json([ASSIGNMENT]);
    }

    if (path.includes("/support/customer") && method === "GET") {
      return json(tickets.map(asCustomerThread));
    }

    if (path.includes("/support/customer") && method === "POST") {
      const body = request.postDataJSON().catch(() => ({})) as any;
      const created = {
        ...tickets[0],
        id: "sup-visual-created-by-customer",
        protocol: "ASTRO-SUP-VISUAL-CUSTOMER",
        title: body?.subject || "Chamado criado pelo cliente",
        subject: body?.subject || "Chamado criado pelo cliente",
        status: "OPEN",
        sourceType: "CUSTOMER",
        currentOwnerType: "PRODUCER",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastMessageAt: nowIso(),
        messages: [
          {
            id: `msg-customer-${Date.now()}`,
            text: body?.message || "Mensagem criada pelo cliente",
            message: body?.message || "Mensagem criada pelo cliente",
            authorRole: "CUSTOMER",
            senderType: "CUSTOMER",
            senderName: USERS.customer.name,
            targetType: "ALL",
            createdAt: nowIso(),
          },
        ],
      };

      tickets = [created, ...tickets];
      return json(asCustomerThread(created), 201);
    }

    if (path.includes("/support") && method === "GET") {
      const eventId = url.searchParams.get("eventId");
      const role = (url.searchParams.get("role") || "").toUpperCase();

      let visible = [...tickets];

      if (eventId) {
        visible = visible.filter((ticket) => String(ticket.eventId) === eventId);
      }

      if (role === "SUPER_ADMIN") {
        visible = visible.filter((ticket) => String(ticket.currentOwnerType).toUpperCase() === "SUPER_ADMIN" || String(ticket.status).toUpperCase().includes("SUPER"));
      }

      return json(visible);
    }

    if (path.includes("/support") && method === "POST") {
      const body = request.postDataJSON().catch(() => ({})) as any;
      const created = {
        id: `sup-visual-created-${Date.now()}`,
        protocol: `ASTRO-SUP-${Date.now()}`,
        title: body?.title || body?.subject || "Chamado criado no teste",
        subject: body?.title || body?.subject || "Chamado criado no teste",
        category: body?.category || "Suporte",
        status: "OPEN",
        currentOwnerType: body?.currentOwnerType || "PRODUCER",
        sourceType: body?.sourceType || "PRODUCER",
        targetType: "ALL",
        eventId: body?.eventId || EVENT.id,
        eventName: body?.eventName || EVENT.name,
        event: EVENT,
        customerName: body?.customerName || USERS.customer.name,
        customerEmail: body?.customerEmail || USERS.customer.email,
        operatorName: body?.operatorName || USERS.operator.name,
        operatorEmail: body?.operatorEmail || USERS.operator.email,
        producerName: body?.producerName || USERS.producer.name,
        producerEmail: body?.producerEmail || USERS.producer.email,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastMessageAt: nowIso(),
        messages: [
          {
            id: `msg-created-${Date.now()}`,
            text: body?.message || "Mensagem inicial",
            message: body?.message || "Mensagem inicial",
            authorRole: body?.createdByRole || body?.sourceType || "PRODUCER",
            senderType: body?.createdByRole || body?.sourceType || "PRODUCER",
            senderName: body?.createdByName || "Usuário visual",
            targetType: "ALL",
            createdAt: nowIso(),
          },
        ],
      };

      tickets = [created, ...tickets];
      return json(created, 201);
    }

    if (path.includes("/support") && ["PATCH", "PUT", "POST"].includes(method)) {
      const body = request.postDataJSON().catch(() => ({})) as any;
      const ticketId = extractTicketIdFromUrl(url) || body?.threadId || body?.ticketId || body?.id || tickets[0]?.id;
      const actionText = `${path} ${method}`.toLowerCase();

      tickets = tickets.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;

        const next = { ...ticket, messages: [...(ticket.messages || [])] };

        if (actionText.includes("forward")) {
          next.status = "FORWARDED_TO_SUPER_ADMIN";
          next.currentOwnerType = "SUPER_ADMIN";
          next.messages.push({
            id: `msg-forward-${Date.now()}`,
            text: `Encaminhado ao Suporte Site.\n\nJustificativa: ${body?.reason || body?.message || "Justificativa visual"}`,
            message: `Encaminhado ao Suporte Site.\n\nJustificativa: ${body?.reason || body?.message || "Justificativa visual"}`,
            authorRole: body?.role || "OPERATOR",
            senderType: body?.role || "OPERATOR",
            kind: "FORWARD",
            targetType: "ALL",
            createdAt: nowIso(),
          });
        } else if (actionText.includes("resolve") || actionText.includes("close")) {
          next.status = "RESOLVED";
          next.messages.push({
            id: `msg-resolve-${Date.now()}`,
            text: body?.message || "Chamado resolvido.",
            message: body?.message || "Chamado resolvido.",
            authorRole: body?.role || "PRODUCER",
            senderType: body?.role || "PRODUCER",
            kind: "SYSTEM",
            targetType: "ALL",
            createdAt: nowIso(),
          });
        } else {
          next.status = "IN_PROGRESS";
          next.messages.push({
            id: `msg-reply-${Date.now()}`,
            text: body?.message || body?.text || "Resposta visual",
            message: body?.message || body?.text || "Resposta visual",
            authorRole: body?.role || body?.senderType || "PRODUCER",
            senderType: body?.role || body?.senderType || "PRODUCER",
            targetType: "ALL",
            createdAt: nowIso(),
          });
        }

        next.updatedAt = nowIso();
        next.lastMessageAt = nowIso();
        return next;
      });

      return json(tickets.find((ticket) => ticket.id === ticketId) || tickets[0]);
    }

    return json({});
  });
}

async function setupRole(page: Page, user: VisualUser) {
  tickets = initialTickets();
  await installSession(page, user);
  await mockSupportApi(page);
}

async function screenshotStep(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/support-guided/${name}.png`,
    fullPage: true,
  });
}

async function clickIfVisible(page: Page, name: RegExp | string) {
  const button = page.getByRole("button", { name });
  if (await button.first().isVisible().catch(() => false)) {
    await button.first().click();
    return true;
  }
  return false;
}

test.describe.serial("visual guiado: suporte de customer ate super admin", () => {
  test("01 customer abre suporte e enxerga tickets", async ({ page }) => {
    await setupRole(page, USERS.customer);

    await page.goto("/support");
    await expect(page.getByText(/Central de suporte|Meus atendimentos|Tickets de suporte/i).first()).toBeVisible();
    await screenshotStep(page, "01-customer-central");

    await page.getByRole("button", { name: /Abrir suporte/i }).first().click();
    await expect(page.getByText(/Falar com o produtor/i)).toBeVisible();
    await page.locator("select").first().selectOption({ index: 1 });
    await page.getByPlaceholder(/Assunto/i).fill("Teste visual customer");
    await page.getByPlaceholder(/Mensagem para o produtor|Mensagem/i).fill("Mensagem do customer para testar o fluxo completo.");
    await screenshotStep(page, "02-customer-abrindo-suporte");

    await page.getByRole("button", { name: /Abrir chamado/i }).click();
    await page.waitForTimeout(1500);
    await screenshotStep(page, "03-customer-apos-criar");
  });

  test("02 produtor escolhe evento, responde, encaminha e resolve", async ({ page }) => {
    await setupRole(page, USERS.producer);

    await page.goto("/admin/support");
    await expect(page.getByText(/Agenda de eventos|Suporte por evento|Central de suporte/i).first()).toBeVisible();
    await screenshotStep(page, "04-produtor-agenda");

    await page.getByText(EVENT.name).first().click();
    await expect(page.getByText(/Fichas|Chamados/i).first()).toBeVisible();
    await screenshotStep(page, "05-produtor-evento-fichas");

    await page.getByText(/Dúvida sobre entrada|Atendimento/i).first().click();
    await page.getByPlaceholder(/Digite uma mensagem/i).fill("Resposta do produtor visível para todos.");
    await page.getByRole("button", { name: /^Enviar$/i }).click();
    await expect(page.getByText(/Resposta do produtor visível para todos/i)).toBeVisible();
    await screenshotStep(page, "06-produtor-respondeu");

    await page.getByRole("button", { name: /Encaminhar Suporte Site/i }).click();
    await page.getByPlaceholder(/Explique brevemente|Justificativa/i).fill("Precisa de análise técnica do Suporte Site.");
    await page.getByRole("button", { name: /^Enviar$/i }).last().click();
    await expect(page.getByText(/Justificativa|Suporte Site/i).first()).toBeVisible();
    await screenshotStep(page, "07-produtor-encaminhou");

    await clickIfVisible(page, /Resolver chamado/i);
    await page.waitForTimeout(800);
    await expect(page.getByText(/histórico|resolvido|bloqueado/i).first()).toBeVisible();
    await screenshotStep(page, "08-produtor-resolvido-historico");
  });

  test("03 operador entra pelo evento, cria tecnico, filtra e respeita evento atual", async ({ page }) => {
    await setupRole(page, USERS.operator);

    await page.goto(`/operator/support?eventId=${EVENT.id}&eventName=${encodeURIComponent(EVENT.name)}&assignmentId=${ASSIGNMENT.id}`);
    await expect(page.getByText(EVENT.name).first()).toBeVisible();
    await expect(page.getByText(/Fichas do evento|Chamados/i).first()).toBeVisible();
    await screenshotStep(page, "09-operador-suporte-evento");

    await page.getByRole("link", { name: /Abrir técnico/i }).click();
    await expect(page.getByText(/Evento atual|Abrir chamado com Suporte Site/i).first()).toBeVisible();
    await expect(page.getByText(EVENT.id).first()).toBeVisible();
    await expect(page.getByText(EVENT.name).first()).toBeVisible();

    await page.getByPlaceholder(/Título do problema/i).fill("Teste técnico do operador");
    await page.getByPlaceholder(/Descrição do problema técnico/i).fill("Leitor de QR Code oscilando no portão 2.");
    await screenshotStep(page, "10-operador-novo-tecnico-evento-travado");

    await page.getByRole("button", { name: /Abrir chamado técnico/i }).click();
    await page.waitForTimeout(1500);
    await screenshotStep(page, "11-operador-apos-criar-tecnico");
  });

  test("04 suporte site ve eventos encaminhados, responde e resolve tecnico", async ({ page }) => {
    await setupRole(page, USERS.superAdmin);

    await page.goto("/admin/super/support");
    await expect(page.getByText(/Suporte técnico por evento|Suporte Site/i).first()).toBeVisible();
    await screenshotStep(page, "12-super-agenda-eventos");

    await page.getByText(EVENT.name).first().click();
    await expect(page.getByText(/Fichas|Chamado técnico|Atendimento/i).first()).toBeVisible();
    await screenshotStep(page, "13-super-evento-fichas");

    await expect(page.getByRole("button", { name: /Devolver cliente/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Devolver produtor/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Devolver operador/i })).toHaveCount(0);

    await page.getByPlaceholder(/Digite uma resposta técnica|Digite uma mensagem/i).fill("Resposta técnica do Suporte Site visível para todos.");
    await page.getByRole("button", { name: /^Enviar$/i }).click();
    await expect(page.getByText(/Resposta técnica do Suporte Site/i)).toBeVisible();
    await screenshotStep(page, "14-super-respondeu");

    await clickIfVisible(page, /Resolver técnico/i);
    await page.waitForTimeout(800);
    await screenshotStep(page, "15-super-resolveu");
  });

  test("05 regras finais: resolvido vira historico e operador sem eventId e bloqueado", async ({ page }) => {
    await setupRole(page, USERS.operator);

    await page.goto("/operator/support");
    await expect(page.getByText(/Entre pelo botão Suporte do evento|Selecione um evento|Evento obrigatório/i).first()).toBeVisible();
    await screenshotStep(page, "16-operador-sem-evento-bloqueado");

    await page.goto(`/operator/support?eventId=${EVENT.id}&eventName=${encodeURIComponent(EVENT.name)}&assignmentId=${ASSIGNMENT.id}&ticket=sup-visual-closed`);
    await expect(page.getByText(/Histórico|resolvido/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Digite uma mensagem/i).or(page.getByPlaceholder(/Somente histórico/i)).first()).toBeDisabled();
    await screenshotStep(page, "17-operador-resolvido-historico-bloqueado");
  });
});