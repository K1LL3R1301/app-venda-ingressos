// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createSupportTicket,
  forwardSupportToSuperAdmin,
  getSupportTickets,
  returnSupportFromSuperAdmin,
  resolveSupportTicket,
  saveSupportTickets,
  supportOwnerLabel,
  supportStatusLabel,
  type SupportTicket,
} from "../../../../lib/support-workflow";

const TEST_EVENT_ID = "event-test-support-001";
const TEST_EVENT_NAME = "Evento Teste Suporte";
const TEST_TITLE = "[TESTE] Fluxo interligado de suporte";

function timeLabel(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportTestLabPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [lastAction, setLastAction] = useState("");

  function reload(message?: string) {
    const allTickets = getSupportTickets();
    setTickets(allTickets);

    if (message) {
      setLastAction(message);
    }
  }

  useEffect(() => {
    reload();

    function onUpdate() {
      reload();
    }

    window.addEventListener("astro-support-updated", onUpdate);

    return () => window.removeEventListener("astro-support-updated", onUpdate);
  }, []);

  const testTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.title.startsWith(TEST_TITLE));
  }, [tickets]);

  const selectedTicket =
    testTickets.find((ticket) => ticket.id === selectedId) || testTickets[0] || null;

  function requireTicket() {
    if (!selectedTicket) {
      alert("Crie primeiro um chamado de teste.");
      return null;
    }

    return selectedTicket;
  }

  function clearTestTickets() {
    if (!confirm("Remover todos os chamados de teste?")) return;

    const remaining = getSupportTickets().filter((ticket) => !ticket.title.startsWith(TEST_TITLE));
    saveSupportTickets(remaining);
    setSelectedId("");
    reload("Chamados de teste removidos.");
  }

  function createProducerTicket() {
    const ticket = createSupportTicket({
      title: `${TEST_TITLE} ${new Date().toLocaleTimeString("pt-BR")}`,
      category: "Teste automatizado",
      message:
        "Chamado criado pelo laboratório de testes. O próximo passo é encaminhar ao Super Admin.",
      priority: "HIGH",
      currentOwnerType: "PRODUCER",
      eventId: TEST_EVENT_ID,
      eventName: TEST_EVENT_NAME,
      customerName: "Cliente Teste",
      customerEmail: "cliente.teste@local",
      producerName: "Produtor Teste",
      producerEmail: "produtor.teste@local",
      operatorName: "Operador Teste",
      operatorEmail: "operador.teste@local",
      createdByRole: "PRODUCER",
      createdByName: "Produtor Teste",
      createdByEmail: "produtor.teste@local",
    });

    setSelectedId(ticket.id);
    reload("1. Chamado criado pelo produtor/admin.");
  }

  function forwardFromProducer() {
    const ticket = requireTicket();

    if (!ticket) return;

    forwardSupportToSuperAdmin(
      ticket.id,
      {
        role: "PRODUCER",
        name: "Produtor Teste",
        email: "produtor.teste@local",
      },
      "Encaminhamento de teste: parece problema técnico interno do site.",
    );

    reload("2. Chamado encaminhado pelo produtor ao Super Admin.");
  }

  function returnToProducer() {
    const ticket = requireTicket();

    if (!ticket) return;

    returnSupportFromSuperAdmin(
      ticket.id,
      "PRODUCER",
      {
        name: "Super Admin Teste",
        email: "super.teste@local",
      },
      "Resposta de teste do Super Admin: não é problema técnico, devolver ao produtor.",
    );

    reload("3. Super Admin devolveu o chamado ao produtor.");
  }

  function forwardFromOperator() {
    const ticket = requireTicket();

    if (!ticket) return;

    forwardSupportToSuperAdmin(
      ticket.id,
      {
        role: "OPERATOR",
        name: "Operador Teste",
        email: "operador.teste@local",
      },
      "Encaminhamento de teste do operador: erro técnico no check-in/suporte do evento.",
    );

    reload("4. Operador encaminhou o mesmo chamado ao Super Admin.");
  }

  function returnToOperator() {
    const ticket = requireTicket();

    if (!ticket) return;

    returnSupportFromSuperAdmin(
      ticket.id,
      "OPERATOR",
      {
        name: "Super Admin Teste",
        email: "super.teste@local",
      },
      "Resposta técnica de teste: corrigido/validado, devolver ao operador para finalizar atendimento.",
    );

    reload("5. Super Admin devolveu o chamado ao operador.");
  }

  function resolveByOperator() {
    const ticket = requireTicket();

    if (!ticket) return;

    resolveSupportTicket(
      ticket.id,
      {
        role: "OPERATOR",
        name: "Operador Teste",
        email: "operador.teste@local",
      },
      "Operador finalizou o atendimento depois da resposta técnica.",
    );

    reload("6. Operador resolveu o chamado.");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300">
            Laboratório de testes
          </p>
          <h1 className="mt-4 text-5xl font-black leading-tight">
            Teste do suporte interligado
          </h1>
          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/75">
            Use estes botões para criar um chamado de teste e simular o caminho completo entre
            produtor/admin, operador e Super Admin usando o mesmo histórico.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/admin/support"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
            >
              Abrir suporte admin
            </a>
            <a
              href={`/operator/support?eventId=${TEST_EVENT_ID}&eventName=${encodeURIComponent(TEST_EVENT_NAME)}`}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
            >
              Abrir suporte operador
            </a>
            <a
              href="/admin/super/support"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
            >
              Abrir suporte Super Admin
            </a>
          </div>
        </section>

        {lastAction ? (
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 text-sm font-black text-emerald-900">
            {lastAction}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                Roteiro automático
              </p>
              <h2 className="mt-2 text-2xl font-black">Executar passos</h2>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={createProducerTicket}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-left text-sm font-black text-white"
                >
                  1. Criar chamado como produtor/admin
                </button>

                <button
                  type="button"
                  onClick={forwardFromProducer}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-left text-sm font-black text-white"
                >
                  2. Encaminhar ao Super Admin
                </button>

                <button
                  type="button"
                  onClick={returnToProducer}
                  className="w-full rounded-2xl bg-orange-600 px-5 py-4 text-left text-sm font-black text-white"
                >
                  3. Super Admin devolve ao produtor
                </button>

                <button
                  type="button"
                  onClick={forwardFromOperator}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-left text-sm font-black text-white"
                >
                  4. Operador encaminha ao Super Admin
                </button>

                <button
                  type="button"
                  onClick={returnToOperator}
                  className="w-full rounded-2xl bg-indigo-600 px-5 py-4 text-left text-sm font-black text-white"
                >
                  5. Super Admin devolve ao operador
                </button>

                <button
                  type="button"
                  onClick={resolveByOperator}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-left text-sm font-black text-white"
                >
                  6. Operador resolve chamado
                </button>

                <button
                  type="button"
                  onClick={clearTestTickets}
                  className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm font-black text-rose-700"
                >
                  Limpar chamados de teste
                </button>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Chamados de teste
              </p>
              <div className="mt-4 space-y-3">
                {testTickets.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Nenhum chamado de teste ainda.
                  </div>
                ) : (
                  testTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedId(ticket.id)}
                      className={`w-full rounded-2xl border p-4 text-left ${
                        selectedTicket?.id === ticket.id
                          ? "border-orange-300 bg-orange-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {ticket.protocol}
                      </p>
                      <h3 className="mt-1 text-lg font-black">{ticket.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {supportStatusLabel(ticket.status)} • com {supportOwnerLabel(ticket.currentOwnerType)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section>
            {selectedTicket ? (
              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
                      {selectedTicket.protocol}
                    </p>
                    <h2 className="mt-2 text-3xl font-black">{selectedTicket.title}</h2>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      {selectedTicket.eventName || "Sem evento"} • atual:{" "}
                      {supportOwnerLabel(selectedTicket.currentOwnerType)}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                    {supportStatusLabel(selectedTicket.status)}
                  </span>
                </div>

                <section className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Histórico completo
                  </p>

                  <div className="mt-4 space-y-3">
                    {selectedTicket.messages.map((message) => (
                      <div key={message.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="text-sm font-black">{message.authorName}</p>
                          <p className="text-xs font-bold text-slate-400">
                            {timeLabel(message.createdAt)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                          {supportOwnerLabel(message.authorRole)} {message.internal ? "• nota interna" : ""}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                          {message.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    O que conferir
                  </p>
                  <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-600">
                    <li>O status deve mudar conforme os botões executados.</li>
                    <li>O responsável atual deve alternar entre Produtor/Admin, Operador e Super Admin.</li>
                    <li>O histórico deve manter todas as mensagens no mesmo chamado.</li>
                    <li>As rotas reais devem mostrar o mesmo chamado quando abertas pelos links de cima.</li>
                  </ul>
                </section>
              </article>
            ) : (
              <section className="rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h2 className="text-3xl font-black">Nenhum chamado selecionado</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Clique no passo 1 para criar o primeiro chamado de teste.
                </p>
              </section>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}