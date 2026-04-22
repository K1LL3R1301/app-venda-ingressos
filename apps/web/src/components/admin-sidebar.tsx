"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type MenuItem = {
  href: string;
  label: string;
  emoji: string;
};

const adminItems: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", emoji: "🎟️" },
  { href: "/organizers", label: "Organizadores", emoji: "🏢" },
  { href: "/events", label: "Eventos", emoji: "🎫" },
  { href: "/orders", label: "Pedidos", emoji: "🧾" },
  { href: "/support", label: "Atendimentos", emoji: "💬" },
  { href: "/checkin", label: "Check-in", emoji: "✅" },
];

const operatorItems: MenuItem[] = [
  { href: "/operator/dashboard", label: "Dashboard", emoji: "🎟️" },
  { href: "/operator/events", label: "Eventos", emoji: "🎫" },
  { href: "/operator/orders", label: "Pedidos", emoji: "🧾" },
  { href: "/operator/checkin", label: "Check-in", emoji: "✅" },
];

const customerItems: MenuItem[] = [
  { href: "/customer/dashboard", label: "Área do cliente", emoji: "👤" },
  { href: "/customer/orders", label: "Meus pedidos", emoji: "🛍️" },
  { href: "/customer/support", label: "Suporte", emoji: "💬" },
  { href: "/customer/wallet", label: "Wallet", emoji: "👛" },
];

export default function AdminSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUser({ role: "ADMIN" });
        return;
      }

      const parsedUser = JSON.parse(rawUser) as StoredUser;
      setUser(parsedUser || { role: "ADMIN" });
    } catch {
      setUser({ role: "ADMIN" });
    }
  }, []);

  const userRole = String(user?.role || "ADMIN").toUpperCase();
  const isAdmin = userRole === "ADMIN";
  const isOperator = userRole === "OPERATOR";
  const canAccessCustomer = isAdmin || isOperator;

  const currentPanelTitle = useMemo(() => {
    if (pathname.startsWith("/operator")) return "Painel Operador";
    if (pathname.startsWith("/customer")) return "Área do Cliente";
    return "Painel Admin";
  }, [pathname]);

  function isActive(href: string) {
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  }

  function goTo(href: string) {
    setOpen(false);
    window.location.href = href;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function renderMenuSection(title: string, items: MenuItem[]) {
    return (
      <div className="space-y-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          {title}
        </p>

        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => goTo(item.href)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                active
                  ? "bg-black text-white"
                  : "text-gray-800 hover:bg-gray-100"
              }`}
            >
              <span>{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white shadow-lg"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[300px] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{currentPanelTitle}</h2>
              <p className="text-sm text-gray-500">Plataforma de ingressos</p>

              {user?.name ? (
                <div className="mt-3">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {user.email || "-"}
                  </p>
                  {user.cpf ? (
                    <p className="mt-1 text-xs text-gray-400">CPF: {user.cpf}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              aria-label="Fechar menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-6 p-4">
          {isAdmin ? renderMenuSection("Administração", adminItems) : null}

          {isOperator ? renderMenuSection("Painel Operador", operatorItems) : null}

          {canAccessCustomer
            ? renderMenuSection("Conta / Cliente", customerItems)
            : null}
        </div>

        <div className="border-t p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-xl bg-red-600 px-4 py-3 text-center font-medium text-white hover:bg-red-700"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-screen p-6 pt-20">{children}</main>
    </div>
  );
}