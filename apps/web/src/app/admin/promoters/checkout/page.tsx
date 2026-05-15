"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

async function call(path: string, payload: any) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Falha na operacao");
  return result;
}

export default function CommercialCheckoutToolsPage() {
  const [coupon, setCoupon] = useState({ eventId: "", code: "", subtotal: "100", customerCpf: "" });
  const [ref, setRef] = useState("");
  const [orderId, setOrderId] = useState("");
  const [output, setOutput] = useState<any>(null);

  async function validate(event: FormEvent) {
    event.preventDefault();
    setOutput(await call("/commercial-checkout/validate-coupon", coupon));
  }

  async function resolve(event: FormEvent) {
    event.preventDefault();
    const result = await call("/commercial-checkout/resolve-ref", { ref });
    localStorage.setItem("astro_promoter_ref", result.ref);
    setOutput(result);
  }

  async function syncPaid(event: FormEvent) {
    event.preventDefault();
    setOutput(await call("/commercial-checkout/sync-paid-order", { orderId }));
  }

  async function syncCanceled(event: FormEvent) {
    event.preventDefault();
    setOutput(await call("/commercial-checkout/sync-canceled-order", { orderId }));
  }

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-slate-950 p-8 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300">Checkout real</p>
        <h1 className="mt-4 text-4xl font-black">Ferramentas comerciais v90</h1>
        <p className="mt-3 text-sm font-semibold text-white/70">Valide cupons, resolva refs e sincronize pedido pago/cancelado.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={validate} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Validar cupom</h2>
          <div className="mt-4 space-y-3">
            {['eventId','code','subtotal','customerCpf'].map((key) => (
              <input key={key} value={(coupon as any)[key]} onChange={(event) => setCoupon({ ...coupon, [key]: event.target.value })} placeholder={key} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold" />
            ))}
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Validar</button>
          </div>
        </form>

        <form onSubmit={resolve} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Resolver ref</h2>
          <div className="mt-4 space-y-3">
            <input value={ref} onChange={(event) => setRef(event.target.value)} placeholder="joao-instagram" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold" />
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">Resolver</button>
          </div>
        </form>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Sincronizar pedido</h2>
          <form onSubmit={syncPaid} className="mt-4 space-y-3">
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="orderId" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold" />
            <button className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white">Sincronizar pago</button>
          </form>
          <form onSubmit={syncCanceled} className="mt-3">
            <button className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white">Sincronizar cancelado</button>
          </form>
        </div>
      </div>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">Resultado</h2>
          <Link href="/admin/promoters" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Voltar</Link>
        </div>
        <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-bold text-white">{JSON.stringify(output, null, 2)}</pre>
      </section>
    </main>
  );
}