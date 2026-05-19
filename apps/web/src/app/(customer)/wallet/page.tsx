"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1";

type StoredUser = { id?: string; name?: string; email?: string; cpf?: string };
type Movement = { id: string; type?: string; source?: string; description?: string; amount?: string | number; createdAt?: string; status?: string; pixKey?: string; grossAmount?: string | number; feeAmount?: string | number; netAmount?: string | number };
type Filter = "ALL" | "BANK_REFUNDS" | "CREDITS" | "DEBITS";

function toNumber(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function money(value?: string | number | null) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value)); }
function userFromStorage(): StoredUser { try { return JSON.parse(sessionStorage.getItem("astro_session_user") || "{}"); } catch { return {}; } }
function withdrawalKey(user: StoredUser) { return `astro_wallet_withdrawals_${user.id || user.email || "anon"}`; }
function loadWithdrawals(user: StoredUser): Movement[] { try { return JSON.parse(localStorage.getItem(withdrawalKey(user)) || "[]"); } catch { return []; } }
function saveWithdrawals(user: StoredUser, list: Movement[]) { localStorage.setItem(withdrawalKey(user), JSON.stringify(list)); }
function upper(value?: string | null) { return String(value || "").toUpperCase(); }

export default function WalletPage() {
  const [user, setUser] = useState<StoredUser>({});
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [withdrawals, setWithdrawals] = useState<Movement[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("");

  async function load() {
    const storedUser = userFromStorage();
    setUser(storedUser);
    setWithdrawals(loadWithdrawals(storedUser));
    const token = sessionStorage.getItem("astro_session_token");
    if (!token || token === "undefined") { window.location.href = "/login"; return; }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me/wallet`, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setBalance(toNumber(data.balance));
        setMovements(Array.isArray(data.transactions) ? data.transactions : Array.isArray(data.movements) ? data.movements : []);
      }
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const allMovements = useMemo(() => [...withdrawals, ...movements], [withdrawals, movements]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allMovements.filter((item) => {
      const type = upper(item.type);
      const source = upper(item.source);
      const status = upper(item.status);

      if (filter === "BANK_REFUNDS" && !(["BANK_REFUND", "PIX_WITHDRAWAL"].includes(source) && ["PAID", "COMPLETED", "DONE"].includes(status))) return false;
      if (filter === "CREDITS" && type !== "CREDIT") return false;
      if (filter === "DEBITS" && type !== "DEBIT") return false;
      if (!term) return true;
      return `${item.description || ""} ${item.id} ${item.pixKey || ""} ${item.status || ""}`.toLowerCase().includes(term);
    });
  }, [allMovements, filter, search]);

  const walletCredits = allMovements.filter((item) => upper(item.type) === "CREDIT").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const walletDebits = allMovements.filter((item) => upper(item.type) === "DEBIT").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const paidBankRefunds = allMovements.filter((item) => ["BANK_REFUND", "PIX_WITHDRAWAL"].includes(upper(item.source)) && ["PAID", "COMPLETED", "DONE"].includes(upper(item.status))).reduce((sum, item) => sum + toNumber(item.netAmount || item.amount), 0);

  function requestWithdrawal(event: FormEvent) {
    event.preventDefault();
    const gross = Math.max(0, toNumber(amount));
    if (gross <= 0 || gross > balance) { alert("Informe um valor válido dentro do saldo disponível."); return; }
    if (!pixKey.trim()) { alert("Informe a chave Pix."); return; }
    const fee = gross * 0.2;
    const net = gross - fee;
    if (!confirm(`Confirmar solicitação?\n\nValor solicitado: ${money(gross)}\nTaxa/desconto 20%: ${money(fee)}\nValor líquido no Pix: ${money(net)}`)) return;

    const payload: Movement = { id: `PIX-${Date.now()}`, type: "DEBIT", source: "PIX_WITHDRAWAL", status: "REQUESTED", description: "Solicitação de reembolso bancário via Pix", amount: gross, grossAmount: gross, feeAmount: fee, netAmount: net, pixKey: pixKey.trim(), createdAt: new Date().toISOString() };
    const next = [payload, ...withdrawals];
    setWithdrawals(next);
    saveWithdrawals(user, next);
    setPixKey("");
    setAmount("");
    alert("Solicitação registrada. O pagamento real será ligado quando o financeiro real estiver pronto.");
  }

  const filters: Array<[Filter, string]> = [["ALL", "Tudo"], ["BANK_REFUNDS", "Estornos bancários"], ["CREDITS", "Créditos wallet"], ["DEBITS", "Débitos wallet"]];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[34px] bg-slate-950 p-8 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div><p className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300">Wallet</p><h1 className="mt-4 text-5xl font-black">Carteira de créditos</h1><p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75">Use saldo em novas compras ou solicite reembolso bancário via Pix com desconto de 20%.</p></div>
            <div className="grid gap-3"><Box label="Cliente" value={user.name || "Cliente"} sub={user.email || ""} /><Box label="Saldo disponível" value={money(balance)} /></div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Saldo disponível" value={money(balance)} />
          <Metric label="Créditos wallet" value={money(walletCredits)} />
          <Metric label="Débitos wallet" value={money(walletDebits)} />
          <Metric label="Estornos bancários pagos" value={money(paidBankRefunds)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Extrato</p><h2 className="mt-2 text-3xl font-black">Movimentações</h2></div>
              <div className="flex flex-wrap gap-2">{filters.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-2xl px-4 py-3 text-sm font-black ${filter === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700"}`}>{label}</button>)}</div>
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no extrato..." className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" />
            <div className="mt-5 grid gap-3">{filtered.length ? filtered.map((item) => <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">{item.source || item.type || "Movimento"}</p><h3 className="mt-1 font-black">{item.description || item.id}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{item.pixKey ? `Pix: ${item.pixKey} • ` : ""}{item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : ""}</p></div><div className="text-right"><p className="text-xl font-black">{money(item.netAmount || item.amount)}</p><p className="mt-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{item.status || item.type}</p></div></div></article>) : <div className="rounded-3xl bg-slate-50 p-8 text-center font-black">Nenhuma movimentação neste filtro.</div>}</div>
          </section>

          <form onSubmit={requestWithdrawal} className="h-fit rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Reembolso bancário</p>
            <h2 className="mt-2 text-3xl font-black">Solicitar Pix</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">O saque via Pix desconta 20% do valor solicitado. Por enquanto fica como solicitação preparada para dinheiro real.</p>
            <label className="mt-5 block text-sm font-black">Valor solicitado</label>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ex: 100,00" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" />
            <label className="mt-5 block text-sm font-black">Chave Pix</label>
            <input value={pixKey} onChange={(event) => setPixKey(event.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none" />
            <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-950"><p>Taxa/desconto: {money(toNumber(amount) * 0.2)}</p><p>Valor líquido estimado: {money(toNumber(amount) * 0.8)}</p></div>
            <button className="mt-5 h-12 w-full rounded-2xl bg-[#ff6900] text-sm font-black text-white">Solicitar reembolso via Pix</button>
          </form>
        </section>
      </section>
    </main>
  );
}

function Box({ label, value, sub }: { label: string; value: string; sub?: string }) { return <div className="rounded-3xl border border-white/10 bg-white/10 p-5"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">{label}</p><p className="mt-2 text-2xl font-black">{value}</p>{sub ? <p className="text-sm font-semibold text-white/60">{sub}</p> : null}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></article>; }
