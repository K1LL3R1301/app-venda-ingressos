"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1";
type AnyItem = Record<string, any>;

function formatDate(value?: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function mediaUrl(order?: AnyItem | null) { const media = order?.event?.media || {}; return media.bannerImageUrl || media.coverImageUrl || media.mobileBannerUrl || media.thumbnailUrl || ""; }
function safeJson(value: string) { try { return JSON.parse(value); } catch { return {}; } }
function getTicketDate(order?: AnyItem | null, ticket?: AnyItem | null) { return ticket?.eventSession?.startDate || ticket?.session?.startDate || order?.event?.startDate || order?.event?.eventDate || order?.createdAt; }
function ticketCode(ticket?: AnyItem | null) { return ticket?.qrToken || ticket?.secureToken || ticket?.code || ticket?.id || ""; }
function ticketPlace(ticket?: AnyItem | null) { const meta = typeof ticket?.accessMetadata === "string" ? safeJson(ticket.accessMetadata) : ticket?.accessMetadata || {}; return ticket?.accessLabel || meta.label || meta.chairLabel || ""; }

export default function OrderPrintPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id || "";
  const [order, setOrder] = useState<AnyItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      if (!token || token === "undefined") { window.location.href = "/login"; return; }
      try {
        const response = await fetch(`${API_BASE_URL}/orders/customer/${orderId}`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
        const data = await response.json().catch(() => null);
        if (response.ok) setOrder(data);
      } finally { setLoading(false); }
    }
    load();
  }, [orderId]);

  const byDate = useMemo(() => {
    const map = new Map<string, Array<{ ticket: AnyItem; item: AnyItem }>>();
    for (const item of order?.items || []) {
      for (const ticket of item?.tickets || []) {
        const key = formatDate(getTicketDate(order, ticket));
        const list = map.get(key) || [];
        list.push({ ticket, item });
        map.set(key, list);
      }
    }
    return Array.from(map.entries());
  }, [order]);

  if (loading) return <main className="p-8">Preparando PDF...</main>;
  if (!order) return <main className="p-8">Pedido não encontrado.</main>;

  return (
    <main className="bg-white text-slate-950">
      <style jsx global>{`
        @page { size: A4; margin: 10mm; }
        body { background: white !important; }
        .print-page { page-break-after: always; min-height: 277mm; }
        .ticket-card { break-inside: avoid; page-break-inside: avoid; }
        .qr-box svg { width: 34mm !important; height: 34mm !important; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="no-print sticky top-0 z-50 border-b border-slate-200 bg-white p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="font-black">PDF oficial dos ingressos</p>
          <button onClick={() => window.print()} className="rounded-2xl bg-[#ff6900] px-5 py-3 text-sm font-black text-white">Imprimir / salvar PDF</button>
        </div>
      </div>

      {byDate.map(([dateLabel, entries], pageIndex) => (
        <section key={dateLabel} className="print-page mx-auto max-w-5xl">
          <header className="rounded-b-3xl bg-[#ff6900] p-5 text-white">
            <div className="flex items-start justify-between gap-5">
              <div><p className="text-2xl font-black">ASTRO INGRESSOS</p><p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-white/75">Evento</p><h1 className="mt-1 text-3xl font-black">{order.event?.name || "Evento"}</h1><p className="mt-2 text-sm font-bold">Pedido: {order.id}</p><p className="text-sm font-bold">Data: {dateLabel}</p></div>
              {mediaUrl(order) ? <img src={mediaUrl(order)} alt="" className="h-28 w-44 rounded-2xl object-cover" /> : null}
            </div>
          </header>

          <section className="grid gap-4 p-5">
            {entries.map(({ ticket, item }, index) => (
              <article key={ticket.id || index} className="ticket-card grid grid-cols-[1fr_46mm] gap-5 rounded-3xl border border-slate-200 p-5">
                <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff6900]">Ingresso</p><h2 className="mt-1 text-2xl font-black text-[#ff6900]">{item?.ticketType?.name || ticket?.accessLabel || "Ingresso"}</h2><div className="mt-4 grid gap-2 text-sm font-bold text-slate-700"><p>Evento: {order.event?.name || "Evento"}</p><p>Data: {dateLabel}</p>{ticketPlace(ticket) ? <p>Local/setor: {ticketPlace(ticket)}</p> : null}<p>Titular: {ticket.holderName || order.customerName || "Titular"}</p>{ticket.holderCpf || order.customerCpf ? <p>CPF: {ticket.holderCpf || order.customerCpf}</p> : null}<p>Código: {ticket.code || ticket.id}</p></div></div>
                <div className="qr-box flex flex-col items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-slate-200"><QRCodeSVG value={ticketCode(ticket)} size={132} level="M" includeMargin /><p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">QR Code</p></div>
              </article>
            ))}
          </section>

          <footer className="px-5 pb-5 text-xs font-semibold text-slate-500">Página {pageIndex + 1} • Documento oficial de acesso Astro Ingressos.</footer>
        </section>
      ))}
    </main>
  );
}
