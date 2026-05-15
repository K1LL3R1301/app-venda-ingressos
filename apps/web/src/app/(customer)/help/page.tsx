"use client";

import { useMemo, useState } from "react";

type HelpItem = { id: string; category: string; question: string; answer: string };

const HELP_ITEMS: HelpItem[] = [
  { id: "compra", category: "Comprar ingressos", question: "Como funciona a compra de ingressos?", answer: "Escolha o evento, selecione data, setor, mesa ou cadeira quando existir, confira o resumo e finalize o pedido. Pedidos pendentes podem expirar se o pagamento não for concluído no prazo." },
  { id: "acesso", category: "Meus ingressos", question: "Como acesso meus ingressos?", answer: "Após o pagamento confirmado, acesse Meus ingressos para ver QR Codes, titular, setor, mesa/cadeira e opções de impressão ou transferência." },
  { id: "pagamento", category: "Pagamento", question: "Quando o QR Code é liberado?", answer: "O QR Code é liberado depois da confirmação do pagamento. Enquanto o pedido estiver pendente, os ingressos ficam aguardando confirmação." },
  { id: "transferencia", category: "Transferência", question: "Como transfiro um ingresso?", answer: "Informe o CPF do destinatário. A pessoa precisa aceitar a transferência antes de acessar o ingresso normalmente." },
  { id: "reembolso", category: "Cancelamento e reembolso", question: "Como funciona reembolso e wallet?", answer: "Cancelamentos aprovados podem virar crédito na wallet. Saque Pix/bancário é uma solicitação separada e pode ter desconto conforme regra da plataforma." },
  { id: "suporte", category: "Suporte", question: "Como falo com o produtor?", answer: "Acesse Suporte, abra um chamado, escolha um pedido/evento comprado e envie sua mensagem." },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tudo");
  const [openId, setOpenId] = useState(HELP_ITEMS[0].id);

  const categories = useMemo(() => ["Tudo", ...Array.from(new Set(HELP_ITEMS.map((item) => item.category)))], []);
  const items = useMemo(() => {
    const term = normalize(search.trim());
    return HELP_ITEMS.filter((item) => {
      const okCategory = category === "Tudo" || item.category === category;
      const okSearch = !term || normalize(`${item.category} ${item.question} ${item.answer}`).includes(term);
      return okCategory && okSearch;
    });
  }, [search, category]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-[#ff6900]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <a href="/dashboard" className="text-2xl font-black text-white">ASTRO INGRESSOS</a>
          <a href="/support" className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#19002f]">Abrir suporte</a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-7 px-4 py-8">
        <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300">Central de ajuda</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">Tire suas dúvidas sobre compra, ingresso e suporte.</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70">Busque por assunto, leia respostas rápidas e abra um chamado se precisar.</p>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por compra, transferência, pagamento..." className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold outline-none focus:border-orange-400" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black outline-none">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Perguntas frequentes</p>
              <h2 className="mt-2 text-3xl font-black">{items.length} resposta(s)</h2>
            </div>
            <a href="/support" className="rounded-2xl bg-[#ff6900] px-5 py-3 text-sm font-black text-white">Não encontrei, abrir chamado</a>
          </div>

          <div className="mt-6 divide-y divide-slate-100">
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <article key={item.id} className="py-4">
                  <button type="button" onClick={() => setOpenId(open ? "" : item.id)} className="flex w-full items-center justify-between gap-4 text-left">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">{item.category}</p>
                      <h3 className="mt-1 text-lg font-black">{item.question}</h3>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black">{open ? "−" : "+"}</span>
                  </button>
                  {open ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
